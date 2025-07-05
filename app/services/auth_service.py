"""
Authentication service for user registration, login, and password management.
"""
from datetime import datetime, timedelta, timezone
from typing import Dict, Optional, Union, cast

from fastapi import HTTPException, status
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings
from app.models.users.user import User
from app.schemas.user import TokenData, UserCreate


class AuthService:
    """Authentication service for user management."""

    def __init__(self) -> None:
        self.pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
        self.settings = get_settings()

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a plain password against its hash."""
        return cast(bool, self.pwd_context.verify(plain_password, hashed_password))

    def get_password_hash(self, password: str) -> str:
        """Hash a plain password."""
        # pwd_context.hash() returns str but mypy doesn't know that
        hashed: str = self.pwd_context.hash(password)
        return hashed

    async def get_user_by_email(
        self, db: AsyncSession, email: Optional[str]
    ) -> Optional[User]:
        """Get user by email address."""
        if email is None:
            return None
        result = await db.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def authenticate_user(
        self, db: AsyncSession, email: str, password: str
    ) -> Optional[User]:
        """Authenticate user by email and password."""
        user = await self.get_user_by_email(db, email)
        if not user:
            return None
        if not self.verify_password(password, user.password_hash):
            return None
        return user

    async def create_user(self, db: AsyncSession, user_create: UserCreate) -> User:
        """Create a new user."""
        # Check if user already exists
        existing_user = await self.get_user_by_email(db, user_create.email)
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered",
            )

        # Create new user
        hashed_password = self.get_password_hash(user_create.password)
        db_user = User(
            email=user_create.email,
            password_hash=hashed_password,
            user_type=user_create.user_type,
            is_active=True,
            is_verified=False,
        )

        db.add(db_user)
        await db.commit()
        await db.refresh(db_user)
        return db_user

    def create_access_token(
        self, data: Dict[str, str], expires_delta: Optional[timedelta]
    ) -> str:
        """Create JWT access token."""
        to_encode: Dict[str, Union[str, datetime]] = dict(data)
        if expires_delta:
            expire = datetime.now(timezone.utc) + expires_delta
        else:
            expire = datetime.now(timezone.utc) + timedelta(minutes=15)

        to_encode.update({"exp": expire})
        encoded_jwt = jwt.encode(
            to_encode, self.settings.secret_key, algorithm=self.settings.algorithm
        )
        return cast(str, encoded_jwt)

    async def get_current_user_from_token(self, db: AsyncSession, token: str) -> User:
        """Get current user from JWT token."""
        credentials_exception = HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

        try:
            payload = jwt.decode(
                token, self.settings.secret_key, algorithms=[self.settings.algorithm]
            )
            email = payload.get("sub")
            if email is None:
                raise credentials_exception
            token_data = TokenData(email=email)
        except JWTError:
            raise credentials_exception from None

        user = await self.get_user_by_email(db, email=token_data.email)
        if user is None:
            raise credentials_exception
        return user


# Create global instance
auth_service = AuthService()

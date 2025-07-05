"""
Authentication API endpoints.
"""
from datetime import timedelta
from typing import Annotated, Dict

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.user import Token, UserCreate, UserLogin, UserResponse
from app.services.auth_service import auth_service

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


@router.post("/register", response_model=UserResponse)
async def register(
    user_create: UserCreate, db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Register a new user."""
    user = await auth_service.create_user(db, user_create)
    return UserResponse.model_validate(user)


@router.post("/login", response_model=Token)
async def login(user_login: UserLogin, db: AsyncSession = Depends(get_db)) -> Token:
    """Login user and return access token."""
    user = await auth_service.authenticate_user(
        db, user_login.email, user_login.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(
        minutes=auth_service.settings.access_token_expire_minutes
    )  # noqa
    access_token = auth_service.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    token_data: Dict[str, str] = {"access_token": access_token, "token_type": "bearer"}
    return Token.model_validate(token_data)


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(), db: AsyncSession = Depends(get_db)
) -> Token:
    """OAuth2 compatible token endpoint."""
    user = await auth_service.authenticate_user(
        db, form_data.username, form_data.password
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    access_token_expires = timedelta(
        minutes=auth_service.settings.access_token_expire_minutes
    )  # noqa
    access_token = auth_service.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    token_data: Dict[str, str] = {"access_token": access_token, "token_type": "bearer"}
    return Token.model_validate(token_data)


@router.get("/me", response_model=UserResponse)
async def read_users_me(
    token: Annotated[str, Depends(oauth2_scheme)], db: AsyncSession = Depends(get_db)
) -> UserResponse:
    """Get current user information."""
    user = await auth_service.get_current_user_from_token(db, token)
    return UserResponse.model_validate(user)

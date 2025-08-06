"""
JWT authentication and security utilities.
"""
from datetime import datetime, timedelta, timezone
from typing import Any, Optional, Union

import bcrypt
from jose import JWTError, jwt
from pydantic import BaseModel

from app.core.config import get_settings

settings = get_settings()


class Token(BaseModel):
    """Token response model."""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Token payload model."""
    username: Optional[str] = None
    sub: Optional[str] = None


def create_access_token(
    data: dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create a JWT access token.
    
    Args:
        data: The data to encode in the token
        expires_delta: Optional custom expiration time
        
    Returns:
        The encoded JWT token
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.access_token_expire_minutes
        )
    
    to_encode.update({"exp": expire})
    
    encoded_jwt: str = jwt.encode(
        to_encode, settings.secret_key, algorithm=settings.algorithm
    )
    
    return encoded_jwt


def verify_token(token: str, credentials_exception) -> TokenData:
    """
    Verify and decode a JWT token.
    
    Args:
        token: The JWT token to verify
        credentials_exception: Exception to raise if verification fails
        
    Returns:
        TokenData containing the decoded token information
        
    Raises:
        credentials_exception: If token verification fails
    """
    try:
        payload = jwt.decode(
            token, settings.secret_key, algorithms=[settings.algorithm]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username, sub=username)
    except JWTError:
        raise credentials_exception
    
    return token_data


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.
    
    Args:
        plain_password: The plain text password
        hashed_password: The hashed password to verify against
        
    Returns:
        True if password is correct, False otherwise
    """
    return bcrypt.checkpw(
        plain_password.encode('utf-8'),
        hashed_password.encode('utf-8')
    )


def get_password_hash(password: str) -> str:
    """
    Hash a password using bcrypt.
    
    Args:
        password: The plain text password to hash
        
    Returns:
        The hashed password
    """
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def create_token_for_user(
    user_id: Union[str, int], 
    username: str,
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create an access token for a specific user.
    
    Args:
        user_id: The user's ID
        username: The user's username
        expires_delta: Optional custom expiration time
        
    Returns:
        The encoded JWT token
    """
    token_data = {
        "sub": str(username),
        "user_id": str(user_id),
        "username": username,
    }
    
    return create_access_token(data=token_data, expires_delta=expires_delta)

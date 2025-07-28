"""
User-related Pydantic schemas for API requests and responses.
"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.users.user import UserType


class UserBase(BaseModel):
    """Base user schema with common fields."""

    email: EmailStr
    user_type: UserType


class UserCreate(UserBase):
    """Schema for user creation."""

    password: str = Field(
        ..., min_length=8, description="Password must be at least 8 characters"
    )  # noqa


class UserLogin(BaseModel):
    """Schema for user login."""

    email: EmailStr
    password: str


class UserResponse(UserBase):
    """Schema for user response."""

    id: UUID
    is_active: bool
    is_verified: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserInDB(UserResponse):
    """Schema for user in database (includes password hash)."""

    password_hash: str


class Token(BaseModel):
    """Token response schema."""

    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Token data schema."""

    email: Optional[str] = None

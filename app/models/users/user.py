"""
User model for authentication and user management.
"""
import enum
import uuid
from typing import Any
from uuid import UUID

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import BaseModel


class UserType(enum.Enum):
    """User type enumeration."""

    FARMER = "FARMER"
    BUYER = "BUYER"
    ADMIN = "ADMIN"


class User(BaseModel):
    """User model for authentication."""

    __tablename__ = "users"

    # Override id to use UUID
    id: Mapped[UUID] = mapped_column(
        primary_key=True, default=uuid.uuid4, index=True
    )
    email: Mapped[str] = mapped_column(String, unique=True, index=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    user_type: Mapped[UserType] = mapped_column(nullable=False)
    is_active: Mapped[bool] = mapped_column(default=True)
    is_verified: Mapped[bool] = mapped_column(default=False)

    def __repr__(self) -> str:
        return f"<User(id={self.id}, email={self.email}, user_type={self.user_type})>"

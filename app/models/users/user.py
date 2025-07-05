"""
User model for authentication and user management.
"""
import enum
import uuid

from sqlalchemy import Boolean, Column, Enum, String
from sqlalchemy.dialects.postgresql import UUID

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
    id = Column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True
    )  # noqa: E501
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    user_type = Column(
        Enum(UserType, name="usertype", create_type=False), nullable=False
    )  # noqa: E501
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)

    def __repr__(self):
        return f"<User(id={self.id}, email={self.email}, user_type={self.user_type})>"  # noqa: E501

"""
SQLAlchemy models for Farmers Marketplace - Modular Organization.

This module organizes models by domain:
- users: User authentication and profiles
- farmers: Agricultural producer entities
- products: Agricultural product catalog
- orders: Marketplace transactions
- shared: Common models used across domains

TODO: Contributors should implement models.
"""

# Base model for all entities
from .base import BaseModel

# Import domain-specific models as they are implemented
from .users.user import User

__all__ = [
    "BaseModel",
    "User",
]

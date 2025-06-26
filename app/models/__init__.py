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

# TODO: Import domain-specific models as they are implemented
# Examples:
# from .users import User
# from .farmers import Farmer, FarmerVerification
# from .products import Product, ProductCategory
# from .orders import Order, OrderItem
# from .shared import Location

__all__ = [
    "BaseModel",
    # TODO: Add model exports as they are implemented
]

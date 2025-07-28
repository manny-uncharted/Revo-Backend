"""
User GraphQL resolvers for Farmers Marketplace.
"""

from typing import Optional
from uuid import UUID

import strawberry
from fastapi import HTTPException, status
from sqlalchemy import select

from app.core.database import get_db
from app.graphql.types.user_type import User, UserInput
from app.models.users.user import User as UserModel
from app.services.auth_service import auth_service


@strawberry.type
class UserQuery:
    """User-related GraphQL queries."""

    @strawberry.field
    async def user(self, id: UUID) -> Optional[User]:
        """Get user by ID."""
        async for db in get_db():
            try:
                query = select(UserModel).where(UserModel.id == id)
                result = await db.execute(query)
                user_model = result.scalar_one_or_none()

                if not user_model:
                    return None

                return User.from_model(user_model)
            finally:
                await db.close()

    @strawberry.field
    async def users(self, skip: int = 0, limit: int = 100) -> list[User]:
        """Get list of users with pagination."""
        async for db in get_db():
            try:
                query = select(UserModel).offset(skip).limit(limit)
                result = await db.execute(query)
                user_models = result.scalars().all()

                return [User.from_model(user) for user in user_models]
            finally:
                await db.close()

    @strawberry.field
    async def current_user(self, token: str) -> Optional[User]:
        """Get current authenticated user."""
        async for db in get_db():
            try:
                user_model = await auth_service.get_current_user_from_token(
                    db, token
                )
                return User.from_model(user_model)
            except HTTPException:
                return None
            finally:
                await db.close()


@strawberry.type
class UserMutation:
    """User-related GraphQL mutations."""

    @strawberry.field
    async def create_user(self, user_input: UserInput) -> User:
        """Create a new user."""
        from app.schemas.user import UserCreate

        async for db in get_db():
            try:
                # Convert GraphQL input to Pydantic schema
                user_create = UserCreate(
                    email=user_input.email,
                    password=user_input.password,
                    user_type=user_input.user_type.value,
                )

                # Create user using auth service
                user_model = await auth_service.create_user(db, user_create)
                return User.from_model(user_model)
            finally:
                await db.close()

    @strawberry.field
    async def delete_user(self, id: UUID, token: str) -> bool:
        """Delete a user (requires authentication)."""
        async for db in get_db():
            try:
                # Verify current user (authentication check)
                await auth_service.get_current_user_from_token(db, token)

                # Check if user exists
                query = select(UserModel).where(UserModel.id == id)
                result = await db.execute(query)
                user = result.scalar_one_or_none()

                if not user:
                    raise HTTPException(
                        status_code=status.HTTP_404_NOT_FOUND,
                        detail="User not found"
                    )

                await db.delete(user)
                await db.commit()
                return True
            except HTTPException:
                return False
            finally:
                await db.close()

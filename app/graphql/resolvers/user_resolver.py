"""
User GraphQL resolvers for Farmers Marketplace.
"""

from typing import Optional
from uuid import UUID

import strawberry
from fastapi import HTTPException
from sqlalchemy import select

from app.core.database import get_db
from app.graphql.types.user_type import User, UserInput
from app.models.users.user import User as UserModel, UserType as UserTypeEnum
from app.services.auth_service import auth_service


@strawberry.type
class UserQuery:
    """User-related GraphQL queries."""

    @strawberry.field
    async def user(self, id: UUID) -> Optional[User]:
        """Get user by ID."""
        async for db in get_db():
            query = select(UserModel).where(UserModel.id == id)
            result = await db.execute(query)
            user_model = result.scalar_one_or_none()

            if not user_model:
                return None

            return User.from_model(user_model)
        return None

    @strawberry.field
    async def users(self, skip: int = 0, limit: int = 100) -> list[User]:
        """Get list of users with pagination."""
        async for db in get_db():
            query = select(UserModel).offset(skip).limit(limit)
            result = await db.execute(query)
            user_models = result.scalars().all()

            return [User.from_model(user) for user in user_models]
        return []

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
        return None


@strawberry.type
class UserMutation:
    """User-related GraphQL mutations."""

    @strawberry.field
    async def create_user(self, user_input: UserInput) -> User:
        """Create a new user."""
        from app.schemas.user import UserCreate

        async for db in get_db():
            try:
                # Convert GraphQL enum string to SQLAlchemy enum
                user_type_enum = UserTypeEnum(user_input.user_type.value)

                # Convert GraphQL input to Pydantic schema
                user_create = UserCreate(
                    email=user_input.email,
                    password=user_input.password,
                    user_type=user_type_enum,
                )

                # Create user using auth service
                user_model = await auth_service.create_user(db, user_create)
                return User.from_model(user_model)
            except HTTPException as e:
                # Convert HTTPException to Strawberry error
                raise strawberry.GraphQLError(str(e.detail))
            except Exception:
                # Log unexpected errors but don't expose internal details
                raise strawberry.GraphQLError("Failed to create user")
        raise RuntimeError("Database session not available")

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
                    raise strawberry.GraphQLError("User not found")

                await db.delete(user)
                await db.commit()
                return True
            except HTTPException as e:
                # Convert HTTPException to Strawberry error
                raise strawberry.GraphQLError(str(e.detail))
            except Exception:
                # Log unexpected errors but don't expose internal details
                raise strawberry.GraphQLError("Failed to delete user")
        return False

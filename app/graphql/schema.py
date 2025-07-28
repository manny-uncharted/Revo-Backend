"""
GraphQL schema for Farmers Marketplace.
"""

from typing import Any, Optional
from uuid import UUID

import strawberry
from strawberry.fastapi import GraphQLRouter
from strawberry.schema.schema import Schema

from app.graphql.resolvers.user_resolver import UserMutation, UserQuery
from app.graphql.types.user_type import User


@strawberry.type
class Query(UserQuery):
    """
    GraphQL queries for Farmers Marketplace.
    """

    @strawberry.field
    def hello(self) -> str:
        """Basic hello query."""
        return "Hello Farmers Marketplace! 🌾"


@strawberry.type
class Mutation(UserMutation):
    """
    GraphQL mutations for Farmers Marketplace.
    """

    @strawberry.field
    def placeholder(self) -> str:
        """Placeholder mutation."""
        return "Placeholder mutation"


# Create the schema
schema = strawberry.Schema(query=Query, mutation=Mutation)

# Create GraphQL router for FastAPI
graphql_router: GraphQLRouter[Schema, Any] = GraphQLRouter(schema)

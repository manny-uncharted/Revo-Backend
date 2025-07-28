"""
Tests for User GraphQL queries and mutations.
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


class TestUserGraphQLQueries:
    """Test user GraphQL queries."""

    async def test_hello_query(self, client: AsyncClient):
        """Test basic hello query."""
        query = """
        query {
            hello
        }
        """

        response = await client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data
        assert data["data"]["hello"] == "Hello Farmers Marketplace! 🌾"

    async def test_get_user_by_id(self, client: AsyncClient, db_session: AsyncSession):
        """Test getting user by ID via GraphQL."""
        # First create a user via REST API
        user_data = {
            "email": "graphql@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }

        rest_response = await client.post("/api/users/register", json=user_data)
        assert rest_response.status_code == 201
        user_id = rest_response.json()["id"]

        # Query the user via GraphQL
        query = f"""
        query {{
            user(id: "{user_id}") {{
                id
                email
                userType
                isActive
                isVerified
                createdAt
                updatedAt
            }}
        }}
        """

        response = await client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data
        assert data["data"]["user"]["id"] == user_id
        assert data["data"]["user"]["email"] == user_data["email"]
        assert data["data"]["user"]["userType"] == user_data["user_type"]
        assert data["data"]["user"]["isActive"] is True
        assert data["data"]["user"]["isVerified"] is False

    async def test_get_user_not_found(self, client: AsyncClient):
        """Test getting non-existent user by ID."""
        fake_id = "123e4567-e89b-12d3-a456-426614174000"

        query = f"""
        query {{
            user(id: "{fake_id}") {{
                id
                email
            }}
        }}
        """

        response = await client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data
        assert data["data"]["user"] is None

    async def test_get_users_list(self, client: AsyncClient, db_session: AsyncSession):
        """Test getting list of users via GraphQL."""
        # Create multiple users
        users_data = [
            {
                "email": "user1@example.com",
                "password": "password123",
                "user_type": "FARMER",
            },
            {
                "email": "user2@example.com",
                "password": "password123",
                "user_type": "BUYER",
            },
        ]

        for user_data in users_data:
            response = await client.post("/api/users/register", json=user_data)
            assert response.status_code == 201

        # Query users list via GraphQL
        query = """
        query {
            users(skip: 0, limit: 10) {
                id
                email
                userType
                isActive
            }
        }
        """

        response = await client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data
        assert len(data["data"]["users"]) >= 2

        # Check that our created users are in the list
        emails = [user["email"] for user in data["data"]["users"]]
        assert "user1@example.com" in emails
        assert "user2@example.com" in emails

    async def test_get_users_with_pagination(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test users pagination."""
        # Create multiple users
        for i in range(5):
            user_data = {
                "email": f"paginated_user{i}@example.com",
                "password": "password123",
                "user_type": "FARMER",
            }
            response = await client.post("/api/users/register", json=user_data)
            assert response.status_code == 201

        # Test pagination
        query = """
        query {
            users(skip: 0, limit: 2) {
                id
                email
            }
        }
        """

        response = await client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data
        # Should return at most 2 users due to limit
        assert len(data["data"]["users"]) <= 2


class TestUserGraphQLMutations:
    """Test user GraphQL mutations."""

    async def test_create_user_mutation(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test creating user via GraphQL mutation."""
        mutation = """
        mutation {
            createUser(userInput: {
                email: "graphql_created@example.com",
                password: "testpassword123",
                userType: FARMER
            }) {
                id
                email
                userType
                isActive
                isVerified
            }
        }
        """

        response = await client.post("/graphql", json={"query": mutation})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data
        user_data = data["data"]["createUser"]
        assert user_data["email"] == "graphql_created@example.com"
        assert user_data["userType"] == "FARMER"
        assert user_data["isActive"] is True
        assert user_data["isVerified"] is False
        assert "id" in user_data

    async def test_create_user_duplicate_email(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test creating user with duplicate email via GraphQL."""
        user_data = {
            "email": "duplicate_graphql@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }

        # Create user via REST API first
        rest_response = await client.post("/api/users/register", json=user_data)
        assert rest_response.status_code == 201

        # Try to create same user via GraphQL
        mutation = """
        mutation {
            createUser(userInput: {
                email: "duplicate_graphql@example.com",
                password: "testpassword123",
                userType: FARMER
            }) {
                id
                email
            }
        }
        """

        response = await client.post("/graphql", json={"query": mutation})

        assert response.status_code == 200
        data = response.json()
        assert "errors" in data
        assert "Email already registered" in data["errors"][0]["message"]

    async def test_delete_user_mutation(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test deleting user via GraphQL mutation."""
        # Create a user and get auth token
        user_data = {
            "email": "to_delete@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }

        # Create user
        create_response = await client.post("/api/users/register", json=user_data)
        assert create_response.status_code == 201
        user_id = create_response.json()["id"]

        # Login to get token
        login_response = await client.post(
            "/api/users/login",
            json={"email": user_data["email"], "password": user_data["password"]},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Delete user via GraphQL
        mutation = f"""
        mutation {{
            deleteUser(id: "{user_id}", token: "{token}")
        }}
        """

        response = await client.post("/graphql", json={"query": mutation})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data
        assert data["data"]["deleteUser"] is True

    async def test_delete_user_unauthorized(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test deleting user without authentication."""
        # Create a user
        user_data = {
            "email": "unauthorized_delete@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }

        create_response = await client.post("/api/users/register", json=user_data)
        assert create_response.status_code == 201
        user_id = create_response.json()["id"]

        # Try to delete without valid token
        mutation = f"""
        mutation {{
            deleteUser(id: "{user_id}", token: "invalid_token")
        }}
        """

        response = await client.post("/graphql", json={"query": mutation})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data
        assert data["data"]["deleteUser"] is False


class TestUserGraphQLAuthentication:
    """Test authenticated GraphQL queries."""

    async def test_current_user_query(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test getting current user via GraphQL with token."""
        # Create and login user
        user_data = {
            "email": "current_user@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }

        # Create user
        create_response = await client.post("/api/users/register", json=user_data)
        assert create_response.status_code == 201

        # Login to get token
        login_response = await client.post(
            "/api/users/login",
            json={"email": user_data["email"], "password": user_data["password"]},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        # Get current user via GraphQL
        query = f"""
        query {{
            currentUser(token: "{token}") {{
                id
                email
                userType
                isActive
            }}
        }}
        """

        response = await client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data
        assert data["data"]["currentUser"]["email"] == user_data["email"]
        assert data["data"]["currentUser"]["userType"] == user_data["user_type"]

    async def test_current_user_invalid_token(self, client: AsyncClient):
        """Test getting current user with invalid token."""
        query = """
        query {
            currentUser(token: "invalid_token") {
                id
                email
            }
        }
        """

        response = await client.post("/graphql", json={"query": query})

        assert response.status_code == 200
        data = response.json()
        assert "errors" not in data
        assert data["data"]["currentUser"] is None

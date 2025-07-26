"""
Tests for Users REST API endpoints.
"""

from httpx import AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession


class TestUserRegistration:
    """Test user registration endpoints."""

    async def test_register_user_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test successful user registration."""
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }

        response = await client.post("/api/users/register", json=user_data)

        assert response.status_code == 201
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["user_type"] == user_data["user_type"]
        assert "id" in data
        assert "password" not in data  # Password should not be returned
        assert data["is_active"] is True
        assert data["is_verified"] is False

    async def test_register_user_duplicate_email(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test registration with duplicate email."""
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }

        # Register first user
        await client.post("/api/users/register", json=user_data)

        # Try to register with same email
        response = await client.post("/api/users/register", json=user_data)

        assert response.status_code == 400
        assert "Email already registered" in response.json()["detail"]

    async def test_register_user_invalid_email(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test registration with invalid email."""
        user_data = {
            "email": "invalid-email",
            "password": "testpassword123",
            "user_type": "FARMER",
        }

        response = await client.post("/api/users/register", json=user_data)

        assert response.status_code == 422

    async def test_register_user_short_password(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test registration with short password."""
        user_data = {
            "email": "test@example.com",
            "password": "123",
            "user_type": "FARMER",
        }

        response = await client.post("/api/users/register", json=user_data)

        assert response.status_code == 422


class TestUserLogin:
    """Test user login endpoints."""

    async def test_login_user_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test successful user login."""
        # Register user first
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }
        await client.post("/api/users/register", json=user_data)

        # Login
        login_data = {"email": "test@example.com", "password": "testpassword123"}
        response = await client.post("/api/users/login", json=login_data)

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"

    async def test_login_user_invalid_credentials(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test login with invalid credentials."""
        login_data = {"email": "test@example.com", "password": "wrongpassword"}
        response = await client.post("/api/users/login", json=login_data)

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]

    async def test_login_user_nonexistent(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test login with nonexistent user."""
        login_data = {"email": "nonexistent@example.com", "password": "testpassword123"}
        response = await client.post("/api/users/login", json=login_data)

        assert response.status_code == 401
        assert "Incorrect email or password" in response.json()["detail"]


class TestUserAuthentication:
    """Test user authentication endpoints."""

    async def test_get_current_user_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test getting current user with valid token."""
        # Register and login user
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }
        await client.post("/api/users/register", json=user_data)

        login_data = {"email": "test@example.com", "password": "testpassword123"}
        login_response = await client.post("/api/users/login", json=login_data)
        token = login_response.json()["access_token"]

        # Get current user
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.get("/api/users/me", headers=headers)

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == user_data["email"]
        assert data["user_type"] == user_data["user_type"]

    async def test_get_current_user_invalid_token(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test getting current user with invalid token."""
        headers = {"Authorization": "Bearer invalid_token"}
        response = await client.get("/api/users/me", headers=headers)

        assert response.status_code == 401
        assert "Could not validate credentials" in response.json()["detail"]

    async def test_get_current_user_no_token(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test getting current user without token."""
        response = await client.get("/api/users/me")

        assert response.status_code == 401


class TestUserCRUD:
    """Test user CRUD operations."""

    async def test_get_users_list(self, client: AsyncClient, db_session: AsyncSession):
        """Test getting list of users."""
        # Register a few users
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
            await client.post("/api/users/register", json=user_data)

        response = await client.get("/api/users/")

        assert response.status_code == 200
        data = response.json()
        assert len(data) >= 2
        assert all("id" in user for user in data)
        assert all("email" in user for user in data)

    async def test_get_user_by_id_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test getting user by ID."""
        # Register user
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }
        register_response = await client.post("/api/users/register", json=user_data)
        user_id = register_response.json()["id"]

        # Get user by ID
        response = await client.get(f"/api/users/{user_id}")

        assert response.status_code == 200
        data = response.json()
        assert data["id"] == user_id
        assert data["email"] == user_data["email"]

    async def test_get_user_by_id_not_found(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test getting user by non-existent ID."""
        import uuid

        fake_id = str(uuid.uuid4())

        response = await client.get(f"/api/users/{fake_id}")

        assert response.status_code == 404
        assert "User not found" in response.json()["detail"]

    async def test_get_user_by_id_invalid_format(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test getting user by invalid ID format."""
        response = await client.get("/api/users/invalid-id")

        assert response.status_code == 400
        assert "Invalid user ID format" in response.json()["detail"]

    async def test_update_user_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test updating user information."""
        # Register and login user
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }
        register_response = await client.post("/api/users/register", json=user_data)
        user_id = register_response.json()["id"]

        login_data = {"email": "test@example.com", "password": "testpassword123"}
        login_response = await client.post("/api/users/login", json=login_data)
        token = login_response.json()["access_token"]

        # Update user
        update_data = {
            "email": "updated@example.com",
            "password": "newpassword123",
            "user_type": "BUYER",
        }
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.put(
            f"/api/users/{user_id}", json=update_data, headers=headers
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == update_data["email"]
        assert data["user_type"] == update_data["user_type"]

    async def test_update_user_unauthorized(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test updating user without authentication."""
        # Register user
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }
        register_response = await client.post("/api/users/register", json=user_data)
        user_id = register_response.json()["id"]

        # Try to update without token
        update_data = {
            "email": "updated@example.com",
            "password": "newpassword123",
            "user_type": "BUYER",
        }
        response = await client.put(f"/api/users/{user_id}", json=update_data)

        assert response.status_code == 401

    async def test_delete_user_success(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test deleting user."""
        # Register and login user
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }
        register_response = await client.post("/api/users/register", json=user_data)
        user_id = register_response.json()["id"]

        login_data = {"email": "test@example.com", "password": "testpassword123"}
        login_response = await client.post("/api/users/login", json=login_data)
        token = login_response.json()["access_token"]

        # Delete user
        headers = {"Authorization": f"Bearer {token}"}
        response = await client.delete(f"/api/users/{user_id}", headers=headers)

        assert response.status_code == 204

        # Verify user is deleted
        get_response = await client.get(f"/api/users/{user_id}")
        assert get_response.status_code == 404

    async def test_delete_user_unauthorized(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test deleting user without authentication."""
        # Register user
        user_data = {
            "email": "test@example.com",
            "password": "testpassword123",
            "user_type": "FARMER",
        }
        register_response = await client.post("/api/users/register", json=user_data)
        user_id = register_response.json()["id"]

        # Try to delete without token
        response = await client.delete(f"/api/users/{user_id}")

        assert response.status_code == 401


class TestUserPagination:
    """Test user list pagination."""

    async def test_get_users_with_pagination(
        self, client: AsyncClient, db_session: AsyncSession
    ):
        """Test getting users with pagination parameters."""
        # Register multiple users
        for i in range(5):
            user_data = {
                "email": f"user{i}@example.com",
                "password": "password123",
                "user_type": "FARMER",
            }
            await client.post("/api/users/register", json=user_data)

        # Test with limit
        response = await client.get("/api/users/?limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 2

        # Test with skip
        response = await client.get("/api/users/?skip=2&limit=2")
        assert response.status_code == 200
        data = response.json()
        assert len(data) <= 2

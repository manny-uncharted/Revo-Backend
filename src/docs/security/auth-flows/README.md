# 🔐 Authentication Flow Documentation

This document explains the authentication mechanism used by the **Revolutionary Farmers** API.

## ✅ Overview

The API uses **JSON Web Tokens (JWT)** for authentication. Users authenticate by sending their credentials to the `/auth/login` endpoint. If valid, the server responds with a JWT access token. This token must be included in all subsequent requests to protected routes.

---

## 📥 Login Flow

1. **User submits credentials** to the `POST /auth/login` endpoint.
2. **Backend validates credentials** via `authService.login()`.
3. If valid, the backend **signs a JWT** containing user ID and username.
4. The server returns:
   ```json
   {
     "user": {
       "id": 1,
       "username": "john_doe",
       ...
     },
     "accessToken": "<JWT_TOKEN>"
   }
   ```
5. The client must store this token securely and include it in the `Authorization` header:
   ```http
   Authorization: Bearer <JWT_TOKEN>
   ```

---

## 📤 Token Usage

Clients must send the JWT in the header for protected routes:
```http
GET /auth/profile
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Protected routes are guarded using NestJS `JwtAuthGuard`. If the token is missing, expired, or invalid:
- `401 Unauthorized` is returned.

---

## ⏳ Token Expiration

- Token expiration is configured at the `JwtModule` level (default assumed to be 1 hour unless overridden)
- There is **no refresh token** mechanism currently implemented.

---

## 📊 Diagram (Coming Soon)

You can add a visual representation of the login flow here:
- `client` → `POST /auth/login` → `server validates` → `returns JWT`
- `client` → `GET /protected` → `includes token in header` → `server authorizes`

> Diagram will be added as `login-flow.png` or `login-flow.svg` in this folder.

---
  
For more details, see: [OAuth 2.0](https://oauth.net/2/) | [OWASP API Security](https://owasp.org/www-project-api-security/) | [Swagger Auth](https://swagger.io/docs/specification/authentication/)

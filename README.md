# Revo Backend

A secure NestJS backend application with robust environment and configuration management.

## Secure Environment and Configuration Management

This project implements a secure environment and configuration management system with the following features:

- Secret management using Docker secrets and HashiCorp Vault
- Environment-specific configurations
- Automatic credential rotation
- SSL/TLS configuration
- Security auditing

## Getting Started

### Prerequisites

- Node.js (v18+)
- Docker and Docker Compose
- PowerShell Core (for Windows)

### Setting Up

1. Clone the repository:

   ```bash
   git clone <repository-url>
   cd Revo-Backend
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

3. Generate initial secrets:

   ```bash
   # On Windows
   powershell -ExecutionPolicy Bypass -File rotate-secrets.ps1

   # On Linux/MacOS
   chmod +x config/docker/security/rotate-secrets.sh
   ./config/docker/security/rotate-secrets.sh
   ```

4. Start the application:

   ```bash
   # Development
   docker-compose -f config/docker/docker-compose.yml up -d

   # Production
   NODE_ENV=prod docker-compose -f config/docker/docker-compose.yml up -d
   ```

### Security Features

- **Secret Management**: Credentials are stored securely using Docker secrets and Vault
- **Environment Config**: Different configs for development and production
- **Credential Rotation**: Automatic rotation of credentials
- **TLS/SSL**: Secure communication with SSL/TLS
- **Audit Logging**: Comprehensive audit logging

### Directory Structure

```
config/docker/
├── secrets/           # Docker secrets storage
├── env/              # Environment-specific configurations
│   ├── dev/         # Development environment
│   └── prod/        # Production environment
└── security/        # Security configurations and scripts
```

### Credential Rotation

To rotate credentials manually:

```bash
# On Windows
powershell -ExecutionPolicy Bypass -File rotate-secrets.ps1

# On Linux/MacOS
./config/docker/security/rotate-secrets.sh
```

### SSL/TLS Configuration

SSL certificates are automatically generated during setup and can be rotated as needed. Production environments should use proper certificates from a certificate authority.

## Development

For local development without Docker:

1. Create a local .env file:

   ```bash
   cp .env.example .env
   ```

2. Start the development server:
   ```bash
   npm run start:dev
   ```

## Documentation

For more detailed information, see:

- [Security Configuration](config/docker/README.md)
- [API Documentation](http://localhost:3000/docs) (available when server is running)

#!/bin/bash

# Exit on error
set -e

# Configuration
SECRETS_DIR="./secrets"
VAULT_ADDR="http://localhost:8200"
VAULT_TOKEN="${VAULT_TOKEN}"

# Function to generate random string
generate_random_string() {
    local length=$1
    openssl rand -base64 $((length * 3/4)) | tr -d '/+=' | head -c $length
}

# Function to rotate database password
rotate_db_password() {
    local new_password=$(generate_random_string 32)
    echo "$new_password" > "$SECRETS_DIR/db_password.txt"
    
    # Update Vault
    curl -X POST \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"value\": \"$new_password\"}" \
        "$VAULT_ADDR/v1/secret/database/password"
}

# Function to rotate JWT secret
rotate_jwt_secret() {
    local new_secret=$(generate_random_string 64)
    echo "$new_secret" > "$SECRETS_DIR/jwt_secret.txt"
    
    # Update Vault
    curl -X POST \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d "{\"value\": \"$new_secret\"}" \
        "$VAULT_ADDR/v1/secret/jwt/secret"
}

# Function to rotate SSL certificates
rotate_ssl_certificates() {
    # Generate new private key
    openssl genrsa -out "$SECRETS_DIR/ssl_key.pem" 4096
    
    # Generate new certificate
    openssl req -x509 -new -nodes \
        -key "$SECRETS_DIR/ssl_key.pem" \
        -sha256 -days 365 \
        -out "$SECRETS_DIR/ssl_cert.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    
    # Update Vault
    curl -X POST \
        -H "X-Vault-Token: $VAULT_TOKEN" \
        -H "Content-Type: application/json" \
        -d @- "$VAULT_ADDR/v1/secret/ssl/cert" << EOF
{
    "key": "$(cat $SECRETS_DIR/ssl_key.pem | base64)",
    "cert": "$(cat $SECRETS_DIR/ssl_cert.pem | base64)"
}
EOF
}

# Function to rotate Vault token
rotate_vault_token() {
    local new_token=$(generate_random_string 64)
    echo "$new_token" > "$SECRETS_DIR/vault_token.txt"
    
    # Update environment variables
    sed -i "s/VAULT_TOKEN=.*/VAULT_TOKEN=$new_token/" ./env/*/.env
}

# Main rotation function
rotate_secrets() {
    echo "Starting secret rotation..."
    
    # Create secrets directory if it doesn't exist
    mkdir -p "$SECRETS_DIR"
    
    # Rotate all secrets
    rotate_db_password
    rotate_jwt_secret
    rotate_ssl_certificates
    rotate_vault_token
    
    echo "Secret rotation completed successfully!"
}

# Execute rotation
rotate_secrets 
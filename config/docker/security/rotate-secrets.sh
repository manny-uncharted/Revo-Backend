#!/bin/bash

# Exit on error
set -e

# Configuration
# Make path relative to script location
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
SECRETS_DIR="$SCRIPT_DIR/../../secrets"
VAULT_ADDR="http://localhost:8200"
VAULT_TOKEN="${VAULT_TOKEN}"

# Function to generate random string
generate_random_string() {
    local length=$1
    openssl rand -base64 $((length * 3/4)) | tr -d '/+=' | head -c $length
}

# Function to save secret without newline
save_secret() {
    local file="$1"
    local content="$2"
    echo -n "$content" > "$file"
}
# Function to rotate database password
rotate_db_password() {
    local new_password=$(generate_random_string 32)
    save_secret "$SECRETS_DIR/db_password.txt" "$new_password"
    
    # Update Vault if available
    if [ -n "$VAULT_TOKEN" ] && [ -n "$VAULT_ADDR" ]; then
       # Send request to Vault and check for successful response
        response=$(curl -s -w "\n%{http_code}" -X POST \
            -H "X-Vault-Token: $VAULT_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"value\": \"$new_password\"}" \
            "$VAULT_ADDR/v1/secret/database/password")
        
        status_code=$(echo "$response" | tail -n1)
        response_body=$(echo "$response" | sed '$d')
        
        if [ "$status_code" -ne 200 ] && [ "$status_code" -ne 204 ]; then
            echo "Error updating Vault with database password: $response_body"
            return 1
        fi
    fi
}

# Function to rotate JWT secret
rotate_jwt_secret() {
    local new_secret=$(generate_random_string 64)
    save_secret "$SECRETS_DIR/jwt_secret.txt" "$new_secret"
    
    # Update Vault if available
    if [ -n "$VAULT_TOKEN" ] && [ -n "$VAULT_ADDR" ]; then
        curl -s -X POST \
            -H "X-Vault-Token: $VAULT_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"value\": \"$new_secret\"}" \
            "$VAULT_ADDR/v1/secret/jwt/secret" || true
    fi
}

# Function to rotate SSL certificates
rotate_ssl_certificates() {
    # Generate new private key
    openssl genrsa -out "$SECRETS_DIR/ssl_key.pem" 4096
    chmod 600 "$SECRETS_DIR/ssl_key.pem"
    
    # Generate new certificate
    openssl req -x509 -new -nodes \
        -key "$SECRETS_DIR/ssl_key.pem" \
        -sha256 -days 365 \
        -out "$SECRETS_DIR/ssl_cert.pem" \
        -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    
    # Update Vault if available
    if [ -n "$VAULT_TOKEN" ] && [ -n "$VAULT_ADDR" ]; then
 # Create temporary file for JSON payload
       # Create temporary file for JSON payload
       tmp_json=$(mktemp)
        key_b64=$(base64 -w 0 < "$SECRETS_DIR/ssl_key.pem")
        cert_b64=$(base64 -w 0 < "$SECRETS_DIR/ssl_cert.pem")
        
        cat > "$tmp_json" << EOF
{
    "key": "$key_b64",
    "cert": "$cert_b64"
}
EOF
        
       curl -s -X POST \
           -H "X-Vault-Token: $VAULT_TOKEN" \
            -H "Content-Type: application/json" \
           -d @"$tmp_json" \
           "$VAULT_ADDR/v1/secret/ssl/cert"
           
       rm "$tmp_json"

# Function to rotate Vault token
rotate_vault_token() {
    local new_token=$(generate_random_string 64)
    save_secret "$SECRETS_DIR/vault_token.txt" "$new_token"
    
    # Update environment variables
    if [ -d "./env" ]; then
        find ./env -type f -name ".env" -exec sed -i "s/VAULT_TOKEN=.*/VAULT_TOKEN=$new_token/" {} \;
    fi
}

# Main rotation function
rotate_secrets() {
    echo "Starting secret rotation..."
    
    # Create secrets directory if it doesn't exist
    mkdir -p "$SECRETS_DIR"
    chmod 700 "$SECRETS_DIR"
    
    # Rotate all secrets
    rotate_db_password
    rotate_jwt_secret
    rotate_ssl_certificates
    rotate_vault_token
    
    echo "Secret rotation completed successfully!"
}

# Execute rotation
rotate_secrets 
# PowerShell Secret Rotation Script

# Enable error handling
$ErrorActionPreference = "Stop"

# Configuration
$SECRETS_DIR = ".\secrets"
$VAULT_ADDR = "http://localhost:8200"
$VAULT_TOKEN = $env:VAULT_TOKEN

# Function to generate random string
function Generate-RandomString {
    param (
        [int]$Length
    )
    try {
        $bytes = New-Object byte[] $Length
        [System.Security.Cryptography.RNGCryptoServiceProvider]::Create().GetBytes($bytes)
        return [Convert]::ToBase64String($bytes).Substring(0, $Length)
    }
    catch {
        Write-Error "Failed to generate random string: $_"
        throw
    }
}

# Function to rotate database password
function Rotate-DbPassword {
    try {
        Write-Host "Rotating database password..."
        $newPassword = Generate-RandomString 32
        Set-Content -Path "$SECRETS_DIR\db_password.txt" -Value $newPassword -Force
        
        # Update Vault
        $body = @{
            value = $newPassword
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$VAULT_ADDR/v1/secret/database/password" `
            -Method Post `
            -Headers @{"X-Vault-Token" = $VAULT_TOKEN} `
            -ContentType "application/json" `
            -Body $body
        Write-Host "Database password rotated successfully"
    }
    catch {
        Write-Error "Failed to rotate database password: $_"
        throw
    }
}

# Function to rotate JWT secret
function Rotate-JwtSecret {
    try {
        Write-Host "Rotating JWT secret..."
        $newSecret = Generate-RandomString 64
        Set-Content -Path "$SECRETS_DIR\jwt_secret.txt" -Value $newSecret -Force
        
        # Update Vault
        $body = @{
            value = $newSecret
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$VAULT_ADDR/v1/secret/jwt/secret" `
            -Method Post `
            -Headers @{"X-Vault-Token" = $VAULT_TOKEN} `
            -ContentType "application/json" `
            -Body $body
        Write-Host "JWT secret rotated successfully"
    }
    catch {
        Write-Error "Failed to rotate JWT secret: $_"
        throw
    }
}

# Function to rotate SSL certificates
function Rotate-SslCertificates {
    try {
        Write-Host "Rotating SSL certificates..."
        # Generate new private key
        $key = New-Object System.Security.Cryptography.RSACryptoServiceProvider(4096)
        $key.ExportCspBlob($true) | Set-Content "$SECRETS_DIR\ssl_key.pem" -Force
        
        # Generate new certificate
        $cert = New-SelfSignedCertificate -DnsName "localhost" `
            -CertStoreLocation "cert:\LocalMachine\My" `
            -KeyLength 4096 `
            -KeyAlgorithm RSA `
            -HashAlgorithm SHA256 `
            -NotAfter (Get-Date).AddDays(365)
        
        # Export certificate
        $cert | Export-Certificate -FilePath "$SECRETS_DIR\ssl_cert.pem" -Force
        
        # Update Vault
        $keyContent = Get-Content "$SECRETS_DIR\ssl_key.pem" -Raw | ConvertTo-Base64
        $certContent = Get-Content "$SECRETS_DIR\ssl_cert.pem" -Raw | ConvertTo-Base64
        
        $body = @{
            key = $keyContent
            cert = $certContent
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$VAULT_ADDR/v1/secret/ssl/cert" `
            -Method Post `
            -Headers @{"X-Vault-Token" = $VAULT_TOKEN} `
            -ContentType "application/json" `
            -Body $body
        Write-Host "SSL certificates rotated successfully"
    }
    catch {
        Write-Error "Failed to rotate SSL certificates: $_"
        throw
    }
}

# Function to rotate Vault token
function Rotate-VaultToken {
    try {
        Write-Host "Rotating Vault token..."
        $newToken = Generate-RandomString 64
        Set-Content -Path "$SECRETS_DIR\vault_token.txt" -Value $newToken -Force
        
        # Update environment variables
        Get-ChildItem -Path ".\env" -Recurse -Filter ".env" | ForEach-Object {
            $content = Get-Content $_.FullName
            $content = $content -replace "VAULT_TOKEN=.*", "VAULT_TOKEN=$newToken"
            Set-Content -Path $_.FullName -Value $content -Force
        }
        Write-Host "Vault token rotated successfully"
    }
    catch {
        Write-Error "Failed to rotate Vault token: $_"
        throw
    }
}

# Main rotation function
function Rotate-Secrets {
    try {
        Write-Host "Starting secret rotation..."
        
        # Create secrets directory if it doesn't exist
        if (-not (Test-Path $SECRETS_DIR)) {
            New-Item -ItemType Directory -Path $SECRETS_DIR -Force | Out-Null
            Write-Host "Created secrets directory"
        }
        
        # Rotate all secrets
        Rotate-DbPassword
        Rotate-JwtSecret
        Rotate-SslCertificates
        Rotate-VaultToken
        
        Write-Host "Secret rotation completed successfully!"
    }
    catch {
        Write-Error "Secret rotation failed: $_"
        exit 1
    }
}

# Execute rotation
Rotate-Secrets 
# PowerShell Secret Rotation Script

# Enable error handling
$ErrorActionPreference = "Stop"

# Configuration
$SECRETS_DIR = Join-Path $PSScriptRoot "config\docker\secrets"
$VAULT_ADDR = "http://localhost:8200"
$VAULT_TOKEN = $env:VAULT_TOKEN

Write-Host "Starting secret rotation..."

# Function to save secret without newline
function Save-Secret {
    param (
        [string]$Path,
        [string]$Content
    )
    [System.IO.File]::WriteAllText($Path, $Content)
}

# Create secrets directory if it doesn't exist
if (-not (Test-Path $SECRETS_DIR)) {
    New-Item -ItemType Directory -Path $SECRETS_DIR -Force | Out-Null
    Write-Host "Created secrets directory at: $SECRETS_DIR"
}

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

# Generate initial secrets without Vault (we'll add Vault later)
try {
    Write-Host "Generating initial secrets..."
    
    # Database password
    $dbPassword = Generate-RandomString 32
    $dbPasswordPath = Join-Path $SECRETS_DIR "db_password.txt"
    Save-Secret -Path $dbPasswordPath -Content $dbPassword
    Write-Host "Generated database password"
    
    # JWT secret
    $jwtSecret = Generate-RandomString 64
    $jwtSecretPath = Join-Path $SECRETS_DIR "jwt_secret.txt"
    Save-Secret -Path $jwtSecretPath -Content $jwtSecret
    Write-Host "Generated JWT secret"
    
    # Generate SSL certificate
    Write-Host "Generating SSL certificate..."
    $cert = New-SelfSignedCertificate -DnsName "localhost" `
        -CertStoreLocation "cert:\CurrentUser\My" `
        -KeyLength 4096 `
        -KeyAlgorithm RSA `
        -HashAlgorithm SHA256 `
        -NotAfter (Get-Date).AddDays(365)
    
    # Export certificate and private key
    $certPath = Join-Path $SECRETS_DIR "ssl_cert.pem"
    $keyPath = Join-Path $SECRETS_DIR "ssl_key.pem"
    
    Export-Certificate -Cert $cert -FilePath $certPath -Type CERT -Force
    
    # Export private key (this is a simplified version, in production you'd want to use proper PEM format)
    $certBytes = $cert.Export([System.Security.Cryptography.X509Certificates.X509ContentType]::Pfx)
    Save-Secret -Path $keyPath -Content ([Convert]::ToBase64String($certBytes))
    
    Write-Host "Generated SSL certificate and key"
    
    # Vault token (for future use)
    $vaultToken = Generate-RandomString 64
    $vaultTokenPath = Join-Path $SECRETS_DIR "vault_token.txt"
    Save-Secret -Path $vaultTokenPath -Content $vaultToken
    Write-Host "Generated Vault token"
    
    Write-Host "Secret generation completed successfully!"
    
    # List generated files
    Write-Host "`nGenerated files:"
    Get-ChildItem $SECRETS_DIR | ForEach-Object {
        Write-Host "- $($_.Name)"
    }
}
catch {
    Write-Error "Secret generation failed: $_"
    exit 1
} 
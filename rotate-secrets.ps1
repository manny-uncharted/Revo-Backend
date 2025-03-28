# PowerShell Secret Rotation Script

# Enable error handling
$ErrorActionPreference = "Stop"

# Configuration
$SECRETS_DIR = Join-Path $PSScriptRoot "config\docker\secrets"
$VAULT_ADDR = "http://localhost:8200"
$VAULT_TOKEN = $env:VAULT_TOKEN

Write-Host "Starting secret rotation..."

# Function to set restrictive permissions on secret files
function Set-RestrictivePermissions {
    param (
        [string]$Path
    )
    try {
        $acl = Get-Acl $Path
        $acl.SetAccessRuleProtection($true, $false)
        
        # Add current user with full control
        $identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
        $userRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            $identity.Name, 
            "FullControl",
            "None",
            "None",
            "Allow"
        )
        $acl.AddAccessRule($userRule)
        
        # Add SYSTEM with full control
        $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
            "NT AUTHORITY\SYSTEM",
            "FullControl",
            "None",
            "None",
            "Allow"
        )
        $acl.AddAccessRule($systemRule)
        
        Set-Acl -Path $Path -AclObject $acl
    }
    catch {
        Write-Error "Failed to set restrictive permissions: $_"
        throw
    }
}

# Function to securely overwrite and delete a file
function Remove-SecurelyWithOverwrite {
    param (
        [string]$Path
    )
    if (Test-Path $Path) {
        try {
            # Use a fixed size of 4KB for secure overwrite
            $buffer = New-Object byte[] 4096
            $rng = [System.Security.Cryptography.RNGCryptoServiceProvider]::Create()
            $rng.GetBytes($buffer)
            
            # Overwrite file 3 times with random data
            for ($i = 0; $i -lt 3; $i++) {
                [System.IO.File]::WriteAllBytes($Path, $buffer)
                [System.IO.File]::Flush($true)
            }
            
            Remove-Item $Path -Force
        }
        catch {
            Write-Error "Failed to securely delete file: $_"
            throw
        }
        finally {
            if ($rng) { $rng.Dispose() }
        }
    }
}

# Function to save secret without newline
function Save-Secret {
    param (
        [string]$Path,
        [string]$Content
    )
    try {
        [System.IO.File]::WriteAllText($Path, $Content)
        Set-RestrictivePermissions -Path $Path
    }
    catch {
        Write-Error "Failed to save secret: $_"
        throw
    }
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

# Create secrets directory if it doesn't exist
if (-not (Test-Path $SECRETS_DIR)) {
    New-Item -ItemType Directory -Path $SECRETS_DIR -Force | Out-Null
    Write-Host "Created secrets directory at: $SECRETS_DIR"
}

function Rotate-DbPassword {
    try {
        Write-Host "Rotating database password..."
        $dbPasswordPath = "$SECRETS_DIR\db_password.txt"
        
        # Securely delete old password file if it exists
        Remove-SecurelyWithOverwrite -Path $dbPasswordPath
        
        # Generate and save new password
        $newPassword = Generate-RandomString 32
        Save-Secret -Path $dbPasswordPath -Content $newPassword
        
        # Update Vault
        $body = @{
            value = $newPassword
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$VAULT_ADDR/v1/secret/db/password" `
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

function Rotate-JwtSecret {
    try {
        Write-Host "Rotating JWT secret..."
        $jwtSecretPath = "$SECRETS_DIR\jwt_secret.txt"
        
        # Securely delete old JWT secret if it exists
        Remove-SecurelyWithOverwrite -Path $jwtSecretPath
        
        # Generate and save new JWT secret
        $newSecret = Generate-RandomString 64
        Save-Secret -Path $jwtSecretPath -Content $newSecret
        
        # Update Vault
        $body = @{
            value = $newSecret
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$VAULT_ADDR/v1/secret/jwt" `
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

function Rotate-VaultToken {
    try {
        Write-Host "Rotating Vault token..."
        $vaultTokenPath = "$SECRETS_DIR\vault_token.txt"
        
        # Securely delete old token if it exists
        Remove-SecurelyWithOverwrite -Path $vaultTokenPath
        
        # Generate and save new token
        $newToken = Generate-RandomString 64
        Save-Secret -Path $vaultTokenPath -Content $newToken
        
        # Update Vault token
        # Note: This requires appropriate Vault policies and permissions
        $body = @{
            id = $newToken
            policies = @("admin")  # Adjust policies as needed
            ttl = "0"  # Non-expiring token, adjust as needed
        } | ConvertTo-Json
        
        Invoke-RestMethod -Uri "$VAULT_ADDR/v1/auth/token/create" `
            -Method Post `
            -Headers @{"X-Vault-Token" = $VAULT_TOKEN} `
            -ContentType "application/json" `
            -Body $body
            
        Write-Host "Vault token rotated successfully"
    }
    catch {
        Write-Error "Failed to rotate Vault token: $_"
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

# Add warning about Vault manual rollback requirement
Write-Host @"

IMPORTANT NOTE: 
If secret rotation fails after Vault updates but before local file updates are complete,
manual intervention may be required to roll back Vault secrets to maintain consistency.
Please refer to the documentation for manual rollback procedures in such cases.

"@

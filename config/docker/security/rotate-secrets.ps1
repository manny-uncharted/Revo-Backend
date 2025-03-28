# PowerShell Secret Rotation Script

# Enable error handling
$ErrorActionPreference = "Stop"

# Configuration
$SECRETS_DIR = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "secrets"
$VAULT_ADDR = "http://localhost:8200"
$VAULT_TOKEN = $env:VAULT_TOKEN

Write-Host "Starting secret rotation..."

# Create secrets directory if it doesn't exist
if (-not (Test-Path $SECRETS_DIR)) {
    New-Item -ItemType Directory -Path $SECRETS_DIR -Force | Out-Null
    Write-Host "Created secrets directory at: $SECRETS_DIR"
}

# Function to generate random string

function Save-Secret {
    param (
        [string]$Path,
        [string]$Content
    )
    [System.IO.File]::WriteAllText($Path, $Content)
}

function Generate-RandomString {
    param (
        [Parameter(Mandatory = $true)]
        [int]$Length,
        
        [Parameter(Mandatory = $false)]
        [ValidateSet("Alphanumeric", "Base64", "Hex")]
        [string]$CharacterSet = "Base64"
    )
    try {
        # Calculate byte length needed based on encoding
        $byteLength = switch ($CharacterSet) {
            "Alphanumeric" { $Length }
            "Base64" { [Math]::Ceiling($Length * 0.75) } # Base64 encodes 3 bytes to 4 chars
            "Hex" { [Math]::Ceiling($Length / 2) }
            default { $Length }
        }
        
        # Generate random bytes
        $bytes = New-Object byte[] $byteLength
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        $rng.GetBytes($bytes)
        
        # Convert to requested format
        $result = switch ($CharacterSet) {
            "Alphanumeric" {
                $chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
                $result = ""
                 for ($i = 0; $i -lt $Length; $i++) {
                     $result += $chars[$bytes[$i] % $chars.Length]
                }
                $result
            }
            "Base64" { [Convert]::ToBase64String($bytes) }
            "Hex" { [BitConverter]::ToString($bytes).Replace("-", "") }
            default { [Convert]::ToBase64String($bytes) }
        }
        
        # Ensure the string is exactly the requested length
        if ($result.Length -ge $Length) {
            return $result.Substring(0, $Length)
        } else {
            throw "Generated string length (${result.Length}) is less than requested length ($Length)"
        }
    }
    catch {
        Write-Error "Failed to generate random string: $_"
        throw
    }
}

# Check if OpenSSL is available
$opensslAvailable = $null -ne (Get-Command "openssl" -ErrorAction SilentlyContinue)


# Check if OpenSSL is available
#Initial secret generation will be handled by the Rotate-Secrets function

# Function to rotate JWT secret
function Rotate-JwtSecret {
    try {
        Write-Host "Rotating JWT secret..."
        $newSecret = Generate-RandomString 64
        Save-Secret -Path "$SECRETS_DIR\jwt_secret.txt" -Content $newSecret        
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
        # Use OpenSSL to generate proper PEM format key if available
         if ($opensslAvailable) {
           & openssl genrsa -out "$SECRETS_DIR\ssl_key.pem" 4096
         } else {
            # Fallback to .NET, but export in proper PEM format
             $key = New-Object System.Security.Cryptography.RSACryptoServiceProvider(4096)
             $privateKeyBytes = $key.ExportRSAPrivateKey()
             $pem = "-----BEGIN PRIVATE KEY-----`r`n"
             $pem += [Convert]::ToBase64String($privateKeyBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
             $pem += "`r`n-----END PRIVATE KEY-----"
             Set-Content -Path "$SECRETS_DIR\ssl_key.pem" -Value $pem -Force
              
             # Restrict permissions on the private key file
             $acl = Get-Acl "$SECRETS_DIR\ssl_key.pem"
             $acl.SetAccessRuleProtection($true, $false)
             $adminRule = New-Object System.Security.AccessControl.FileSystemAccessRule("Administrators", "FullControl", "Allow")
             $systemRule = New-Object System.Security.AccessControl.FileSystemAccessRule("SYSTEM", "FullControl", "Allow")
             $currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
             $userRule = New-Object System.Security.AccessControl.FileSystemAccessRule($currentUser, "FullControl", "Allow")
             $acl.AddAccessRule($adminRule)
             $acl.AddAccessRule($systemRule)
             $acl.AddAccessRule($userRule)
             Set-Acl "$SECRETS_DIR\ssl_key.pem" $acl
         }
        
        # Generate new certificate
        $cert = New-SelfSignedCertificate -DnsName "localhost" `
              -CertStoreLocation "cert:\CurrentUser\My" `
            -KeyLength 4096 `
            -KeyAlgorithm RSA `
            -HashAlgorithm SHA256 `
            -NotAfter (Get-Date).AddDays(365)
        
        # Export certificate
         # Export certificate in PEM format
         if ($opensslAvailable) {
             $tempCertPath = Join-Path $env:TEMP "temp_cert.cer"
             $cert | Export-Certificate -FilePath $tempCertPath -Type CERT -Force
             & openssl x509 -inform DER -in $tempCertPath -out "$SECRETS_DIR\ssl_cert.pem" 
             Remove-Item -Path $tempCertPath -Force
         } else {
             $tempCertPath = Join-Path $env:TEMP "temp_cert.cer"
             $cert | Export-Certificate -FilePath $tempCertPath -Type CERT -Force
             $certBytes = Get-Content -Path $tempCertPath -Encoding Byte
             $certBase64 = [Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
             $pemCert = "-----BEGIN CERTIFICATE-----`r`n$certBase64`r`n-----END CERTIFICATE-----"
             Set-Content -Path "$SECRETS_DIR\ssl_cert.pem" -Value $pemCert -Force
             Remove-Item -Path $tempCertPath -Force
         }
        
        # Update Vault
        $keyContent = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content "$SECRETS_DIR\ssl_key.pem" -Raw)))
        $certContent = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Content "$SECRETS_DIR\ssl_cert.pem" -Raw)))
        
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
     Get-ChildItem -Path (Join-Path (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))) "env") -Recurse -Filter ".env" | ForEach-Object {
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

# Function to rotate DB password
function Rotate-DbPassword {
    try {
        Write-Host "Rotating database password..."
        $newPassword = Generate-RandomString 32
        Set-Content -Path "$SECRETS_DIR\db_password.txt" -Value $newPassword -Force
                
# Function to save secret without newline
        
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

# # Main rotation function
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
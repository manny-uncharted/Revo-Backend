# PowerShell Secret Rotation Script

# Enable error handling
$ErrorActionPreference = "Stop"

# Configuration
$SECRETS_DIR = Join-Path (Split-Path -Parent (Split-Path -Parent $PSScriptRoot)) "secrets"
$VAULT_ADDR="https://localhost:8200"
$VAULT_TOKEN = $env:VAULT_TOKEN

Write-Host "Starting secret rotation..."

    # Create backup of existing secrets
    $backupDir = Join-Path $env:TEMP "secrets_backup_$(Get-Date -Format 'yyyyMMdd_HHmmss')"
    if (Test-Path $SECRETS_DIR) {
        New-Item -ItemType Directory -Path $backupDir -Force | Out-Null
        Copy-Item -Path "$SECRETS_DIR\*" -Destination $backupDir -Recurse -Force -ErrorAction SilentlyContinue
        Write-Host "Created backup of existing secrets at $backupDir"
    }

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


# Function to rotate JWT secret
function Rotate-JwtSecret {
    try {
        Write-Host "Rotating JWT secret..."
        $newSecret = $null
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
        $newToken = $null
        $newToken = Generate-RandomString 64
        Set-Content -Path "$SECRETS_DIR\vault_token.txt" -Value $newToken -Force
        
        # Update environment variables
      $envPath = Join-Path (Split-Path -Parent (Split-Path -Parent (Split-Path -Parent $PSScriptRoot))) "env"
      if (Test-Path $envPath) {
          Get-ChildItem -Path $envPath -Recurse -Filter ".env" | ForEach-Object {
              try {
                  $filePath = $_.FullName
                  $backupPath = "$filePath.bak"
                  
                  # Create backup first
                  Copy-Item -Path $filePath -Destination $backupPath -Force
                  
                  $content = Get-Content $filePath
                  $content = $content -replace "VAULT_TOKEN=.*", "VAULT_TOKEN=$newToken"
                  Set-Content -Path $filePath -Value $content -Force
                  
                  # Remove backup after successful update
                   Remove-Item -Path $backupPath -Force
              } catch {
                  Write-Error "Failed to update environment file $($_.FullName): $_"
                 
                  # Try to restore from backup if it exists
                  if (Test-Path $backupPath) {
                      Write-Warning "Restoring from backup..."
                      Copy-Item -Path $backupPath -Destination $filePath -Force
                      Remove-Item -Path $backupPath -Force
                  }
                  
                  throw
              }
          }
     } else {
          Write-Warning "Environment directory not found at $envPath"
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
        Save-Secret -Path "$SECRETS_DIR\db_password.txt" -Content $newPassword
                

        
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
         $rotationSuccess = $true
         $errorMessages = @()
         
         try { Rotate-DbPassword } catch { $rotationSuccess = $false; $errorMessages += "DB Password: $_" }
         try { Rotate-JwtSecret } catch { $rotationSuccess = $false; $errorMessages += "JWT Secret: $_" }
         try { Rotate-SslCertificates } catch { $rotationSuccess = $false; $errorMessages += "SSL Certificates: $_" }
         try { Rotate-VaultToken } catch { $rotationSuccess = $false; $errorMessages += "Vault Token: $_" }
         
         if (-not $rotationSuccess) {
             throw "One or more rotations failed: $($errorMessages -join '; ')"
         }


        Write-Host "Secret rotation completed successfully!"
        
         # Clean up backup on success
         if (Test-Path $backupDir) {
             Remove-Item -Path $backupDir -Recurse -Force
         }
    }
    catch {
        Write-Error "Secret rotation failed: $_"
        
         # Restore from backup
         if (Test-Path $backupDir) {
             Write-Host "Restoring secrets from backup..."
             if (Test-Path $SECRETS_DIR) {
                 Remove-Item -Path "$SECRETS_DIR\*" -Recurse -Force
             }
             Copy-Item -Path "$backupDir\*" -Destination $SECRETS_DIR -Recurse -Force
             Remove-Item -Path $backupDir -Recurse -Force
             Write-Host "Restored from backup"
         }

        exit 1
    }
}

# Execute rotation
Rotate-Secrets 
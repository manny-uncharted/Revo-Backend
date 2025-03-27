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
                for ($i = 0; $i -lt $Length; $i) {
                    $result = $chars[$bytes[$i] % $chars.Length]
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

# Generate initial secrets without Vault (we'll add Vault later)
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

# Check if OpenSSL is available
$opensslAvailable = $null -ne (Get-Command "openssl" -ErrorAction SilentlyContinue)

if ($opensslAvailable) {
    # Use OpenSSL for proper PEM format
    $certPath = Join-Path $SECRETS_DIR "ssl_cert.pem"
    $keyPath = Join-Path $SECRETS_DIR "ssl_key.pem"
    $csrPath = Join-Path $SECRETS_DIR "ssl_request.csr"
    $configPath = Join-Path $SECRETS_DIR "openssl.cnf"
   
   # Create OpenSSL config
    $opensslConfig = @"
[req]
default_bits = 4096
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
keyUsage = critical, digitalSignature, keyAgreement
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
"@
   
    Set-Content -Path $configPath -Value $opensslConfig
    
    # Generate private key and certificate
    & openssl genrsa -out $keyPath 4096
    & openssl req -new -key $keyPath -out $csrPath -config $configPath
    & openssl x509 -req -days 365 -in $csrPath -signkey $keyPath -out $certPath -extensions v3_req -extfile $configPath
    
    # Clean up temporary files
    Remove-Item -Path $csrPath -Force
    Remove-Item -Path $configPath -Force
} else {
    # Fallback to .NET methods but with proper export
    $cert = New-SelfSignedCertificate -DnsName "localhost" `
       -CertStoreLocation "cert:\CurrentUser\My" `
        -KeyLength 4096 `
        -KeyAlgorithm RSA `
        -HashAlgorithm SHA256 `
        -NotAfter (Get-Date).AddDays(365)
   
   $certPath = Join-Path $SECRETS_DIR "ssl_cert.pem"
   $keyPath = Join-Path $SECRETS_DIR "ssl_key.pem"
   $pfxPath = Join-Path $SECRETS_DIR "temp.pfx"
   
    # Generate a secure password for PFX export
   $pfxPassword = Generate-RandomString -Length 32
   $securePfxPassword = ConvertTo-SecureString -String $pfxPassword -Force -AsPlainText
    
   # Export to PFX with password
   Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePfxPassword -Force | Out-Null
   
   # Use certutil to convert to PEM format (available on Windows by default)
   & certutil -exportPFX -p $pfxPassword $pfxPath $certPath PEM | Out-Null
   
   # Clean up
  Remove-Item -Path $pfxPath -Force
  
   # Clean up certificate from store
   Remove-Item -Path "cert:\CurrentUser\My\$($cert.Thumbprint)" -Force
}

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

# Generate initial secrets without Vault (we'll add Vault later)
try {
    Write-Host "Generating initial secrets..."

    # Database password
    $dbPassword = Generate-RandomString 32
    $dbPasswordPath = Join-Path $SECRETS_DIR "db_password.txt"
    Set-Content -Path $dbPasswordPath -Value $dbPassword -Force
    Write-Host "Generated database password"

# JWT secret
    $jwtSecret = Generate-RandomString 64
    $jwtSecretPath = Join-Path $SECRETS_DIR "jwt_secret.txt"
    Set-Content -Path $jwtSecretPath -Value $jwtSecret -Force
    Write-Host "Generated JWT secret"

# Generate SSL certificate
Write-Host "Generating SSL certificate..."

# Check if OpenSSL is available
$opensslAvailable = $null -ne (Get-Command "openssl" -ErrorAction SilentlyContinue)

if ($opensslAvailable) {
    # Use OpenSSL for proper PEM format
    $certPath = Join-Path $SECRETS_DIR "ssl_cert.pem"
    $keyPath = Join-Path $SECRETS_DIR "ssl_key.pem"
    $csrPath = Join-Path $SECRETS_DIR "ssl_request.csr"
    $configPath = Join-Path $SECRETS_DIR "openssl.cnf"

 # Create OpenSSL config
 $opensslConfig = @"
[req]
default_bits = 4096
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no
[req_distinguished_name]
CN = localhost
[v3_req]
keyUsage = critical, digitalSignature, keyAgreement
extendedKeyUsage = serverAuth
subjectAltName = @alt_names
[alt_names]
DNS.1 = localhost
"@

    Set-Content -Path $configPath -Value $opensslConfig

    # Generate private key and certificate
    & openssl genrsa -out $keyPath 4096
    & openssl req -new -key $keyPath -out $csrPath -config $configPath
    & openssl x509 -req -days 365 -in $csrPath -signkey $keyPath -out $certPath -extensions v3_req -extfile $configPath

    # Clean up temporary files
    Remove-Item -Path $csrPath -Force
    Remove-Item -Path $configPath -Force
} else {
    # Fallback to .NET methods but with proper export
    $cert = New-SelfSignedCertificate -DnsName "localhost" `
        -CertStoreLocation "cert:\CurrentUser\My" `
        -KeyLength 4096 `
        -KeyAlgorithm RSA `
        -HashAlgorithm SHA256 `
        -NotAfter (Get-Date).AddDays(365)

    $certPath = Join-Path $SECRETS_DIR "ssl_cert.pem"
    $keyPath = Join-Path $SECRETS_DIR "ssl_key.pem"
    $pfxPath = Join-Path $SECRETS_DIR "temp.pfx"

    # Generate a secure password for PFX export
    $pfxPassword = Generate-RandomString -Length 32
    $securePfxPassword = ConvertTo-SecureString -String $pfxPassword -Force -AsPlainText

    # Export to PFX with password
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePfxPassword -Force | Out-Null

    # Use certutil to convert to PEM format (available on Windows by default)
    & certutil -exportPFX -p $pfxPassword $pfxPath $certPath PEM | Out-Null

    # Clean up
    Remove-Item -Path $pfxPath -Force

    # Clean up certificate from store
    Remove-Item -Path "cert:\CurrentUser\My\$($cert.Thumbprint)" -Force
}

Write-Host "Generated SSL certificate and key"

    # Vault token (for future use)
    $vaultToken = Generate-RandomString 64
    $vaultTokenPath = Join-Path $SECRETS_DIR "vault_token.txt"
    Set-Content -Path $vaultTokenPath -Value $vaultToken -Force
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



# Check if OpenSSL is available
$opensslAvailable = $null -ne (Get-Command "openssl" -ErrorAction SilentlyContinue)

if ($opensslAvailable) {
    # Use OpenSSL for proper PEM format
    $certPath = Join-Path $SECRETS_DIR "ssl_cert.pem"
    $keyPath = Join-Path $SECRETS_DIR "ssl_key.pem"
    $csrPath = Join-Path $SECRETS_DIR "ssl_request.csr"
    $configPath = Join-Path $SECRETS_DIR "openssl.cnf"
    
 # Create OpenSSL config
 $opensslConfig = @"
[req]
default_bits = 4096
default_md = sha256
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = localhost

[v3_req]
keyUsage = critical, digitalSignature, keyAgreement
extendedKeyUsage = serverAuth
subjectAltName = @alt_names

[alt_names]
DNS.1 = localhost
"@
    
    Set-Content -Path $configPath -Value $opensslConfig
    
    # Generate private key and certificate
    & openssl genrsa -out $keyPath 4096
    & openssl req -new -key $keyPath -out $csrPath -config $configPath
    & openssl x509 -req -days 365 -in $csrPath -signkey $keyPath -out $certPath -extensions v3_req -extfile $configPath
    
    # Clean up temporary files
    Remove-Item -Path $csrPath -Force
    Remove-Item -Path $configPath -Force
} else {
    # Fallback to .NET methods but with proper export
    $cert = New-SelfSignedCertificate -DnsName "localhost" `
        -CertStoreLocation "cert:\CurrentUser\My" `
        -KeyLength 4096 `
        -KeyAlgorithm RSA `
        -HashAlgorithm SHA256 `
        -NotAfter (Get-Date).AddDays(365)
    
    $certPath = Join-Path $SECRETS_DIR "ssl_cert.pem"
    $keyPath = Join-Path $SECRETS_DIR "ssl_key.pem"
    $pfxPath = Join-Path $SECRETS_DIR "temp.pfx"
    
    # Generate a secure password for PFX export
    $pfxPassword = Generate-RandomString -Length 32
    $securePfxPassword = ConvertTo-SecureString -String $pfxPassword -Force -AsPlainText
    
    # Export to PFX with password
    Export-PfxCertificate -Cert $cert -FilePath $pfxPath -Password $securePfxPassword -Force | Out-Null
    
    # Use certutil to convert to PEM format (available on Windows by default)
    & certutil -exportPFX -p $pfxPassword $pfxPath $certPath PEM | Out-Null
    
    # Clean up
    Remove-Item -Path $pfxPath -Force
    
    # Clean up certificate from store
    Remove-Item -Path "cert:\CurrentUser\My\$($cert.Thumbprint)" -Force
}

Write-Host "Generated SSL certificate and key"

    # Vault token (for future use)
    $vaultToken = Generate-RandomString 64
    $vaultTokenPath = Join-Path $SECRETS_DIR "vault_token.txt"
    Set-Content -Path $vaultTokenPath -Value $vaultToken -Force
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
        # Use OpenSSL to generate proper PEM format key if available
+        if ($opensslAvailable) {
+            & openssl genrsa -out "$SECRETS_DIR\ssl_key.pem" 4096
+        } else {
+            # Fallback to .NET, but export in proper PEM format
+            $key = New-Object System.Security.Cryptography.RSACryptoServiceProvider(4096)
+            $privateKeyBytes = $key.ExportRSAPrivateKey()
+            $pem = "-----BEGIN PRIVATE KEY-----`r`n"
+            $pem += [Convert]::ToBase64String($privateKeyBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
+            $pem += "`r`n-----END PRIVATE KEY-----"
+            Set-Content -Path "$SECRETS_DIR\ssl_key.pem" -Value $pem -Force
+        }
        
        # Generate new certificate
        $cert = New-SelfSignedCertificate -DnsName "localhost" `
              -CertStoreLocation "cert:\CurrentUser\My" `
            -KeyLength 4096 `
            -KeyAlgorithm RSA `
            -HashAlgorithm SHA256 `
            -NotAfter (Get-Date).AddDays(365)
        
        # Export certificate
         # Export certificate in PEM format
+        if ($opensslAvailable) {
+            $tempCertPath = Join-Path $env:TEMP "temp_cert.cer"
+            $cert | Export-Certificate -FilePath $tempCertPath -Type CERT -Force
+            & openssl x509 -inform DER -in $tempCertPath -out "$SECRETS_DIR\ssl_cert.pem" 
+            Remove-Item -Path $tempCertPath -Force
+        } else {
+            $tempCertPath = Join-Path $env:TEMP "temp_cert.cer"
+            $cert | Export-Certificate -FilePath $tempCertPath -Type CERT -Force
+            $certBytes = Get-Content -Path $tempCertPath -Encoding Byte
+            $certBase64 = [Convert]::ToBase64String($certBytes, [System.Base64FormattingOptions]::InsertLineBreaks)
+            $pemCert = "-----BEGIN CERTIFICATE-----`r`n$certBase64`r`n-----END CERTIFICATE-----"
+            Set-Content -Path "$SECRETS_DIR\ssl_cert.pem" -Value $pemCert -Force
+            Remove-Item -Path $tempCertPath -Force
+        }
        
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
function Save-Secret {
    param (
        [string]$Path,
        [string]$Content
    )
    [System.IO.File]::WriteAllText($Path, $Content)
}
        
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
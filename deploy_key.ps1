$ErrorActionPreference = "Stop"
try {
    Write-Host "Deploying SSH Key to 192.168.0.125..." -ForegroundColor Cyan
    $keyPath = "$env:USERPROFILE\.ssh\id_rsa.pub"
    if (-not (Test-Path $keyPath)) {
        throw "Public key not found at $keyPath"
    }
    $key = Get-Content $keyPath
    
    Write-Host "Connecting to 192.168.0.125... (Please enter password if prompted)" -ForegroundColor Yellow
    
    # Execute SSH command to append key
    ssh root@192.168.0.125 "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$key' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
    
    if ($?) {
        Write-Host "✅ Key deployed successfully!" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to deploy key." -ForegroundColor Red
    }
} catch {
    Write-Host "Error: $_" -ForegroundColor Red
}

Read-Host "Press Enter to exit"

# Script to start the backend server with proper error handling
Write-Host "`n🚀 Starting Backend Server...`n" -ForegroundColor Cyan

# Free port 5000 if in use
Write-Host "Checking port 5000..." -ForegroundColor Yellow
$connections = netstat -ano | Select-String ":5000.*LISTENING"
if ($connections) {
    Write-Host "Port 5000 is in use. Freeing it..." -ForegroundColor Yellow
    $connections | ForEach-Object {
        $line = $_.Line
        # Split on whitespace, remove empty pieces
        $pid = ($line -split '\s+')[-1]
        if ($pid -match '^\d+$') {
            $process = Get-Process -Id $pid -ErrorAction SilentlyContinue
            if ($process) {
                Write-Host "  Killing PID $pid ($($process.ProcessName))..." -ForegroundColor Gray
                taskkill /PID $pid /F | Out-Null
            }
        }
    }
    Start-Sleep -Seconds 2
    Write-Host "✓ Port 5000 is now free`n" -ForegroundColor Green
} else {
    Write-Host "✓ Port 5000 is free`n" -ForegroundColor Green
}

# Check for syntax errors
Write-Host "Checking for syntax errors..." -ForegroundColor Yellow
$errors = @()

$files = @("src\middleware\auth.js", "src\routes\professors.js", "src\routes\students.js", "src\server.js")
foreach ($file in $files) {
    if (Test-Path $file) {
        $result = node -c $file 2>&1
        if ($LASTEXITCODE -ne 0) {
            $errors += "$file has syntax errors"
            Write-Host "  ✗ $file has errors" -ForegroundColor Red
        } else {
            Write-Host "  ✓ $file is valid" -ForegroundColor Gray
        }
    }
}

if ($errors.Count -gt 0) {
    Write-Host "`n❌ Syntax errors found. Please fix them before starting the server.`n" -ForegroundColor Red
    exit 1
}

Write-Host "✓ All files are valid`n" -ForegroundColor Green

# Start the server
Write-Host "Starting server...`n" -ForegroundColor Cyan
npm run dev



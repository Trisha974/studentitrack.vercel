# PowerShell script to free a port
# Usage: .\scripts\free-port.ps1 [PORT]

param(
    [int]$Port = 5000
)

Write-Host "Checking for processes using port $Port..." -ForegroundColor Yellow

$portPattern = ':' + $Port + '.*LISTENING'
$connections = netstat -ano | Select-String $portPattern

if ($connections) {
    $portMsg = "Found processes using port $Port"
    Write-Host $portMsg -ForegroundColor Red
    $connections | ForEach-Object {
        $line = $_.Line
        $processId = ($line -split '\s+')[-1]
        if ($processId -match '^\d+$') {
            $proc = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($proc) {
                Write-Host "  PID: $processId - Process: $($proc.ProcessName)" -ForegroundColor Cyan
                Write-Host "  Killing process $processId..." -ForegroundColor Yellow
                taskkill /PID $processId /F | Out-Null
                Write-Host "  Process $processId terminated" -ForegroundColor Green
            }
        }
    }
    $freeMsg = "Port $Port should now be free!"
    Write-Host ""
    Write-Host $freeMsg -ForegroundColor Green
} else {
    $freeMsg = "Port $Port is already free!"
    Write-Host $freeMsg -ForegroundColor Green
}

# Free Ports Script - Run this before starting dev servers
Write-Host "
 Checking and freeing ports 5000, 5173, 5174...
" -ForegroundColor Cyan

# Function to kill process on a port
function Free-Port {
    param([int]$Port)
    $connections = netstat -ano | Select-String ":.*LISTENING"
    if ($connections) {
        $connections | ForEach-Object {
            $line = $_.Line
            $pid = ($line -split '\s+')[-1]
            if ($pid -match '^\d+$') {
                Write-Host "  Killing PID $pid on port ..." -ForegroundColor Yellow
                taskkill /PID $pid /F 2>&1 | Out-Null
            }
        }
        Write-Host "   Port  is now free" -ForegroundColor Green
    } else {
        Write-Host "   Port  is already free" -ForegroundColor Gray
    }
}

Free-Port 5000
Free-Port 5173
Free-Port 5174

Write-Host "
 Done! You can now start your dev servers.
" -ForegroundColor Green

# Quick Navigation Helper Script
# Usage: .\quick-nav.ps1 [server|client|root]

param(
    [Parameter(Position=0)]
    [ValidateSet('server', 'client', 'root')]
    [string]$Target = 'root'
)

$rootPath = Split-Path -Parent $PSScriptRoot

switch ($Target) {
    'server' {
        $targetPath = Join-Path $rootPath 'server'
        if (Test-Path $targetPath) {
            Set-Location $targetPath
            Write-Host "✅ Navigated to server directory" -ForegroundColor Green
            Write-Host "📁 Current: $(Get-Location)" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Server directory not found at: $targetPath" -ForegroundColor Red
        }
    }
    'client' {
        $targetPath = Join-Path $rootPath 'client'
        if (Test-Path $targetPath) {
            Set-Location $targetPath
            Write-Host "✅ Navigated to client directory" -ForegroundColor Green
            Write-Host "📁 Current: $(Get-Location)" -ForegroundColor Cyan
        } else {
            Write-Host "❌ Client directory not found at: $targetPath" -ForegroundColor Red
        }
    }
    'root' {
        Set-Location $rootPath
        Write-Host "✅ Navigated to root directory" -ForegroundColor Green
        Write-Host "📁 Current: $(Get-Location)" -ForegroundColor Cyan
    }
}

Write-Host "`n💡 Tip: Use '.\quick-nav.ps1 server' or '.\quick-nav.ps1 client' to navigate quickly" -ForegroundColor Yellow




$backupPath = Join-Path $PSScriptRoot "Prof.jsx.backup"
$targetPath = Join-Path $PSScriptRoot "Prof.jsx"

Write-Host "🔍 Monitoring Prof.jsx for changes..." -ForegroundColor Cyan
Write-Host "Backup: $backupPath" -ForegroundColor Gray
Write-Host "Target: $targetPath" -ForegroundColor Gray
Write-Host "Press Ctrl+C to stop`n" -ForegroundColor Yellow

while ($true) {
    if (Test-Path $targetPath) {
        $file = Get-Item $targetPath
        if ($file.Length -eq 0 -or $file.Length -lt 1000) {
            Write-Host "⚠️  Prof.jsx is empty or too small! Restoring..." -ForegroundColor Red
            if (Test-Path $backupPath) {
                Copy-Item -Path $backupPath -Destination $targetPath -Force
                Write-Host "✅ Prof.jsx restored from backup (Size: $((Get-Item $targetPath).Length) bytes)" -ForegroundColor Green
            } else {
                Write-Host "❌ Backup file not found at $backupPath" -ForegroundColor Red
            }
        }
    } else {
        Write-Host "⚠️  Prof.jsx not found! Restoring..." -ForegroundColor Red
        if (Test-Path $backupPath) {
            Copy-Item -Path $backupPath -Destination $targetPath -Force
            Write-Host "✅ Prof.jsx restored from backup" -ForegroundColor Green
        }
    }
    Start-Sleep -Seconds 5
}



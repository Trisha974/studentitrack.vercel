# PowerShell Script to Export MySQL Database
# Run this from project root: .\export-database.ps1

Write-Host "📦 Exporting Database..." -ForegroundColor Cyan
Write-Host ""

# Check if .env file exists in server directory
$envFile = "server\.env"
if (-not (Test-Path $envFile)) {
    Write-Host "❌ Error: server\.env file not found!" -ForegroundColor Red
    Write-Host "💡 Please create server\.env file with your database credentials" -ForegroundColor Yellow
    exit 1
}

# Read .env file (simple parsing)
$dbHost = "localhost"
$dbUser = "root"
$dbPassword = ""
$dbName = "student_itrack"

Get-Content $envFile | ForEach-Object {
    if ($_ -match "^DB_HOST=(.+)$") {
        $dbHost = $matches[1].Trim()
    }
    if ($_ -match "^DB_USER=(.+)$") {
        $dbUser = $matches[1].Trim()
    }
    if ($_ -match "^DB_PASSWORD=(.+)$") {
        $dbPassword = $matches[1].Trim()
    }
    if ($_ -match "^DB_NAME=(.+)$") {
        $dbName = $matches[1].Trim()
    }
}

Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "   Host: $dbHost"
Write-Host "   User: $dbUser"
Write-Host "   Database: $dbName"
Write-Host ""

# Output file
$date = Get-Date -Format "yyyy-MM-dd"
$outputFile = "database_export_$date.sql"

Write-Host "🔄 Exporting to: $outputFile" -ForegroundColor Cyan
Write-Host ""

# Try to find mysqldump
$mysqldumpPaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysqldump.exe",
    "C:\Program Files\MySQL\MySQL Server 8.1\bin\mysqldump.exe",
    "C:\xampp\mysql\bin\mysqldump.exe",
    "C:\wamp64\bin\mysql\mysql8.0.xx\bin\mysqldump.exe",
    "mysqldump.exe"  # If in PATH
)

$mysqldump = $null
foreach ($path in $mysqldumpPaths) {
    if (Test-Path $path) {
        $mysqldump = $path
        break
    }
    # Try if it's in PATH
    $which = Get-Command $path -ErrorAction SilentlyContinue
    if ($which) {
        $mysqldump = $path
        break
    }
}

if (-not $mysqldump) {
    Write-Host "❌ mysqldump not found!" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Please install MySQL client tools or use one of these methods:" -ForegroundColor Yellow
    Write-Host "   1. Install MySQL from: https://dev.mysql.com/downloads/installer/" -ForegroundColor White
    Write-Host "   2. Use XAMPP (includes MySQL): https://www.apachefriends.org/" -ForegroundColor White
    Write-Host "   3. Use MySQL Workbench to export" -ForegroundColor White
    Write-Host "   4. Use phpMyAdmin if installed locally" -ForegroundColor White
    Write-Host ""
    Write-Host "📖 See EXPORT_DATABASE.md for alternative methods" -ForegroundColor Cyan
    exit 1
}

Write-Host "✅ Found mysqldump: $mysqldump" -ForegroundColor Green
Write-Host ""

# Build command
if ($dbPassword) {
    $command = "& `"$mysqldump`" -h $dbHost -u $dbUser -p$dbPassword $dbName > `"$outputFile`""
} else {
    Write-Host "⚠️  No password set. You'll be prompted for password." -ForegroundColor Yellow
    $command = "& `"$mysqldump`" -h $dbHost -u $dbUser -p $dbName > `"$outputFile`""
}

# Execute
try {
    Invoke-Expression $command
    
    if (Test-Path $outputFile) {
        $fileSize = (Get-Item $outputFile).Length / 1KB
        Write-Host ""
        Write-Host "✅ Export completed successfully!" -ForegroundColor Green
        Write-Host ""
        Write-Host "📄 File: $outputFile" -ForegroundColor Cyan
        Write-Host "📊 Size: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "💡 Next steps:" -ForegroundColor Yellow
        Write-Host "   1. Upload this file to Hostinger" -ForegroundColor White
        Write-Host "   2. Import via phpMyAdmin" -ForegroundColor White
        Write-Host "   3. Or use: mysql -u user -p database < $outputFile" -ForegroundColor White
    } else {
        Write-Host ""
        Write-Host "❌ Export file was not created!" -ForegroundColor Red
        Write-Host "   Check if database exists and credentials are correct" -ForegroundColor Yellow
    }
} catch {
    Write-Host ""
    Write-Host "❌ Export failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Troubleshooting:" -ForegroundColor Yellow
    Write-Host "   - Check if MySQL server is running" -ForegroundColor White
    Write-Host "   - Verify database credentials in server\.env" -ForegroundColor White
    Write-Host "   - Make sure database '$dbName' exists" -ForegroundColor White
}


# PowerShell script to test notifications endpoint
# Usage: .\test-notifications.ps1

Write-Host "`n🧪 Testing GET /api/notifications?limit=50`n" -ForegroundColor Cyan

# Test 1: Without authentication (should return 401)
Write-Host "Test 1: Without authentication (expecting 401)" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/notifications?limit=50" -Method GET -ErrorAction Stop
    Write-Host "Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "Status: $($_.Exception.Response.StatusCode.value__)" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n" -ForegroundColor White

# Test 2: With authentication (replace YOUR_TOKEN with actual JWT)
Write-Host "Test 2: With authentication (replace YOUR_TOKEN with actual JWT)" -ForegroundColor Yellow
Write-Host "To get your token, check localStorage in browser: localStorage.getItem('auth_token')" -ForegroundColor Gray
Write-Host "`nExample command:" -ForegroundColor Gray
Write-Host '  $token = "YOUR_JWT_TOKEN_HERE"' -ForegroundColor White
Write-Host '  $headers = @{ "Authorization" = "Bearer $token" }' -ForegroundColor White
Write-Host '  Invoke-RestMethod -Uri "http://localhost:5000/api/notifications?limit=50" -Method GET -Headers $headers' -ForegroundColor White

Write-Host "`n✅ Server should be running on port 5000" -ForegroundColor Green
Write-Host "✅ Check backend console for detailed logs" -ForegroundColor Green


# How to Get Your JWT Token for Testing

## Method 1: Browser Console (Easiest)

1. Open your browser and go to `http://localhost:5173`
2. Open Developer Tools (F12)
3. Go to Console tab
4. Run this command:
   ```javascript
   localStorage.getItem('auth_token')
   ```
5. Copy the token that appears (it will be a long string)

## Method 2: Application Tab

1. Open Developer Tools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Expand "Local Storage" → `http://localhost:5173`
4. Find the key `auth_token`
5. Copy its value

## Method 3: Login and Check Network Tab

1. Login to your application
2. Open Network tab in Developer Tools
3. Look for any API request
4. Check the Request Headers
5. Find the `Authorization: Bearer <token>` header
6. Copy the token part

## Using the Token

Once you have the token, use it in PowerShell:

```powershell
$token = "PASTE_YOUR_TOKEN_HERE"
$headers = @{ "Authorization" = "Bearer $token" }
Invoke-RestMethod -Uri "http://localhost:5000/api/notifications?limit=50" -Method GET -Headers $headers
```

Expected result: Should return an array of notifications (empty array `[]` if no notifications exist)


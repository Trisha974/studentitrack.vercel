# Railway Application Failed to Respond - Troubleshooting Guide

## Quick Diagnosis Steps

### 1. Check Railway Deploy Logs

1. Go to Railway Dashboard → Your Service (`studentitrack1`)
2. Click **"Deploy Logs"** tab
3. Look for error messages, especially:
   - `❌ MySQL connection error`
   - `❌ Uncaught Exception`
   - `❌ Unhandled Rejection`
   - `❌ Server error`

### 2. Verify Environment Variables

Go to Railway Dashboard → Your Service → **Variables** tab and verify these are set:

#### Required Database Variables:
```
DB_HOST = ${{MySQL.MYSQLHOST}}
DB_USER = ${{MySQL.MYSQLUSER}}
DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}
DB_NAME = ${{MySQL.MYSQLDATABASE}}
```

**Important:** 
- Use exact syntax: `${{MySQL.VARIABLE_NAME}}` (with double curly braces)
- MySQL service must be in the same Railway project
- MySQL service must be running (green status)

#### Required Server Variables:
```
NODE_ENV = production
PORT = 5000
FRONTEND_URL = https://your-project.vercel.app
```

#### Required Firebase Variables:
```
FIREBASE_PROJECT_ID = studitrack-54f69
FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@studitrack-54f69.iam.gserviceaccount.com
```

### 3. Common Issues and Solutions

#### Issue: "Application failed to respond"

**Possible Causes:**

1. **Database Connection Failure**
   - **Symptom:** Logs show `❌ MySQL connection error: connect ECONNREFUSED ::1:3306`
   - **Solution:** 
     - Verify `DB_HOST` is set to `${{MySQL.MYSQLHOST}}` (not `localhost`)
     - Check MySQL service is running
     - Ensure MySQL service is in same project

2. **Server Not Binding to Correct Interface**
   - **Symptom:** Server starts but can't receive requests
   - **Solution:** ✅ Already fixed - server now listens on `0.0.0.0`

3. **Missing Environment Variables**
   - **Symptom:** Server crashes on startup
   - **Solution:** Add all required environment variables listed above

4. **Uncaught Exception/Unhandled Rejection**
   - **Symptom:** Logs show `❌ Uncaught Exception` or `❌ Unhandled Rejection`
   - **Solution:** Check the error message in logs for specific cause

5. **Port Already in Use**
   - **Symptom:** `❌ Port 5000 is already in use`
   - **Solution:** Railway handles this automatically, but if it persists, check Railway settings

### 4. Verify MySQL Service

1. In Railway Dashboard, check if MySQL service exists
2. MySQL service should show **green status** (running)
3. MySQL service must be in **same project** as your backend service

### 5. Test Database Connection

After setting variables, check logs for:
```
📊 Database Configuration:
   Host: mysql.railway.internal (or similar, NOT localhost)
   User: root
   Database: railway
✅ MySQL connected successfully
```

If you see `Host: localhost`, the `DB_HOST` variable is not set correctly.

### 6. Check Server Startup

Look for these messages in logs:
```
🚀 Server running on port 5000
📡 API available at http://0.0.0.0:5000/api
🌐 Environment: production
📊 Database: mysql.railway.internal
```

If these don't appear, the server is crashing before it can start.

### 7. Test Health Endpoint

Once server is running, test:
```
https://your-app.up.railway.app/api/health
```

Should return:
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

## Step-by-Step Fix

### Step 1: Verify MySQL Service
- [ ] MySQL service exists in Railway project
- [ ] MySQL service is running (green status)
- [ ] MySQL service is in same project as backend

### Step 2: Add Database Variables
- [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}`
- [ ] `DB_USER = ${{MySQL.MYSQLUSER}}`
- [ ] `DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}`
- [ ] `DB_NAME = ${{MySQL.MYSQLDATABASE}}`

### Step 3: Add Other Required Variables
- [ ] `NODE_ENV = production`
- [ ] `PORT = 5000`
- [ ] `FRONTEND_URL = https://your-project.vercel.app`
- [ ] `FIREBASE_PROJECT_ID = studitrack-54f69`
- [ ] `FIREBASE_PRIVATE_KEY = ...`
- [ ] `FIREBASE_CLIENT_EMAIL = ...`

### Step 4: Redeploy
- [ ] Trigger a new deployment
- [ ] Check Deploy Logs for errors
- [ ] Verify server starts successfully

### Step 5: Test
- [ ] Visit `https://your-app.up.railway.app/api/health`
- [ ] Should see `{"status":"ok","message":"Server is running"}`

## Still Not Working?

1. **Check Railway Logs** - Look for specific error messages
2. **Verify Variable Syntax** - Must be `${{MySQL.VARIABLE}}` (double curly braces)
3. **Check MySQL Status** - Ensure MySQL service is running
4. **Test Locally** - Try running the server locally with Railway variables to isolate the issue

## Recent Fixes Applied

✅ Server now listens on `0.0.0.0` (required for Railway)
✅ Database connection errors won't crash the server
✅ Better logging to diagnose issues
✅ Environment information logged on startup


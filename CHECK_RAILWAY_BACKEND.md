# Check Railway Backend Status

## Error: "Cannot connect to server"

This means your Railway backend is either:
1. Not running
2. Crashed on startup
3. Not responding to requests

## Step 1: Check Railway Service Status

1. Go to **Railway Dashboard** → Your Service (`studentitrack1`)
2. Look at the service status:
   - ✅ **Green dot** = Running
   - ❌ **Red/Yellow dot** = Not running or error
   - ⚠️ **Gray** = Stopped

## Step 2: Check Railway Deploy Logs

1. Railway Dashboard → Your Service → **Deploy Logs**
2. Look for these messages:

### ✅ Good Signs (Server Started):
```
🚀 Server running on port 5000
📡 API available at http://0.0.0.0:5000/api
🌐 Environment: production
📊 Database: mysql.railway.internal
✅ MySQL connected successfully
```

### ❌ Bad Signs (Server Failed):
```
❌ MySQL connection error
❌ Uncaught Exception
❌ Unhandled Rejection
❌ Server error
❌ Port already in use
```

## Step 3: Test Backend Health Endpoint

Try visiting this URL in your browser:
```
https://studentitrack1-production.up.railway.app/api/health
```

### Expected Response:
```json
{
  "status": "ok",
  "message": "Server is running",
  "environment": "production",
  ...
}
```

### If You Get:
- **404 Not Found** → Server not running or wrong route
- **Connection Refused** → Server crashed or not started
- **Timeout** → Server not responding
- **502 Bad Gateway** → Railway can't reach your server

## Step 4: Common Issues & Fixes

### Issue 1: Server Not Starting

**Check Logs For:**
- Database connection errors
- Missing environment variables
- Port conflicts
- Syntax errors

**Fix:**
1. Check Railway Deploy Logs for specific error
2. Verify all environment variables are set
3. Check database connection

### Issue 2: Database Connection Failed

**Error in Logs:**
```
❌ MySQL connection error: connect ECONNREFUSED ::1:3306
```

**Fix:**
1. Verify `DB_HOST = ${{MySQL.MYSQLHOST}}` (NOT localhost!)
2. Check MySQL service is running
3. Ensure MySQL service is in same project

### Issue 3: Missing Environment Variables

**Check:**
- `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `NODE_ENV = production`
- `PORT = 5000` (or leave empty)
- `FRONTEND_URL = https://studentitrack1.vercel.app`

### Issue 4: Server Crashed on Startup

**Check Logs For:**
- `❌ Uncaught Exception`
- `❌ Unhandled Rejection`
- Syntax errors
- Missing modules

**Fix:**
1. Check the error message in logs
2. Fix the code issue
3. Redeploy

## Step 5: Verify Deployment

### Check Recent Deployments:
1. Railway Dashboard → Your Service → **Deployments**
2. Look for:
   - ✅ **Green checkmark** = Successful deployment
   - ❌ **Red X** = Failed deployment
   - ⏳ **In progress** = Still deploying

### If Deployment Failed:
1. Click on the failed deployment
2. Check the error message
3. Fix the issue
4. Redeploy

## Step 6: Restart Service

If service is running but not responding:

1. Railway Dashboard → Your Service
2. Click **"Restart"** or **"Redeploy"**
3. Wait for it to start
4. Check logs again

## Quick Checklist

- [ ] Service status is **Green** (running)
- [ ] Deploy Logs show `🚀 Server running on port...`
- [ ] Health endpoint works: `/api/health`
- [ ] Database connected: `✅ MySQL connected successfully`
- [ ] All environment variables are set
- [ ] No errors in Deploy Logs

## What to Share for Help

If you need help, share:
1. **Service Status** - Green/Red/Yellow?
2. **Last 20-30 lines of Deploy Logs** - Copy/paste
3. **Health Endpoint Result** - What happens when you visit `/api/health`?
4. **Recent Deployment Status** - Success or failed?

## Next Steps

1. **Check Railway Dashboard** - Is service running?
2. **Check Deploy Logs** - Any errors?
3. **Test Health Endpoint** - Does it respond?
4. **Share the results** - So we can diagnose further


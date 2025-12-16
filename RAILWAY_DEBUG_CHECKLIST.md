# Railway Debugging Checklist

## 🔍 Step 1: Check Railway Deploy Logs

Go to **Railway Dashboard → Your Service → Deploy Logs** and look for these messages:

### ✅ Good Signs (Server Started Successfully):
```
🚀 Server running on port 5000
📡 API available at http://0.0.0.0:5000/api
🌐 Environment: production
📊 Database: mysql.railway.internal
✅ MySQL connected successfully
```

### ❌ Bad Signs (Server Failed):
```
❌ MySQL connection error: connect ECONNREFUSED ::1:3306
❌ Uncaught Exception: ...
❌ Unhandled Rejection: ...
❌ Server error: ...
```

**Please copy and paste the LAST 20-30 lines of your Deploy Logs here.**

---

## 🔍 Step 2: Check What You See

### Option A: "Application failed to respond" Error Page
- This means Railway can't reach your server
- **Check:** Deploy Logs for server startup errors

### Option B: Timeout / Connection Refused
- Server might not be listening on the correct port
- **Check:** Verify PORT environment variable

### Option C: 503 Service Unavailable
- Server might be crashing on startup
- **Check:** Deploy Logs for uncaught exceptions

### Option D: CORS Error in Browser Console
- Server is running but blocking requests
- **Check:** CORS configuration (already fixed above)

---

## 🔍 Step 3: Verify Environment Variables

Go to **Railway Dashboard → Your Service → Variables** and verify:

### Database Variables (MUST be set):
- [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}` (NOT localhost!)
- [ ] `DB_USER = ${{MySQL.MYSQLUSER}}`
- [ ] `DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}`
- [ ] `DB_NAME = ${{MySQL.MYSQLDATABASE}}`

**Important:** Click the eye icon 👁️ next to `DB_HOST` and verify it shows something like:
- ✅ `mysql.railway.internal` or `containers-us-west-xxx.railway.app`
- ❌ `localhost` (this is wrong!)

### Server Variables:
- [ ] `NODE_ENV = production`
- [ ] `PORT = 5000` (or leave empty, Railway auto-assigns)
- [ ] `FRONTEND_URL = https://your-project.vercel.app`

### Firebase Variables:
- [ ] `FIREBASE_PROJECT_ID = studitrack-54f69`
- [ ] `FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n..."`
- [ ] `FIREBASE_CLIENT_EMAIL = firebase-adminsdk-...`

---

## 🔍 Step 4: Test Health Endpoint

After deployment, try accessing:
```
https://your-app.up.railway.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "environment": "production",
  "database": {
    "host": "mysql.railway.internal",
    "database": "railway"
  },
  "firebase": {
    "configured": true
  },
  "timestamp": "2025-12-16T..."
}
```

**If this doesn't work:**
- Server is not starting
- Check Deploy Logs for errors

---

## 🔍 Step 5: Common Issues

### Issue 1: Database Connection Error
**Error:** `❌ MySQL connection error: connect ECONNREFUSED ::1:3306`

**Solution:**
1. Verify `DB_HOST = ${{MySQL.MYSQLHOST}}` (with double curly braces)
2. Check MySQL service is running (green status)
3. Ensure MySQL service is in same project

### Issue 2: Server Crashes on Startup
**Error:** `❌ Uncaught Exception` or `❌ Unhandled Rejection`

**Solution:**
1. Check the error message in logs
2. Common causes:
   - Missing required module
   - Syntax error in code
   - Missing environment variable causing crash

### Issue 3: Port Already in Use
**Error:** `❌ Port 5000 is already in use`

**Solution:**
- Railway handles this automatically
- If persists, check Railway settings

### Issue 4: Routes Not Loading
**Error:** Server starts but routes return 404

**Solution:**
- Check if routes are properly required
- Verify file paths are correct

---

## 🔍 Step 6: Share Information

Please provide:

1. **Last 30 lines of Deploy Logs** (copy/paste)
2. **What error message you see** (if any)
3. **Screenshot of Variables tab** (showing DB_HOST value)
4. **Result of `/api/health` endpoint** (if accessible)

---

## 🚀 Quick Fixes Applied

✅ CORS now allows Railway and Vercel URLs
✅ Server listens on `0.0.0.0` (required for Railway)
✅ Better error handling (database errors won't crash server)
✅ Enhanced health endpoint with diagnostics
✅ Production mode allows more permissive CORS

---

## 📝 Next Steps

1. **Commit and push these changes:**
   ```bash
   git add server/src/server.js
   git commit -m "Fix CORS for Railway/Vercel and improve error handling"
   git push
   ```

2. **Wait for Railway to redeploy**

3. **Check Deploy Logs** for the startup messages

4. **Test `/api/health` endpoint**

5. **Share the results** so we can diagnose further if needed


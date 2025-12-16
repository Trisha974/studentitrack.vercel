# Fix CORS and Backend Connection Issues

## 🔴 Current Problem

Your backend is showing "Application failed to respond" and CORS errors. This means:
1. **Backend is not running** OR
2. **Backend is crashing on startup** OR  
3. **CORS headers are not being sent** (because server isn't responding)

---

## ✅ Step 1: Check Railway Deploy Logs (CRITICAL)

**This is the most important step!**

1. Go to **Railway Dashboard** → Your Service (`studentitrack1`)
2. Click **"Deploy Logs"** tab
3. Scroll to the **BOTTOM** (most recent logs)
4. **Copy the last 50-100 lines** and check for:

### ✅ Good Signs:
```
🚀 Server running on port 5000
📡 API available at http://0.0.0.0:5000/api
🌐 Environment: production
✅ MySQL connected successfully
```

### ❌ Bad Signs (Common Errors):

**Error 1: Database Connection Failed**
```
❌ MySQL connection error: connect ECONNREFUSED ::1:3306
```
**Fix:** Set `DB_HOST = ${{MySQL.MYSQLHOST}}` (NOT `localhost`)

**Error 2: Missing Environment Variable**
```
❌ Error: FIREBASE_PRIVATE_KEY is required
```
**Fix:** Add missing Firebase variables

**Error 3: Server Crashed**
```
❌ Uncaught Exception: ...
❌ Unhandled Rejection: ...
```
**Fix:** Check the error message - usually missing variable or syntax error

**Error 4: Port Already in Use**
```
❌ Port 5000 is already in use
```
**Fix:** Remove `PORT = 5000` from Railway variables (let Railway auto-assign)

---

## ✅ Step 2: Verify Environment Variables in Railway

Go to **Railway Dashboard** → Your Service → **Variables** tab

### Required Variables Checklist:

#### Database (CRITICAL - Most Common Issue):
- [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}`
  - ⚠️ **Click the eye icon 👁️** - Does it show `mysql.railway.internal`?
  - ❌ If it shows `localhost` → **This is wrong!** Fix it.
  
- [ ] `DB_USER = ${{MySQL.MYSQLUSER}}`
- [ ] `DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}`
- [ ] `DB_NAME = ${{MySQL.MYSQLDATABASE}}`

#### Server:
- [ ] `NODE_ENV = production`
- [ ] `FRONTEND_URL = https://studentitrack1.vercel.app`
  - ⚠️ **Must match your Vercel URL exactly!**

#### Firebase (Required for authentication):
- [ ] `FIREBASE_PROJECT_ID = studitrack-54f69`
- [ ] `FIREBASE_PRIVATE_KEY = -----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n`
- [ ] `FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@studitrack-54f69.iam.gserviceaccount.com`

#### Port (Optional):
- [ ] `PORT` - **Leave this EMPTY** (Railway auto-assigns)

---

## ✅ Step 3: Check MySQL Service

1. Railway Dashboard → Your **Project** (not service)
2. Look in left sidebar for **MySQL** service
3. Check:
   - ✅ Is MySQL service there?
   - ✅ Is it **green** (running)?
   - ✅ Is it in the **same project** as your backend?

**If MySQL is missing or red:**
- Create a new MySQL service in Railway
- Link it to your backend service
- Update `DB_HOST = ${{MySQL.MYSQLHOST}}`

---

## ✅ Step 4: Restart/Redeploy Railway Service

After fixing environment variables:

1. Railway Dashboard → Your Service
2. Click **"Settings"** tab
3. Scroll down to **"Danger Zone"**
4. Click **"Redeploy"** or **"Restart"**
5. Watch the **Deploy Logs** to see if it starts successfully

---

## ✅ Step 5: Test Backend Directly

After redeploying, test if backend is running:

### Test 1: Health Endpoint
Open in browser:
```
https://studentitrack1-production.up.railway.app/api/health
```

**Expected:** JSON response:
```json
{
  "status": "ok",
  "message": "Server is running",
  "environment": "production",
  ...
}
```

**If you still see "Application failed to respond":**
- Backend is still not running
- Check Deploy Logs for errors
- Verify all environment variables are set

---

## ✅ Step 6: Enhanced CORS Configuration

I've updated your `server/src/server.js` with enhanced CORS handling. The changes include:

1. **Better preflight handling** - Explicitly handles OPTIONS requests
2. **More permissive in production** - Allows all Vercel origins
3. **Better logging** - Shows which origins are being allowed/blocked

**After fixing the backend startup issue, the CORS should work automatically.**

---

## 🔧 Quick Fixes for Common Issues

### Issue 1: Database Connection Failed

**Symptom:** Logs show `❌ MySQL connection error: connect ECONNREFUSED ::1:3306`

**Fix:**
1. Railway → Variables → `DB_HOST`
2. Make sure it's: `${{MySQL.MYSQLHOST}}` (NOT `localhost`)
3. Click eye icon - should show `mysql.railway.internal`
4. Redeploy

---

### Issue 2: Missing Firebase Variables

**Symptom:** Logs show `❌ Error: FIREBASE_PRIVATE_KEY is required`

**Fix:**
1. Get Firebase Admin SDK credentials from Firebase Console
2. Add to Railway Variables:
   - `FIREBASE_PROJECT_ID`
   - `FIREBASE_PRIVATE_KEY` (with `\n` for newlines)
   - `FIREBASE_CLIENT_EMAIL`
3. Redeploy

---

### Issue 3: Server Crashes on Startup

**Symptom:** Logs show `❌ Uncaught Exception` or `❌ Unhandled Rejection`

**Fix:**
1. Read the error message in logs
2. Usually means:
   - Missing environment variable
   - Syntax error in code
   - Missing npm package
3. Fix the specific error
4. Redeploy

---

### Issue 4: CORS Still Blocking After Backend Works

**Symptom:** Backend responds but browser shows CORS errors

**Fix:**
1. Verify `FRONTEND_URL = https://studentitrack1.vercel.app` in Railway
2. The updated CORS config should handle this automatically
3. Check Railway logs for CORS messages
4. If still blocked, check browser console for exact origin being blocked

---

## 📋 Complete Checklist

Before testing again, verify:

### Railway:
- [ ] Service status is **green** (running)
- [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}` (shows `mysql.railway.internal`)
- [ ] `DB_USER = ${{MySQL.MYSQLUSER}}`
- [ ] `DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}`
- [ ] `DB_NAME = ${{MySQL.MYSQLDATABASE}}`
- [ ] `NODE_ENV = production`
- [ ] `FRONTEND_URL = https://studentitrack1.vercel.app`
- [ ] All Firebase variables set
- [ ] MySQL service is running (green)
- [ ] Deploy Logs show `🚀 Server running on port...`
- [ ] `/api/health` returns JSON (not error page)

### Vercel:
- [ ] `VITE_API_URL = https://studentitrack1-production.up.railway.app/api`
- [ ] All Firebase variables set
- [ ] Redeployed after setting `VITE_API_URL`

---

## 🚀 Next Steps

1. **Check Railway Deploy Logs** - This will tell you exactly what's wrong
2. **Fix the specific error** shown in logs
3. **Redeploy Railway** service
4. **Test `/api/health`** endpoint
5. **Test frontend** - Should connect now

---

## 📞 Share This Information

If you're still stuck, share:

1. **Last 50 lines of Railway Deploy Logs**
2. **What `DB_HOST` shows** when you click the eye icon
3. **Service status color** (Green/Red/Yellow)
4. **What `/api/health` returns** (JSON or error?)

With this information, I can give you the exact fix!


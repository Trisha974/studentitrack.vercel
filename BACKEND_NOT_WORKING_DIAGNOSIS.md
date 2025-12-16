# Backend Not Working - Step-by-Step Diagnosis

## 🔍 Step 1: Check Railway Service Status

1. Go to **Railway Dashboard** → Your Service (`studentitrack1`)
2. Look at the top of the service page:
   - ✅ **Green dot** = Service is running
   - ❌ **Red/Yellow dot** = Service has errors or stopped
   - ⚠️ **Gray** = Service is stopped

**What do you see?** (Green/Red/Yellow/Gray)

---

## 🔍 Step 2: Check Railway Deploy Logs

1. Railway Dashboard → Your Service → **Deploy Logs** tab
2. Scroll to the **BOTTOM** (most recent logs)
3. Look for these messages:

### ✅ GOOD - Server Started Successfully:
```
🚀 Server running on port 5000
📡 API available at http://0.0.0.0:5000/api
🌐 Environment: production
📊 Database: mysql.railway.internal
✅ MySQL connected successfully
```

### ❌ BAD - Server Failed:
```
❌ MySQL connection error: connect ECONNREFUSED ::1:3306
❌ Uncaught Exception: ...
❌ Unhandled Rejection: ...
❌ Server error: ...
❌ Port 5000 is already in use
```

**Copy the LAST 30-50 lines of your Deploy Logs and share them.**

---

## 🔍 Step 3: Test Health Endpoint

Open this URL in your browser:
```
https://studentitrack1-production.up.railway.app/api/health
```

### What happens?

**Option A: You see JSON response**
```json
{
  "status": "ok",
  "message": "Server is running",
  ...
}
```
✅ **Backend IS working!** The issue might be CORS or routing.

**Option B: You see "Not Found" or 404**
❌ Server is running but route doesn't exist (unlikely)

**Option C: Connection refused / Timeout / Can't connect**
❌ Server is NOT running or crashed

**Option D: 502 Bad Gateway**
❌ Railway can't reach your server (server crashed)

**What do you see?** (Share the result)

---

## 🔍 Step 4: Check Recent Deployments

1. Railway Dashboard → Your Service → **Deployments** tab
2. Look at the most recent deployment:
   - ✅ **Green checkmark** = Deployment succeeded
   - ❌ **Red X** = Deployment failed
   - ⏳ **In progress** = Still deploying

**What status do you see?** (Success/Failed/In Progress)

---

## 🔍 Step 5: Verify Environment Variables

Go to Railway Dashboard → Your Service → **Variables** tab

### Check These Required Variables:

#### Database Variables (MUST be set):
- [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}` 
  - ⚠️ **Important:** Click the eye icon 👁️ - does it show `mysql.railway.internal` or `localhost`?
  - ❌ If `localhost` → This is wrong! Fix it.
  
- [ ] `DB_USER = ${{MySQL.MYSQLUSER}}`
- [ ] `DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}`
- [ ] `DB_NAME = ${{MySQL.MYSQLDATABASE}}`

#### Server Variables:
- [ ] `NODE_ENV = production`
- [ ] `PORT = 5000` (or leave empty - Railway auto-assigns)
- [ ] `FRONTEND_URL = https://studentitrack1.vercel.app`

#### Firebase Variables:
- [ ] `FIREBASE_PROJECT_ID = studitrack-54f69`
- [ ] `FIREBASE_PRIVATE_KEY = ...`
- [ ] `FIREBASE_CLIENT_EMAIL = ...`

**Are all these set?** (Yes/No - and which ones are missing?)

---

## 🔍 Step 6: Check MySQL Service

1. Railway Dashboard → Your Project
2. Look for **MySQL** service in the left sidebar
3. Check:
   - ✅ Is MySQL service there?
   - ✅ Is it **green** (running)?
   - ✅ Is it in the **same project** as your backend?

**What do you see?** (MySQL exists and is green? Or missing/red?)

---

## 🎯 Most Common Issues

### Issue 1: Database Connection Failed
**Symptom:** Logs show `❌ MySQL connection error: connect ECONNREFUSED ::1:3306`

**Fix:**
1. Verify `DB_HOST = ${{MySQL.MYSQLHOST}}` (NOT localhost!)
2. Check MySQL service is running (green)
3. Ensure MySQL is in same project

### Issue 2: Server Crashed on Startup
**Symptom:** Logs show `❌ Uncaught Exception` or `❌ Unhandled Rejection`

**Fix:**
1. Check the error message in logs
2. Common causes:
   - Missing environment variable
   - Syntax error in code
   - Missing module

### Issue 3: Service Not Running
**Symptom:** Service shows red/yellow dot, no logs

**Fix:**
1. Click **"Restart"** or **"Redeploy"**
2. Check if deployment succeeded
3. Check logs for errors

### Issue 4: Port Issue
**Symptom:** Logs show `❌ Port 5000 is already in use`

**Fix:**
- Railway handles this automatically, but if persists:
- Remove `PORT = 5000` from variables (let Railway auto-assign)

---

## 📋 Quick Checklist

Answer these questions:

1. **Service Status:** Green / Red / Yellow / Gray?
2. **Deploy Logs:** Do you see `🚀 Server running on port...`?
3. **Health Endpoint:** What happens when you visit `/api/health`?
4. **DB_HOST:** Does it show `mysql.railway.internal` or `localhost`?
5. **MySQL Service:** Is it running (green)?
6. **Recent Deployment:** Success or Failed?

---

## 🚀 Next Steps

**Share the answers to these questions, and I'll help you fix the specific issue:**

1. What color is your service status dot? (Green/Red/Yellow)
2. What do the last 20-30 lines of Deploy Logs say?
3. What happens when you visit `/api/health`?
4. What does `DB_HOST` show when you click the eye icon? (mysql.railway.internal or localhost?)
5. Is MySQL service running? (Green or Red?)

Once I know these answers, I can give you the exact fix!


# How to Check Backend Server Logs

## ⚠️ Important: You're Looking at MySQL Logs, Not Backend Logs!

The logs you shared are from the **MySQL service**, which is running fine. We need to check the **backend server logs** (your Node.js application).

---

## ✅ Step 1: Find Your Backend Service

In Railway Dashboard:

1. Look at the **left sidebar** - you should see multiple services:
   - **MySQL** (database) ← You checked this one
   - **studentitrack1** or **backend** or **server** ← **Check this one!**

2. Click on the **backend service** (NOT MySQL)

---

## ✅ Step 2: Check Deploy Logs for Backend

1. Click on your **backend service** (the Node.js one)
2. Click the **"Deploy Logs"** tab
3. Scroll to the **BOTTOM** (most recent logs)
4. Look for these messages:

### ✅ Good - Server Started:
```
🚀 Server running on port 5000
📡 API available at http://0.0.0.0:5000/api
🌐 Environment: production
📊 Database: mysql.railway.internal
✅ MySQL connected successfully
```

### ❌ Bad - Server Failed:
```
❌ MySQL connection error: connect ECONNREFUSED ::1:3306
❌ Uncaught Exception: ...
❌ Unhandled Rejection: ...
❌ Error: Cannot find module...
❌ Error: FIREBASE_PRIVATE_KEY is required
```

---

## ✅ Step 3: What to Look For

### Common Errors in Backend Logs:

**Error 1: Database Connection Failed**
```
❌ MySQL connection error: connect ECONNREFUSED ::1:3306
```
**Meaning:** Backend trying to connect to `localhost` instead of Railway MySQL
**Fix:** Set `DB_HOST = ${{MySQL.MYSQLHOST}}` in Railway Variables

---

**Error 2: Missing Environment Variable**
```
❌ Error: FIREBASE_PRIVATE_KEY is required
❌ Error: FIREBASE_PROJECT_ID is required
```
**Meaning:** Firebase variables not set
**Fix:** Add Firebase Admin SDK credentials to Railway Variables

---

**Error 3: Module Not Found**
```
❌ Error: Cannot find module 'express'
❌ Error: Cannot find module 'mysql2'
```
**Meaning:** npm packages not installed
**Fix:** Check `package.json` and ensure `npm install` runs during build

---

**Error 4: Port Already in Use**
```
❌ Port 5000 is already in use
```
**Meaning:** Port conflict
**Fix:** Remove `PORT = 5000` from Railway Variables (let Railway auto-assign)

---

**Error 5: Syntax Error**
```
❌ SyntaxError: Unexpected token
❌ ReferenceError: variable is not defined
```
**Meaning:** Code error
**Fix:** Check the file mentioned in error, fix syntax

---

## 📋 Quick Checklist

1. [ ] I'm looking at the **backend service** (NOT MySQL)
2. [ ] I'm in the **"Deploy Logs"** tab
3. [ ] I scrolled to the **BOTTOM** (most recent)
4. [ ] I can see either:
   - ✅ `🚀 Server running on port...` (Good!)
   - ❌ Error messages (Bad - need to fix)

---

## 🚀 Next Steps

**Copy the last 50-100 lines from the BACKEND service Deploy Logs** and share them. This will show exactly why the server isn't starting.

The MySQL logs you shared show MySQL is working fine - now we need to see why the Node.js backend isn't connecting to it or starting up.


# 🔧 Fix Railway MySQL Connection Timeout

## ❌ Current Problem

Your logs show:
```
❌ MySQL connection error: connect ETIMEDOUT
DB_PORT=3306 (from MYSQLPORT)  ← WRONG! Should be 46804
```

## 🚨 Issues Found

### Issue 1: Wrong Port (CRITICAL)
- **Current:** `MYSQLPORT=3306`
- **Should be:** `MYSQLPORT=46804` (your actual Railway MySQL port)
- **Impact:** Connection timeout because port 3306 is not your Railway MySQL port

### Issue 2: Database Name
- **Current:** `DB_NAME=studentitrack` (from DB_NAME)
- **Verify:** Check if this matches your actual Railway MySQL database name
- **Check:** Railway → MySQL Service → Variables tab → `MYSQLDATABASE` value

### Issue 3: SSL Configuration
- **Check:** `DB_SSL=true` should be set
- **Impact:** Railway MySQL requires SSL

## ✅ Fix Steps

### Step 1: Update Port in Railway

1. Go to Railway → **Backend Service** (not MySQL)
2. Click **"Variables"** tab
3. Find `MYSQLPORT` variable
4. **Change value from `3306` to `46804`**
5. Save

**OR** if `MYSQLPORT` doesn't exist:
1. Add new variable: `MYSQLPORT=46804`
2. Save

### Step 2: Verify Database Name

1. Go to Railway → **MySQL Service**
2. Click **"Variables"** tab
3. Find `MYSQLDATABASE` value
4. **Copy the exact value**
5. Go to **Backend Service** → Variables
6. Set `MYSQLDATABASE` to the exact value from MySQL service
7. **OR** set `DB_NAME` to match (if using DB_* format)

### Step 3: Verify SSL is Enabled

1. Backend Service → Variables
2. Verify `DB_SSL=true` is set
3. If not, add it

### Step 4: Verify All Variables

After fixing, your Backend Service Variables should have:

```env
# Server
NODE_ENV=production
PORT=5000

# MySQL (from Railway MySQL service)
MYSQLHOST=yamabiko.proxy.rlwy.net
MYSQLUSER=root
MYSQLPASSWORD=<from MySQL service>
MYSQLDATABASE=<from MySQL service - verify exact name>
MYSQLPORT=46804  ← FIX THIS! Change from 3306 to 46804
DB_SSL=true

# JWT
JWT_SECRET=<your secret>
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=https://your-app.vercel.app
```

### Step 5: Redeploy

1. Railway will auto-redeploy after saving variables
2. Or manually: Deployments tab → Redeploy
3. Check Logs tab

### Step 6: Verify Connection

After redeploy, logs should show:
```
✅ MySQL connected successfully
DB_PORT=46804 (from MYSQLPORT)  ← Should show 46804, not 3306!
```

## 🔍 How to Get Correct Values

### Get Port:
1. Railway → MySQL Service → Variables tab
2. Find `MYSQLPORT` value
3. Copy it (should be `46804`)

### Get Database Name:
1. Railway → MySQL Service → Variables tab
2. Find `MYSQLDATABASE` value
3. Copy exact value (could be `railway`, `mysql`, `studentitrack`, etc.)

### Get Password:
1. Railway → MySQL Service → Variables tab
2. Find `MYSQLPASSWORD` value
3. Copy it (no extra spaces)

## ⚠️ Common Mistakes

### Mistake 1: Using Default Port 3306
- ❌ `MYSQLPORT=3306` (default MySQL port)
- ✅ `MYSQLPORT=46804` (your Railway MySQL port)

### Mistake 2: Wrong Database Name
- ❌ Using default `student_itrack`
- ✅ Use exact name from Railway `MYSQLDATABASE`

### Mistake 3: SSL Not Enabled
- ❌ Missing `DB_SSL=true`
- ✅ Set `DB_SSL=true` for Railway MySQL

## 📋 Quick Fix Checklist

- [ ] Change `MYSQLPORT` from `3306` to `46804` in Railway Backend Service
- [ ] Verify `MYSQLDATABASE` matches actual database name from MySQL service
- [ ] Verify `DB_SSL=true` is set
- [ ] Copy `MYSQLPASSWORD` fresh from MySQL service
- [ ] Railway redeploys automatically
- [ ] Check logs show `DB_PORT=46804` (not 3306)
- [ ] Check logs show `✅ MySQL connected successfully`

## 🎯 Most Likely Fix

**Change `MYSQLPORT=3306` to `MYSQLPORT=46804` in Railway Backend Service Variables.**

This is the #1 cause of connection timeouts - wrong port number!


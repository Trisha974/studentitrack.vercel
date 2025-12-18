# 🔍 Verify Railway Environment Variables

Your logs show `Available env vars:` is **EMPTY**, which means Railway isn't reading your environment variables.

## 🚨 Critical Issue

The logs show:
```
DB_HOST=localhost  ← Should be switchback.proxy.rlwy.net
Available env vars:   ← EMPTY! No variables found!
```

This means **Railway is NOT reading your environment variables**.

## ✅ Step-by-Step Fix

### Step 1: Verify Variables Are in the RIGHT Service

**CRITICAL:** Variables must be in your **BACKEND SERVICE**, not MySQL service!

1. Go to Railway dashboard
2. You should see **TWO services:**
   - **Backend Service** (your Node.js/Fastify app) ← Variables go HERE!
   - **MySQL Service** (database) ← Variables come FROM here, but don't go here!

3. Click on your **BACKEND SERVICE** (the one running your Node.js app)
4. Click **"Variables"** tab
5. **Verify** you see variables listed here

### Step 2: Check Variable Names

Railway might not be recognizing the variable names. Try **BOTH** formats:

#### Option A: Use MYSQL* Variables (Railway's format)
```env
MYSQLHOST=switchback.proxy.rlwy.net
MYSQLUSER=root
MYSQLPASSWORD=<paste from MySQL service>
MYSQLDATABASE=<paste from MySQL service>
MYSQLPORT=46804
```

#### Option B: Use DB_* Variables (Custom format)
```env
DB_HOST=switchback.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=<paste from MySQL service>
DB_NAME=<paste from MySQL service>
DB_PORT=3306
DB_SSL=true
```

**Try Option A first** (MYSQL* format) - the code prioritizes these!

### Step 3: Get Values from MySQL Service

1. Go to **MySQL Service** → **Variables** tab
2. Copy these **EXACT** values:
   - `MYSQLHOST` → Use as `MYSQLHOST` or `DB_HOST`
   - `MYSQLUSER` → Use as `MYSQLUSER` or `DB_USER`
   - `MYSQLPASSWORD` → Use as `MYSQLPASSWORD` or `DB_PASSWORD`
   - `MYSQLDATABASE` → Use as `MYSQLDATABASE` or `DB_NAME`
   - `MYSQLPORT` → Use as `MYSQLPORT` or `DB_PORT`

3. Go to **Backend Service** → **Variables** tab
4. **Delete** any existing MySQL variables
5. **Add fresh** variables using **MYSQL* format** (Option A above)
6. **Paste values directly** (don't use template syntax for now)

### Step 4: Verify Variables Are Saved

After adding variables:
1. **Refresh** the Variables page
2. **Verify** you see:
   - `MYSQLHOST` (or `DB_HOST`)
   - `MYSQLUSER` (or `DB_USER`)
   - `MYSQLPASSWORD` (or `DB_PASSWORD`)
   - `MYSQLDATABASE` (or `DB_NAME`)
   - `MYSQLPORT` (or `DB_PORT`)

### Step 5: Force Redeploy

Railway should auto-redeploy, but if not:

1. Go to **Backend Service** → **Deployments** tab
2. Click **"Redeploy"** button
3. Wait for deployment to complete
4. Check **Logs** tab

### Step 6: Check New Logs

After redeploy, logs should show:
```
Host: switchback.proxy.rlwy.net  ← NOT localhost!
Available env vars: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, ...  ← Should list variables!
✅ MySQL connected successfully
```

## 🔍 Troubleshooting

### Issue 1: Variables Still Not Showing

**Check:**
1. Variables are in **Backend Service**, not MySQL service
2. Variable names are **exact** (case-sensitive: `MYSQLHOST` not `mysqlhost`)
3. No extra spaces in variable names or values
4. Variables are **saved** (refresh page to verify)

### Issue 2: Still Shows "localhost"

**Solutions:**
1. **Delete all MySQL variables** from Backend Service
2. **Add fresh** using **MYSQL* format** (not DB_*)
3. **Copy values directly** from MySQL service (no template syntax)
4. **Force redeploy**

### Issue 3: Template Syntax Not Working

If `${{MySQL.MYSQLHOST}}` doesn't work:
1. **Don't use template syntax** for now
2. **Manually copy** values from MySQL service
3. **Paste directly** into Backend Service variables

### Issue 4: Railway Not Redeploying

1. Go to **Deployments** tab
2. Click **"Redeploy"** manually
3. Or make a small change (add a comment variable) to trigger redeploy

## 📋 Quick Checklist

Before checking logs, verify:
- [ ] Variables are in **Backend Service** (not MySQL service)
- [ ] Using **MYSQL*** variable names (MYSQLHOST, MYSQLUSER, etc.)
- [ ] Values copied **directly** from MySQL service Variables tab
- [ ] No template syntax (`${{...}}`) - use direct values
- [ ] Variables are **saved** (visible after page refresh)
- [ ] Railway has **redeployed** (check Deployments tab)

## 🎯 Expected Result

After fixing, logs should show:
```
📊 Database Configuration:
   Host: switchback.proxy.rlwy.net  ← Correct host!
   User: root
   Database: [your database name]
   Password: ***
   🔍 Environment variables found: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
✅ MySQL connected successfully
```

## 🚨 If Still Not Working

If `Available env vars:` is still empty after all this:

1. **Screenshot** your Backend Service Variables tab
2. **Screenshot** your MySQL Service Variables tab
3. Check if Railway has any **service linking** or **variable sharing** settings
4. Try creating a **new Backend Service** and setting variables there

The fact that it shows `Available env vars:` empty means Railway is not passing environment variables to your application at all. This is a Railway configuration issue, not a code issue.


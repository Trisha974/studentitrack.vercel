# 🔧 Railway Backend Environment Variables - Complete List

## ✅ Required Environment Variables

Add these variables to your **Railway Backend Service** (not MySQL service):

### 1. Server Configuration

```env
NODE_ENV=production
PORT=5000
```

### 2. MySQL Database Connection

**Option A: Use MYSQL* format (Recommended - Code prioritizes these)**

```env
MYSQLHOST=yamabiko.proxy.rlwy.net
MYSQLUSER=root
MYSQLPASSWORD=<copy from MySQL service Variables tab>
MYSQLDATABASE=<copy from MySQL service Variables tab>
MYSQLPORT=46804
DB_SSL=true
```

**Option B: Use DB_* format (Alternative)**

```env
DB_HOST=yamabiko.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=<copy from MySQL service Variables tab>
DB_NAME=<copy from MySQL service Variables tab>
DB_PORT=3306
DB_SSL=true
```

**Note:** The code checks `MYSQL*` variables first, then `DB_*` variables. Use **Option A** for best compatibility.

### 3. JWT Authentication

```env
JWT_SECRET=<generate a strong random string, minimum 32 characters>
JWT_EXPIRES_IN=7d
```

**How to generate JWT_SECRET:**
- PowerShell: `-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})`
- Online: https://randomkeygen.com/ (use "CodeIgniter Encryption Keys")
- Example: `my-super-secret-jwt-key-12345-abcdef-67890-xyz`

### 4. Frontend URL

```env
FRONTEND_URL=https://your-app.vercel.app
```

**Note:** Update this after you deploy frontend to Vercel.

---

## 📋 Complete List (Copy-Paste Ready)

Here's the complete list with placeholders:

```env
# Server
NODE_ENV=production
PORT=5000

# MySQL Database (from Railway MySQL service Variables tab)
MYSQLHOST=yamabiko.proxy.rlwy.net
MYSQLUSER=root
MYSQLPASSWORD=<paste from MySQL service MYSQLPASSWORD>
MYSQLDATABASE=<paste from MySQL service MYSQLDATABASE>
MYSQLPORT=46804
DB_SSL=true

# JWT Authentication
JWT_SECRET=<generate random string, 32+ characters>
JWT_EXPIRES_IN=7d

# Frontend URL (update after Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app
```

---

## 🔍 How to Get MySQL Values

1. Go to Railway → **MySQL Service** (not backend)
2. Click **"Variables"** tab
3. Copy these values:
   - `MYSQLHOST` → Use for `MYSQLHOST` or `DB_HOST`
   - `MYSQLUSER` → Use for `MYSQLUSER` or `DB_USER`
   - `MYSQLPASSWORD` → Use for `MYSQLPASSWORD` or `DB_PASSWORD`
   - `MYSQLDATABASE` → Use for `MYSQLDATABASE` or `DB_NAME`
   - `MYSQLPORT` → Use for `MYSQLPORT` or `DB_PORT`

---

## ✅ Step-by-Step Setup

### Step 1: Go to Railway Backend Service
1. Railway Dashboard → Your Project
2. Click **Backend Service** (Node.js app, NOT MySQL)
3. Click **"Variables"** tab

### Step 2: Add Variables One by One

Click **"+ New Variable"** for each:

1. **NODE_ENV** = `production`
2. **PORT** = `5000`
3. **MYSQLHOST** = `yamabiko.proxy.rlwy.net` (from MySQL service)
4. **MYSQLUSER** = `root` (from MySQL service)
5. **MYSQLPASSWORD** = [paste from MySQL service]
6. **MYSQLDATABASE** = [paste from MySQL service]
7. **MYSQLPORT** = `46804` (from MySQL service)
8. **DB_SSL** = `true`
9. **JWT_SECRET** = [generate random string]
10. **JWT_EXPIRES_IN** = `7d`
11. **FRONTEND_URL** = `https://your-app.vercel.app`

### Step 3: Verify

After adding all variables:
1. **Refresh** the Variables page
2. **Verify** all 11 variables are listed
3. Railway will **auto-redeploy**
4. Check **Logs** tab

### Step 4: Check Logs

After redeploy, logs should show:
```
✅ MySQL connected successfully
Host: yamabiko.proxy.rlwy.net  ← Should NOT be localhost!
🔍 Environment variables found: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
```

---

## ⚠️ Common Mistakes

### ❌ Wrong Service
- Adding variables to MySQL service
- ✅ **Add to Backend Service**

### ❌ Wrong Variable Names
- Using `mysqlhost` (lowercase)
- ✅ Use `MYSQLHOST` (uppercase, exact)

### ❌ Missing Values
- Not copying from MySQL service
- ✅ Copy exact values from MySQL service Variables tab

### ❌ Wrong Hostname
- Using `localhost` or old hostname
- ✅ Use current hostname: `yamabiko.proxy.rlwy.net`

---

## 🎯 Quick Checklist

Before testing, verify:
- [ ] Variables are in **Backend Service** (not MySQL)
- [ ] All 11 variables are added
- [ ] Variable names are exact (case-sensitive)
- [ ] MySQL values copied from MySQL service
- [ ] JWT_SECRET is 32+ characters
- [ ] Railway has redeployed
- [ ] Logs show correct host (not localhost)

---

## 📝 Optional Variables

These are optional but can be useful:

```env
# CSRF Protection (optional)
CSRF_SECRET=<random string>

# Debug Mode (optional - for troubleshooting)
DEBUG_ENV=true
```

---

## 🔄 After Setup

Once variables are set:
1. ✅ Railway auto-redeploys
2. ✅ Check logs for connection success
3. ✅ Import database: `IMPORT_TO_MYSQL_WORKBENCH.sql`
4. ✅ Deploy frontend to Vercel
5. ✅ Update `FRONTEND_URL` with Vercel URL

Your backend should now connect to Railway MySQL! 🚀


# 🚨 Railway Setup - Fix Database Connection NOW

## Current Problem

Your Railway logs show:
```
❌ MySQL connection error: connect ECONNREFUSED ::1:3306
   DB_HOST=localhost  ← This is wrong! Should be switchback.proxy.rlwy.net
```

**The environment variables are NOT set in Railway!**

## ✅ Quick Fix (5 minutes)

### Step 1: Go to Railway Dashboard
1. Open https://railway.app
2. Select your project
3. Click on your **backend service** (not the MySQL service)

### Step 2: Add Environment Variables
1. Click the **"Variables"** tab
2. Click **"+ New Variable"** or **"Add from Service"**

### Step 3: Add These Variables

**Option A: Use Railway Template (Easiest)**
```env
NODE_ENV=production
PORT=5000

DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_SSL=true

JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-app.vercel.app
```

**Option B: Manual Values (If template doesn't work)**
```env
NODE_ENV=production
PORT=5000

MYSQLHOST=switchback.proxy.rlwy.net
MYSQLUSER=root
MYSQLPASSWORD=<copy from MySQL service Variables tab>
MYSQLDATABASE=<copy from MySQL service Variables tab>
MYSQLPORT=46804

JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d
FRONTEND_URL=https://your-app.vercel.app
```

### Step 4: Get MySQL Password
1. Go to your **MySQL service** (not backend)
2. Click **"Variables"** tab
3. Find `MYSQLPASSWORD` and copy it
4. Paste it in your backend service variables

### Step 5: Wait for Redeploy
- Railway will automatically redeploy after you save
- Check the logs - you should see:
  ```
  ✅ MySQL connected successfully
  ```

## ✅ Verify It's Working

After redeploy, check logs for:
- ✅ `Host: switchback.proxy.rlwy.net` (not localhost!)
- ✅ `✅ MySQL connected successfully`
- ❌ No more `ECONNREFUSED` errors

## About the Schema Warnings

The `strict mode: use allowUnionTypes` warnings are **harmless** - they won't break your app. The code has been updated to suppress them, but Railway needs to redeploy with the latest code.

## Still Not Working?

1. **Check service name**: Replace `MySQL` in `${{MySQL.MYSQLHOST}}` with your actual MySQL service name
2. **Check variables exist**: Go to MySQL service → Variables tab, verify all `MYSQL*` variables exist
3. **Manual copy**: If template syntax fails, manually copy each value from MySQL service to backend service

## Next Steps After Connection Works

1. Run SQL script: `server/scripts/create-dashboard-state-table.sql`
2. Deploy frontend to Vercel
3. Update `FRONTEND_URL` in Railway


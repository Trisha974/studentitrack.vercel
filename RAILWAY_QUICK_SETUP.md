# 🚂 Railway Quick Setup - Your MySQL Connection

Based on your Railway MySQL connection details:

```
Host: switchback.proxy.rlwy.net
Port: 46804
User: root
SSL: Required
```

## Option 1: Use Railway Template Syntax (Recommended)

Railway automatically provides these variables in your MySQL service. Link them to your backend:

1. Go to your **backend service** → **Variables** tab
2. Click **"New Variable"** or **"Add from Service"**
3. Add these variables using Railway's template syntax:

```env
NODE_ENV=production
PORT=5000

# MySQL - Link from MySQL service
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_SSL=true

# JWT Secret (generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# JWT Expiration
JWT_EXPIRES_IN=7d

# Frontend URL (update after Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app
```

**Note:** Replace `MySQL` with your actual MySQL service name if different.

## Option 2: Manual Setup (If Template Doesn't Work)

If Railway's template syntax doesn't work, manually set the values:

1. Go to your **MySQL service** → **Variables** tab
2. Find and copy these values:
   - `MYSQLHOST` (should be `switchback.proxy.rlwy.net`)
   - `MYSQLUSER` (should be `root`)
   - `MYSQLPASSWORD` (copy the actual password)
   - `MYSQLDATABASE` (copy the database name)
   - `MYSQLPORT` (should be `46804`)

3. Go to your **backend service** → **Variables** tab
4. Add these variables:

```env
NODE_ENV=production
PORT=5000

# MySQL - Manual values
MYSQLHOST=switchback.proxy.rlwy.net
MYSQLUSER=root
MYSQLPASSWORD=<paste from MySQL service>
MYSQLDATABASE=<paste from MySQL service>
MYSQLPORT=46804

# Or use DB_* format (code supports both):
DB_HOST=switchback.proxy.rlwy.net
DB_USER=root
DB_PASSWORD=<paste from MySQL service>
DB_NAME=<paste from MySQL service>
DB_PORT=3306
DB_SSL=true

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# JWT Expiration
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=https://your-app.vercel.app
```

## How the Code Works

The code automatically:
1. ✅ Checks for `MYSQL*` variables first (Railway's format)
2. ✅ Falls back to `DB_*` variables if `MYSQL*` not found
3. ✅ Enables SSL automatically when Railway MySQL variables are detected
4. ✅ Works with both variable naming conventions

## Verify Connection

After setting variables, Railway will redeploy. Check logs for:

✅ **Success:**
```
✅ MySQL connected successfully
🚀 Server running on port 8080
```

❌ **If still failing:**
- Check MySQL service is running
- Verify variable names are correct (case-sensitive)
- Check password is copied correctly (no extra spaces)

## Next Steps

1. ✅ Database connection working
2. Run SQL script to create `dashboard_state` table:
   - Connect via MySQL Workbench or Railway CLI
   - Run: `server/scripts/create-dashboard-state-table.sql`
3. Deploy frontend to Vercel
4. Update `FRONTEND_URL` in Railway with Vercel URL


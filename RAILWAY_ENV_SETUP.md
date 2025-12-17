# 🚂 Railway Environment Variables Setup

## Quick Fix for Database Connection

Your Railway deployment is failing to connect to MySQL because the environment variables need to be configured.

## Step 1: Add MySQL Database Service

1. In Railway dashboard, click **"+ New"**
2. Select **"Database"** → **"Add MySQL"**
3. Railway will automatically create a MySQL database

## Step 2: Configure Environment Variables

Go to your **backend service** (not the MySQL service) → **Variables** tab, and add these:

### Required Variables:

```env
NODE_ENV=production
PORT=5000

# MySQL Database - Railway auto-provides these when you add MySQL service
# Use Railway's template syntax to reference the MySQL service variables:
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_SSL=true

# JWT Secret (Generate a strong random string)
# Use: openssl rand -base64 32 (or any random string generator)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# JWT Expiration
JWT_EXPIRES_IN=7d

# Frontend URL (Update after Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app
```

### Important Notes:

1. **Railway Template Syntax**: Use `${{MySQL.MYSQLHOST}}` format to reference MySQL service variables
2. **Service Name**: If your MySQL service is named differently (not "MySQL"), use that name:
   - Example: `${{YourServiceName.MYSQLHOST}}`
3. **SSL**: Railway MySQL requires SSL, so `DB_SSL=true` is important
4. **JWT_SECRET**: Generate a strong random string (minimum 32 characters)

## Step 3: Verify Connection

After setting variables, Railway will automatically redeploy. Check the logs:

✅ **Success looks like:**
```
✅ MySQL connected successfully
🚀 Server running on port 8080
```

❌ **If still failing, check:**
- MySQL service is running
- Variable names match exactly (case-sensitive)
- Service name in template matches your MySQL service name

## Alternative: Manual Variable Setup

If Railway's template syntax doesn't work, you can manually copy values:

1. Go to **MySQL service** → **Variables** tab
2. Copy these values:
   - `MYSQLHOST`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `MYSQLPORT`

3. In **backend service** → **Variables**, add:
   ```env
   DB_HOST=<paste MYSQLHOST value>
   DB_USER=<paste MYSQLUSER value>
   DB_PASSWORD=<paste MYSQLPASSWORD value>
   DB_NAME=<paste MYSQLDATABASE value>
   DB_PORT=<paste MYSQLPORT value>
   DB_SSL=true
   ```

## Code Changes Made

The code has been updated to:
1. ✅ Prioritize Railway's `MYSQL*` variables over `DB_*` variables
2. ✅ Automatically enable SSL when Railway MySQL variables are detected
3. ✅ Fix Fastify schema warnings about union types

## Next Steps

After database connection is working:
1. Run the SQL script to create `dashboard_state` table (see `server/scripts/create-dashboard-state-table.sql`)
2. Deploy frontend to Vercel
3. Update `FRONTEND_URL` in Railway with your Vercel URL


# 🚂 Railway Environment Variables Setup - Step by Step

## Overview

You need to set environment variables in your **Backend Service** (not MySQL service) so your backend can connect to Railway MySQL.

## 📋 Step-by-Step Instructions

### Step 1: Go to Railway Dashboard

1. Open https://railway.app
2. Sign in to your account
3. Select your project

### Step 2: Identify Your Services

You should see **TWO services** in your Railway project:
- **Backend Service** (Node.js/Fastify app) ← **Variables go HERE!**
- **MySQL Service** (Database) ← Variables come FROM here

### Step 3: Get MySQL Connection Details

1. Click on your **MySQL Service** (the database service)
2. Click the **"Variables"** tab
3. You'll see these variables - **COPY THESE VALUES:**
   - `MYSQLHOST` = `yamabiko.proxy.rlwy.net` (or similar)
   - `MYSQLUSER` = `root`
   - `MYSQLPASSWORD` = [copy the password value]
   - `MYSQLDATABASE` = [copy the database name]
   - `MYSQLPORT` = `46804` (or similar)

**Keep this tab open** - you'll need these values!

### Step 4: Go to Backend Service Variables

1. Click on your **Backend Service** (the Node.js app, NOT MySQL)
2. Click the **"Variables"** tab
3. You'll see existing variables (if any) or an empty list

### Step 5: Add Environment Variables

Click **"+ New Variable"** or **"Add Variable"** and add these one by one:

#### Option A: Use Railway Template Syntax (Recommended)

If Railway supports template syntax, use this format:

```env
NODE_ENV=production
PORT=5000

# MySQL Database - Link from MySQL service
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_SSL=true

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# Frontend URL (update after Vercel deployment)
FRONTEND_URL=https://your-app.vercel.app
```

**Note:** Replace `MySQL` with your actual MySQL service name if different.

#### Option B: Manual Values (If Template Doesn't Work)

If template syntax doesn't work, manually copy values:

1. **Add each variable one by one:**

   **Variable 1:**
   - Name: `MYSQLHOST`
   - Value: `yamabiko.proxy.rlwy.net` (from MySQL service Variables tab)

   **Variable 2:**
   - Name: `MYSQLUSER`
   - Value: `root` (from MySQL service Variables tab)

   **Variable 3:**
   - Name: `MYSQLPASSWORD`
   - Value: [paste from MySQL service `MYSQLPASSWORD`]

   **Variable 4:**
   - Name: `MYSQLDATABASE`
   - Value: [paste from MySQL service `MYSQLDATABASE`]

   **Variable 5:**
   - Name: `MYSQLPORT`
   - Value: `46804` (from MySQL service Variables tab)

   **Variable 6:**
   - Name: `NODE_ENV`
   - Value: `production`

   **Variable 7:**
   - Name: `PORT`
   - Value: `5000`

   **Variable 8:**
   - Name: `DB_SSL`
   - Value: `true`

   **Variable 9:**
   - Name: `JWT_SECRET`
   - Value: [generate a strong random string, minimum 32 characters]

   **Variable 10:**
   - Name: `JWT_EXPIRES_IN`
   - Value: `7d`

   **Variable 11:**
   - Name: `FRONTEND_URL`
   - Value: `https://your-app.vercel.app` (update after Vercel deployment)

### Step 6: Generate JWT Secret

For `JWT_SECRET`, generate a strong random string:

**Option 1: Online Generator**
- Go to https://randomkeygen.com/
- Use "CodeIgniter Encryption Keys" - copy one

**Option 2: PowerShell (Windows)**
```powershell
-join ((48..57) + (65..90) + (97..122) | Get-Random -Count 64 | % {[char]$_})
```

**Option 3: Any random string**
- Minimum 32 characters
- Mix of letters, numbers, and symbols
- Example: `my-super-secret-jwt-key-12345-abcdef-67890`

### Step 7: Save and Verify

1. After adding all variables, **refresh the page**
2. **Verify** you see all variables listed:
   - `MYSQLHOST` (or `DB_HOST`)
   - `MYSQLUSER` (or `DB_USER`)
   - `MYSQLPASSWORD` (or `DB_PASSWORD`)
   - `MYSQLDATABASE` (or `DB_NAME`)
   - `MYSQLPORT` (or `DB_PORT`)
   - `NODE_ENV`
   - `PORT`
   - `DB_SSL`
   - `JWT_SECRET`
   - `JWT_EXPIRES_IN`
   - `FRONTEND_URL`

### Step 8: Railway Will Auto-Redeploy

After saving variables:
1. Railway will **automatically redeploy** your backend service
2. Wait for deployment to complete (check Deployments tab)
3. Go to **Logs** tab to see the deployment

### Step 9: Verify Connection in Logs

After redeploy, check **Logs** tab. You should see:

```
✅ MySQL connected successfully
Host: yamabiko.proxy.rlwy.net  ← Should NOT be localhost!
🔍 Environment variables found: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
```

**If you see:**
```
❌ MySQL connection error
DB_HOST=localhost  ← WRONG!
Available env vars:   ← EMPTY!
```

Then variables are not set correctly - go back to Step 4.

## 🎯 Quick Reference: All Required Variables

```env
# Server
NODE_ENV=production
PORT=5000

# MySQL Database (from Railway MySQL service)
MYSQLHOST=yamabiko.proxy.rlwy.net
MYSQLUSER=root
MYSQLPASSWORD=<from MySQL service>
MYSQLDATABASE=<from MySQL service>
MYSQLPORT=46804
DB_SSL=true

# JWT Authentication
JWT_SECRET=<generate strong random string, 32+ chars>
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=https://your-app.vercel.app
```

## ⚠️ Common Mistakes

### Mistake 1: Variables in Wrong Service
- ❌ Adding variables to MySQL service
- ✅ Add variables to **Backend Service**

### Mistake 2: Wrong Variable Names
- ❌ Using `mysqlhost` (lowercase)
- ✅ Use `MYSQLHOST` (uppercase, exact match)

### Mistake 3: Template Syntax Not Working
- ❌ `${{MySQL.MYSQLHOST}}` doesn't resolve
- ✅ Use manual values instead (copy from MySQL service)

### Mistake 4: Not Redeploying
- ❌ Variables saved but service not redeployed
- ✅ Railway auto-redeploys, but check Deployments tab

## ✅ Success Checklist

After setup, verify:
- [ ] Variables are in **Backend Service** (not MySQL service)
- [ ] All variable names are correct (case-sensitive)
- [ ] Values are correct (host = yamabiko.proxy.rlwy.net)
- [ ] Railway has redeployed (check Deployments tab)
- [ ] Logs show: `✅ MySQL connected successfully`
- [ ] Logs show correct host (not localhost)

## 🔍 Troubleshooting

### Still Shows "localhost" in Logs?

1. **Check variable location:** Must be in Backend Service
2. **Check variable names:** Must be exact (MYSQLHOST not mysqlhost)
3. **Force redeploy:** Go to Deployments tab → Click "Redeploy"
4. **Check logs:** Look for "Available env vars:" - should list variables

### Connection Still Fails?

1. **Verify MySQL service is running** (green status)
2. **Check password** is correct (copy fresh from MySQL service)
3. **Verify hostname** matches MySQL service Variables tab
4. **Check DB_SSL=true** is set

## 📝 Next Steps

After environment variables are set:
1. ✅ Database connection working
2. Import SQL script: `IMPORT_TO_MYSQL_WORKBENCH.sql`
3. Deploy frontend to Vercel
4. Update `FRONTEND_URL` in Railway with Vercel URL

Your backend should now connect to Railway MySQL! 🎉


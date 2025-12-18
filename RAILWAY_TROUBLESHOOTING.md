# 🔧 Railway Troubleshooting Guide

## Problem: Environment Variables Not Being Read

If your logs show:
```
DB_HOST=localhost
Available env vars: NONE
```

This means Railway isn't reading your environment variables.

## ✅ Step-by-Step Fix

### Step 1: Verify Variables Are Set
1. Go to Railway → Your **Backend Service** (not MySQL service)
2. Click **"Variables"** tab
3. **Verify** you see these variables:
   - `MYSQLHOST` or `DB_HOST`
   - `MYSQLUSER` or `DB_USER`
   - `MYSQLPASSWORD` or `DB_PASSWORD`
   - `MYSQLDATABASE` or `DB_NAME`
   - `MYSQLPORT` or `DB_PORT`

### Step 2: Check Service Name
If using Railway template syntax `${{MySQL.MYSQLHOST}}`:
- **Replace `MySQL`** with your actual MySQL service name
- Example: If your MySQL service is named "Database", use `${{Database.MYSQLHOST}}`

### Step 3: Manual Setup (If Template Fails)
1. Go to **MySQL service** → **Variables** tab
2. Copy these values:
   - `MYSQLHOST` = `switchback.proxy.rlwy.net`
   - `MYSQLUSER` = `root`
   - `MYSQLPASSWORD` = (copy the password)
   - `MYSQLDATABASE` = (copy the database name)
   - `MYSQLPORT` = `46804`

3. Go to **Backend service** → **Variables** tab
4. Add these **exact variable names**:
   ```env
   MYSQLHOST=switchback.proxy.rlwy.net
   MYSQLUSER=root
   MYSQLPASSWORD=<paste password>
   MYSQLDATABASE=<paste database name>
   MYSQLPORT=46804
   DB_SSL=true
   ```

### Step 4: Trigger Redeploy
After setting variables:
1. Railway should auto-redeploy
2. If not, go to **Deployments** tab → Click **"Redeploy"**
3. Wait for deployment to complete

### Step 5: Check Logs
After redeploy, logs should show:
```
✅ MySQL connected successfully
Host: switchback.proxy.rlwy.net  ← Should NOT be localhost!
```

## Common Issues

### Issue 1: Variables Set But Not Read
**Cause:** Variables set in wrong service
**Fix:** Make sure variables are in **Backend Service**, not MySQL service

### Issue 2: Template Syntax Not Working
**Cause:** Service name mismatch
**Fix:** Use manual values instead of template syntax

### Issue 3: Still Shows localhost
**Cause:** Railway hasn't redeployed with new variables
**Fix:** Manually trigger redeploy in Deployments tab

### Issue 4: Connection Refused
**Cause:** Wrong host/port or SSL not enabled
**Fix:** 
- Verify host is `switchback.proxy.rlwy.net`
- Verify port is `46804`
- Set `DB_SSL=true`

## Schema Warnings (Harmless)

The `strict mode: use allowUnionTypes` warnings are **harmless** - they won't break your app. The code has been updated to suppress them, but you need to:
1. Wait for Railway to redeploy with latest code
2. Or manually trigger a redeploy

## Favicon 404 (Fixed)

The `/favicon.ico` 404 errors are now handled - they won't appear in logs after redeploy.

## Still Not Working?

1. **Check Railway Status**: Make sure MySQL service is running
2. **Verify Variables**: Double-check variable names are exact (case-sensitive)
3. **Check Logs**: Look for the detailed error messages
4. **Manual Test**: Try connecting via MySQL Workbench to verify credentials

## Quick Checklist

- [ ] Variables set in **Backend Service** (not MySQL service)
- [ ] Variable names are correct (MYSQLHOST or DB_HOST)
- [ ] Values are correct (host = switchback.proxy.rlwy.net)
- [ ] Railway has redeployed after setting variables
- [ ] Logs show correct host (not localhost)
- [ ] MySQL service is running


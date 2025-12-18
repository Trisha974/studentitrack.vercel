# 🚨 Railway Crash Troubleshooting Guide

## Common Causes of Railway Crashes

### 1. ❌ Code Bug: DB_PORT Used Before Definition

**Problem:** In `server/src/shared/config/database.js`, `DB_PORT` is used on line 18 before it's defined on line 32.

**Fix:** Move `DB_PORT` definition before it's used.

### 2. ❌ Missing Environment Variables

**Symptoms:**
- Server starts but crashes immediately
- Logs show: "Available env vars: NONE"
- Database connection fails

**Fix:**
- Set all required environment variables in Railway Backend Service
- See: `RAILWAY_BACKEND_ENV_VARIABLES.md`

### 3. ❌ Database Connection Fails

**Symptoms:**
- Server crashes on startup
- Error: "ECONNREFUSED" or "Connection timeout"

**Fix:**
- Verify MySQL service is running in Railway
- Check environment variables are correct
- Verify SSL is enabled (`DB_SSL=true`)

### 4. ❌ Port Already in Use

**Symptoms:**
- Error: "EADDRINUSE: address already in use"
- Server won't start

**Fix:**
- Railway assigns ports automatically
- Don't hardcode PORT - use `process.env.PORT`
- Current code uses `PORT` from env (correct)

### 5. ❌ Uncaught Exceptions

**Symptoms:**
- Server crashes with "Uncaught Exception"
- Error in logs

**Fix:**
- Check Railway logs for specific error
- The code has error handlers, but some errors might slip through

### 6. ❌ Memory Issues

**Symptoms:**
- Server crashes after running for a while
- "Out of memory" errors

**Fix:**
- Check Railway service limits
- Optimize database queries
- Check for memory leaks

### 7. ❌ Missing Dependencies

**Symptoms:**
- "Cannot find module" errors
- Build fails

**Fix:**
- Ensure `package.json` has all dependencies
- Railway runs `npm install` automatically

### 8. ❌ Build/Start Command Issues

**Symptoms:**
- Deployment fails
- Service won't start

**Fix:**
- Check `Procfile` is correct
- Verify `package.json` start script works

## 🔍 How to Diagnose

### Step 1: Check Railway Logs

1. Go to Railway → Backend Service
2. Click **"Logs"** tab
3. Look for:
   - Error messages
   - Stack traces
   - "Uncaught Exception"
   - "Unhandled Rejection"

### Step 2: Check Service Status

1. Railway Dashboard → Your Service
2. Check service status:
   - ✅ Green = Running
   - ❌ Red = Crashed
   - ⚠️ Yellow = Building/Starting

### Step 3: Check Environment Variables

1. Railway → Backend Service → Variables tab
2. Verify all required variables are set
3. Check variable names are exact (case-sensitive)

### Step 4: Check Database Connection

1. Railway → MySQL Service
2. Verify service is running (green status)
3. Check MySQL service logs for errors

## 🛠️ Quick Fixes

### Fix 1: Restart Service

1. Railway → Backend Service
2. Click **"Settings"** → **"Restart"**
3. Or go to **"Deployments"** → Click **"Redeploy"**

### Fix 2: Check Recent Changes

1. Check what was last deployed
2. Revert to previous working version if needed
3. Check git commits for recent changes

### Fix 3: Verify Environment Variables

1. Railway → Backend Service → Variables
2. Verify all variables are set correctly
3. Check for typos in variable names

### Fix 4: Check Code for Bugs

Common bugs that cause crashes:
- Variables used before definition
- Missing error handling
- Unhandled promise rejections
- Database connection issues

## 📋 Railway Crash Checklist

- [ ] Check Railway logs for error messages
- [ ] Verify environment variables are set
- [ ] Check MySQL service is running
- [ ] Verify PORT is set correctly (Railway auto-assigns)
- [ ] Check for code bugs (like DB_PORT issue)
- [ ] Verify all dependencies are in package.json
- [ ] Check Procfile is correct
- [ ] Try restarting the service
- [ ] Check service resource limits

## 🎯 Most Likely Causes

Based on common issues:

1. **Missing environment variables** (most common)
2. **Database connection fails** (environment variables wrong)
3. **Code bugs** (like DB_PORT used before definition)
4. **Uncaught exceptions** (check logs for specific error)

## 📝 Next Steps

1. **Check Railway logs** - This will show the exact error
2. **Share the error message** - I can help fix it
3. **Verify environment variables** - Make sure all are set
4. **Check service status** - Is MySQL service running?

## 🔧 Code Fix Needed

There's a bug in `server/src/shared/config/database.js`:
- Line 18 uses `DB_PORT` before it's defined on line 32
- This will cause a ReferenceError and crash the server

**This needs to be fixed!**


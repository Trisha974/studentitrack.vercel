# Fix CORS and API URL Issues

## 🚨 Current Problems

1. **CORS Error:** Backend not allowing requests from `https://studentitrack-vercel.vercel.app`
2. **URL Typo:** Request going to `/ap/auth/login` instead of `/api/auth/login`

---

## ✅ Fix 1: CORS Configuration (Already Fixed in Code)

The backend CORS has been updated to:
- Allow `https://studentitrack-vercel.vercel.app` specifically
- Allow all Vercel domains (any `*.vercel.app`)

**This fix is in the code and will be deployed when you push to Railway.**

---

## ✅ Fix 2: VITE_API_URL in Vercel (YOU NEED TO DO THIS)

### The Problem
Your `VITE_API_URL` in Vercel is probably set to:
```
https://web-production-5e2ec.up.railway.app/ap
```

But it should be:
```
https://web-production-5e2ec.up.railway.app/api
```

Notice: `/ap` → `/api` (missing the "i")

### How to Fix

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Open your project: `studentitrack-vercel`

2. **Go to Environment Variables**
   - Click **Settings** → **Environment Variables**

3. **Find `VITE_API_URL`**
   - Look for the variable `VITE_API_URL`
   - Check its current value

4. **Update the Value**
   - **Current (WRONG):** `https://web-production-5e2ec.up.railway.app/ap`
   - **Correct:** `https://web-production-5e2ec.up.railway.app/api`
   
   Make sure it ends with `/api` (not `/ap`)

5. **Save and Redeploy**
   - Click **Save**
   - Go to **Deployments** → Click **"..."** on latest → **"Redeploy"**
   - Or Vercel will auto-redeploy

---

## 🔍 How to Verify

### Step 1: Check Vercel Environment Variable
1. Vercel → Settings → Environment Variables
2. Verify `VITE_API_URL = https://web-production-5e2ec.up.railway.app/api`
3. Make sure it's set for **Production, Preview, and Development**

### Step 2: Check Railway Environment Variable
1. Railway → Backend Service → Variables
2. Verify `FRONTEND_URL = https://studentitrack-vercel.vercel.app`
3. (Or your actual Vercel URL)

### Step 3: Test After Redeploy
1. Wait for both Vercel and Railway to redeploy
2. Open your Vercel site: `https://studentitrack-vercel.vercel.app`
3. Open browser console (F12)
4. Try to log in
5. Check for errors:
   - ✅ **No CORS errors** = Success!
   - ✅ **No "Failed to fetch"** = Success!
   - ❌ **Still CORS error** = Wait a bit longer for Railway to redeploy
   - ❌ **Still `/ap/` in URL** = Vercel env var not updated correctly

---

## 📋 Complete Checklist

### Vercel (Frontend)
- [ ] `VITE_API_URL` = `https://web-production-5e2ec.up.railway.app/api` (ends with `/api`)
- [ ] Environment variable set for all environments (Production, Preview, Development)
- [ ] Frontend redeployed after updating env var

### Railway (Backend)
- [ ] `FRONTEND_URL` = `https://studentitrack-vercel.vercel.app` (your Vercel URL)
- [ ] CORS code updated (will be deployed when you push)
- [ ] Backend redeployed

---

## 🚀 Quick Fix Steps

1. **Fix Vercel `VITE_API_URL`:**
   ```
   https://web-production-5e2ec.up.railway.app/api
   ```
   (Make sure it ends with `/api`)

2. **Push CORS fix to Railway:**
   ```bash
   git add server/src/plugins/cors.js
   git commit -m "Fix CORS to allow studentitrack-vercel.vercel.app"
   git push origin main
   ```

3. **Wait for deployments** (2-3 minutes)

4. **Test login** on your Vercel site

---

## 🎯 Summary

**The Issue:**
- CORS blocking `studentitrack-vercel.vercel.app` ✅ Fixed in code
- `VITE_API_URL` has typo: `/ap` instead of `/api` ⚠️ You need to fix in Vercel

**The Fix:**
1. Update `VITE_API_URL` in Vercel to end with `/api`
2. Push CORS fix to Railway (I'll do this)
3. Wait for redeployments
4. Test login

---

## 🔧 If Still Not Working

1. **Clear browser cache** (Ctrl+Shift+Delete)
2. **Hard refresh** (Ctrl+F5)
3. **Check browser console** for exact error
4. **Verify Railway logs** show CORS plugin loaded
5. **Verify Vercel build logs** show `VITE_API_URL` is set


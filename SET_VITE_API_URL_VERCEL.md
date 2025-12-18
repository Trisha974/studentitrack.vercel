# How to Set VITE_API_URL in Vercel

## 📍 Important Understanding

**`VITE_API_URL` is NOT set in Railway** - it's set in **Vercel** (your frontend deployment).

- **Railway** = Backend (API server)
- **Vercel** = Frontend (React app)
- **VITE_API_URL** = Tells the frontend where to find the backend

---

## 🚂 Step 1: Get Your Railway Backend URL

From your Railway dashboard (which you just showed):
- **Your Railway Backend URL:** `web-production-5e2ec.up.railway.app`
- **Full API URL:** `https://web-production-5e2ec.up.railway.app/api`

**Note:** The `/api` at the end is important!

---

## ▲ Step 2: Set VITE_API_URL in Vercel

### Option A: Via Vercel Dashboard (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Log in to your account

2. **Open Your Project**
   - Click on your project: `studentitrack.vercel` (or similar)

3. **Go to Settings**
   - Click **"Settings"** in the top navigation
   - Or click the project → **Settings** tab

4. **Open Environment Variables**
   - In the left sidebar, click **"Environment Variables"**

5. **Add New Variable**
   - Click **"+ Add New"** or **"Add"** button
   - **Key/Name:** `VITE_API_URL`
   - **Value:** `https://web-production-5e2ec.up.railway.app/api`
   - **Environment:** Select all (Production, Preview, Development)
   - Click **"Save"**

6. **Redeploy**
   - Vercel will automatically trigger a new deployment
   - Or manually: Go to **Deployments** → Click **"..."** on latest deployment → **"Redeploy"**

### Option B: Via Vercel CLI

```bash
# Install Vercel CLI (if not installed)
npm i -g vercel

# Login to Vercel
vercel login

# Set environment variable
vercel env add VITE_API_URL

# When prompted, enter:
# Value: https://web-production-5e2ec.up.railway.app/api
# Environment: Production, Preview, Development (select all)
```

---

## ✅ Step 3: Verify It's Set Correctly

1. **Check Vercel Environment Variables**
   - Go to Vercel → Project → Settings → Environment Variables
   - You should see: `VITE_API_URL = https://web-production-5e2ec.up.railway.app/api`

2. **Check Deployment Logs**
   - Go to Vercel → Deployments → Latest deployment → Build Logs
   - Look for: `VITE_API_URL` in the build output (it won't show the value for security)

3. **Test Your Frontend**
   - Open your Vercel site: `https://studentitrack1.vercel.app` (or your Vercel URL)
   - Open browser DevTools (F12) → Console
   - Try to log in or make any API call
   - Check for errors:
     - ✅ **No "Cannot connect to server" errors** = Success!
     - ❌ **"Cannot connect to server"** = VITE_API_URL not set or wrong URL

---

## 🔍 Step 4: Test the Connection

### Test 1: Backend Health Check
Open in browser:
```
https://web-production-5e2ec.up.railway.app/health
```

Should return:
```json
{
  "status": "healthy"
}
```

### Test 2: Backend API Info
Open in browser:
```
https://web-production-5e2ec.up.railway.app/api
```

Should return API information.

### Test 3: Frontend Connection
1. Open your Vercel frontend
2. Open browser console (F12)
3. Run this in console:
```javascript
fetch('https://web-production-5e2ec.up.railway.app/api/health')
  .then(r => r.json())
  .then(data => console.log('✅ Backend connected:', data))
  .catch(err => console.error('❌ Connection failed:', err))
```

---

## 📋 Complete Setup Checklist

### Railway (Backend)
- [x] Backend deployed: `web-production-5e2ec.up.railway.app`
- [ ] `FRONTEND_URL` set to your Vercel URL (e.g., `https://studentitrack1.vercel.app`)
- [ ] Database connected (check Railway logs)
- [ ] Backend health check works: `/health` endpoint

### Vercel (Frontend)
- [ ] `VITE_API_URL` set to: `https://web-production-5e2ec.up.railway.app/api`
- [ ] Frontend redeployed after setting environment variable
- [ ] Frontend can connect to backend (no console errors)

---

## 🚨 Common Issues

### Issue 1: "Cannot connect to server"
**Problem:** `VITE_API_URL` not set or incorrect
**Fix:** 
- Double-check the value in Vercel → Settings → Environment Variables
- Make sure it ends with `/api`
- Redeploy frontend

### Issue 2: CORS Error
**Problem:** Railway `FRONTEND_URL` not set
**Fix:**
- Go to Railway → Backend Service → Variables
- Add: `FRONTEND_URL=https://studentitrack1.vercel.app` (your Vercel URL)
- Railway will auto-redeploy

### Issue 3: Environment Variable Not Working
**Problem:** Vite requires rebuild when env vars change
**Fix:**
- After setting `VITE_API_URL`, **manually trigger a redeploy** in Vercel
- Go to Deployments → Click "..." → "Redeploy"

---

## 📝 Quick Reference

**Your Railway Backend URL:**
```
https://web-production-5e2ec.up.railway.app
```

**VITE_API_URL to Set in Vercel:**
```
https://web-production-5e2ec.up.railway.app/api
```

**Your Vercel Frontend URL:**
```
https://studentitrack1.vercel.app
```
(Or whatever your actual Vercel domain is)

---

## 🎯 Summary

1. **Railway gives you:** Backend URL (`web-production-5e2ec.up.railway.app`)
2. **You set in Vercel:** `VITE_API_URL = https://web-production-5e2ec.up.railway.app/api`
3. **You set in Railway:** `FRONTEND_URL = https://studentitrack1.vercel.app` (your Vercel URL)

That's it! Once both are set, your frontend and backend will be connected. 🚀


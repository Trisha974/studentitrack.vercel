# Deployment Status Check Guide

## 🔍 How to Verify if Frontend (Vercel) and Backend (Railway) are Connected

### Step 1: Check Your Railway Backend URL
1. Go to [Railway Dashboard](https://railway.app)
2. Open your backend service
3. Go to **Settings** → **Networking**
4. Find your **Public Domain** (e.g., `https://your-app.up.railway.app`)
5. **Copy this URL** - this is your backend API URL

### Step 2: Check Your Vercel Frontend URL
1. Go to [Vercel Dashboard](https://vercel.com)
2. Open your project
3. Check the **Domains** section
4. Your production URL should be something like: `https://studentitrack1.vercel.app`
5. **Copy this URL** - this is your frontend URL

### Step 3: Verify Railway Backend Environment Variables
In Railway → Backend Service → Variables tab, ensure you have:

```env
FRONTEND_URL=https://studentitrack1.vercel.app
# (Replace with your actual Vercel URL)
```

### Step 4: Verify Vercel Frontend Environment Variables
In Vercel → Project Settings → Environment Variables, ensure you have:

```env
VITE_API_URL=https://your-app.up.railway.app/api
# (Replace with your actual Railway backend URL + /api)
```

**Important:** The `VITE_API_URL` must end with `/api`

### Step 5: Test the Connection

#### Test Backend Health:
Open in browser: `https://your-railway-url.up.railway.app/health`

Should return:
```json
{
  "status": "healthy"
}
```

#### Test API Endpoint:
Open in browser: `https://your-railway-url.up.railway.app/api`

Should return API information.

#### Test Frontend:
1. Open your Vercel URL: `https://studentitrack1.vercel.app`
2. Open browser DevTools (F12) → Console tab
3. Try to log in or make any API call
4. Check for errors:
   - ❌ `Cannot connect to server` = Frontend can't reach backend
   - ❌ `CORS error` = Backend CORS not configured correctly
   - ❌ `401 Unauthorized` = Authentication issue (but connection works)
   - ✅ No errors = Connection successful!

### Step 6: Common Issues & Fixes

#### Issue 1: Frontend shows "Cannot connect to server"
**Problem:** `VITE_API_URL` not set or incorrect in Vercel
**Fix:**
1. Go to Vercel → Project Settings → Environment Variables
2. Add/Update: `VITE_API_URL=https://your-railway-url.up.railway.app/api`
3. Redeploy frontend (Vercel auto-redeploys when env vars change)

#### Issue 2: CORS Error in Browser Console
**Problem:** Backend `FRONTEND_URL` not set or incorrect
**Fix:**
1. Go to Railway → Backend Service → Variables
2. Add/Update: `FRONTEND_URL=https://studentitrack1.vercel.app`
3. Railway auto-redeploys

#### Issue 3: Backend returns 404
**Problem:** Backend not deployed or wrong URL
**Fix:**
1. Check Railway logs for errors
2. Verify backend is running (check `/health` endpoint)
3. Ensure Railway service is not paused

#### Issue 4: Database Connection Error
**Problem:** MySQL not connected in Railway
**Fix:**
1. Check Railway logs for MySQL connection errors
2. Verify all MySQL environment variables are set
3. Check `server/src/shared/config/database.js` logs

### Step 7: Quick Connection Test Script

Open browser console on your Vercel frontend and run:

```javascript
// Test backend connection
fetch('https://your-railway-url.up.railway.app/api/health')
  .then(r => r.json())
  .then(data => console.log('✅ Backend connected:', data))
  .catch(err => console.error('❌ Backend connection failed:', err))
```

Replace `your-railway-url.up.railway.app` with your actual Railway URL.

---

## 📋 Deployment Checklist

- [ ] Railway backend deployed and accessible
- [ ] Railway backend `/health` endpoint returns `{"status": "healthy"}`
- [ ] Railway `FRONTEND_URL` environment variable set to Vercel URL
- [ ] Vercel frontend deployed and accessible
- [ ] Vercel `VITE_API_URL` environment variable set to Railway URL + `/api`
- [ ] No CORS errors in browser console
- [ ] Frontend can make API calls to backend
- [ ] Login/authentication works
- [ ] Database connected (check Railway logs)

---

## 🚀 Current Status

To check your current deployment status:

1. **Railway Backend:**
   - URL: `https://your-app.up.railway.app`
   - Health: `https://your-app.up.railway.app/health`
   - API: `https://your-app.up.railway.app/api`

2. **Vercel Frontend:**
   - URL: `https://studentitrack1.vercel.app` (or your custom domain)

3. **Connection:**
   - Frontend → Backend: Check `VITE_API_URL` in Vercel
   - Backend → Frontend: Check `FRONTEND_URL` in Railway
   - CORS: Check `server/src/plugins/cors.js` includes Vercel URL

---

## 📞 Need Help?

If connection still doesn't work:
1. Check Railway logs for backend errors
2. Check Vercel build logs for frontend errors
3. Check browser console for network errors
4. Verify all environment variables are set correctly
5. Ensure both services are deployed (not paused)


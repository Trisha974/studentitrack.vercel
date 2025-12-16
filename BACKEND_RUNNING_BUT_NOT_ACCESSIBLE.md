# Backend is Running But Not Accessible - Fix Guide

## ✅ Good News: Your Backend IS Running!

Your logs show:
- ✅ MySQL connected successfully
- ✅ Firebase Admin SDK initialized
- ✅ Server running on port 5000
- ✅ API available at http://0.0.0.0:5000/api

**But** you're still getting "Application failed to respond" when accessing the URL.

This means the server is running, but Railway isn't routing traffic to it properly.

---

## 🔍 Step 1: Verify Service is Exposed

1. Go to **Railway Dashboard** → Your Backend Service
2. Look at the top of the service page
3. Check if you see a **public URL** like:
   ```
   https://studentitrack1-production.up.railway.app
   ```

### If you DON'T see a public URL:

**The service is not exposed!**

**Fix:**
1. Click **"Settings"** tab
2. Scroll to **"Networking"** section
3. Click **"Generate Domain"** or **"Expose"**
4. Railway will create a public URL
5. Copy this URL - you'll need it for `VITE_API_URL` in Vercel

---

## 🔍 Step 2: Check Service Status

1. Railway Dashboard → Your Backend Service
2. Look at the service status indicator:
   - ✅ **Green dot** = Running and healthy
   - ⚠️ **Yellow dot** = Running but issues
   - ❌ **Red dot** = Not running or crashed

**What color do you see?**

---

## 🔍 Step 3: Verify Port Configuration

Your server is running on port 5000, but Railway might be expecting a different port.

1. Railway Dashboard → Your Service → **Variables** tab
2. Check if `PORT` variable is set:
   - ✅ If `PORT = 5000` → Keep it
   - ✅ If `PORT` is empty → Railway will auto-assign (this is fine)
   - ❌ If `PORT = something else` → Change to `5000` or remove it

**Note:** Railway uses the `PORT` environment variable. If it's not set, Railway will assign one automatically, and your server should use `process.env.PORT`.

---

## 🔍 Step 4: Test Health Endpoint Directly

After ensuring the service is exposed:

1. Get your Railway public URL (from Step 1)
2. Test the health endpoint:
   ```
   https://your-service.up.railway.app/api/health
   ```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "environment": "production",
  "database": {
    "host": "mysql.railway.internal",
    "database": "railway"
  },
  "firebase": {
    "configured": true
  },
  "timestamp": "2025-12-16T05:38:53.000Z"
}
```

**If you still get "Application failed to respond":**
- Service might not be fully exposed
- Wait 1-2 minutes after exposing
- Try again

---

## 🔍 Step 5: Check Railway Networking Settings

1. Railway Dashboard → Your Service → **Settings** → **Networking**
2. Verify:
   - ✅ **Public Networking** is enabled
   - ✅ **Domain** is generated
   - ✅ **Port** matches your server (5000 or auto-assigned)

---

## 🔍 Step 6: Verify Server is Binding Correctly

Your server logs show:
```
🚀 Server running on port 5000
📡 API available at http://0.0.0.0:5000/api
```

This is **correct** - `0.0.0.0` means it's listening on all interfaces, which is what Railway needs.

---

## 🔧 Common Issues and Fixes

### Issue 1: Service Not Exposed

**Symptom:** No public URL shown in Railway

**Fix:**
1. Settings → Networking → Generate Domain
2. Wait 1-2 minutes
3. Test the URL

---

### Issue 2: Wrong Port

**Symptom:** Server running on 5000 but Railway expects different port

**Fix:**
1. Remove `PORT` from Railway Variables (let Railway auto-assign)
2. OR set `PORT = 5000` explicitly
3. Redeploy

**Note:** Your server code uses `process.env.PORT || 5000`, which is correct.

---

### Issue 3: Service Health Check Failing

**Symptom:** Service shows yellow/red even though logs show it's running

**Fix:**
1. Check if health endpoint exists: `/api/health` ✅ (you have this)
2. Railway might be checking wrong endpoint
3. Add health check configuration if needed

---

### Issue 4: CORS Still Blocking

**Symptom:** Backend responds but browser shows CORS errors

**Fix:**
1. Verify `FRONTEND_URL = https://studentitrack1.vercel.app` in Railway
2. The updated CORS config should handle this
3. Check Railway logs for CORS messages

---

## 📋 Quick Checklist

Before testing again:

- [ ] Service has a **public URL** (not just internal)
- [ ] Service status is **green** (running)
- [ ] `PORT` variable is set to `5000` OR empty (auto-assign)
- [ ] Server logs show `🚀 Server running on port 5000`
- [ ] `/api/health` endpoint exists (✅ you have this)
- [ ] Service is **exposed** (not just running internally)
- [ ] `FRONTEND_URL = https://studentitrack1.vercel.app` is set

---

## 🚀 Next Steps

1. **Verify service is exposed** (has public URL)
2. **Test `/api/health`** with the public URL
3. **If still not working**, check:
   - Service status color
   - Networking settings
   - Port configuration

---

## 📞 What to Share

If it's still not working, share:

1. **Do you see a public URL** in Railway? (Yes/No)
2. **What's the exact URL?** (if you have one)
3. **Service status color?** (Green/Yellow/Red)
4. **What happens** when you visit `/api/health`? (Error message or JSON?)

With this info, I can pinpoint the exact issue!


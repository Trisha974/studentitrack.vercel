# Test Your Application - Quick Verification Guide

## ✅ Step 1: Test Backend Health Endpoint

### Get Your Railway Backend URL

1. Go to **Railway Dashboard** → Your Service (`studentitrack1`)
2. Look for the URL (e.g., `studentitrack1-production.up.railway.app`)
3. Copy the full URL

### Test the Health Endpoint

Open in your browser or use curl:
```
https://your-app.up.railway.app/api/health
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
  "timestamp": "2025-12-16T..."
}
```

### ✅ If You See This:
- ✅ Backend is **WORKING**!
- ✅ Server is running
- ✅ API is accessible

### ❌ If You See "Application failed to respond":
- Check Railway Deploy Logs for errors
- Verify environment variables are set
- See troubleshooting guide below

---

## ✅ Step 2: Test Frontend Connection

### Get Your Vercel Frontend URL

1. Go to **Vercel Dashboard** → Your Project
2. Copy your deployment URL (e.g., `your-project.vercel.app`)

### Test Frontend

1. Open your Vercel URL in browser
2. Try to:
   - **Login/Register** - Should connect to backend
   - **View Dashboard** - Should load data from backend
   - **Any feature** - Should make API calls to Railway backend

### Check Browser Console

1. Open **Developer Tools** (F12)
2. Go to **Console** tab
3. Look for:
   - ✅ API calls succeeding
   - ❌ CORS errors
   - ❌ Network errors
   - ❌ 404 errors

### Check Network Tab

1. Open **Developer Tools** (F12)
2. Go to **Network** tab
3. Try using your app
4. Look for API requests to your Railway backend
5. Check if they return **200 OK** or errors

---

## ✅ Step 3: Verify Environment Variables

### Backend (Railway) - Required Variables:

- [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}` (NOT localhost!)
- [ ] `DB_USER = ${{MySQL.MYSQLUSER}}`
- [ ] `DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}`
- [ ] `DB_NAME = ${{MySQL.MYSQLDATABASE}}`
- [ ] `NODE_ENV = production`
- [ ] `PORT = 5000`
- [ ] `FRONTEND_URL = https://your-project.vercel.app`
- [ ] `FIREBASE_PROJECT_ID = studitrack-54f69`
- [ ] `FIREBASE_PRIVATE_KEY = ...`
- [ ] `FIREBASE_CLIENT_EMAIL = ...`

### Frontend (Vercel) - Required Variables:

- [ ] `VITE_FIREBASE_API_KEY = ...`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN = ...`
- [ ] `VITE_FIREBASE_PROJECT_ID = studitrack-54f69`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET = ...`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID = ...`
- [ ] `VITE_FIREBASE_APP_ID = ...`
- [ ] `VITE_API_URL = https://your-app.up.railway.app/api`

**Important:** `VITE_API_URL` must point to your Railway backend URL!

---

## ✅ Step 4: Test Common Features

### Test Authentication:
- [ ] Can register new user
- [ ] Can login
- [ ] Can logout
- [ ] Token is stored correctly

### Test Student Features:
- [ ] View courses
- [ ] View grades
- [ ] View attendance
- [ ] View notifications

### Test Professor Features:
- [ ] Create course
- [ ] Add students to course
- [ ] Record grades
- [ ] Record attendance
- [ ] View reports

---

## 🔍 Troubleshooting

### Problem: Backend Health Endpoint Not Working

**Check:**
1. Railway Deploy Logs - Is server starting?
2. Environment Variables - Are they set correctly?
3. Database Connection - Is MySQL connected?

**Solution:**
- See `RAILWAY_TROUBLESHOOTING.md` for detailed steps

### Problem: Frontend Can't Connect to Backend

**Check:**
1. Browser Console - Any CORS errors?
2. Network Tab - Are API calls failing?
3. `VITE_API_URL` - Is it set correctly in Vercel?

**Solution:**
- Verify `VITE_API_URL` in Vercel matches your Railway URL
- Check CORS is allowing your Vercel domain
- Verify Railway backend is running

### Problem: Database Errors

**Check:**
1. Railway Logs - Database connection errors?
2. `DB_HOST` - Is it set to Railway MySQL host?
3. MySQL Service - Is it running?

**Solution:**
- Verify `DB_HOST = ${{MySQL.MYSQLHOST}}` (not localhost!)
- Check MySQL service is running in Railway

### Problem: Authentication Not Working

**Check:**
1. Firebase variables - Are they set in Railway?
2. Firebase Admin SDK - Is it initialized?
3. Railway Logs - Any Firebase errors?

**Solution:**
- Add Firebase Admin SDK variables to Railway
- See `RAILWAY_ENV_CHECKLIST.md` for Firebase setup

---

## ✅ Quick Test Checklist

- [ ] Backend health endpoint returns OK
- [ ] Frontend loads without errors
- [ ] Can login/register
- [ ] API calls work (check Network tab)
- [ ] No CORS errors in console
- [ ] Database operations work
- [ ] All environment variables are set

---

## 🎯 Summary

**If backend health endpoint works:**
✅ Your backend is **WORKING**!

**If frontend can make API calls:**
✅ Your full stack is **WORKING**!

**If you see errors:**
- Check the specific error message
- Refer to troubleshooting guides
- Check Railway/Vercel logs

---

## 📞 Need Help?

1. **Backend Issues:** Check `RAILWAY_TROUBLESHOOTING.md`
2. **Frontend Issues:** Check `VERCEL_ENV_VARIABLES.md`
3. **Database Issues:** Check `RAILWAY_ENV_CHECKLIST.md`
4. **General:** Check `RAILWAY_DEBUG_CHECKLIST.md`


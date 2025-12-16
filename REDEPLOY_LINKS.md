# Redeploy Your Application - Quick Links

## 🔗 Your Application URLs

### Frontend (Vercel):
```
https://studentitrack1.vercel.app
```

### Backend (Railway):
```
https://studentitrack1-production.up.railway.app
```

---

## 🚀 How to Redeploy

### Option 1: Automatic Redeploy (After Pushing Code)

If you've made changes and pushed to your repository:

1. **Vercel** - Automatically redeploys when you push to your main branch
2. **Railway** - Automatically redeploys when you push to your main branch

**Just push your code changes and both will redeploy automatically!**

---

### Option 2: Manual Redeploy

#### Redeploy Backend (Railway):

1. Go to: **Railway Dashboard**
   - Direct link: https://railway.app/dashboard
2. Click on your **backend service** (`studentitrack1`)
3. Click **"Deployments"** tab
4. Click **"Redeploy"** button on the latest deployment
   - OR
5. Go to **Settings** → Scroll down → Click **"Redeploy"**

#### Redeploy Frontend (Vercel):

1. Go to: **Vercel Dashboard**
   - Direct link: https://vercel.com/dashboard
2. Click on your project: **studentitrack1**
3. Go to **"Deployments"** tab
4. Click the **"..."** menu on the latest deployment
5. Click **"Redeploy"**

---

## ✅ Test Your Deployment

### Test Backend Health:
```
https://studentitrack1-production.up.railway.app/health
```

**Expected Response:**
```json
{ "status": "healthy" }
```

### Test Backend API Health:
```
https://studentitrack1-production.up.railway.app/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "message": "Server is running",
  "environment": "production",
  ...
}
```

### Test Frontend:
```
https://studentitrack1.vercel.app
```

**Expected:** Your website loads without errors

---

## 🔍 Check Deployment Status

### Railway:
1. Go to: https://railway.app/dashboard
2. Click your service
3. Check **"Deploy Logs"** tab
4. Look for: `Server started` and `🚀 Server running on port...`

### Vercel:
1. Go to: https://vercel.com/dashboard
2. Click your project
3. Check **"Deployments"** tab
4. Status should be: ✅ **Ready** (green)

---

## 📋 Quick Checklist Before Testing

### Railway (Backend):
- [ ] Service is **green** (running)
- [ ] Deploy Logs show `Server started`
- [ ] `/health` endpoint returns `{ "status": "healthy" }`
- [ ] Environment variables are set:
  - [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}`
  - [ ] `FRONTEND_URL = https://studentitrack1.vercel.app`
  - [ ] All Firebase variables

### Vercel (Frontend):
- [ ] Deployment status is **Ready** (green)
- [ ] `VITE_API_URL = https://studentitrack1-production.up.railway.app/api` is set
- [ ] All Firebase variables are set

---

## 🎯 Test the Connection

1. **Open your website:**
   ```
   https://studentitrack1.vercel.app
   ```

2. **Open Browser Console (F12)**
   - Go to **Network** tab
   - Try to login or load data
   - Check if API calls go to Railway (not localhost)

3. **Expected:**
   - ✅ API calls to: `studentitrack1-production.up.railway.app`
   - ✅ No CORS errors
   - ✅ No `localhost:5000` errors

---

## 🔧 If Something Doesn't Work

### Backend Not Responding:
1. Check Railway Deploy Logs
2. Verify service is **green** (running)
3. Test `/health` endpoint
4. Check environment variables

### Frontend Shows Errors:
1. Check browser console (F12)
2. Verify `VITE_API_URL` is set in Vercel
3. Clear browser cache
4. Check Vercel deployment logs

### CORS Errors:
1. Verify `FRONTEND_URL` is set in Railway
2. Check Railway logs for CORS messages
3. Redeploy Railway after setting `FRONTEND_URL`

---

## 📞 Quick Links Summary

**Frontend:**
- Website: https://studentitrack1.vercel.app
- Dashboard: https://vercel.com/dashboard

**Backend:**
- API: https://studentitrack1-production.up.railway.app
- Health: https://studentitrack1-production.up.railway.app/health
- Dashboard: https://railway.app/dashboard

---

## 🚀 Ready to Test!

After redeploying, test your application:

1. ✅ Visit: https://studentitrack1.vercel.app
2. ✅ Try to login
3. ✅ Check if data loads
4. ✅ Verify API calls go to Railway

Good luck! 🎉


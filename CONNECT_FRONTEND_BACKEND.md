# Connect Frontend (Vercel) to Backend (Railway)

## Your URLs

- **Frontend (Vercel):** `https://studentitrack1.vercel.app`
- **Backend (Railway):** `https://studentitrack1-production.up.railway.app`

---

## ✅ Step 1: Vercel Environment Variables

Go to: **Vercel Dashboard → studentitrack1 → Settings → Environment Variables**

### Add/Update This Variable:

```
Key: VITE_API_URL
Value: https://studentitrack1-production.up.railway.app/api
Environments: ✅ Production, ✅ Preview, ✅ Development
```

**Important:** 
- Include `/api` at the end
- Make sure to select all environments

### After Adding:
1. Click **Save**
2. Vercel will automatically redeploy
3. Or manually trigger a redeploy

---

## ✅ Step 2: Railway Environment Variables

Go to: **Railway Dashboard → studentitrack1 → Variables**

### Add/Update This Variable:

```
Key: FRONTEND_URL
Value: https://studentitrack1.vercel.app
```

### After Adding:
1. Railway will automatically redeploy
2. Or manually trigger a redeploy

---

## ✅ Step 3: Verify Connection

### Test Backend:
Visit: `https://studentitrack1-production.up.railway.app/api/health`

Should return:
```json
{
  "status": "ok",
  "message": "Server is running",
  ...
}
```

### Test Frontend:
1. Visit: `https://studentitrack1.vercel.app`
2. Open Browser Console (F12)
3. Try to login
4. Check Network tab - API calls should go to Railway, not localhost

---

## ✅ Complete Checklist

### Vercel Variables:
- [ ] `VITE_API_URL = https://studentitrack1-production.up.railway.app/api`
- [ ] All Firebase variables set
- [ ] Redeployed after adding `VITE_API_URL`

### Railway Variables:
- [ ] `FRONTEND_URL = https://studentitrack1.vercel.app`
- [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}`
- [ ] `DB_USER = ${{MySQL.MYSQLUSER}}`
- [ ] `DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}`
- [ ] `DB_NAME = ${{MySQL.MYSQLDATABASE}}`
- [ ] `NODE_ENV = production`
- [ ] `PORT = 5000`
- [ ] Firebase Admin SDK variables set
- [ ] Service is exposed (has public URL)

---

## 🔍 Troubleshooting

### Frontend Still Shows `localhost:5000`

**Problem:** `VITE_API_URL` not set or wrong value

**Solution:**
1. Check Vercel Environment Variables
2. Verify `VITE_API_URL` is set correctly
3. Make sure you redeployed after adding it
4. Clear browser cache

### CORS Errors

**Problem:** Backend blocking frontend requests

**Solution:**
1. Verify `FRONTEND_URL = https://studentitrack1.vercel.app` in Railway
2. Check Railway logs for CORS messages
3. Redeploy Railway after setting `FRONTEND_URL`

### Backend Not Responding

**Problem:** Railway service not exposed or not running

**Solution:**
1. Expose Railway service (Settings → Networking → Generate Domain)
2. Check Railway logs for errors
3. Verify database connection

---

## 📝 Quick Reference

**Your Frontend URL:**
```
https://studentitrack1.vercel.app
```

**Your Backend URL:**
```
https://studentitrack1-production.up.railway.app
```

**Vercel Variable:**
```
VITE_API_URL = https://studentitrack1-production.up.railway.app/api
```

**Railway Variable:**
```
FRONTEND_URL = https://studentitrack1.vercel.app
```

---

## ✅ After Setup

Once both variables are set and services are redeployed:

1. ✅ Frontend will connect to Railway backend
2. ✅ Login will work
3. ✅ All API calls will go to Railway
4. ✅ No more `localhost:5000` errors
5. ✅ CORS will allow requests from Vercel


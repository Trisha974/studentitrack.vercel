# How to Change Your Vercel Domain to studentitrack.vercel.app

## ✅ Yes, it's possible!

You can change your Vercel domain name. Here's how:

---

## 🎯 Step 1: Change Domain in Vercel Dashboard

### Option A: Rename Project (Recommended)

1. **Go to Vercel Dashboard**
   - Visit [vercel.com](https://vercel.com)
   - Log in to your account

2. **Open Your Project**
   - Click on your current project

3. **Go to Settings**
   - Click **"Settings"** tab

4. **Rename Project**
   - Scroll to **"Project Name"** section
   - Change project name to: `studentitrack`
   - Click **"Save"**

5. **New Domain**
   - Vercel will automatically update your domain to: `https://studentitrack.vercel.app`
   - This may take a few minutes to propagate

### Option B: Add Custom Domain

1. **Go to Vercel Dashboard** → Your Project → **Settings** → **Domains**

2. **Add Domain**
   - Click **"Add"** or **"Add Domain"**
   - Enter: `studentitrack.vercel.app`
   - Click **"Add"**

3. **Set as Primary** (if needed)
   - Make this your primary domain

---

## 🔧 Step 2: Update Environment Variables

### In Vercel (Frontend)

1. **Go to Vercel** → Your Project → **Settings** → **Environment Variables**

2. **Update `VITE_API_URL`** (if it references the old domain)
   - Current: Check if it has old domain
   - Should be: `https://web-production-5e2ec.up.railway.app/api` (Railway backend URL)
   - **Note**: This shouldn't need to change (it points to Railway, not Vercel)

### In Railway (Backend)

1. **Go to Railway** → Backend Service → **Variables**

2. **Update `FRONTEND_URL`**
   - Current: `https://studentitrack-vercel.vercel.app` (or old domain)
   - **Change to**: `https://studentitrack.vercel.app`
   - Save (Railway will auto-redeploy)

---

## 📝 Step 3: Update Code References (Already Done)

I've updated the code to include `studentitrack.vercel.app` in the CORS configuration. The changes include:

- ✅ Added `https://studentitrack.vercel.app` to CORS allowed origins
- ✅ Updated default `FRONTEND_URL` in environment config
- ✅ CORS already allows all `*.vercel.app` domains (so it will work automatically)

---

## ✅ Step 4: Verify Everything Works

1. **Wait for deployments** (2-3 minutes)
   - Vercel will redeploy with new domain
   - Railway will redeploy with updated `FRONTEND_URL`

2. **Test the new domain**
   - Visit: `https://studentitrack.vercel.app`
   - Try logging in
   - Check browser console for errors

3. **Verify CORS**
   - No CORS errors in browser console
   - API calls work correctly

---

## 🔍 Current Configuration

### CORS Configuration
The backend already allows:
- ✅ `https://studentitrack.vercel.app` (will be added)
- ✅ `https://studentitrack1.vercel.app` (old, can keep for compatibility)
- ✅ `https://studentitrack-vercel.vercel.app` (old, can keep for compatibility)
- ✅ All `*.vercel.app` domains (automatic)

### Environment Variables to Update

**Railway Backend:**
```env
FRONTEND_URL=https://studentitrack.vercel.app
```

**Vercel Frontend:**
```env
VITE_API_URL=https://web-production-5e2ec.up.railway.app/api
```
(No change needed - this points to Railway backend)

---

## 📋 Checklist

- [ ] Rename project in Vercel to `studentitrack`
- [ ] Wait for new domain: `studentitrack.vercel.app` to be active
- [ ] Update `FRONTEND_URL` in Railway to `https://studentitrack.vercel.app`
- [ ] Wait for Railway to redeploy
- [ ] Test new domain: `https://studentitrack.vercel.app`
- [ ] Verify login works
- [ ] Check browser console for errors

---

## 🎉 After Changes

Your website will be accessible at:
- **New Domain**: `https://studentitrack.vercel.app`
- **Old Domains**: May still work (Vercel keeps old domains active for a while)

---

## ⚠️ Important Notes

1. **DNS Propagation**: Domain changes may take a few minutes to propagate
2. **Old Domain**: Your old domain may still work for a while (Vercel keeps it active)
3. **Bookmarks**: Users may need to update bookmarks
4. **CORS**: Already configured to allow the new domain automatically

---

## 🚀 Quick Summary

1. **Vercel**: Rename project to `studentitrack` → Get `studentitrack.vercel.app`
2. **Railway**: Update `FRONTEND_URL` to `https://studentitrack.vercel.app`
3. **Wait**: 2-3 minutes for deployments
4. **Test**: Visit `https://studentitrack.vercel.app`

That's it! Your website will be accessible at the new domain. 🎉


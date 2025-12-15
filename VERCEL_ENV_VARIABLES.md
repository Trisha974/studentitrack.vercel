# Environment Variables for Vercel Deployment

Copy these values from your local `.env` files and add them to **Vercel Dashboard → Settings → Environment Variables**

## 📍 Where to Set: Vercel Dashboard

1. Go to https://vercel.com/dashboard
2. Select your project: `studentitrack1`
3. Click **Settings** → **Environment Variables**
4. Add each variable below (make sure to select **Production**, **Preview**, and **Development**)

---

## 🔵 Frontend Environment Variables (VITE_*)

Add these from your `client/.env` file:

```
VITE_FIREBASE_API_KEY=AIzaSyD-n0r_yIMMBfTsa2kahr5_xV1iLNvUgHY
VITE_FIREBASE_AUTH_DOMAIN=studitrack-54f69.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=studitrack-54f69
VITE_FIREBASE_STORAGE_BUCKET=studitrack-54f69.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=825538308202
VITE_FIREBASE_APP_ID=1:825538308202:web:5a84a9f2b4f2169b9f0213
VITE_FIREBASE_MEASUREMENT_ID=G-3NHL0FSD9D
VITE_CSRF_TOKEN=super-strong-secret-change-me
```

### ⚠️ IMPORTANT: Set After Railway Deployment
```
VITE_API_URL=https://your-app.up.railway.app/api
```
*(Replace with your Railway backend URL - get this after deploying to Railway)*

---

## 🟢 Backend Environment Variables

Add these from your `server/.env` file:

```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=Crbphy@88
DB_NAME=student_itrack
FRONTEND_URL=https://your-project.vercel.app
```

### ⚠️ Database Host Note:
If your database is on a remote server (not localhost), update `DB_HOST` to your database server address.

---

## 📋 Quick Copy Checklist

### Step 1: Initial Deployment Variables
- [ ] `VITE_FIREBASE_API_KEY`
- [ ] `VITE_FIREBASE_AUTH_DOMAIN`
- [ ] `VITE_FIREBASE_PROJECT_ID`
- [ ] `VITE_FIREBASE_STORAGE_BUCKET`
- [ ] `VITE_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `VITE_FIREBASE_APP_ID`
- [ ] `VITE_FIREBASE_MEASUREMENT_ID`
- [ ] `DB_HOST`
- [ ] `DB_USER`
- [ ] `DB_PASSWORD`
- [ ] `DB_NAME`

### Step 2: After First Deployment
- [ ] `VITE_API_URL` (set to your Vercel URL)
- [ ] `FRONTEND_URL` (set to your Vercel URL)

---

## 🔒 Security Notes

1. **Never commit `.env` files** - They're already in `.gitignore`
2. **Database Password** - Make sure your database allows connections from Vercel's IP addresses
3. **CSRF Token** - Consider changing `VITE_CSRF_TOKEN` to a more secure random string
4. **Database Host** - If using `localhost`, your database won't be accessible. Use a remote database service.

---

## 🌐 Database Access for Vercel

Since Vercel runs in the cloud, `localhost` won't work for database connections. You need:

1. **Remote Database** - Use a cloud database service like:
   - PlanetScale (MySQL)
   - Railway (MySQL)
   - AWS RDS (MySQL)
   - Hostinger MySQL (if accessible from internet)

2. **Update DB_HOST** - Change from `localhost` to your remote database host

---

## 📝 Example: Setting Variables in Vercel

1. Go to: **Project Settings → Environment Variables**
2. Click **Add New**
3. Enter:
   - **Key**: `VITE_FIREBASE_API_KEY`
   - **Value**: `AIzaSyD-n0r_yIMMBfTsa2kahr5_xV1iLNvUgHY`
   - **Environment**: Select all (Production, Preview, Development)
4. Click **Save**
5. Repeat for all variables

---

## ✅ After Adding Variables

1. **Redeploy** your project (Vercel will automatically redeploy if you have auto-deploy enabled)
2. Or manually trigger a new deployment
3. Check deployment logs to verify variables are loaded


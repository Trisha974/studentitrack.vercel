# 🚀 Quick Deployment Guide

## Step-by-Step Deployment Instructions

### 📋 Prerequisites Checklist
- [ ] GitHub repository with your code pushed
- [ ] Railway account (sign up at https://railway.app)
- [ ] Vercel account (sign up at https://vercel.com)

---

## 🚂 PART 1: Deploy Backend to Railway

### Step 1: Create Railway Project
1. Go to https://railway.app and sign in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your repository: `studentitrack.vercel` (or your repo name)
5. Railway will start detecting your project

### Step 2: Add MySQL Database
1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"Add MySQL"**
3. Railway will automatically create a MySQL database
4. **Important:** Note the database name (usually `railway` or `mysql`)

### Step 3: Configure Service Settings
1. Railway should auto-detect your `Procfile`
2. If not, go to your service → **Settings** → **Deploy**
3. Set **Root Directory:** `server` (if needed)
4. Set **Start Command:** `npm start` (Railway will use Procfile)

### Step 4: Set Environment Variables
Go to your Railway service → **Variables** tab, add these:

```env
NODE_ENV=production
PORT=5000

# MySQL Database (Railway auto-provides - use these exact variable names)
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_SSL=true

# JWT Secret (Generate a strong random string)
# Use: openssl rand -base64 32 (or any random string generator)
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long

# JWT Expiration
JWT_EXPIRES_IN=7d

# Frontend URL (You'll update this after Vercel deployment)
# For now, use a placeholder:
FRONTEND_URL=https://your-app.vercel.app
```

**Important Notes:**
- Railway automatically creates MySQL variables when you add the database
- Use the exact format: `${{MySQL.MYSQLHOST}}` (Railway's template syntax)
- Generate a strong JWT_SECRET (at least 32 characters)

### Step 5: Deploy
1. Railway will automatically deploy when you push to GitHub
2. Or click **"Deploy"** in Railway dashboard
3. Wait for deployment to complete
4. Check **Logs** tab for any errors
5. **Copy your Railway URL** (e.g., `https://your-app.up.railway.app`)

### Step 6: Test Backend
1. Open: `https://your-railway-url.up.railway.app/api/health`
2. Should see: `{"status":"ok","message":"Server is running",...}`
3. If error, check Railway logs

### Step 7: Create Database Table
1. In Railway, go to your MySQL database
2. Click **"Query"** tab
3. Copy and paste the SQL from: `server/scripts/create-dashboard-state-table.sql`
4. Click **"Run"**
5. Verify table was created

---

## ▲ PART 2: Deploy Frontend to Vercel

### Step 1: Create Vercel Project
1. Go to https://vercel.com and sign in
2. Click **"Add New Project"**
3. Import your GitHub repository
4. Select the repository: `studentitrack.vercel` (or your repo name)

### Step 2: Configure Project Settings
Vercel should auto-detect from `vercel.json`, but verify:

- **Framework Preset:** Vite
- **Root Directory:** `client` (IMPORTANT!)
- **Build Command:** `npm run build` (auto-detected)
- **Output Directory:** `dist` (auto-detected)
- **Install Command:** `npm ci` (auto-detected)

### Step 3: Set Environment Variables
In **Environment Variables** section, add:

```env
VITE_API_URL=https://your-railway-url.up.railway.app/api
```

**Replace `your-railway-url` with your actual Railway backend URL!**

### Step 4: Deploy
1. Click **"Deploy"**
2. Wait for build to complete (usually 1-2 minutes)
3. **Copy your Vercel URL** (e.g., `https://your-app.vercel.app`)

### Step 5: Test Frontend
1. Open your Vercel URL
2. Try to register/login
3. Check browser console for errors

---

## 🔄 PART 3: Connect Frontend to Backend

### Step 1: Update Railway CORS
1. Go back to Railway → Your service → **Variables**
2. Update `FRONTEND_URL`:
   ```env
   FRONTEND_URL=https://your-app.vercel.app
   ```
3. Replace with your actual Vercel URL
4. Railway will auto-redeploy

### Step 2: Verify Connection
1. Open your Vercel frontend
2. Open browser DevTools → Network tab
3. Try to login/register
4. Check if API calls go to Railway backend
5. Should see requests to: `https://your-railway-url.up.railway.app/api/...`

---

## ✅ Final Checklist

### Backend (Railway)
- [ ] Service deployed successfully
- [ ] MySQL database connected
- [ ] Environment variables set
- [ ] `/api/health` endpoint works
- [ ] `dashboard_state` table created
- [ ] CORS allows Vercel URL

### Frontend (Vercel)
- [ ] Build completed successfully
- [ ] `VITE_API_URL` points to Railway backend
- [ ] Frontend loads without errors
- [ ] Can register new account
- [ ] Can login
- [ ] Dashboard loads

---

## 🐛 Troubleshooting

### Backend Issues

**"Cannot connect to database"**
- Check Railway MySQL variables are set correctly
- Verify `DB_SSL=true` if Railway requires SSL
- Check database name matches

**"CORS error"**
- Verify `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Check CORS plugin allows Vercel domain
- Redeploy backend after changing CORS

**"Port already in use"**
- Railway handles this automatically
- Don't set PORT manually unless needed

### Frontend Issues

**"Failed to fetch" or "Network error"**
- Check `VITE_API_URL` in Vercel environment variables
- Verify Railway backend is running
- Test Railway health endpoint directly
- Check browser console for exact error

**"Build failed"**
- Check Node.js version (Vite requires Node 14+)
- Verify all dependencies in `package.json`
- Check Vercel build logs

---

## 📝 Quick Reference

### Railway Backend URL Format
```
https://your-service-name.up.railway.app
```

### Vercel Frontend URL Format
```
https://your-project-name.vercel.app
```

### Environment Variables Summary

**Railway:**
- `DB_HOST=${{MySQL.MYSQLHOST}}`
- `DB_USER=${{MySQL.MYSQLUSER}}`
- `DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}`
- `DB_NAME=${{MySQL.MYSQLDATABASE}}`
- `DB_PORT=${{MySQL.MYSQLPORT}}`
- `DB_SSL=true`
- `JWT_SECRET=your-secret`
- `FRONTEND_URL=https://your-vercel-app.vercel.app`

**Vercel:**
- `VITE_API_URL=https://your-railway-app.up.railway.app/api`

---

## 🎉 You're Live!

Once both are deployed:
- **Frontend:** https://your-app.vercel.app
- **Backend:** https://your-app.up.railway.app

Test the full flow:
1. Register a new account
2. Login
3. Access professor/student dashboard
4. Create subjects, add students, record grades

Good luck! 🚀


# Deployment Guide: Railway (Backend) + Vercel (Frontend)

## Prerequisites
- Railway account (for backend)
- Vercel account (for frontend)
- MySQL database (Railway provides MySQL addon)

---

## 🚂 Backend Deployment (Railway)

### Step 1: Create Railway Project
1. Go to [Railway](https://railway.app)
2. Click "New Project"
3. Select "Deploy from GitHub repo" (or upload code)

### Step 2: Add MySQL Database
1. In Railway project, click "+ New"
2. Select "Database" → "MySQL"
3. Railway will automatically create a MySQL database
4. Note the connection details (will be in environment variables)

### Step 3: Configure Environment Variables
In Railway project settings, add these environment variables:

```env
NODE_ENV=production
PORT=5000

# MySQL Database (Railway auto-provides these)
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_SSL=true

# Frontend URL (Your Vercel deployment URL)
FRONTEND_URL=https://your-app-name.vercel.app

# JWT Secret (Generate a strong random string)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# JWT Expiration (optional)
JWT_EXPIRES_IN=7d

# CSRF Secret (optional, generate random string)
CSRF_SECRET=your-random-csrf-secret
```

**Important:** Railway automatically provides MySQL connection variables:
- `${{MySQL.MYSQLHOST}}` - Database host
- `${{MySQL.MYSQLUSER}}` - Database user
- `${{MySQL.MYSQLPASSWORD}}` - Database password
- `${{MySQL.MYSQLDATABASE}}` - Database name
- `${{MySQL.MYSQLPORT}}` - Database port

### Step 4: Deploy
1. Railway will automatically detect the `Procfile` or `package.json` start script
2. It will run: `cd server && npm install && npm start`
3. Wait for deployment to complete
4. Note the Railway deployment URL (e.g., `https://your-app.up.railway.app`)

### Step 5: Run Database Migrations
After first deployment, run the SQL script to create the `dashboard_state` table:

1. Connect to your Railway MySQL database
2. Run: `server/scripts/create-dashboard-state-table.sql`

Or use Railway's database console to execute the SQL.

---

## ▲ Frontend Deployment (Vercel)

### Step 1: Create Vercel Project
1. Go to [Vercel](https://vercel.com)
2. Click "Add New Project"
3. Import your GitHub repository
4. Select the `client` folder as the root directory

### Step 2: Configure Build Settings
Vercel should auto-detect these from `vercel.json`:
- **Framework Preset:** Vite
- **Root Directory:** `client`
- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm ci`

### Step 3: Configure Environment Variables
In Vercel project settings → Environment Variables, add:

```env
# Backend API URL (Your Railway deployment URL)
VITE_API_URL=https://your-app.up.railway.app/api
```

**Important:** Replace `https://your-app.up.railway.app` with your actual Railway backend URL.

### Step 4: Deploy
1. Click "Deploy"
2. Vercel will build and deploy your frontend
3. Note the Vercel deployment URL (e.g., `https://your-app.vercel.app`)

### Step 5: Update Backend CORS
After getting your Vercel URL, update Railway environment variable:
```env
FRONTEND_URL=https://your-app.vercel.app
```

Then redeploy the backend so CORS allows your Vercel frontend.

---

## ✅ Post-Deployment Checklist

### Backend (Railway)
- [ ] MySQL database connected
- [ ] Environment variables configured
- [ ] `dashboard_state` table created
- [ ] Backend URL accessible (test `/api/health`)
- [ ] CORS allows Vercel frontend URL

### Frontend (Vercel)
- [ ] `VITE_API_URL` points to Railway backend
- [ ] Build completes successfully
- [ ] Frontend can connect to backend API
- [ ] Login/Register works
- [ ] Dashboard loads correctly

---

## 🔧 Troubleshooting

### Backend Issues

**Database Connection Failed:**
- Check Railway MySQL connection variables
- Verify `DB_SSL=true` if Railway requires SSL
- Check database name matches

**CORS Errors:**
- Ensure `FRONTEND_URL` in Railway matches your Vercel URL
- Check CORS plugin allows Vercel domain
- Redeploy backend after changing CORS settings

### Frontend Issues

**API Connection Failed:**
- Verify `VITE_API_URL` in Vercel environment variables
- Check Railway backend is running and accessible
- Test backend health endpoint: `https://your-backend.up.railway.app/api/health`

**Build Fails:**
- Check Node.js version compatibility
- Verify all dependencies in `package.json`
- Check Vite build logs in Vercel

---

## 📝 Environment Variables Summary

### Railway (Backend)
```env
NODE_ENV=production
PORT=5000
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}
DB_PORT=${{MySQL.MYSQLPORT}}
DB_SSL=true
FRONTEND_URL=https://your-app.vercel.app
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=7d
```

### Vercel (Frontend)
```env
VITE_API_URL=https://your-app.up.railway.app/api
```

---

## 🎉 You're Done!

Your application should now be live:
- **Frontend:** `https://your-app.vercel.app`
- **Backend:** `https://your-app.up.railway.app`

Test the deployment by:
1. Opening your Vercel URL
2. Creating a new account
3. Logging in
4. Testing dashboard functionality


# Complete Deployment Setup Guide

## Architecture

- **Frontend (React/Vite)**: Deployed on **Vercel**
- **Backend (Express.js)**: Deployed on **Railway**
- **Database**: MySQL on Railway (or external)

## Quick Start

### 1. Deploy Backend to Railway

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select: `Trisha974/studentitrack1`
4. In service settings, set **Root Directory** to: `server`
5. Add MySQL database (Railway → + New → Database → MySQL)
6. Add environment variables (see below)
7. Deploy and note your Railway URL (e.g., `https://your-app.up.railway.app`)

### 2. Deploy Frontend to Vercel

1. Go to https://vercel.com/new
2. Import repository: `Trisha974/studentitrack1`
3. Configure:
   - **Root Directory**: `.` (root)
   - **Build Command**: `cd client && npm ci && npm run build`
   - **Output Directory**: `client/dist`
   - **Install Command**: `cd client && npm ci`
4. Add environment variables (see below)
5. Deploy

### 3. Connect Frontend to Backend

After both are deployed:

1. Get your Railway backend URL: `https://your-app.up.railway.app`
2. Update Vercel environment variable:
   ```
   VITE_API_URL=https://your-app.up.railway.app/api
   ```
3. Redeploy Vercel frontend

## Environment Variables

### Railway (Backend) Variables

```
# Database (if using Railway MySQL, use Railway's provided variables)
DB_HOST=${{MySQL.MYSQLHOST}}
DB_USER=${{MySQL.MYSQLUSER}}
DB_PASSWORD=${{MySQL.MYSQLPASSWORD}}
DB_NAME=${{MySQL.MYSQLDATABASE}}

# Server
NODE_ENV=production
PORT=5000

# Frontend URL (your Vercel URL)
FRONTEND_URL=https://your-project.vercel.app

# Optional
CSRF_SECRET=your-random-secret
```

### Vercel (Frontend) Variables

```
# Firebase
VITE_FIREBASE_API_KEY=AIzaSyD-n0r_yIMMBfTsa2kahr5_xV1iLNvUgHY
VITE_FIREBASE_AUTH_DOMAIN=studitrack-54f69.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=studitrack-54f69
VITE_FIREBASE_STORAGE_BUCKET=studitrack-54f69.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=825538308202
VITE_FIREBASE_APP_ID=1:825538308202:web:5a84a9f2b4f2169b9f0213
VITE_FIREBASE_MEASUREMENT_ID=G-3NHL0FSD9D

# Backend API URL (set after Railway deployment)
VITE_API_URL=https://your-app.up.railway.app/api

# Optional
VITE_CSRF_TOKEN=super-strong-secret-change-me
```

## Deployment Order

1. ✅ **Deploy Backend to Railway** → Get Railway URL
2. ✅ **Deploy Frontend to Vercel** → Get Vercel URL
3. ✅ **Update Railway `FRONTEND_URL`** → Set to Vercel URL
4. ✅ **Update Vercel `VITE_API_URL`** → Set to Railway URL + `/api`
5. ✅ **Redeploy both** → Test connection

## Testing

### Backend Health Check
```bash
curl https://your-app.up.railway.app/api/health
```
Should return: `{"status":"ok","message":"Server is running"}`

### Frontend
Visit your Vercel URL and check browser console for API connection.

## Troubleshooting

### Backend not accessible
- Check Railway deployment logs
- Verify `PORT` environment variable (Railway provides this automatically)
- Check database connection variables

### Frontend can't connect to backend
- Verify `VITE_API_URL` is set correctly in Vercel
- Check CORS settings in backend (should allow Vercel domain)
- Verify Railway backend is running (check Railway logs)

### CORS errors
- Ensure `FRONTEND_URL` in Railway matches your Vercel URL exactly
- Check backend CORS configuration allows your Vercel domain

## Files Created

- `railway.json` - Railway configuration (root)
- `server/railway.json` - Railway configuration for server
- `vercel.json` - Updated for frontend-only deployment
- `RAILWAY_DEPLOYMENT.md` - Detailed Railway guide
- `DEPLOYMENT_SETUP.md` - This file

## Next Steps

1. Deploy backend to Railway
2. Deploy frontend to Vercel  
3. Connect them together
4. Test the full application


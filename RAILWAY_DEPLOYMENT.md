# Railway Backend Deployment Guide

This guide will help you deploy your Express.js backend to Railway.

## Prerequisites

1. A Railway account (sign up at https://railway.app)
2. GitHub account (your code is already on GitHub)
3. MySQL database (Railway provides MySQL, or use external service)

## Step 1: Create Railway Project

1. Go to https://railway.app/new
2. Click **"Deploy from GitHub repo"**
3. Select your repository: `Trisha974/studentitrack1`
4. Railway will detect it's a Node.js project

## Step 2: Configure Railway Service

### Set Root Directory

1. Go to your service settings
2. Under **"Root Directory"**, set it to: `server`
3. This tells Railway to deploy only the server folder

### Configure Build Settings

Railway should auto-detect, but verify:
- **Build Command**: `npm ci` (or leave empty, Railway will auto-detect)
- **Start Command**: `npm start`

## Step 3: Add MySQL Database

### Option A: Use Railway MySQL (Recommended)

1. In your Railway project, click **"+ New"**
2. Select **"Database"** → **"Add MySQL"**
3. Railway will create a MySQL database automatically
4. Note the connection details (they'll be in environment variables)

### Option B: Use External MySQL

If you have an external MySQL database:
- You'll need to add connection details manually as environment variables

## Step 4: Set Environment Variables

Go to your Railway service → **Variables** tab and add:

### Database Configuration
```
DB_HOST=your-mysql-host
DB_USER=your-mysql-user
DB_PASSWORD=your-mysql-password
DB_NAME=student_itrack
```

**If using Railway MySQL:**
- Railway automatically provides these as `MYSQLHOST`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE`
- Map them to your app's expected names:
  - `DB_HOST` = `${{MySQL.MYSQLHOST}}`
  - `DB_USER` = `${{MySQL.MYSQLUSER}}`
  - `DB_PASSWORD` = `${{MySQL.MYSQLPASSWORD}}`
  - `DB_NAME` = `${{MySQL.MYSQLDATABASE}}`

### Server Configuration
```
NODE_ENV=production
PORT=5000
```

### Frontend URL (Your Vercel URL)
```
FRONTEND_URL=https://your-project.vercel.app
```
*(Replace with your actual Vercel frontend URL)*

### Optional Variables
```
CSRF_SECRET=your-random-csrf-secret
```

### Firebase Admin SDK (if needed)
```
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
```

## Step 5: Deploy

1. Railway will automatically deploy when you push to GitHub
2. Or click **"Deploy"** manually
3. Wait for deployment to complete
4. Note your Railway backend URL (e.g., `https://your-app.up.railway.app`)

## Step 6: Update Frontend Configuration

After Railway deployment, update your Vercel environment variables:

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add/Update:
   ```
   VITE_API_URL=https://your-app.up.railway.app/api
   ```
3. Redeploy your Vercel frontend

## Step 7: Update CORS in Backend

Your backend CORS is already configured to accept requests from your frontend URL. Make sure `FRONTEND_URL` in Railway matches your Vercel URL.

## Database Setup

### Initial Database Setup

After deployment, you may need to run database migrations:

1. Connect to your Railway MySQL database
2. Run your setup scripts (if needed):
   ```bash
   # Via Railway CLI or SSH
   railway run npm run setup-db
   ```

### Railway MySQL Connection

Railway provides MySQL connection via:
- **Internal**: Use `MYSQLHOST` (for services in same project)
- **External**: Use the public connection string (if enabled)

## Monitoring & Logs

- **Logs**: View in Railway dashboard → Your Service → Logs
- **Metrics**: Railway provides CPU, Memory, and Network metrics
- **Deployments**: View deployment history and rollback if needed

## Troubleshooting

### Database Connection Issues

1. Verify environment variables are set correctly
2. Check Railway MySQL service is running
3. Verify database credentials match

### Port Issues

- Railway automatically assigns a `PORT` environment variable
- Your app should use `process.env.PORT` (which it does)
- Don't hardcode port numbers

### CORS Errors

1. Verify `FRONTEND_URL` matches your Vercel URL exactly
2. Check backend logs for CORS errors
3. Ensure frontend `VITE_API_URL` points to Railway backend

### Build Failures

1. Check Railway build logs
2. Verify `server/package.json` has correct scripts
3. Ensure all dependencies are listed in `package.json`

## Railway CLI (Optional)

Install Railway CLI for easier management:

```bash
npm i -g @railway/cli
railway login
railway link  # Link to your project
railway up   # Deploy
railway logs # View logs
```

## Cost Considerations

- Railway offers a free tier with $5 credit monthly
- MySQL database included
- Pay-as-you-go pricing after free tier
- Check Railway pricing for current rates

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Get Railway backend URL
3. ✅ Update Vercel `VITE_API_URL` environment variable
4. ✅ Redeploy Vercel frontend
5. ✅ Test the full stack

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Check Railway status: https://status.railway.app




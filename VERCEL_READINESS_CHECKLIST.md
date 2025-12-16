# Vercel Deployment Readiness Checklist

## ✅ Configuration Files (Ready)

- [x] `vercel.json` - Configured with build commands and API routes
- [x] `api/index.js` - Serverless function wrapper created
- [x] `.gitignore` - Properly excludes sensitive files
- [x] `.vercelignore` - Excludes unnecessary files from deployment
- [x] `package.json` - Root package.json with scripts

## ⚠️ Before Deploying - Required Actions

### 1. Environment Variables Setup
You MUST set these in Vercel Dashboard → Settings → Environment Variables:

#### Backend (Required):
```
DB_HOST=your-database-host
DB_USER=your-database-username  
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
```

#### Frontend (Required):
```
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

#### After First Deployment (Important!):
```
VITE_API_URL=https://your-project.vercel.app/api
FRONTEND_URL=https://your-project.vercel.app
```

#### Optional:
```
CSRF_SECRET=your-csrf-secret
VITE_CSRF_TOKEN=your-csrf-token
```

### 2. Database Requirements
- ✅ Your MySQL database MUST be accessible from the internet
- ✅ Database must allow connections from Vercel's IP addresses
- ⚠️ Consider using a managed database service (PlanetScale, Railway, AWS RDS, etc.)

### 3. Firebase Configuration
- ✅ Firebase project must be set up
- ✅ Firebase authentication must be configured
- ✅ Firebase storage bucket must be accessible

## 📋 Deployment Steps

1. **Go to Vercel Dashboard**
   - Visit https://vercel.com/new
   - Import repository: `https://github.com/Trisha974/studentitrack1.git`

2. **Configure Project Settings**
   - Root Directory: `.` (root)
   - Framework Preset: Other
   - Build Command: `cd client && npm run build`
   - Output Directory: `client/dist`
   - Install Command: `cd client && npm install && cd ../server && npm install`

3. **Add Environment Variables**
   - Go to Settings → Environment Variables
   - Add all variables listed above
   - Make sure to add for Production, Preview, and Development

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Note your deployment URL

5. **Update VITE_API_URL**
   - After first deployment, add `VITE_API_URL` pointing to your Vercel URL
   - Redeploy to apply changes

## 🔍 Verification Checklist

After deployment, verify:
- [ ] Frontend loads at your Vercel URL
- [ ] API health check works: `https://your-project.vercel.app/api/health`
- [ ] Database connection is working
- [ ] Firebase authentication works
- [ ] CORS is allowing requests from your frontend
- [ ] All API endpoints are accessible

## ⚠️ Known Considerations

1. **Serverless Functions**: Your Express server runs as serverless functions. Each API route is a separate function invocation.

2. **Cold Starts**: First request after inactivity may be slower (cold start).

3. **Database Connections**: MySQL connection pooling works, but connections may timeout. Consider connection limits.

4. **File Uploads**: Large file uploads (50MB limit) should work, but verify storage limits.

5. **Environment Variables**: All `VITE_*` variables must be set in Vercel for the frontend to access them.

## 🐛 Troubleshooting

If deployment fails:
- Check build logs in Vercel dashboard
- Verify all environment variables are set
- Ensure database is accessible from internet
- Check Node.js version compatibility (>=14.0.0)

If API doesn't work:
- Verify `VITE_API_URL` is set correctly
- Check function logs in Vercel dashboard
- Verify database connection credentials
- Check CORS configuration

## ✅ Status: READY TO DEPLOY

Your project is configured and ready for Vercel deployment. Follow the steps above to deploy!




# Quick Start: Deploy to Vercel

## Step 1: Prepare Your Repository
1. Make sure your code is pushed to GitHub, GitLab, or Bitbucket
2. All changes are committed

## Step 2: Connect to Vercel
1. Go to https://vercel.com/new
2. Sign in with your Git provider
3. Import your repository

## Step 3: Configure Project Settings
In Vercel project settings, set:
- **Root Directory:** `.` (root)
- **Framework Preset:** Other
- **Build Command:** `cd client && npm run build`
- **Output Directory:** `client/dist`
- **Install Command:** `cd client && npm install && cd ../server && npm install`

## Step 4: Add Environment Variables
Go to **Settings → Environment Variables** and add:

### Required Backend Variables:
```
DB_HOST=your-database-host
DB_USER=your-database-user
DB_PASSWORD=your-database-password
DB_NAME=your-database-name
```

### Required Frontend Variables:
```
VITE_FIREBASE_API_KEY=your-firebase-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-firebase-auth-domain
VITE_FIREBASE_PROJECT_ID=your-firebase-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-firebase-storage-bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your-firebase-messaging-sender-id
VITE_FIREBASE_APP_ID=your-firebase-app-id
```

### Optional Variables:
```
CSRF_SECRET=your-csrf-secret
VITE_CSRF_TOKEN=your-csrf-token
FRONTEND_URL=https://your-project.vercel.app
```

**Important:** After adding environment variables, you'll need to redeploy!

## Step 5: Set VITE_API_URL After First Deployment
1. Deploy your project (even if it fails, you'll get a URL)
2. Copy your Vercel deployment URL (e.g., `https://your-project.vercel.app`)
3. Add environment variable: `VITE_API_URL=https://your-project.vercel.app/api`
4. Redeploy

## Step 6: Deploy!
Click **Deploy** and wait for the build to complete.

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Verify all dependencies are in package.json files
- Ensure Node.js version is compatible (>=14.0.0)

### API Not Working
- Verify `VITE_API_URL` is set correctly
- Check database connection settings
- Review function logs in Vercel dashboard

### CORS Errors
- The API automatically allows Vercel domains
- Check that `FRONTEND_URL` matches your deployment URL

## Need Help?
See `VERCEL_DEPLOYMENT.md` for detailed documentation.


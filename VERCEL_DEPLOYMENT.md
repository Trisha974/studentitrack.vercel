# Vercel Deployment Guide

This guide will help you deploy your Student iTrack application to Vercel.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed (optional, for CLI deployment)
3. Your project pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Environment Variables

You need to set the following environment variables in your Vercel project settings:

### Frontend Environment Variables (Client)
- `VITE_API_URL` - Your Vercel API URL (will be set automatically, format: `https://your-project.vercel.app/api`)
- `VITE_CSRF_TOKEN` - CSRF token for API requests (optional)
- `VITE_FIREBASE_API_KEY` - Firebase API key
- `VITE_FIREBASE_AUTH_DOMAIN` - Firebase auth domain
- `VITE_FIREBASE_PROJECT_ID` - Firebase project ID
- `VITE_FIREBASE_STORAGE_BUCKET` - Firebase storage bucket
- `VITE_FIREBASE_MESSAGING_SENDER_ID` - Firebase messaging sender ID
- `VITE_FIREBASE_APP_ID` - Firebase app ID
- `VITE_FIREBASE_MEASUREMENT_ID` - Firebase measurement ID (optional, for analytics)

### Backend Environment Variables (Server)
- `DB_HOST` - MySQL database host
- `DB_USER` - MySQL database username
- `DB_PASSWORD` - MySQL database password
- `DB_NAME` - MySQL database name
- `CSRF_SECRET` - CSRF secret token (optional)
- `FRONTEND_URL` - Your Vercel frontend URL (will be set automatically)

### Firebase Configuration
Make sure your Firebase configuration is properly set up in `client/src/firebase.js` with environment variables or Firebase config.

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect your repository:**
   - Go to https://vercel.com/new
   - Import your Git repository
   - Vercel will auto-detect the project settings

2. **Configure project settings:**
   - **Root Directory:** Leave as root (`.`)
   - **Framework Preset:** Other (or Vite if available)
   - **Build Command:** `cd client && npm run build`
   - **Output Directory:** `client/dist`
   - **Install Command:** `cd client && npm install && cd ../server && npm install`

3. **Add environment variables:**
   - Go to Project Settings → Environment Variables
   - Add all the environment variables listed above
   - Make sure to add them for Production, Preview, and Development environments

4. **Deploy:**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI:**
   ```bash
   npm i -g vercel
   ```

2. **Login to Vercel:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   vercel
   ```

4. **Set environment variables:**
   ```bash
   vercel env add DB_HOST
   vercel env add DB_USER
   vercel env add DB_PASSWORD
   vercel env add DB_NAME
   # ... add all other environment variables
   ```

5. **Deploy to production:**
   ```bash
   vercel --prod
   ```

## Important Notes

### Database Connection
- Your MySQL database must be accessible from the internet
- Consider using a managed database service (like PlanetScale, Railway, or AWS RDS)
- Make sure your database allows connections from Vercel's IP addresses

### CORS Configuration
The API automatically allows requests from:
- Your Vercel deployment URL
- All Vercel preview deployments (*.vercel.app)
- Localhost (for development)

### API Routes
All API routes are available at `/api/*`:
- `/api/students`
- `/api/professors`
- `/api/courses`
- `/api/enrollments`
- `/api/grades`
- `/api/attendance`
- `/api/notifications`
- `/api/reports`
- `/api/health`

### Build Process
1. Vercel installs dependencies for both client and server
2. Builds the React frontend using Vite
3. Sets up serverless functions for API routes
4. Deploys everything together

## Troubleshooting

### Build Failures
- Check that all dependencies are listed in `package.json` files
- Verify Node.js version compatibility (check `server/package.json` engines)
- Review build logs in Vercel dashboard

### API Not Working
- Verify environment variables are set correctly
- Check database connection settings
- Review serverless function logs in Vercel dashboard
- Ensure CORS is configured correctly

### Frontend Not Loading
- Verify `VITE_API_URL` is set to your Vercel API URL
- Check browser console for errors
- Verify Firebase configuration

## Post-Deployment

After deployment:
1. Update your Firebase hosting settings if needed
2. Test all API endpoints
3. Verify database connections
4. Test authentication flow
5. Monitor Vercel logs for any issues

## Continuous Deployment

Vercel automatically deploys on every push to your main branch:
- Production deployments: pushes to `main` branch
- Preview deployments: pushes to other branches or pull requests

## Support

For issues specific to:
- **Vercel:** Check Vercel documentation or support
- **Project:** Check project README or documentation
- **Database:** Verify database connection and credentials


# Expose Railway Service - Get Public URL

## Current Status
Your service is deployed but **"Unexposed"** - meaning it's running but not accessible from the internet.

## Step 1: Expose Your Service

1. In your Railway dashboard, click on your **"studentitrack1"** service
2. Look for the **"Settings"** tab (or check the service overview)
3. Find the **"Networking"** or **"Public Networking"** section
4. Click **"Generate Domain"** or **"Expose"** button
5. Railway will generate a public URL like: `https://studentitrack1-production.up.railway.app`

## Step 2: Note Your Public URL

After exposing, you'll get a URL like:
```
https://studentitrack1-production.up.railway.app
```

**Save this URL** - you'll need it for:
- Setting `VITE_API_URL` in Vercel
- Testing your API endpoints
- Updating `FRONTEND_URL` in Railway (after Vercel deployment)

## Step 3: Test Your Backend

Once exposed, test your backend:

### Health Check
```bash
curl https://your-service.up.railway.app/api/health
```

Should return:
```json
{"status":"ok","message":"Server is running"}
```

### In Browser
Visit: `https://your-service.up.railway.app/api/health`

## Step 4: Update Environment Variables

### In Railway (Backend)
After you deploy your frontend to Vercel, update Railway:

1. Go to Railway → Your Service → **Variables**
2. Add/Update:
   ```
   FRONTEND_URL = https://your-project.vercel.app
   ```
   (Replace with your actual Vercel URL)

### In Vercel (Frontend)
1. Go to Vercel → Your Project → **Settings** → **Environment Variables**
2. Add/Update:
   ```
   VITE_API_URL = https://your-service.up.railway.app/api
   ```
   (Replace with your Railway URL + `/api`)

## Step 5: Verify Database Connection

Check Railway logs to ensure database is connected:

1. Go to Railway → Your Service → **Logs**
2. Look for:
   ```
   📊 Database Configuration:
      Host: [your-mysql-host]
      User: [your-mysql-user]
      Database: [your-database-name]
   ✅ MySQL connected successfully
   ```

If you see connection errors, check `RAILWAY_DATABASE_SETUP.md` for database setup.

## Quick Checklist

- [ ] Service is exposed (has public URL)
- [ ] Health check endpoint works (`/api/health`)
- [ ] Database connection successful (check logs)
- [ ] Environment variables set:
  - [ ] `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
  - [ ] `NODE_ENV=production`
  - [ ] `PORT=5000`
  - [ ] `FRONTEND_URL` (set after Vercel deployment)
- [ ] Ready to connect frontend

## Next Steps

1. ✅ Expose Railway service → Get public URL
2. ✅ Test backend API endpoints
3. ✅ Deploy frontend to Vercel
4. ✅ Connect frontend to backend (set `VITE_API_URL`)
5. ✅ Update Railway `FRONTEND_URL` to Vercel URL
6. ✅ Test full stack

## Troubleshooting

### Can't find "Expose" button
- Check if you're on the correct service
- Look in **Settings** → **Networking** section
- Some Railway plans may have different UI

### Service still shows "Unexposed"
- Make sure you clicked "Generate Domain" or "Expose"
- Refresh the page
- Check if there are any errors in the service status

### URL not working
- Wait a few minutes for DNS propagation
- Check Railway logs for errors
- Verify the service is "Online" (green dot)




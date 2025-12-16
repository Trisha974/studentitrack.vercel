# Railway Environment Variables Checklist

## ✅ Required Database Variables

Add these in Railway → Your Service → Variables tab:

### Option 1: Using Railway MySQL (Recommended)

If you added MySQL database via Railway:

1. Click **"+ New Variable"**
2. Add each variable using Railway's reference syntax:

```
DB_HOST = ${{MySQL.MYSQLHOST}}
DB_USER = ${{MySQL.MYSQLUSER}}
DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}
DB_NAME = ${{MySQL.MYSQLDATABASE}}
```

**Important:** 
- Use the exact syntax: `${{MySQL.VARIABLE_NAME}}`
- Make sure MySQL service is added to your Railway project first
- MySQL service must be in the same project as your backend service

### Option 2: Using External MySQL

If using an external MySQL database:

```
DB_HOST = your-mysql-host.com
DB_USER = your-username
DB_PASSWORD = your-password
DB_NAME = student_itrack
```

## ✅ Required Server Variables

```
NODE_ENV = production
PORT = 5000
```

**Note:** Railway automatically provides `PORT`, but you can set it explicitly.

## ✅ Frontend URL (Set After Vercel Deployment)

```
FRONTEND_URL = https://your-project.vercel.app
```

Replace with your actual Vercel frontend URL after deployment.

## ✅ Firebase Admin SDK Variables (Required for Authentication)

These are **required** for token verification and authentication to work properly. Without these, you'll see warnings in your logs.

### How to Get Firebase Admin SDK Credentials

1. **Go to Firebase Console**
   - Visit https://console.firebase.google.com
   - Select your project: `studitrack-54f69`

2. **Create Service Account**
   - Click the **gear icon** ⚙️ next to "Project Overview"
   - Select **"Project settings"**
   - Go to **"Service accounts"** tab
   - Click **"Generate new private key"**
   - A JSON file will download (keep this secure!)

3. **Extract Values from JSON**
   - Open the downloaded JSON file
   - You'll see something like:
     ```json
     {
       "project_id": "studitrack-54f69",
       "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
       "client_email": "firebase-adminsdk-xxxxx@studitrack-54f69.iam.gserviceaccount.com"
     }
     ```

4. **Add to Railway Variables**
   ```
   FIREBASE_PROJECT_ID = studitrack-54f69
   FIREBASE_PRIVATE_KEY = "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
   FIREBASE_CLIENT_EMAIL = firebase-adminsdk-xxxxx@studitrack-54f69.iam.gserviceaccount.com
   ```

**Important Notes:**
- `FIREBASE_PRIVATE_KEY` must include the quotes and keep the `\n` characters (they'll be converted to newlines)
- Copy the entire private key including `-----BEGIN PRIVATE KEY-----` and `-----END PRIVATE KEY-----`
- The private key should be on a single line with `\n` characters

### ⚠️ Current Warning

If you see this in your logs:
```
⚠️ Firebase Admin SDK not configured. Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL in .env
⚠️ Token verification will not work until Firebase Admin SDK is configured
```

This means you need to add these three variables to Railway.

## ✅ Optional Variables

```
CSRF_SECRET = your-random-secret-string
```

## Step-by-Step: Adding Variables in Railway

1. **Go to Railway Dashboard**
   - Navigate to your project
   - Click on your **"studentitrack1"** service

2. **Open Variables Tab**
   - Click on **"Variables"** tab (next to Deployments)

3. **Add Database Variables**
   - Click **"+ New Variable"** button
   - For each variable:
     - **Key**: `DB_HOST`
     - **Value**: `${{MySQL.MYSQLHOST}}`
     - Click **"Add"**
   - Repeat for: `DB_USER`, `DB_PASSWORD`, `DB_NAME`

4. **Add Other Variables**
   - Add `NODE_ENV = production`
   - Add `PORT = 5000`
   - Add `FRONTEND_URL` (after Vercel deployment)
   - Add `FIREBASE_PROJECT_ID = studitrack-54f69`
   - Add `FIREBASE_PRIVATE_KEY` (from Firebase service account JSON)
   - Add `FIREBASE_CLIENT_EMAIL` (from Firebase service account JSON)

5. **Verify Variables**
   - Check that all variables are listed
   - Ensure values are correct (especially the `${{MySQL.}}` syntax)

6. **Redeploy**
   - Railway will automatically redeploy after adding variables
   - Or manually trigger a redeploy

## Verification: Check Logs

After adding variables and redeploying, check Railway logs:

1. Go to **"Logs"** tab
2. Look for these messages:

### ✅ Success Indicators:
```
📊 Database Configuration:
   Host: [your-mysql-host]
   User: [your-mysql-user]
   Database: [your-database-name]
✅ MySQL connected successfully
✅ Firebase Admin SDK initialized successfully
```

### ❌ Error Indicators:
```
❌ MySQL connection error: connect ECONNREFUSED ::1:3306
```
This means `DB_HOST` is still `localhost` - variables not set correctly.

```
❌ MySQL connection error: Access denied
```
This means `DB_USER` or `DB_PASSWORD` is incorrect.

## Troubleshooting

### Problem: Variables show as empty or localhost

**Solution:**
1. Verify MySQL service is added to Railway project
2. Check variable syntax: `${{MySQL.MYSQLHOST}}` (not `$MySQL.MYSQLHOST`)
3. Ensure MySQL service is in same project as backend
4. Try removing and re-adding variables

### Problem: Can't see MySQL variables

**Solution:**
1. Make sure MySQL database is added via Railway
2. MySQL service must be in same project
3. Check Railway MySQL service is running (green status)

### Problem: Still getting connection errors

**Solution:**
1. Check Railway logs for exact error message
2. Verify all 4 database variables are set:
   - `DB_HOST`
   - `DB_USER`
   - `DB_PASSWORD`
   - `DB_NAME`
3. Ensure MySQL service is running
4. Try redeploying the service

## Quick Checklist

- [ ] MySQL database added to Railway project
- [ ] MySQL service is running (green status)
- [ ] Backend service is in same project as MySQL
- [ ] Variables added:
  - [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}`
  - [ ] `DB_USER = ${{MySQL.MYSQLUSER}}`
  - [ ] `DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}`
  - [ ] `DB_NAME = ${{MySQL.MYSQLDATABASE}}`
  - [ ] `NODE_ENV = production`
  - [ ] `PORT = 5000`
  - [ ] `FIREBASE_PROJECT_ID = studitrack-54f69`
  - [ ] `FIREBASE_PRIVATE_KEY` (from Firebase service account)
  - [ ] `FIREBASE_CLIENT_EMAIL` (from Firebase service account)
- [ ] Service redeployed
- [ ] Checked logs for successful connection

## Need Help?

If you're still seeing connection errors:

1. **Check Railway Logs** - Look for the exact error message
2. **Verify Variables** - Make sure all variables are set correctly
3. **Test Database** - Try connecting to MySQL via Railway's MySQL console
4. **Check MySQL Status** - Ensure MySQL service is running

Share the error message from Railway logs for more specific help!




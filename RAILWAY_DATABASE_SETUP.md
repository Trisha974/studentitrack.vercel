# Railway Database Setup - Fix Connection Error

## Problem
```
❌ MySQL connection error: connect ECONNREFUSED ::1:3306
```

This error means your app is trying to connect to `localhost` instead of Railway's MySQL database.

## Solution: Set Railway Environment Variables

### Step 1: Add MySQL Database to Railway

1. In your Railway project dashboard
2. Click **"+ New"** → **"Database"** → **"Add MySQL"**
3. Railway will create a MySQL database automatically
4. Note: Railway automatically provides connection variables

### Step 2: Link MySQL to Your Service

1. Click on your **backend service** (the Node.js service)
2. Go to **"Variables"** tab
3. You should see Railway's MySQL variables available:
   - `MYSQLHOST`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`
   - `MYSQLDATABASE`
   - `MYSQLPORT`

### Step 3: Add Environment Variables

In your backend service **Variables** tab, add these variables:

#### Option A: Use Railway's MySQL Variables (Recommended)

Click **"+ New Variable"** and add:

```
DB_HOST = ${{MySQL.MYSQLHOST}}
DB_USER = ${{MySQL.MYSQLUSER}}
DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}
DB_NAME = ${{MySQL.MYSQLDATABASE}}
```

**Important:** Use the `${{MySQL.VARIABLE_NAME}}` syntax to reference Railway's MySQL service variables.

#### Option B: Manual Values (If using external MySQL)

If you're using an external MySQL database, add:

```
DB_HOST = your-mysql-host.com
DB_USER = your-username
DB_PASSWORD = your-password
DB_NAME = student_itrack
```

### Step 4: Add Other Required Variables

Also add these:

```
NODE_ENV = production
PORT = 5000
FRONTEND_URL = https://your-project.vercel.app
```

### Step 5: Redeploy

1. After adding variables, Railway will automatically redeploy
2. Or manually trigger a redeploy
3. Check the logs - you should see:
   ```
   📊 Database Configuration:
      Host: [your-mysql-host]
      User: [your-mysql-user]
      Database: [your-database-name]
   ✅ MySQL connected successfully
   ```

## Verification

### Check Railway Logs

1. Go to your Railway service
2. Click **"Logs"** tab
3. Look for:
   - ✅ `📊 Database Configuration:` - Shows your DB settings
   - ✅ `✅ MySQL connected successfully` - Connection successful
   - ❌ If you see errors, check the variable names

### Test Database Connection

You can also test the connection by running:

```bash
railway run npm run test-db
```

Or add a test endpoint to your server temporarily.

## Common Issues

### Issue: Variables not showing MySQL values

**Solution:** Make sure:
1. MySQL service is added to your Railway project
2. MySQL service is in the same project as your backend service
3. You're using the correct syntax: `${{MySQL.MYSQLHOST}}`

### Issue: Still connecting to localhost

**Solution:** 
1. Check that `DB_HOST` variable is set (not empty)
2. Verify the variable value is correct
3. Check Railway logs to see what host it's trying to connect to

### Issue: Authentication failed

**Solution:**
1. Verify `DB_USER` and `DB_PASSWORD` are correct
2. Check that the MySQL service is running
3. Verify database name exists

### Issue: Database doesn't exist

**Solution:**
1. Railway MySQL creates a database automatically
2. Use the `MYSQLDATABASE` variable value
3. Or create the database manually via Railway's MySQL console

## Railway MySQL Variables Reference

Railway automatically provides these variables when you add MySQL:

| Railway Variable | Maps To | Description |
|-----------------|---------|------------|
| `MYSQLHOST` | `DB_HOST` | MySQL server hostname |
| `MYSQLUSER` | `DB_USER` | MySQL username |
| `MYSQLPASSWORD` | `DB_PASSWORD` | MySQL password |
| `MYSQLDATABASE` | `DB_NAME` | MySQL database name |
| `MYSQLPORT` | (optional) | MySQL port (usually 3306) |

## Quick Fix Checklist

- [ ] MySQL database added to Railway project
- [ ] Backend service linked to MySQL service
- [ ] Environment variables added:
  - [ ] `DB_HOST = ${{MySQL.MYSQLHOST}}`
  - [ ] `DB_USER = ${{MySQL.MYSQLUSER}}`
  - [ ] `DB_PASSWORD = ${{MySQL.MYSQLPASSWORD}}`
  - [ ] `DB_NAME = ${{MySQL.MYSQLDATABASE}}`
- [ ] Service redeployed
- [ ] Checked logs for successful connection

## After Setup

Once connected, you may need to:

1. **Create database tables** - Run your setup script:
   ```bash
   railway run npm run setup-db
   ```

2. **Run migrations** (if needed):
   ```bash
   railway run npm run migrate
   ```

3. **Verify tables exist** - Check Railway MySQL console or use a test script

## Need Help?

- Check Railway logs for detailed error messages
- Verify all environment variables are set correctly
- Ensure MySQL service is running in Railway dashboard
- Railway Docs: https://docs.railway.app/databases/mysql


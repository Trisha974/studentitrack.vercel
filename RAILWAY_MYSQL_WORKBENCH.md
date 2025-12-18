# 🔌 Connect Railway MySQL to MySQL Workbench

## Step 1: Get Database Connection Details from Railway

### Option A: Using Railway Dashboard
1. Go to your Railway project dashboard
2. Click on your **MySQL database service**
3. Go to the **"Variables"** tab
4. You'll see these connection variables:
   - `MYSQLHOST` - Database host
   - `MYSQLUSER` - Database username
   - `MYSQLPASSWORD` - Database password
   - `MYSQLDATABASE` - Database name
   - `MYSQLPORT` - Database port (usually 3306)

### Option B: Using Railway CLI
```bash
# Install Railway CLI (if not installed)
npm i -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Get database connection string
railway connect mysql
```

---

## Step 2: Connect from MySQL Workbench

### Method 1: Standard Connection (Recommended)

1. **Open MySQL Workbench**
2. Click **"+"** next to "MySQL Connections" or go to **Database → Manage Connections**
3. Click **"New Connection"**
4. Fill in the connection details:

   ```
   Connection Name: Railway - Student iTrack
   
   Hostname: [MYSQLHOST from Railway]
   Port: [MYSQLPORT from Railway] (usually 3306)
   Username: [MYSQLUSER from Railway]
   Password: [MYSQLPASSWORD from Railway]
   Default Schema: [MYSQLDATABASE from Railway]
   ```

5. **Important SSL Settings:**
   - Click **"SSL"** tab
   - Select **"Require"** or **"Preferred"** (Railway usually requires SSL)
   - If connection fails, try **"Preferred"** first

6. Click **"Test Connection"**
   - If successful, you'll see "Successfully made the MySQL connection"
   - If it fails, check SSL settings and try again

7. Click **"OK"** to save the connection

8. Double-click the connection to connect

---

### Method 2: Using Connection String

1. In Railway, go to your MySQL database
2. Click **"Connect"** or **"Connection Info"**
3. Railway will show a connection string like:
   ```
   mysql://user:password@host:port/database
   ```
4. Parse the connection string:
   - `user` = Username
   - `password` = Password
   - `host` = Hostname
   - `port` = Port number
   - `database` = Database name

5. Use these values in MySQL Workbench (same as Method 1)

---

## Step 3: Verify Connection

Once connected:

1. **Check Database:**
   ```sql
   SHOW DATABASES;
   ```
   You should see your database name (usually `railway` or `mysql`)

2. **Use Your Database:**
   ```sql
   USE your_database_name;
   ```

3. **Check Tables:**
   ```sql
   SHOW TABLES;
   ```
   You should see tables like:
   - `users`
   - `professors`
   - `students`
   - `courses`
   - `enrollments`
   - `grades`
   - `attendance`
   - `notifications`
   - `dashboard_state` (after running the SQL script)

---

## Step 4: Run SQL Scripts

### Create Dashboard State Table

1. In MySQL Workbench, make sure you're connected
2. Select your database in the left panel
3. Go to **File → Open SQL Script**
4. Navigate to: `server/scripts/create-dashboard-state-table.sql`
5. Click **"Execute"** (lightning bolt icon) or press `Ctrl+Shift+Enter`
6. Verify table was created:
   ```sql
   SHOW TABLES LIKE 'dashboard_state';
   ```

---

## 🔧 Troubleshooting

### Connection Refused / Timeout

**Problem:** Cannot connect to Railway database

**Solutions:**
1. **Check if Railway service is running**
   - Go to Railway dashboard
   - Verify MySQL database service is active

2. **Verify connection details**
   - Double-check hostname, port, username, password
   - Railway hostnames usually end with `.railway.app` or similar

3. **Check firewall/network**
   - Railway databases are accessible from anywhere
   - If behind corporate firewall, may need to allow MySQL port

4. **Try different SSL mode**
   - In MySQL Workbench SSL tab, try:
     - First: **"Preferred"**
     - If fails: **"Require"**
     - If still fails: **"Disabled"** (not recommended for production)

### SSL Connection Error

**Problem:** SSL handshake failed

**Solutions:**
1. In MySQL Workbench → SSL tab:
   - Select **"Preferred"** instead of **"Require"**
   - Or uncheck **"Use SSL"** temporarily to test

2. Railway usually requires SSL, so keep it enabled if possible

### Authentication Failed

**Problem:** Access denied for user

**Solutions:**
1. **Verify credentials:**
   - Copy password directly from Railway (no extra spaces)
   - Check username is correct

2. **Reset password:**
   - In Railway, you can regenerate database password
   - Update connection in MySQL Workbench

3. **Check database name:**
   - Verify `MYSQLDATABASE` value matches

### Connection Works But Can't See Tables

**Problem:** Connected but no tables visible

**Solutions:**
1. **Select the correct database:**
   ```sql
   USE your_database_name;
   SHOW TABLES;
   ```

2. **Check if tables exist:**
   ```sql
   SELECT * FROM information_schema.tables 
   WHERE table_schema = 'your_database_name';
   ```

3. **Refresh connection:**
   - Right-click database → Refresh All

---

## 📝 Quick Reference

### Railway Connection Details Format

```
Hostname: [MYSQLHOST].railway.app (or similar)
Port: 3306 (or MYSQLPORT value)
Username: [MYSQLUSER]
Password: [MYSQLPASSWORD]
Database: [MYSQLDATABASE]
SSL: Required or Preferred
```

### Common Railway MySQL Variable Names

- `MYSQLHOST` - Hostname
- `MYSQLUSER` - Username  
- `MYSQLPASSWORD` - Password
- `MYSQLDATABASE` - Database name
- `MYSQLPORT` - Port (usually 3306)

---

## ✅ Connection Checklist

- [ ] Railway MySQL database service is running
- [ ] Connection details copied from Railway
- [ ] MySQL Workbench connection created
- [ ] SSL settings configured (Preferred or Require)
- [ ] Test connection successful
- [ ] Database selected in MySQL Workbench
- [ ] Tables visible in left panel
- [ ] Can run SQL queries

---

## 🎯 Next Steps After Connecting

1. **Verify existing tables:**
   ```sql
   SHOW TABLES;
   ```

2. **Create dashboard_state table:**
   - Run `server/scripts/create-dashboard-state-table.sql`

3. **Check data:**
   ```sql
   SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM professors;
   SELECT COUNT(*) FROM students;
   ```

4. **Backup database (optional):**
   - In MySQL Workbench: **Server → Data Export**
   - Select your database
   - Export to SQL file

---

## 💡 Pro Tips

1. **Save Connection:**
   - Save your connection in MySQL Workbench for easy access
   - Use a descriptive name like "Railway - Production"

2. **Connection Timeout:**
   - Railway connections may timeout after inactivity
   - Simply reconnect when needed

3. **Security:**
   - Never commit connection details to Git
   - Use environment variables in Railway
   - Keep MySQL Workbench connection passwords secure

4. **Multiple Environments:**
   - Create separate connections for:
     - Railway Production
     - Local Development
     - Railway Staging (if you have one)

---

You're now ready to manage your Railway MySQL database from MySQL Workbench! 🎉


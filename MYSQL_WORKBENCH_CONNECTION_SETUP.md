# 🔌 MySQL Workbench Connection Setup Guide

## Your Current Connection Details

Based on your MySQL Workbench configuration:

```
Connection Name: studentitrack
Hostname: yamabiko.proxy.rlwy.net
Port: 46804
Username: root
Password: [Stored in Vault]
Default Schema: [Empty - needs to be set]
```

## ✅ Complete Setup Steps

### Step 1: Configure SSL (Required for Railway)

1. In MySQL Workbench, with your connection open
2. Click the **"SSL"** tab (next to "Parameters")
3. Set **SSL Mode:** to **"Preferred"** or **"Required"**
4. **Leave all SSL file fields empty:**
   - SSL CA File: (empty)
   - SSL Cert File: (empty)
   - SSL Key File: (empty)

### Step 2: Set Default Schema (Database Name)

1. Go back to **"Parameters"** tab
2. In **"Default Schema"** field, enter your database name
3. **To find your database name:**
   - Go to Railway → MySQL Service → Variables tab
   - Look for `MYSQLDATABASE` value
   - Common names: `railway`, `mysql`, or a custom name
4. Enter that database name in the Default Schema field

**OR** leave it empty and select the database after connecting.

### Step 3: Test Connection

1. Click **"Test Connection"** button (bottom right)
2. Enter your password when prompted (if not stored in vault)
3. You should see: **"Successfully made the MySQL connection"**
4. Click **"OK"** to save

### Step 4: Connect

1. Double-click your connection in the left panel
2. Or click the connection and press Enter
3. You should now be connected!

## 🔍 If Connection Fails

### Error: "Lost connection at reading initial communication packet"

**Solution:**
1. Go to **SSL** tab
2. Change SSL Mode to **"Required"** (if "Preferred" doesn't work)
3. Or try **"Preferred"** (if "Required" doesn't work)
4. Test connection again

### Error: "Access denied"

**Solution:**
1. Verify password in Railway → MySQL Service → Variables tab
2. Copy `MYSQLPASSWORD` again (no extra spaces)
3. Update password in MySQL Workbench
4. Test connection again

### Error: "Unknown database"

**Solution:**
1. Leave Default Schema empty
2. Connect first
3. After connecting, run: `SHOW DATABASES;`
4. Select your database from the list
5. Or set Default Schema to the correct database name

## 📋 Quick Checklist

Before testing connection:
- [ ] Hostname: `yamabiko.proxy.rlwy.net`
- [ ] Port: `46804`
- [ ] Username: `root`
- [ ] Password: Set (from Railway)
- [ ] SSL Mode: **"Preferred"** or **"Required"**
- [ ] Default Schema: [Your database name] or leave empty
- [ ] Railway MySQL service is running

## 🎯 After Successful Connection

1. **Verify database exists:**
   ```sql
   SHOW DATABASES;
   ```

2. **Select your database:**
   ```sql
   USE your_database_name;
   ```

3. **Check if tables exist:**
   ```sql
   SHOW TABLES;
   ```

4. **If tables don't exist, import the SQL script:**
   - File → Open SQL Script
   - Select: `IMPORT_TO_MYSQL_WORKBENCH.sql`
   - Execute (Ctrl+Shift+Enter)

## ✅ Expected Result

After successful connection:
- ✅ Connection appears in left panel
- ✅ You can expand the connection
- ✅ You can see databases
- ✅ You can run SQL queries

Your connection looks good! Just need to:
1. Set SSL Mode in SSL tab
2. Optionally set Default Schema
3. Test the connection


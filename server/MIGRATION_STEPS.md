# Firebase to MySQL Migration - Step-by-Step Guide

## Prerequisites
- MySQL server running
- Node.js installed
- Access to your database

## Step 1: Create Users Table in MySQL

### Option A: Using MySQL Command Line (PowerShell/Terminal)

**If MySQL is in your PATH:**
```powershell
# Navigate to project root
cd "C:\Users\Angeli1\Documents\STUD1 - Copy"

# Run MySQL command (PowerShell syntax)
Get-Content server\scripts\create-users-table.sql | mysql -u root -p student_itrack
```

**Or if you prefer direct command:**
```powershell
mysql -u root -p student_itrack -e "SOURCE server/scripts/create-users-table.sql"
```

**Or manually copy-paste the SQL:**
1. Open `server/scripts/create-users-table.sql` in a text editor
2. Copy the SQL content
3. Open MySQL command line or MySQL Workbench
4. Select database: `USE student_itrack;`
5. Paste and execute the SQL

### Option B: Using MySQL Workbench (GUI)
1. Open MySQL Workbench
2. Connect to your database
3. Select `student_itrack` database
4. File → Open SQL Script → Select `server/scripts/create-users-table.sql`
5. Click Execute (⚡ icon)

## Step 2: Install Backend Dependencies

**In PowerShell or Cursor Terminal:**
```powershell
# Navigate to server directory
cd server

# Install dependencies
npm install
```

**Or from project root:**
```powershell
cd "C:\Users\Angeli1\Documents\STUD1 - Copy\server"
npm install
```

## Step 3: Configure Environment Variables

**Edit `server/.env` file** (create if it doesn't exist):

```env
# Database Configuration
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=student_itrack
DB_SSL=false

# JWT Configuration
JWT_SECRET=your-very-strong-secret-key-change-this-in-production-min-32-characters
JWT_EXPIRES_IN=7d

# Server Configuration
NODE_ENV=development
PORT=5000

# Frontend URL
FRONTEND_URL=http://localhost:3000

# CSRF Protection (optional)
CSRF_SECRET=your-random-csrf-secret-here
```

**Important:** 
- Replace `your_mysql_password` with your actual MySQL password
- Replace `JWT_SECRET` with a strong random string (at least 32 characters)
- You can generate a JWT secret with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

## Step 4: (Optional) Migrate Existing Firebase Users

**In PowerShell or Cursor Terminal:**
```powershell
# Make sure you're in the server directory
cd server

# Run migration script
node scripts/migrate-firebase-users-to-mysql.js
```

**Or from project root:**
```powershell
cd "C:\Users\Angeli1\Documents\STUD1 - Copy"
node server/scripts/migrate-firebase-users-to-mysql.js
```

## Step 5: Test the Backend

**Start the server:**
```powershell
cd server
npm start
```

**Or in development mode:**
```powershell
cd server
npm run dev
```

**Test the auth endpoint:**
```powershell
# Test login (replace with actual credentials after migration)
curl -X POST http://localhost:5000/api/auth/login -H "Content-Type: application/json" -d '{\"email\":\"test@example.com\",\"password\":\"password123\"}'
```

## Quick Reference: All Commands in One Place

```powershell
# 1. Navigate to project
cd "C:\Users\Angeli1\Documents\STUD1 - Copy"

# 2. Create users table (choose one method above)

# 3. Install dependencies
cd server
npm install

# 4. Edit .env file (use your text editor)

# 5. (Optional) Migrate existing users
node scripts/migrate-firebase-users-to-mysql.js

# 6. Start server
npm start
```

## Troubleshooting

### MySQL Command Not Found
- Make sure MySQL is installed and added to PATH
- Or use MySQL Workbench GUI method instead

### Permission Denied
- Make sure you have MySQL user permissions
- Try: `mysql -u root -p` (enter password when prompted)

### Module Not Found Errors
- Run `npm install` in the server directory
- Make sure you're in the correct directory

### Database Connection Error
- Check your `.env` file has correct database credentials
- Verify MySQL server is running
- Test connection: `mysql -u root -p -e "SHOW DATABASES;"`


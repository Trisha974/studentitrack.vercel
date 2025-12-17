# How to Run Migration Commands

## Where to Run Commands

You can run ALL commands in:
- ✅ **Cursor's Integrated Terminal** (Terminal tab at bottom)
- ✅ **PowerShell** (Windows PowerShell or Windows Terminal)
- ✅ **Command Prompt** (cmd.exe)

## Step-by-Step Instructions

### 1️⃣ Create Users Table in MySQL

**Option A: Using PowerShell/Cursor Terminal (Recommended)**

```powershell
# Navigate to your project
cd "C:\Users\Angeli1\Documents\STUD1 - Copy"

# Method 1: Using Get-Content (PowerShell way)
Get-Content server\scripts\create-users-table.sql | mysql -u root -p student_itrack
# (Enter your MySQL password when prompted)

# Method 2: Direct SQL execution
mysql -u root -p student_itrack -e "CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, email VARCHAR(255) UNIQUE NOT NULL, password_hash VARCHAR(255) NOT NULL, role ENUM('Professor', 'Student') NOT NULL, user_id INT NULL, is_active BOOLEAN DEFAULT TRUE, email_verified BOOLEAN DEFAULT FALSE, last_login DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP, INDEX idx_email (email), INDEX idx_role (role), INDEX idx_user_id (user_id)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;"
```

**Option B: Using MySQL Workbench (Easier - GUI)**
1. Open MySQL Workbench
2. Connect to your database
3. Click on `student_itrack` database
4. Click "File" → "Open SQL Script"
5. Navigate to: `C:\Users\Angeli1\Documents\STUD1 - Copy\server\scripts\create-users-table.sql`
6. Click the Execute button (⚡ lightning bolt icon)

**Option C: Copy-Paste SQL**
1. Open `server\scripts\create-users-table.sql` in any text editor
2. Copy all the SQL code
3. Open MySQL command line: `mysql -u root -p`
4. Type: `USE student_itrack;`
5. Paste the SQL code
6. Press Enter

---

### 2️⃣ Install Backend Dependencies

**In Cursor Terminal or PowerShell:**

```powershell
# Navigate to server folder
cd "C:\Users\Angeli1\Documents\STUD1 - Copy\server"

# Install packages
npm install
```

**Or from project root:**
```powershell
cd "C:\Users\Angeli1\Documents\STUD1 - Copy"
cd server
npm install
```

---

### 3️⃣ Configure Environment Variables

**Edit the `.env` file manually:**

1. Navigate to: `C:\Users\Angeli1\Documents\STUD1 - Copy\server\.env`
2. Open it in Cursor or any text editor
3. Add these lines (or update existing ones):

```env
# JWT Configuration (REQUIRED - add these new lines)
JWT_SECRET=your-very-strong-secret-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# Database Configuration (update if needed)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=student_itrack
DB_SSL=false

# Server Configuration
NODE_ENV=development
PORT=5000

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

**Generate a secure JWT_SECRET:**
```powershell
# Run this in terminal to generate a random secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and use it as your `JWT_SECRET`

---

### 4️⃣ (Optional) Migrate Existing Firebase Users

**In Cursor Terminal or PowerShell:**

```powershell
# Make sure you're in the server directory
cd "C:\Users\Angeli1\Documents\STUD1 - Copy\server"

# Run migration script
node scripts/migrate-firebase-users-to-mysql.js
```

---

### 5️⃣ Test the Server

**Start the backend server:**

```powershell
# In server directory
cd "C:\Users\Angeli1\Documents\STUD1 - Copy\server"

# Start server
npm start

# OR for development (auto-restart on changes)
npm run dev
```

---

## Quick Copy-Paste Commands

**Run these one by one in Cursor Terminal or PowerShell:**

```powershell
# 1. Go to project root
cd "C:\Users\Angeli1\Documents\STUD1 - Copy"

# 2. Install dependencies
cd server
npm install

# 3. (Optional) Migrate users
node scripts/migrate-firebase-users-to-mysql.js

# 4. Start server
npm start
```

**For MySQL table creation, use MySQL Workbench (easiest) or the PowerShell command above.**

---

## Troubleshooting

### "mysql: command not found"
- Install MySQL or add it to PATH
- Or use MySQL Workbench GUI instead

### "npm: command not found"
- Install Node.js from nodejs.org
- Restart terminal after installation

### "Cannot find module"
- Make sure you ran `npm install` in the `server` directory
- Check you're in the correct directory: `cd server`

### Database connection errors
- Check your `.env` file has correct credentials
- Verify MySQL is running: `mysql -u root -p`

---

## Visual Guide

```
Cursor Terminal (Bottom Panel)
    ↓
Type: cd "C:\Users\Angeli1\Documents\STUD1 - Copy\server"
    ↓
Type: npm install
    ↓
Type: npm start
```

**That's it!** All commands work in Cursor's terminal or PowerShell.


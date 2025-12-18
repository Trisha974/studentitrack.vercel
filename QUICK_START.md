# Quick Start - Run These Commands

## ✅ You can run ALL commands in Cursor's Terminal (bottom panel) or PowerShell

---

## Step 1: Install Dependencies

**In Cursor Terminal (or PowerShell), type:**

```powershell
cd "C:\Users\Angeli1\Documents\STUD1 - Copy\server"
npm install
```

This installs `jsonwebtoken` and `bcrypt` packages.

---

## Step 2: Create MySQL Users Table

**Option A: Using MySQL Workbench (EASIEST)**
1. Open MySQL Workbench
2. Connect to your database
3. Select `student_itrack` database
4. File → Open SQL Script
5. Open: `C:\Users\Angeli1\Documents\STUD1 - Copy\server\scripts\create-users-table.sql`
6. Click Execute (⚡ icon)

**Option B: Using Terminal**
```powershell
# If MySQL is in your PATH
Get-Content "C:\Users\Angeli1\Documents\STUD1 - Copy\server\scripts\create-users-table.sql" | mysql -u root -p student_itrack
```

---

## Step 3: Configure Environment Variables

**Edit this file in Cursor:**
`C:\Users\Angeli1\Documents\STUD1 - Copy\server\.env`

**Add these lines:**
```env
JWT_SECRET=generate-a-random-32-character-string-here
JWT_EXPIRES_IN=7d
```

**To generate a secure JWT_SECRET, run in terminal:**
```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the output and paste it as your `JWT_SECRET` value.

---

## Step 4: (Optional) Migrate Existing Users

**In Cursor Terminal:**
```powershell
cd "C:\Users\Angeli1\Documents\STUD1 - Copy\server"
node scripts/migrate-firebase-users-to-mysql.js
```

---

## Step 5: Start the Server

**In Cursor Terminal:**
```powershell
cd "C:\Users\Angeli1\Documents\STUD1 - Copy\server"
npm start
```

---

## 📝 Summary - Copy & Paste These Commands

**Run these in order in Cursor Terminal:**

```powershell
# 1. Go to server directory
cd "C:\Users\Angeli1\Documents\STUD1 - Copy\server"

# 2. Install packages
npm install

# 3. Generate JWT secret (optional - copy the output)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. (Optional) Migrate users
node scripts/migrate-firebase-users-to-mysql.js

# 5. Start server
npm start
```

**For MySQL table creation, use MySQL Workbench (easiest method).**

---

## 🎯 All Commands Work In:
- ✅ Cursor's Integrated Terminal (Terminal tab at bottom)
- ✅ PowerShell
- ✅ Command Prompt
- ✅ Windows Terminal

**Just copy and paste the commands above!**


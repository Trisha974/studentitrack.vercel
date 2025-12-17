# 🧹 Clean Up Firebase from .env File

Since we've migrated from Firebase to MySQL/JWT, Firebase environment variables are no longer needed.

## ✅ Remove These from `server/.env`:

```env
# Remove these Firebase variables (no longer needed):
FIREBASE_PROJECT_ID=...
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...
```

## 📝 What to Keep in `server/.env`:

```env
# Database (MySQL)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=student_itrack
DB_PORT=3306
DB_SSL=false

# Server
NODE_ENV=development
PORT=5000

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# Frontend URL
FRONTEND_URL=http://localhost:5173

# CSRF (optional)
CSRF_SECRET=your-random-secret
```

## 🚨 For Railway Deployment:

In Railway, you only need:
```env
NODE_ENV=production
PORT=5000

# MySQL (from Railway MySQL service)
MYSQLHOST=switchback.proxy.rlwy.net
MYSQLUSER=root
MYSQLPASSWORD=<from Railway>
MYSQLDATABASE=<from Railway>
MYSQLPORT=46804
DB_SSL=true

# JWT
JWT_SECRET=your-super-secret-jwt-key-minimum-32-characters-long
JWT_EXPIRES_IN=7d

# Frontend
FRONTEND_URL=https://your-app.vercel.app
```

**No Firebase variables needed!**

## 📋 Files That Still Reference Firebase (For Migration Only):

These files still reference Firebase but are only used for migration scripts:
- `server/scripts/migrate-professor-enrolls-to-mysql.js` - Migration script only

These can be removed after migration is complete, or kept for reference.

## ✅ Action Items:

1. **Remove Firebase variables from `server/.env`**
2. **Update Railway environment variables** (remove Firebase vars if added)
3. **Verify system still works** after removing Firebase vars

The system no longer uses Firebase, so these variables are safe to remove!


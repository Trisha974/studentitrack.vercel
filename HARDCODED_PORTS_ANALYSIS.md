# 🔍 Hardcoded Ports Analysis

## ✅ Ports That Are Configurable (Good)

### Backend Server Port
- **File:** `server/src/config/env.js`
- **Code:** `PORT: process.env.PORT || 5000`
- **Status:** ✅ Uses environment variable, `5000` is just a default fallback
- **Can be changed:** Yes, via `PORT` environment variable

### Database Port
- **File:** `server/src/shared/config/database.js`
- **Code:** `const DB_PORT = process.env.MYSQLPORT || process.env.DB_PORT || 3306`
- **Status:** ✅ Uses environment variables, `3306` is just a default fallback
- **Can be changed:** Yes, via `MYSQLPORT` or `DB_PORT` environment variable

## ⚠️ Ports That Are Hardcoded (Need Attention)

### 1. Frontend Vite Dev Server Port
- **File:** `client/vite.config.js`
- **Code:** 
  ```javascript
  port: 5173,
  strictPort: true, // Exit if port 5173 is not available
  ```
- **Status:** ⚠️ **HARDCODED** - Port 5173 is fixed
- **Impact:** Frontend dev server always runs on port 5173
- **Fix:** Can be made configurable via environment variable

### 2. API Base URL Fallbacks (Multiple Files)
- **Files:**
  - `client/src/services/api/apiClient.js`
  - `client/src/services/api/authApi.js`
  - `client/src/services/api/notificationsApi.js`
  - `client/src/pages/Student/Student.jsx`
  - `client/src/pages/Login/Login.jsx`
- **Code:** `import.meta.env.VITE_API_URL || 'http://localhost:5000/api'`
- **Status:** ⚠️ **HARDCODED FALLBACK** - Falls back to `localhost:5000` if `VITE_API_URL` not set
- **Impact:** If `VITE_API_URL` is missing, assumes backend on port 5000
- **Fix:** Already uses env var, but fallback is hardcoded

### 3. CORS Origins (Backend)
- **File:** `server/src/plugins/cors.js`
- **Code:**
  ```javascript
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    // ...
  ]
  ```
- **Status:** ⚠️ **HARDCODED** - Specific localhost ports are hardcoded
- **Impact:** CORS allows specific localhost ports
- **Fix:** Should use `FRONTEND_URL` from environment or be more flexible

## 📋 Summary

| Port | Location | Status | Configurable? |
|------|----------|--------|---------------|
| Backend (5000) | `server/src/config/env.js` | ✅ Default only | Yes, via `PORT` env var |
| Frontend (5173) | `client/vite.config.js` | ⚠️ Hardcoded | No, always 5173 |
| Database (3306) | `server/src/shared/config/database.js` | ✅ Default only | Yes, via `MYSQLPORT`/`DB_PORT` |
| API URL (5000) | Multiple frontend files | ⚠️ Hardcoded fallback | Yes, via `VITE_API_URL` |
| CORS (3000, 5173) | `server/src/plugins/cors.js` | ⚠️ Hardcoded | Partially, uses `FRONTEND_URL` |

## 🔧 Recommendations

### Low Priority (Works Fine)
- **Frontend port 5173**: Vite's default, rarely needs to change
- **API fallback to 5000**: Only used if `VITE_API_URL` is missing (should always be set)

### Medium Priority (Could Improve)
- **CORS origins**: Should be more flexible or use `FRONTEND_URL` more consistently

### High Priority (None)
- All critical ports are configurable via environment variables
- Hardcoded values are only defaults/fallbacks

## ✅ Conclusion

**The system is well-designed:**
- ✅ Backend port is configurable (uses `PORT` env var)
- ✅ Database port is configurable (uses `MYSQLPORT`/`DB_PORT` env var)
- ✅ API URL is configurable (uses `VITE_API_URL` env var)
- ⚠️ Frontend dev port is hardcoded (but this is standard for Vite)
- ⚠️ CORS has some hardcoded localhost ports (but also uses `FRONTEND_URL`)

**For production deployment:**
- All important ports are configurable via environment variables
- Hardcoded values are only for local development defaults
- Railway/Vercel will use environment variables, not hardcoded values


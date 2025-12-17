# Firebase to MySQL Authentication Migration

## ✅ Completed Backend Changes

### 1. **Database Schema**
- Created `users` table for authentication
- Table includes: email, password_hash, role, user_id (links to professors/students)
- See: `server/scripts/create-users-table.sql`

### 2. **JWT Authentication System**
- Created `User` model (`server/src/models/User.js`)
- Created JWT utilities (`server/src/utils/jwt.js`)
- Created auth service (`server/src/services/auth.service.js`)
- Created auth controller (`server/src/controllers/auth.controller.js`)
- Created auth routes (`server/src/routes/auth.routes.js`)

### 3. **Updated Authentication Hooks**
- Replaced Firebase token verification with JWT verification
- Updated `server/src/hooks/auth.js` to use JWT
- Removed Firebase Admin SDK dependency

### 4. **Updated All Services**
- Updated services to use `user.user_id` instead of `user.uid` (Firebase UID)
- Removed `firebase_uid` from create/update operations
- Updated:
  - `students.service.js`
  - `professors.service.js`
  - `enrollments.service.js`
  - `grades.service.js`
  - `attendance.service.js`
  - `courses.service.js`
  - `notifications.service.js`

### 5. **Updated Controllers**
- Removed Firebase UID requirements from create operations
- Updated to work with new user system

### 6. **Dependencies**
- Added: `jsonwebtoken`, `bcrypt`
- Removed: `firebase-admin` (can be removed after frontend migration)

### 7. **Migration Script**
- Created `server/scripts/migrate-firebase-users-to-mysql.js`
- Migrates existing Firebase users to MySQL user accounts

## 🔄 Next Steps (Frontend)

### 1. **Update Frontend Authentication**

#### Replace Firebase Auth with API Calls

**File: `client/src/services/api/authApi.js` (NEW)**
```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export async function login(email, password) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  })
  if (!response.ok) throw new Error('Login failed')
  const data = await response.json()
  // Store token
  localStorage.setItem('auth_token', data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export async function register(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(userData)
  })
  if (!response.ok) throw new Error('Registration failed')
  const data = await response.json()
  localStorage.setItem('auth_token', data.token)
  localStorage.setItem('user', JSON.stringify(data.user))
  return data
}

export function logout() {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
}

export function getAuthToken() {
  return localStorage.getItem('auth_token')
}

export function getCurrentUser() {
  const userStr = localStorage.getItem('user')
  return userStr ? JSON.parse(userStr) : null
}
```

#### Update `client/src/services/api/apiClient.js`

Replace Firebase token retrieval:
```javascript
// OLD:
async function getAuthToken() {
  const { auth } = await import('../../firebase')
  const user = auth.currentUser
  if (!user) throw new Error('No authenticated user')
  return await user.getIdToken()
}

// NEW:
async function getAuthToken() {
  const token = localStorage.getItem('auth_token')
  if (!token) throw new Error('No authenticated user')
  return token
}
```

#### Update `client/src/pages/Login/Login.jsx`

Replace Firebase auth calls:
```javascript
// OLD:
import { registerWithEmail, signIn as firebaseSignIn } from '../../firebase'

// NEW:
import { login, register } from '../../services/api/authApi'

// Replace signIn calls:
const result = await login(email, password)

// Replace register calls:
const result = await register({ email, password, role, name, ... })
```

#### Update `client/src/components/ProtectedRoute.jsx`

Replace Firebase auth state:
```javascript
// OLD:
import { onAuthStateChanged } from '../../firebase'

// NEW:
import { getCurrentUser, getAuthToken } from '../../services/api/authApi'

// Check authentication:
const user = getCurrentUser()
const token = getAuthToken()
if (!user || !token) {
  navigate('/login')
}
```

### 2. **Remove Firebase Dependencies**

**File: `client/package.json`**
- Remove: `firebase`, `firebase-admin` (if present)

**Files to Update/Remove:**
- `client/src/firebase.js` - Can be removed or kept for storage only
- Remove Firebase imports from all components

### 3. **Environment Variables**

**Backend `.env`:**
```env
JWT_SECRET=your-strong-secret-key-here
JWT_EXPIRES_IN=7d
```

**Frontend `.env`:**
- Remove Firebase environment variables
- Keep: `VITE_API_URL`

## 📋 Migration Steps

### Step 1: Create Users Table
```bash
mysql -u root -p student_itrack < server/scripts/create-users-table.sql
```

### Step 2: Install Backend Dependencies
```bash
cd server
npm install
```

### Step 3: Run Migration Script (Optional - for existing users)
```bash
node scripts/migrate-firebase-users-to-mysql.js
```

### Step 4: Update Frontend
- Follow frontend update steps above
- Test login/register functionality
- Remove Firebase dependencies

### Step 5: Test System
- Test login with existing migrated users
- Test registration of new users
- Test all protected routes
- Verify student/professor profiles work correctly

## ⚠️ Important Notes

1. **Password Reset**: Migrated users have temporary passwords. Implement password reset functionality.

2. **Backward Compatibility**: Firebase UID lookup methods still exist for migration period but are not used for new auth.

3. **Token Storage**: Frontend should store JWT token in localStorage or httpOnly cookies (more secure).

4. **Token Expiration**: Tokens expire after 7 days (configurable via `JWT_EXPIRES_IN`).

5. **Security**: 
   - Use strong `JWT_SECRET` in production
   - Consider implementing refresh tokens
   - Use HTTPS in production

## 🔍 Testing Checklist

- [ ] Users table created successfully
- [ ] Backend auth routes work (login/register)
- [ ] JWT tokens generated correctly
- [ ] Token verification works
- [ ] Frontend login works
- [ ] Frontend register works
- [ ] Protected routes work
- [ ] Student profile access works
- [ ] Professor profile access works
- [ ] All API calls include JWT token
- [ ] Firebase dependencies removed

## 📝 API Endpoints

### POST `/api/auth/login`
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

### POST `/api/auth/register`
```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "Student",
  "name": "John Doe",
  "student_id": "12345",
  "department": "Department of Computing Education"
}
```

Response:
```json
{
  "token": "jwt-token-here",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "role": "Student",
    "user_id": 5,
    "profile": { ... }
  }
}
```


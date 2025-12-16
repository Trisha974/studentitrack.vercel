# How to Run the Project Locally

## 🚀 Quick Start

### Option 1: Run Both Services (Recommended)

Open **two terminal windows** and run:

**Terminal 1 - Backend:**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 - Frontend:**
```bash
cd client
npm install
npm run dev
```

---

## 📋 Step-by-Step Instructions

### Step 1: Install Dependencies

#### Backend:
```bash
cd server
npm install
```

#### Frontend:
```bash
cd client
npm install
```

---

### Step 2: Set Up Environment Variables

#### Backend (`server/.env`):
Create `server/.env` file with:
```env
# Database
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=student_itrack

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Firebase Admin SDK
FIREBASE_PROJECT_ID=studitrack-54f69
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@studitrack-54f69.iam.gserviceaccount.com
```

#### Frontend (`client/.env`):
Create `client/.env` file with:
```env
# Backend API (for local development)
VITE_API_URL=http://localhost:5000/api

# Firebase
VITE_FIREBASE_API_KEY=AIzaSyD-n0r_yIMMBfTsa2kahr5_xV1iLNvUgHY
VITE_FIREBASE_AUTH_DOMAIN=studitrack-54f69.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=studitrack-54f69
VITE_FIREBASE_STORAGE_BUCKET=studitrack-54f69.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=825538308202
VITE_FIREBASE_APP_ID=1:825538308202:web:5a84a9f2b4f2169b9f0213
VITE_FIREBASE_MEASUREMENT_ID=G-3NHL0FSD9D
VITE_CSRF_TOKEN=super-strong-secret-change-me
```

---

### Step 3: Start Backend Server

```bash
cd server
npm run dev
```

**Expected output:**
```
🔌 Using PORT: 5000 (from fallback)
📊 Database Configuration:
   Host: localhost
   User: root
   Database: student_itrack
✅ MySQL connected successfully
✅ Firebase Admin SDK initialized successfully
Server started
🚀 Server running on port 5000
📡 API available at http://0.0.0.0:5000/api
✅ Health check available at http://0.0.0.0:5000/health
```

**Backend will be available at:**
- API: http://localhost:5000/api
- Health: http://localhost:5000/health

---

### Step 4: Start Frontend (in a new terminal)

```bash
cd client
npm run dev
```

**Expected output:**
```
  VITE v5.0.8  ready in 500 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

**Frontend will be available at:**
- http://localhost:5173

---

## 🎯 Verify It's Working

### 1. Test Backend Health:
Open in browser: http://localhost:5000/health

**Expected:**
```json
{ "status": "healthy" }
```

### 2. Test Frontend:
Open in browser: http://localhost:5173

**Expected:**
- Login page loads
- No console errors (F12 → Console)

### 3. Test Connection:
1. Open http://localhost:5173
2. Press F12 → Network tab
3. Try to login
4. Check API calls go to `localhost:5000/api`

---

## 🔧 Troubleshooting

### Backend Won't Start

**Error: Port 5000 already in use**
```bash
# Windows PowerShell:
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

**Error: MySQL connection failed**
- Check MySQL is running
- Verify `.env` file has correct database credentials
- Test connection: `npm run test-db`

---

### Frontend Won't Start

**Error: Port 5173 already in use**
- Vite will automatically try the next port (5174, 5175, etc.)
- Or kill the process using port 5173

**Error: Cannot connect to backend**
- Verify backend is running on port 5000
- Check `VITE_API_URL=http://localhost:5000/api` in `client/.env`
- Check browser console for errors

---

## 📝 Available Scripts

### Backend (`server/`):
- `npm start` - Start production server
- `npm run dev` - Start development server (with nodemon)
- `npm run test-db` - Test database connection
- `npm run setup-db` - Setup database schema

### Frontend (`client/`):
- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

---

## 🎉 You're Ready!

Once both services are running:
- ✅ Backend: http://localhost:5000
- ✅ Frontend: http://localhost:5173
- ✅ Health: http://localhost:5000/health

Open http://localhost:5173 in your browser and start using the application!


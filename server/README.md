# Student iTrack Backend - Fastify

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode (with auto-reload)
npm run dev
```

## 📁 Project Structure

```
server/
├── src/
│   ├── app.js                # Fastify instance & plugins
│   ├── server.js             # App startup (listen here)
│   ├── config/
│   │   ├── db.js              # MySQL connection
│   │   └── env.js             # Environment variables
│   ├── plugins/
│   │   └── cors.js            # CORS setup
│   ├── hooks/
│   │   ├── auth.js            # Authentication hooks
│   │   ├── errorHandler.js    # Error handling
│   │   └── csrf.js            # CSRF protection
│   ├── routes/
│   │   ├── index.js           # Register all routes
│   │   ├── students.routes.js # Student API routes (Fastify)
│   │   └── express-compat.js  # Express compatibility layer
│   ├── controllers/
│   │   └── students.controller.js
│   ├── services/
│   │   └── students.service.js
│   └── schemas/
│       └── students.schema.js # Request/response validation
├── .env                       # Local env vars (NOT committed)
├── .gitignore
├── package.json
└── README.md
```

## 🔧 Environment Variables

Create a `.env` file in the `server/` directory:

```env
NODE_ENV=development
PORT=5000

DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your-password
DB_NAME=student_itrack
DB_SSL=false

FRONTEND_URL=https://studentitrack1.vercel.app

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
FIREBASE_CLIENT_EMAIL=your-email@project.iam.gserviceaccount.com

CSRF_SECRET=your-random-secret
```

## 📝 API Endpoints

### Health Check
- `GET /health` - Simple health check
- `GET /api/health` - Detailed health information

### Students (Fastify)
- `GET /api/students` - Get all students
- `GET /api/students/:id` - Get student by ID
- `GET /api/students/firebase/:uid` - Get student by Firebase UID
- `GET /api/students/email/:email` - Get student by email
- `GET /api/students/student-id/:studentId` - Get student by numerical ID
- `POST /api/students` - Create student
- `PUT /api/students/:id` - Update student
- `DELETE /api/students/:id` - Delete student

### Other Routes (Express Compatibility)
- Professors: `/api/professors`
- Courses: `/api/courses`
- Enrollments: `/api/enrollments`
- Grades: `/api/grades`
- Attendance: `/api/attendance`
- Notifications: `/api/notifications`
- Reports: `/api/reports`

## 🔄 Migration Status

- ✅ **Students API** - Fully converted to Fastify
- 🔄 **Other APIs** - Using Express compatibility layer (will be converted gradually)

## 🛠️ Development

The system uses Fastify as the main framework with Express compatibility for remaining routes. All functionality is preserved and the system remains fully operational.


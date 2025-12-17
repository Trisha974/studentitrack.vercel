# Final Folder Structure - Fastify Backend

## 📁 Complete Project Structure

```
server/
├── 📄 package.json                    # Fastify dependencies (no Express)
├── 📄 package-lock.json
├── 📄 README.md
├── 📄 .env                            # Environment variables (not committed)
├── 📄 .gitignore
│
├── 📁 scripts/                       # Utility scripts
│   ├── database-export.sql
│   ├── migrate-firestore-to-mysql.js
│   ├── setup-database.js
│   ├── test-db-connection.js
│   └── ... (other utility scripts)
│
└── 📁 src/                            # Main source code
    │
    ├── 📄 server.js                   # Fastify server startup
    ├── 📄 app.js                      # Fastify app instance & configuration
    │
    ├── 📁 config/                     # Configuration files
    │   ├── env.js                     # Environment variables loader
    │   └── db.js                      # MySQL connection pool
    │
    ├── 📁 plugins/                     # Fastify plugins
    │   └── cors.js                    # CORS configuration plugin
    │
    ├── 📁 hooks/                       # Fastify hooks (middleware)
    │   ├── auth.js                    # Authentication hooks (verifyToken, requireProfessor, etc.)
    │   ├── csrf.js                    # CSRF protection hook
    │   └── errorHandler.js            # Global error handler
    │
    ├── 📁 routes/                      # Fastify route definitions
    │   ├── index.js                    # Route registration (main entry)
    │   ├── students.routes.js          # Student API routes
    │   ├── professors.routes.js       # Professor API routes
    │   ├── courses.routes.js          # Course API routes
    │   ├── enrollments.routes.js      # Enrollment API routes
    │   ├── grades.routes.js           # Grade API routes
    │   ├── attendance.routes.js       # Attendance API routes
    │   ├── notifications.routes.js    # Notification API routes
    │   └── reports.routes.js          # Report API routes
    │
    ├── 📁 controllers/                 # Fastify controllers (request handlers)
    │   ├── students.controller.js
    │   ├── professors.controller.js
    │   ├── courses.controller.js
    │   ├── enrollments.controller.js
    │   ├── grades.controller.js
    │   ├── attendance.controller.js
    │   ├── notifications.controller.js
    │   └── reports.controller.js
    │
    ├── 📁 services/                    # Business logic layer
    │   ├── students.service.js
    │   ├── professors.service.js
    │   ├── courses.service.js
    │   ├── enrollments.service.js
    │   ├── grades.service.js
    │   ├── attendance.service.js
    │   ├── notifications.service.js
    │   └── reports.service.js
    │
    ├── 📁 schemas/                      # Fastify JSON schemas (validation)
    │   ├── students.schema.js
    │   ├── professors.schema.js
    │   ├── courses.schema.js
    │   ├── enrollments.schema.js
    │   ├── grades.schema.js
    │   ├── attendance.schema.js
    │   ├── notifications.schema.js
    │   └── reports.schema.js
    │
    ├── 📁 professor/                   # Professor domain (legacy structure - models only)
    │   ├── 📁 models/                  # Database models
    │   │   ├── Professor.js
    │   │   ├── Course.js
    │   │   ├── Enrollment.js
    │   │   ├── Grade.js
    │   │   └── Attendance.js
    │   └── 📁 controllers/             # Legacy controllers (not used)
    │       └── ... (old Express controllers - not imported)
    │
    ├── 📁 student/                      # Student domain (legacy structure - models only)
    │   ├── 📁 models/                   # Database models
    │   │   └── Student.js
    │   └── 📁 controllers/              # Legacy controllers (not used)
    │       └── ... (old Express controllers - not imported)
    │
    └── 📁 shared/                       # Shared utilities
        ├── 📁 config/
        │   └── database.js             # Legacy database config (still used by models)
        ├── 📁 models/
        │   └── Notification.js
        ├── 📁 utils/
        │   ├── notificationHelper.js
        │   └── roleHelpers.js
        └── 📁 middleware/               # Legacy middleware (not used)
            ├── auth.js                  # Old Express auth (not imported)
            └── errorHandler.js          # Old Express error handler (not imported)
```

## 🏗️ Architecture Overview

### **Fastify Structure (Active)**
- **Routes** (`src/routes/`) - Fastify route definitions with schemas
- **Controllers** (`src/controllers/`) - Request handlers using Fastify `request`/`reply`
- **Services** (`src/services/`) - Business logic abstraction
- **Schemas** (`src/schemas/`) - JSON schema validation
- **Hooks** (`src/hooks/`) - Fastify hooks (auth, CSRF, error handling)
- **Plugins** (`src/plugins/`) - Fastify plugins (CORS)

### **Legacy Structure (Models Only)**
- **Models** (`src/professor/models/`, `src/student/models/`) - Database models (still used)
- Old Express controllers/routes exist but are **NOT imported or used**

## 📋 Key Files

### **Entry Points**
- `src/server.js` - Server startup (Fastify)
- `src/app.js` - Fastify app configuration

### **Configuration**
- `src/config/env.js` - Environment variables
- `src/config/db.js` - MySQL connection pool

### **Route Registration**
- `src/routes/index.js` - Registers all Fastify routes

## 🔄 Request Flow

```
Client Request
    ↓
Fastify App (app.js)
    ↓
CORS Plugin
    ↓
CSRF Hook
    ↓
Route Handler (routes/*.routes.js)
    ↓
Auth Hook (if required)
    ↓
Schema Validation
    ↓
Controller (controllers/*.controller.js)
    ↓
Service (services/*.service.js)
    ↓
Model (professor/models/*.js or student/models/*.js)
    ↓
Database (MySQL)
```

## ✅ Conversion Status

- ✅ **100% Fastify** - All routes converted
- ✅ **No Express** - All Express code removed
- ✅ **Schemas** - All validation using Fastify JSON schemas
- ✅ **Hooks** - All middleware converted to Fastify hooks
- ✅ **Services** - Business logic abstracted
- ✅ **Clean Structure** - Organized by feature (routes, controllers, services, schemas)

## 📦 Dependencies

**Fastify Stack:**
- `fastify` - Web framework
- `@fastify/cors` - CORS plugin
- `fastify-plugin` - Plugin utilities

**Database:**
- `mysql2` - MySQL driver

**Other:**
- `firebase-admin` - Firebase authentication
- `dotenv` - Environment variables
- `pino-pretty` - Logging (dev)

**Removed:**
- ❌ `express` - Removed
- ❌ `@fastify/express` - Removed
- ❌ `express-validator` - Removed


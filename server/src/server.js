const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
// Railway requires using the PORT environment variable they provide
// If PORT is not set, use 5000 as fallback (for local development)
const PORT = process.env.PORT || 5000

// Log the port being used for debugging
console.log(`🔌 Using PORT: ${PORT} (from ${process.env.PORT ? 'Railway' : 'fallback'})`)

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5177'
const RAILWAY_URL = process.env.RAILWAY_PUBLIC_DOMAIN || process.env.VERCEL_URL
const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173', // Common Vite default
  'http://localhost:5174', // Alternative Vite port
  'http://localhost:5175', // Alternative Vite port
  'http://localhost:5176', // Alternative Vite port
  'http://localhost:5177', // Alternative port
  'http://localhost:5178', // Alternative port
  'http://localhost:3000', // Common React default
  'http://127.0.0.1:5173', // IPv4 localhost
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://127.0.0.1:5177',
  'http://127.0.0.1:5178',
]

// Add Railway and Vercel URLs if they exist
if (RAILWAY_URL) {
  allowedOrigins.push(`https://${RAILWAY_URL}`)
  allowedOrigins.push(`http://${RAILWAY_URL}`)
}

// Allow all Vercel preview deployments
if (FRONTEND_URL.includes('vercel.app') || FRONTEND_URL.includes('vercel.sh')) {
  allowedOrigins.push(FRONTEND_URL)
}

// Enhanced CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    // Always allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin')
      return callback(null, true)
    }
    
    // Allow all Vercel deployments
    if (origin.includes('vercel.app') || origin.includes('vercel.sh')) {
      console.log(`✅ CORS: Allowing Vercel origin: ${origin}`)
      return callback(null, true)
    }
    
    // Allow all Railway deployments
    if (origin.includes('railway.app') || origin.includes('railway.sh')) {
      console.log(`✅ CORS: Allowing Railway origin: ${origin}`)
      return callback(null, true)
    }
    
    // Allow localhost in development
    if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      console.log(`✅ CORS: Allowing localhost origin: ${origin}`)
      return callback(null, true)
    }
    
    // Check explicit allowed origins
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Allowing origin from allowed list: ${origin}`)
      return callback(null, true)
    }
    
    // In production, be permissive
    if (process.env.NODE_ENV === 'production') {
      console.log(`✅ CORS: Allowing origin in production mode: ${origin}`)
      return callback(null, true)
    }
    
    // Block in development if not in allowed list
    console.warn(`⚠️ CORS blocked origin: ${origin}`)
    console.warn(`⚠️ Allowed origins: ${allowedOrigins.join(', ')}`)
    callback(new Error(`Not allowed by CORS. Origin: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token', 'X-Requested-With'],
  exposedHeaders: ['Content-Type', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}

app.use(cors(corsOptions))

// Explicitly handle preflight OPTIONS requests for all routes
app.options('*', (req, res) => {
  console.log(`🔍 CORS Preflight: ${req.method} ${req.path} from origin: ${req.headers.origin || 'no origin'}`)
  res.header('Access-Control-Allow-Origin', req.headers.origin || '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-csrf-token, X-Requested-With')
  res.header('Access-Control-Allow-Credentials', 'true')
  res.header('Access-Control-Max-Age', '86400') // 24 hours
  res.sendStatus(204)
})

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

const CSRF_SECRET = process.env.CSRF_SECRET
const CSRF_HEADER_NAME = 'x-csrf-token'

const PUBLIC_ENDPOINTS = [
  '/api/students',
  '/api/professors',
]

app.use((req, res, next) => {
  const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (!unsafeMethods.includes(req.method)) {
    return next()
  }

  const isRegistrationEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
    req.path === endpoint || req.path.startsWith(endpoint + '/')
  )
  if (isRegistrationEndpoint && req.method === 'POST') {
    console.log(`✅ Skipping CSRF check for registration endpoint: ${req.path}`)
    return next()
  }

  if (!CSRF_SECRET) {
    return next()
  }

  const token = req.headers[CSRF_HEADER_NAME]

  if (!token || token !== CSRF_SECRET) {
    return res.status(403).json({ error: 'Invalid or missing CSRF token' })
  }

  return next()
})

// Simple health endpoint for Railway (must be before routes)
// Railway uses this to confirm the app is alive
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' })
})

app.use('/api/students', require('./student/routes/students'))
app.use('/api/professors', require('./professor/routes/professors'))
app.use('/api/courses', require('./professor/routes/courses'))
app.use('/api/enrollments', require('./professor/routes/enrollments'))
app.use('/api/grades', require('./professor/routes/grades'))
app.use('/api/attendance', require('./professor/routes/attendance'))
app.use('/api/notifications', require('./shared/routes/notifications'))
app.use('/api/reports', require('./professor/routes/reports'))

// Detailed health endpoint for monitoring
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    database: {
      host: process.env.DB_HOST || process.env.MYSQLHOST || 'not configured',
      database: process.env.DB_NAME || process.env.MYSQLDATABASE || 'not configured'
    },
    firebase: {
      configured: !!(process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL)
    },
    timestamp: new Date().toISOString()
  })
})

const errorHandler = require('./shared/middleware/errorHandler')
app.use(errorHandler)

// Start server immediately - DO NOT wait for database connection
// Railway requires the server to start even if DB fails
// Railway-safe: Use process.env.PORT and bind to 0.0.0.0
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log('Server started')
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 API available at http://0.0.0.0:${PORT}/api`)
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
  console.log(`📊 Database: ${process.env.DB_HOST || process.env.MYSQLHOST || 'not configured'}`)
  console.log(`✅ Health check available at http://0.0.0.0:${PORT}/health`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n❌ Port ${PORT} is already in use.`)
    console.error(`\n💡 Solutions:`)
    console.error(`   1. Find and kill the process:`)
    console.error(`      netstat -ano | findstr :${PORT}`)
    console.error(`      taskkill /PID <PID> /F`)
    console.error(`   2. Change PORT in server/.env file to a different port (e.g., 5001)`)
    console.error(`   3. Wait a few seconds and try again\n`)
    process.exit(1)
  } else {
    console.error('❌ Server error:', err)
    process.exit(1)
  }
})

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})


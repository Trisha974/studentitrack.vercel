const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
// Railway requires using the PORT environment variable they provide
// If PORT is not set, use 5000 as fallback (for local development)
const PORT = process.env.PORT || 5000

// Log the port being used for debugging
console.log(`🔌 Using PORT: ${PORT} (from ${process.env.PORT ? 'Railway' : 'fallback'})`)

// CRITICAL: Health endpoint MUST be first, before ANY middleware
// Railway health checks need instant response without any processing
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' })
})

// CORS configuration - MUST be before routes
// Simplified and explicit configuration for better compatibility
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://studentitrack1.vercel.app'
app.use(cors({
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'https://studentitrack1.vercel.app',
    FRONTEND_URL
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}))

// Explicitly allow preflight OPTIONS requests (IMPORTANT for CORS)
// This fixes "Response to preflight request doesn't pass access control check"
app.options('*', cors())

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

// Health endpoint is now defined at the top (before middleware)
// This ensures Railway's health check gets instant response

// Root endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Student iTrack API Server',
    status: 'running',
    health: '/health',
    api: '/api'
  })
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

// 404 handler for unknown routes
app.use((req, res, next) => {
  console.log(`❌ 404 - Route not found: ${req.method} ${req.path}`)
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    availableRoutes: {
      health: '/health',
      apiHealth: '/api/health',
      students: '/api/students',
      professors: '/api/professors',
      courses: '/api/courses'
    }
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


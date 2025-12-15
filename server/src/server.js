const express = require('express')
const cors = require('cors')
require('dotenv').config()

const app = express()
const PORT = process.env.PORT || 5000

const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5177'
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

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      console.log('✅ CORS: Allowing request with no origin')
      return callback(null, true)
    }
    
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Allowing origin: ${origin}`)
      callback(null, true)
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`)
      console.warn(`⚠️ Allowed origins: ${allowedOrigins.join(', ')}`)
      if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
        console.log(`✅ CORS: Allowing localhost origin in development: ${origin}`)
        callback(null, true)
      } else {
        callback(new Error(`Not allowed by CORS. Origin: ${origin}`))
      }
    }
  },
  credentials: true
}))
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

app.use('/api/students', require('./student/routes/students'))
app.use('/api/professors', require('./professor/routes/professors'))
app.use('/api/courses', require('./professor/routes/courses'))
app.use('/api/enrollments', require('./professor/routes/enrollments'))
app.use('/api/grades', require('./professor/routes/grades'))
app.use('/api/attendance', require('./professor/routes/attendance'))
app.use('/api/notifications', require('./shared/routes/notifications'))
app.use('/api/reports', require('./professor/routes/reports'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running' })
})

const errorHandler = require('./shared/middleware/errorHandler')
app.use(errorHandler)

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`📡 API available at http://localhost:${PORT}/api`)
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


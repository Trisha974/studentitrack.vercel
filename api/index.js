// Vercel serverless function wrapper for Express app
const express = require('express')
const cors = require('cors')
const path = require('path')
require('dotenv').config()

const app = express()

// Get Vercel deployment URL from environment
const VERCEL_URL = process.env.VERCEL_URL
const FRONTEND_URL = process.env.FRONTEND_URL || (VERCEL_URL ? `https://${VERCEL_URL}` : 'http://localhost:5177')

const allowedOrigins = [
  FRONTEND_URL,
  'http://localhost:5173',
]

// Add Vercel preview and production URLs
if (VERCEL_URL) {
  allowedOrigins.push(`https://${VERCEL_URL}`)
}
if (process.env.VERCEL_ENV === 'production' && process.env.VERCEL_URL) {
  allowedOrigins.push(`https://${process.env.VERCEL_URL}`)
}

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) {
      return callback(null, true)
    }
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else if (origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true)
    } else if (origin.includes('vercel.app') || origin.includes('vercel.sh')) {
      // Allow all Vercel preview deployments
      callback(null, true)
    } else {
      console.warn(`⚠️ CORS blocked origin: ${origin}`)
      callback(new Error(`Not allowed by CORS. Origin: ${origin}`))
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

// Error handler must be required before changing directory
const errorHandler = require('../server/src/shared/middleware/errorHandler')

// Import routes - adjust paths for Vercel serverless environment
// Change to server/src directory so relative imports work correctly
process.chdir(path.join(__dirname, '..', 'server', 'src'))

app.use('/api/students', require('./student/routes/students'))
app.use('/api/professors', require('./professor/routes/professors'))
app.use('/api/courses', require('./professor/routes/courses'))
app.use('/api/enrollments', require('./professor/routes/enrollments'))
app.use('/api/grades', require('./professor/routes/grades'))
app.use('/api/attendance', require('./professor/routes/attendance'))
app.use('/api/notifications', require('./shared/routes/notifications'))
app.use('/api/reports', require('./professor/routes/reports'))

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server is running on Vercel' })
})

app.use(errorHandler)

// Export as Vercel serverless function
module.exports = app

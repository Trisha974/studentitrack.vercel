const fastify = require('fastify')({
  logger: {
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  },
  requestIdLogLabel: 'reqId',
  bodyLimit: 50 * 1024 * 1024, // 50MB
  ajv: {
    customOptions: {
      allowUnionTypes: true, // Allow union types in schemas (e.g., type: ['integer', 'string'])
      strict: false // Disable strict mode to allow union types
    },
    plugins: []
  }
})

// Override validator compiler to ensure allowUnionTypes is applied and formats are recognized
fastify.setValidatorCompiler(({ schema }) => {
  const Ajv = require('ajv')
  const addFormats = require('ajv-formats')
  const ajv = new Ajv({
    allowUnionTypes: true,
    strict: false,
    allErrors: true,
    removeAdditional: false
  })
  addFormats(ajv) // Add support for email, date, date-time, etc.
  return ajv.compile(schema)
})

// Register plugins
fastify.register(require('./plugins/cors'))

// Favicon handler (prevents 404 errors)
fastify.get('/favicon.ico', async (request, reply) => {
  return reply.code(204).send() // No Content
})

// Health endpoint (must be first)
fastify.get('/health', async (request, reply) => {
  return { status: 'healthy' }
})

// Root endpoint
fastify.get('/', async (request, reply) => {
  return {
    message: 'Student iTrack API Server',
    status: 'running',
    health: '/health',
    api: '/api'
  }
})

// API root endpoint - provides information about available routes
fastify.get('/api', async (request, reply) => {
  return {
    message: 'Student iTrack API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      },
      students: '/api/students',
      professors: '/api/professors',
      courses: '/api/courses',
      enrollments: '/api/enrollments',
      grades: '/api/grades',
      attendance: '/api/attendance',
      notifications: '/api/notifications',
      reports: '/api/reports'
    },
    timestamp: new Date().toISOString()
  }
})

// Detailed health endpoint
fastify.get('/api/health', async (request, reply) => {
  return {
    status: 'ok',
    message: 'Server is running',
    environment: process.env.NODE_ENV || 'development',
    database: {
      host: process.env.DB_HOST || 'not configured',
      database: process.env.DB_NAME || 'not configured'
    },
    auth: {
      type: 'JWT',
      configured: !!process.env.JWT_SECRET
    },
    timestamp: new Date().toISOString()
  }
})

// Test endpoint to check authentication status
fastify.get('/api/test-auth', async (request, reply) => {
  return {
    message: 'Authentication system is using JWT tokens with MySQL database',
    status: 'operational'
  }
})

// Register routes
fastify.register(require('./routes'))

// 404 handler
fastify.setNotFoundHandler(async (request, reply) => {
  console.log(`❌ 404 - Route not found: ${request.method} ${request.url}`)
  return reply.code(404).send({
    error: 'Not Found',
    message: `Route ${request.method} ${request.url} not found`,
    availableRoutes: {
      root: '/',
      api: '/api',
      health: '/health',
      apiHealth: '/api/health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register'
      },
      students: '/api/students',
      professors: '/api/professors',
      courses: '/api/courses',
      enrollments: '/api/enrollments',
      grades: '/api/grades',
      attendance: '/api/attendance',
      notifications: '/api/notifications',
      reports: '/api/reports'
    }
  })
})

// Error handler
const errorHandler = require('./hooks/errorHandler')
fastify.setErrorHandler(errorHandler)

module.exports = fastify


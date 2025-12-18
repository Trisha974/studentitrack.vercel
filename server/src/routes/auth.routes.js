const authController = require('../controllers/auth.controller')
const { loginSchema, registerSchema } = require('../schemas/auth.schema')

async function authRoutes(fastify, options) {
  // POST /api/auth/login - Login
  fastify.post('/login', {
    schema: loginSchema,
    handler: authController.login
  })

  // POST /api/auth/register - Register
  fastify.post('/register', {
    schema: registerSchema,
    handler: authController.register
  })

  // POST /api/auth/forgot-password - Request password reset
  fastify.post('/forgot-password', {
    handler: authController.requestPasswordReset
  })

  // POST /api/auth/reset-password - Reset password
  fastify.post('/reset-password', {
    handler: authController.resetPassword
  })
}

module.exports = authRoutes


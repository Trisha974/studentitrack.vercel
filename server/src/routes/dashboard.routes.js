const dashboardController = require('../controllers/dashboard.controller')
const { verifyToken, requireRole } = require('../hooks/auth')

async function dashboardRoutes(fastify, options) {
  // All routes require authentication
  fastify.addHook('preHandler', verifyToken)
  
  // Require Professor role
  fastify.addHook('preHandler', requireRole('Professor'))

  // GET /api/dashboard/state - Get dashboard state
  fastify.get('/state', {
    handler: dashboardController.getDashboardState
  })

  // PUT /api/dashboard/state - Save dashboard state
  fastify.put('/state', {
    handler: dashboardController.saveDashboardState
  })
}

module.exports = dashboardRoutes


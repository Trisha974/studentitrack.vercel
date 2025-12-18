const fp = require('fastify-plugin')
const atRiskController = require('../controllers/atRisk.controller')
const { authenticate } = require('../shared/middleware/auth')

async function atRiskRoutes(fastify, options) {
  // Check at-risk students for a course (professor only)
  fastify.get('/course/:courseId', {
    preHandler: authenticate,
    handler: atRiskController.checkCourseAtRisk
  })
}

module.exports = fp(atRiskRoutes)


const reportsController = require('../controllers/reports.controller')
const { verifyToken } = require('../hooks/auth')
const {
  studentIdParamSchema,
  courseIdParamSchema
} = require('../schemas/reports.schema')

async function reportsRoutes(fastify, options) {
  // Apply auth to all routes
  fastify.addHook('preHandler', verifyToken)

  // GET /api/reports/student/:studentId - Get student report
  fastify.get('/student/:studentId', {
    schema: studentIdParamSchema,
    handler: reportsController.getStudentReport
  })

  // GET /api/reports/course/:courseId - Get course report
  fastify.get('/course/:courseId', {
    schema: courseIdParamSchema,
    handler: reportsController.getCourseReport
  })
}

module.exports = reportsRoutes


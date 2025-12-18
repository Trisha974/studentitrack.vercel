const enrollmentsController = require('../controllers/enrollments.controller')
const { verifyToken, requireProfessor } = require('../hooks/auth')
const {
  enrollmentSchema,
  enrollmentIdParamSchema,
  studentIdParamSchema,
  courseIdParamSchema
} = require('../schemas/enrollments.schema')

async function enrollmentsRoutes(fastify, options) {
  // Apply auth to all routes
  fastify.addHook('preHandler', verifyToken)

  // GET /api/enrollments/student/:studentId - Get enrollments by student
  fastify.get('/student/:studentId', {
    schema: studentIdParamSchema,
    handler: enrollmentsController.getEnrollmentsByStudent
  })

  // GET /api/enrollments/student - Get enrollments by student (query param)
  fastify.get('/student', {
    handler: enrollmentsController.getEnrollmentsByStudent
  })

  // GET /api/enrollments/course/:courseId - Get enrollments by course
  fastify.get('/course/:courseId', {
    schema: courseIdParamSchema,
    handler: enrollmentsController.getEnrollmentsByCourse
  })

  // POST /api/enrollments - Create enrollment (Professor only)
  fastify.post('/', {
    preHandler: [requireProfessor],
    schema: enrollmentSchema,
    handler: enrollmentsController.createEnrollment
  })

  // DELETE /api/enrollments/:id - Delete enrollment (Professor only)
  fastify.delete('/:id', {
    preHandler: [requireProfessor],
    schema: enrollmentIdParamSchema,
    handler: enrollmentsController.deleteEnrollment
  })

  // DELETE /api/enrollments - Delete enrollment by student and course (Professor only)
  fastify.delete('/', {
    preHandler: [requireProfessor],
    schema: enrollmentSchema,
    handler: enrollmentsController.deleteEnrollmentByStudentAndCourse
  })
}

module.exports = enrollmentsRoutes


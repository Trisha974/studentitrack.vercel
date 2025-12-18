const studentsController = require('../controllers/students.controller')
const { verifyToken, verifyTokenOnly } = require('../hooks/auth')
const {
  studentSchema,
  studentIdParamSchema,
  studentUidParamSchema,
  studentEmailParamSchema,
  studentIdQuerySchema
} = require('../schemas/students.schema')

async function studentsRoutes(fastify, options) {
  // POST /api/students - Create student (only token verification, no role check)
  fastify.post('/', {
    preHandler: [verifyTokenOnly],
    schema: studentSchema,
    handler: studentsController.createStudent
  })

  // Apply auth to all other routes
  fastify.addHook('preHandler', verifyToken)

  // GET /api/students - Get all students
  fastify.get('/', {
    handler: studentsController.getAllStudents
  })

  // GET /api/students/me - Get current authenticated student
  fastify.get('/me', {
    handler: studentsController.getCurrentStudent
  })

  // GET /api/students/email/:email - Get student by email
  fastify.get('/email/:email', {
    schema: studentEmailParamSchema,
    handler: studentsController.getStudentByEmail
  })

  // GET /api/students/student-id/:studentId - Get student by numerical ID
  fastify.get('/student-id/:studentId', {
    schema: studentIdQuerySchema,
    handler: studentsController.getStudentByNumericalId
  })

  // GET /api/students/:id - Get student by ID
  fastify.get('/:id', {
    schema: studentIdParamSchema,
    handler: studentsController.getStudentById
  })

  // PUT /api/students/:id - Update student
  fastify.put('/:id', {
    schema: {
      ...studentIdParamSchema,
      ...studentSchema
    },
    handler: studentsController.updateStudent
  })

  // DELETE /api/students/:id - Delete student
  fastify.delete('/:id', {
    schema: studentIdParamSchema,
    handler: studentsController.deleteStudent
  })
}

module.exports = studentsRoutes


const gradesController = require('../controllers/grades.controller')
const { verifyToken, requireProfessor } = require('../hooks/auth')
const {
  gradeSchema,
  gradeIdParamSchema
} = require('../schemas/grades.schema')

async function gradesRoutes(fastify, options) {
  // Apply auth to all routes
  fastify.addHook('preHandler', verifyToken)

  // GET /api/grades/student/:studentId - Get grades by student
  fastify.get('/student/:studentId', {
    handler: gradesController.getGradesByStudent
  })

  // GET /api/grades/course/:courseId - Get grades by course
  fastify.get('/course/:courseId', {
    handler: gradesController.getGradesByCourse
  })

  // GET /api/grades - Get grades by student and course (query params)
  fastify.get('/', {
    handler: gradesController.getGradesByStudentAndCourse
  })

  // POST /api/grades - Create grade (Professor only)
  fastify.post('/', {
    preHandler: [requireProfessor],
    schema: {
      ...gradeSchema,
      // Don't validate response - just accept what controller returns
      response: {}
    },
    handler: gradesController.createGrade
  })

  // PUT /api/grades/:id - Update grade (Professor only)
  fastify.put('/:id', {
    preHandler: [requireProfessor],
    schema: {
      ...gradeIdParamSchema,
      ...gradeSchema
    },
    handler: gradesController.updateGrade
  })

  // DELETE /api/grades/:id - Delete grade (Professor only)
  fastify.delete('/:id', {
    preHandler: [requireProfessor],
    schema: gradeIdParamSchema,
    handler: gradesController.deleteGrade
  })
}

module.exports = gradesRoutes


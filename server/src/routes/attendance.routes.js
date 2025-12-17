const attendanceController = require('../controllers/attendance.controller')
const { verifyToken, requireProfessor } = require('../hooks/auth')
const {
  attendanceSchema,
  attendanceIdParamSchema
} = require('../schemas/attendance.schema')

async function attendanceRoutes(fastify, options) {
  // Apply auth to all routes
  fastify.addHook('preHandler', verifyToken)

  // GET /api/attendance/student/:studentId - Get attendance by student
  fastify.get('/student/:studentId', {
    handler: attendanceController.getAttendanceByStudent
  })

  // GET /api/attendance/course/:courseId - Get attendance by course
  fastify.get('/course/:courseId', {
    handler: attendanceController.getAttendanceByCourse
  })

  // GET /api/attendance - Get attendance by student and course (query params)
  fastify.get('/', {
    handler: attendanceController.getAttendanceByStudentAndCourse
  })

  // POST /api/attendance - Create attendance (Professor only)
  fastify.post('/', {
    preHandler: [requireProfessor],
    schema: attendanceSchema,
    handler: attendanceController.createAttendance
  })

  // PUT /api/attendance/:id - Update attendance (Professor only)
  fastify.put('/:id', {
    preHandler: [requireProfessor],
    schema: {
      ...attendanceIdParamSchema,
      ...attendanceSchema
    },
    handler: attendanceController.updateAttendance
  })

  // DELETE /api/attendance/:id - Delete attendance (Professor only)
  fastify.delete('/:id', {
    preHandler: [requireProfessor],
    schema: attendanceIdParamSchema,
    handler: attendanceController.deleteAttendance
  })
}

module.exports = attendanceRoutes


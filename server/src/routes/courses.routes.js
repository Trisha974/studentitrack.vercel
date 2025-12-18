const coursesController = require('../controllers/courses.controller')
const { verifyToken, requireProfessor } = require('../hooks/auth')
const {
  courseSchema,
  courseIdParamSchema,
  courseCodeParamSchema,
  professorIdParamSchema
} = require('../schemas/courses.schema')

async function coursesRoutes(fastify, options) {
  // Apply auth to all routes
  fastify.addHook('preHandler', verifyToken)

  // GET /api/courses - Get all courses
  fastify.get('/', {
    handler: coursesController.getAllCourses
  })

  // GET /api/courses/professor/:professorId - Get courses by professor
  fastify.get('/professor/:professorId', {
    schema: professorIdParamSchema,
    handler: coursesController.getCoursesByProfessor
  })

  // GET /api/courses/code/:code - Get course by code
  fastify.get('/code/:code', {
    schema: courseCodeParamSchema,
    handler: coursesController.getCourseByCode
  })

  // GET /api/courses/:id - Get course by ID
  fastify.get('/:id', {
    schema: courseIdParamSchema,
    handler: coursesController.getCourseById
  })

  // POST /api/courses - Create course (Professor only)
  fastify.post('/', {
    preHandler: [requireProfessor],
    schema: courseSchema,
    handler: coursesController.createCourse
  })

  // PUT /api/courses/:id - Update course (Professor only)
  fastify.put('/:id', {
    preHandler: [requireProfessor],
    schema: {
      ...courseIdParamSchema,
      ...courseSchema
    },
    handler: coursesController.updateCourse
  })

  // DELETE /api/courses/:id - Delete course (Professor only)
  fastify.delete('/:id', {
    preHandler: [requireProfessor],
    schema: courseIdParamSchema,
    handler: coursesController.deleteCourse
  })
}

module.exports = coursesRoutes


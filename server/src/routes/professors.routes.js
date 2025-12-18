const professorsController = require('../controllers/professors.controller')
const { verifyToken, verifyTokenOnly } = require('../hooks/auth')
const {
  professorSchema,
  professorIdParamSchema,
  professorUidParamSchema,
  professorEmailParamSchema
} = require('../schemas/professors.schema')

async function professorsRoutes(fastify, options) {
  // POST /api/professors - Create professor (only token verification, no role check)
  fastify.post('/', {
    preHandler: [verifyTokenOnly],
    schema: professorSchema,
    handler: professorsController.createProfessor
  })

  // Apply auth to all other routes
  fastify.addHook('preHandler', verifyToken)

  // GET /api/professors - Get all professors
  fastify.get('/', {
    handler: professorsController.getAllProfessors
  })

  // GET /api/professors/me - Get current authenticated professor
  fastify.get('/me', {
    handler: professorsController.getCurrentProfessor
  })

  // GET /api/professors/email/:email - Get professor by email
  fastify.get('/email/:email', {
    schema: professorEmailParamSchema,
    handler: professorsController.getProfessorByEmail
  })

  // GET /api/professors/:id - Get professor by ID
  fastify.get('/:id', {
    schema: professorIdParamSchema,
    handler: professorsController.getProfessorById
  })

  // PUT /api/professors/:id - Update professor
  fastify.put('/:id', {
    schema: {
      ...professorIdParamSchema,
      ...professorSchema
    },
    handler: professorsController.updateProfessor
  })

  // DELETE /api/professors/:id - Delete professor
  fastify.delete('/:id', {
    schema: professorIdParamSchema,
    handler: professorsController.deleteProfessor
  })
}

module.exports = professorsRoutes


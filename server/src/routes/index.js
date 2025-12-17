const fp = require('fastify-plugin')

async function routes(fastify, options) {
  // Register auth routes first (no auth required)
  await fastify.register(require('./auth.routes'), { prefix: '/api/auth' })
  
  // Register all other Fastify route modules
  await fastify.register(require('./students.routes'), { prefix: '/api/students' })
  await fastify.register(require('./professors.routes'), { prefix: '/api/professors' })
  await fastify.register(require('./courses.routes'), { prefix: '/api/courses' })
  await fastify.register(require('./enrollments.routes'), { prefix: '/api/enrollments' })
  await fastify.register(require('./grades.routes'), { prefix: '/api/grades' })
  await fastify.register(require('./attendance.routes'), { prefix: '/api/attendance' })
  await fastify.register(require('./notifications.routes'), { prefix: '/api/notifications' })
  await fastify.register(require('./reports.routes'), { prefix: '/api/reports' })
}

module.exports = fp(routes)


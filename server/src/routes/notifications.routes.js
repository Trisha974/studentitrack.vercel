const notificationsController = require('../controllers/notifications.controller')
const { verifyToken } = require('../hooks/auth')
const { notificationIdParamSchema } = require('../schemas/notifications.schema')

async function notificationsRoutes(fastify, options) {
  // Apply auth to all routes
  fastify.addHook('preHandler', verifyToken)

  // GET /api/notifications - Get all notifications
  fastify.get('/', {
    handler: notificationsController.getNotifications
  })

  // GET /api/notifications/unread/count - Get unread count
  fastify.get('/unread/count', {
    handler: notificationsController.getUnreadCount
  })

  // PUT /api/notifications/:id/read - Mark notification as read
  fastify.put('/:id/read', {
    schema: notificationIdParamSchema,
    handler: notificationsController.markAsRead
  })

  // PUT /api/notifications/:id/toggle-read - Toggle notification read status
  fastify.put('/:id/toggle-read', {
    schema: notificationIdParamSchema,
    handler: notificationsController.toggleRead
  })

  // PUT /api/notifications/read-all - Mark all notifications as read
  fastify.put('/read-all', {
    handler: notificationsController.markAllAsRead
  })

  // DELETE /api/notifications/:id - Delete notification
  fastify.delete('/:id', {
    schema: notificationIdParamSchema,
    handler: notificationsController.deleteNotification
  })
}

module.exports = notificationsRoutes


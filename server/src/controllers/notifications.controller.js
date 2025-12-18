const notificationsService = require('../services/notifications.service')

const getNotifications = async (request, reply) => {
  // CRITICAL: Wrap everything to prevent any error from causing 500
  try {
    // Validate and sanitize query parameters
    let limit = 50 // Default
    let offset = 0 // Default
    let unreadOnly = false

    try {
      if (request.query.limit !== undefined) {
        const parsedLimit = parseInt(request.query.limit, 10)
        if (!isNaN(parsedLimit) && parsedLimit > 0 && parsedLimit <= 1000) {
          limit = parsedLimit
        }
      }
    } catch (e) {
      console.warn('⚠️ Invalid limit parameter, using default 50')
    }

    try {
      if (request.query.offset !== undefined) {
        const parsedOffset = parseInt(request.query.offset, 10)
        if (!isNaN(parsedOffset) && parsedOffset >= 0) {
          offset = parsedOffset
        }
      }
    } catch (e) {
      console.warn('⚠️ Invalid offset parameter, using default 0')
    }

    unreadOnly = request.query.unreadOnly === 'true'

    console.log('📬 getNotifications called:', {
      userId: request.user?.id,
      email: request.user?.email,
      role: request.user?.role,
      user_id: request.user?.user_id,
      limit,
      offset,
      unreadOnly,
      hasUser: !!request.user
    })

    // Validate request.user exists (auth middleware should set this)
    if (!request.user) {
      console.error('❌ request.user is undefined - auth middleware may have failed')
      console.error('❌ Request headers:', {
        authorization: request.headers.authorization ? 'present' : 'missing',
        method: request.method,
        url: request.url
      })
      return reply.code(401).send({ 
        error: 'Unauthorized',
        message: 'Authentication required',
        notifications: [] 
      })
    }

    if (!request.user.id) {
      console.error('❌ request.user.id is undefined')
      console.error('❌ request.user object:', request.user)
      return reply.code(401).send({ 
        error: 'Invalid user',
        message: 'User ID not found in token',
        notifications: [] 
      })
    }

    // Validate database connection
    const pool = require('../shared/config/database')
    if (!pool) {
      console.error('❌ Database pool is not initialized')
      return reply.code(503).send({ 
        error: 'Service unavailable',
        message: 'Database connection not available',
        notifications: [] 
      })
    }

    // Call service layer
    const notifications = await notificationsService.getNotifications(
      request.user.id,
      request.user.email || '',
      request.user.role || 'Student',
      { limit, offset, unreadOnly }
    )

    console.log('✅ getNotifications returning:', Array.isArray(notifications) ? notifications.length : 'non-array', 'notifications')

    // Ensure we return an array
    if (!Array.isArray(notifications)) {
      console.warn('⚠️ getNotifications returned non-array:', typeof notifications)
      return []
    }

    return notifications

  } catch (error) {
    // Log the EXACT error with full stack trace
    console.error('❌ CRITICAL ERROR in getNotifications controller:')
    console.error('❌ Error message:', error.message)
    console.error('❌ Error stack:', error.stack)
    console.error('❌ Error name:', error.name)
    console.error('❌ Error code:', error.code)
    console.error('❌ Request details:', {
      method: request.method,
      url: request.url,
      query: request.query,
      hasUser: !!request.user,
      userId: request.user?.id
    })

    // Return safe JSON response - NEVER throw
    return reply.code(200).send({ 
      error: 'Failed to fetch notifications',
      message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
      notifications: [] 
    })
  }
}

const getUnreadCount = async (request, reply) => {
  // Wrap everything in try-catch to ensure we never throw
  try {
    try {
      console.log('📬 getUnreadCount called:', {
        userId: request.user?.id,
        email: request.user?.email,
        role: request.user?.role,
        user_id: request.user?.user_id
      })

      // Validate request.user exists
      if (!request.user || !request.user.id) {
        console.warn('⚠️ No user in request, returning 0 count')
        return { count: 0 }
      }

      // Use JWT user ID (request.user.id) instead of Firebase UID
      const count = await notificationsService.getUnreadCount(
        request.user.id, // MySQL user ID from JWT
        request.user.email,
        request.user.role
      )
      
      console.log('✅ getUnreadCount returning:', count)
      return { count: typeof count === 'number' ? count : 0 }
    } catch (innerError) {
      console.error('❌ Inner error in getUnreadCount controller:', innerError)
      console.error('❌ Inner error details:', {
        message: innerError.message,
        stack: innerError.stack,
        userId: request.user?.id,
        email: request.user?.email,
        role: request.user?.role
      })
      // Return 0 instead of throwing
      return { count: 0 }
    }
  } catch (outerError) {
    // Final safety net - catch any unexpected errors
    console.error('❌ Outer error in getUnreadCount controller:', outerError)
    console.error('❌ Outer error details:', {
      message: outerError.message,
      stack: outerError.stack
    })
    // Always return 0 - never throw
    return { count: 0 }
  }
}

const markAsRead = async (request, reply) => {
  try {
    const notification = await notificationsService.markAsRead(request.params.id)
    if (!notification) {
      return reply.code(404).send({ error: 'Notification not found' })
    }
    return notification
  } catch (error) {
    throw error
  }
}

const toggleRead = async (request, reply) => {
  try {
    const notification = await notificationsService.toggleRead(request.params.id)
    if (!notification) {
      return reply.code(404).send({ error: 'Notification not found' })
    }
    return notification
  } catch (error) {
    throw error
  }
}

const markAllAsRead = async (request, reply) => {
  try {
    // Use JWT user ID (request.user.id) instead of Firebase UID
    await notificationsService.markAllAsRead(
      request.user.id, // MySQL user ID from JWT
      request.user.email,
      request.user.role
    )
    return { message: 'All notifications marked as read' }
  } catch (error) {
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: error.message })
    }
    throw error
  }
}

const deleteNotification = async (request, reply) => {
  try {
    await notificationsService.deleteNotification(request.params.id)
    return { message: 'Notification deleted successfully' }
  } catch (error) {
    throw error
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  toggleRead,
  markAllAsRead,
  deleteNotification
}


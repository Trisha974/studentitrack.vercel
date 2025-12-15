const Notification = require('../models/Notification')
const Student = require('../../student/models/Student')
const Professor = require('../../professor/models/Professor')
const { getUserRoleFromDB } = require('../middleware/auth')

/**
 * Get all notifications for the authenticated user
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.uid
    const userEmail = req.user.email
    const userRole = req.user.role

    let userMySQLId = null
    let userType = null

    if (userRole === 'Student') {
      let student = await Student.findByFirebaseUid(userId)
      console.log(`🔍 Student lookup by Firebase UID ${userId}:`, student ? `Found (MySQL ID: ${student.id})` : 'Not found')
      
      if (!student && userEmail) {
        student = await Student.findByEmail(userEmail)
        console.log(`📧 Student lookup by email ${userEmail}:`, student ? `Found (MySQL ID: ${student.id})` : 'Not found')
      }
      
      if (!student && userEmail) {
        const emailMatch = userEmail.match(/\.(\d+)\.tc@umindanao\.edu\.ph/)
        if (emailMatch && emailMatch[1]) {
          const extractedStudentId = emailMatch[1]
          student = await Student.findByStudentId(extractedStudentId)
          console.log(`🔍 Student lookup by extracted ID ${extractedStudentId}:`, student ? `Found (MySQL ID: ${student.id})` : 'Not found')
        }
      }
      
      if (!student) {
        console.error(`❌ Student profile not found for:`, {
          firebaseUid: userId,
          email: userEmail,
          role: userRole
        })
        console.warn('⚠️ Returning empty array because student profile not found')
        return res.json([])
      }
      userMySQLId = student.id
      userType = 'Student'
      console.log(`📬 Loading notifications for student MySQL ID: ${userMySQLId} (Firebase UID: ${userId}, Email: ${userEmail})`)
      console.log(`📬 Student details:`, {
        id: student.id,
        idType: typeof student.id,
        name: student.name,
        email: student.email,
        student_id: student.student_id,
        firebase_uid: student.firebase_uid
      })
      
      if (typeof userMySQLId !== 'number') {
        console.error(`❌ Student MySQL ID is not a number! Type: ${typeof userMySQLId}, Value: ${userMySQLId}`)
        console.error('❌ This will cause query to fail. Converting to number...')
        userMySQLId = parseInt(userMySQLId, 10)
        if (isNaN(userMySQLId)) {
          console.error('❌ Failed to convert student ID to number. Returning empty array.')
          return res.json([])
        }
        console.log(`✅ Converted student MySQL ID to number: ${userMySQLId}`)
      }
      
      console.log(`📬 Using userType: "${userType}" (type: ${typeof userType})`)
    } else if (userRole === 'Professor') {
      const professor = await Professor.findByFirebaseUid(userId)
      if (!professor) {
        return res.status(404).json({ error: 'Professor profile not found' })
      }
      userMySQLId = professor.id
      userType = 'Professor'
      console.log(`📬 Loading notifications for professor MySQL ID: ${userMySQLId}`)
    } else {
      return res.status(403).json({ error: 'Invalid user role' })
    }

    const limit = parseInt(req.query.limit) || 50
    const offset = parseInt(req.query.offset) || 0
    const unreadOnly = req.query.unreadOnly === 'true'

    try {
      const pool = require('../config/database')
      const [debugRows] = await pool.execute(
        'SELECT id, user_id, user_type, title, created_at FROM notifications WHERE user_id = ?',
        [userMySQLId]
      )
      console.log(`🔍 DEBUG: All notifications for user_id ${userMySQLId}:`, debugRows.length, 'notifications')
      if (debugRows.length > 0) {
        console.log(`🔍 DEBUG: Sample notification:`, {
          id: debugRows[0].id,
          user_id: debugRows[0].user_id,
          user_type: debugRows[0].user_type,
          title: debugRows[0].title
        })
      }
      console.log(`🔍 DEBUG: Looking for user_type "${userType}" among ${debugRows.length} total notifications`)
      
      // Also check what user_types exist for this user_id
      const [typeRows] = await pool.execute(
        'SELECT user_type, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY user_type',
        [userMySQLId]
      )
      console.log(`🔍 DEBUG: User types for user_id ${userMySQLId}:`, typeRows)
    } catch (debugError) {
      console.warn('⚠️ Debug query failed (non-critical):', debugError.message)
    }

    // CRITICAL: Log before calling findByUser
    console.log(`📬 About to call Notification.findByUser with:`, {
      userMySQLId,
      userMySQLIdType: typeof userMySQLId,
      userType,
      userTypeType: typeof userType,
      limit,
      offset,
      unreadOnly
    })
    
    const notifications = await Notification.findByUser(userMySQLId, userType, {
      limit,
      offset,
      unreadOnly
    })

    console.log(`📬 Found ${notifications.length} notifications for ${userType} ID ${userMySQLId}`)
    console.log(`📬 Notifications is array:`, Array.isArray(notifications))
    console.log(`📬 Notifications type:`, typeof notifications)
    
    // Ensure we're sending an array
    if (!Array.isArray(notifications)) {
      console.error('❌ Notifications is not an array!', notifications)
      console.error('❌ Notifications type:', typeof notifications)
      console.error('❌ Notifications value:', JSON.stringify(notifications).substring(0, 500))
      return res.json([])
    }
    
    // Log first notification for debugging (without full JSON stringify to avoid circular refs)
    if (notifications.length > 0) {
      console.log(`📬 First notification sample:`, {
        id: notifications[0].id,
        title: notifications[0].title,
        read: notifications[0].read,
        user_id: notifications[0].user_id,
        user_type: notifications[0].user_type
      })
      console.log(`✅ Sending ${notifications.length} notifications to client`)
    } else {
      console.warn(`⚠️ No notifications found for ${userType} ID ${userMySQLId}. Checking if notifications exist for this user_id...`)
      // Double-check if there are any notifications for this user_id (regardless of user_type)
      try {
        const pool = require('../config/database')
        const [checkRows] = await pool.execute(
          'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
          [userMySQLId]
        )
        console.log(`🔍 Total notifications for user_id ${userMySQLId} (any type): ${checkRows[0].count}`)
        if (checkRows[0].count > 0) {
          // Check what user_types exist for this user_id
          const [typeRows] = await pool.execute(
            'SELECT user_type, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY user_type',
            [userMySQLId]
          )
          console.log(`🔍 User types for user_id ${userMySQLId}:`, typeRows)
          
          // CRITICAL: Always try fallback query if notifications exist but query returned empty
          console.log(`🔄 FALLBACK: Querying notifications without user_type filter for user_id ${userMySQLId}...`)
          const [allRows] = await pool.execute(
            'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?',
            [userMySQLId, limit || 50]
          )
          console.log(`🔄 Fallback query found ${allRows.length} notifications without user_type filter`)
          
          if (allRows.length > 0) {
            console.warn(`⚠️ Returning ${allRows.length} notifications without user_type filter as fallback`)
            console.warn(`⚠️ Expected user_type: "${userType}", Found types:`, typeRows.map(r => `${r.user_type} (${r.count})`).join(', '))
            // Normalize the read field
            const normalized = allRows.map(row => ({
              ...row,
              read: Boolean(row.read === 1 || row.read === true)
            }))
            return res.json(normalized)
          } else {
            console.warn(`⚠️ Mismatch detected! Looking for user_type "${userType}" but found:`, typeRows.map(r => `${r.user_type} (${r.count})`).join(', '))
          }
        } else {
          console.warn(`⚠️ No notifications exist in database for user_id ${userMySQLId}`)
        }
      } catch (checkError) {
        console.error('❌ Error checking notification mismatch:', checkError)
        console.error('❌ Error details:', {
          message: checkError.message,
          stack: checkError.stack
        })
      }
    }
    
    console.log(`📤 Sending response with ${notifications.length} notifications`)
    res.json(notifications)
  } catch (error) {
    console.error('❌ Error in getNotifications controller:', error)
    console.error('❌ Error details:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState,
      sqlCode: error.code,
      errno: error.errno,
      stack: error.stack
    })
    // Return empty array instead of 500 error to prevent crashes
    console.warn('⚠️ Returning empty array due to error in getNotifications')
    return res.json([])
  }
}

/**
 * Get unread notification count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.uid
    const userEmail = req.user.email
    const userRole = req.user.role

    let userMySQLId = null
    let userType = null

    if (userRole === 'Student') {
      // Try Firebase UID first
      let student = await Student.findByFirebaseUid(userId)
      
      // Fallback: Try email if UID lookup fails
      if (!student && userEmail) {
        student = await Student.findByEmail(userEmail)
      }
      
      // Fallback: Try extracting student ID from email
      if (!student && userEmail) {
        const emailMatch = userEmail.match(/\.(\d+)\.tc@umindanao\.edu\.ph/)
        if (emailMatch && emailMatch[1]) {
          const extractedStudentId = emailMatch[1]
          student = await Student.findByStudentId(extractedStudentId)
        }
      }
      
      if (!student) {
        console.error(`❌ [getUnreadCount] Student profile not found for Firebase UID: ${userId}, Email: ${userEmail}`)
        return res.status(404).json({ error: 'Student profile not found' })
      }
      userMySQLId = student.id
      userType = 'Student'
      console.log(`📬 [getUnreadCount] Using student MySQL ID: ${userMySQLId} (type: ${typeof userMySQLId})`)
    } else if (userRole === 'Professor') {
      const professor = await Professor.findByFirebaseUid(userId)
      if (!professor) {
        return res.status(404).json({ error: 'Professor profile not found' })
      }
      userMySQLId = professor.id
      userType = 'Professor'
    } else {
      return res.status(403).json({ error: 'Invalid user role' })
    }

    const count = await Notification.getUnreadCount(userMySQLId, userType)
    console.log(`📊 [getUnreadCount] Returning count: ${count} for ${userType} ID ${userMySQLId}`)
    res.json({ count })
  } catch (error) {
    next(error)
  }
}

/**
 * Mark notification as read
 */
const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.markAsRead(req.params.id)
    if (!notification) {
      return res.status(404).json({ error: 'Notification not found' })
    }
    res.json(notification)
  } catch (error) {
    next(error)
  }
}

/**
 * Mark all notifications as read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.uid
    const userEmail = req.user.email
    const userRole = req.user.role

    let userMySQLId = null
    let userType = null

    if (userRole === 'Student') {
      // Try Firebase UID first
      let student = await Student.findByFirebaseUid(userId)
      
      // Fallback: Try email if UID lookup fails
      if (!student && userEmail) {
        student = await Student.findByEmail(userEmail)
      }
      
      // Fallback: Try extracting student ID from email
      if (!student && userEmail) {
        const emailMatch = userEmail.match(/\.(\d+)\.tc@umindanao\.edu\.ph/)
        if (emailMatch && emailMatch[1]) {
          const extractedStudentId = emailMatch[1]
          student = await Student.findByStudentId(extractedStudentId)
        }
      }
      
      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' })
      }
      userMySQLId = student.id
      userType = 'Student'
    } else if (userRole === 'Professor') {
      const professor = await Professor.findByFirebaseUid(userId)
      if (!professor) {
        return res.status(404).json({ error: 'Professor profile not found' })
      }
      userMySQLId = professor.id
      userType = 'Professor'
    } else {
      return res.status(403).json({ error: 'Invalid user role' })
    }

    await Notification.markAllAsRead(userMySQLId, userType)
    res.json({ message: 'All notifications marked as read' })
  } catch (error) {
    next(error)
  }
}

/**
 * Delete notification
 */
const deleteNotification = async (req, res, next) => {
  try {
    await Notification.delete(req.params.id)
    res.json({ message: 'Notification deleted successfully' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
}



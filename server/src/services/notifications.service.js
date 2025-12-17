const Notification = require('../shared/models/Notification')
const Student = require('../student/models/Student')
const Professor = require('../professor/models/Professor')

const getUserMySQLId = async (userId, userEmail, userRole) => {
  let userMySQLId = null
  let userType = null

  console.log('🔍 getUserMySQLId called with:', { userId, userEmail, userRole })

  if (userRole === 'Student') {
    // userId is now the MySQL user ID from the users table
    // We need to get the student_id (which points to students.id) from the users table
    const User = require('../models/User')
    const user = await User.findById(userId)
    
    if (!user) {
      console.error('❌ User not found for ID:', userId)
      console.warn('⚠️ Returning null userMySQLId - user not found')
      return { userMySQLId: null, userType: 'Student' }
    }

    console.log('✅ User found:', { id: user.id, email: user.email, user_id: user.user_id, role: user.role })

    // user.user_id points to students.id (the profile ID)
    let student = user && user.user_id ? await Student.findById(user.user_id) : null
    
    if (!student && userEmail) {
      console.log('⚠️ Student not found by user_id, trying email:', userEmail)
      student = await Student.findByEmail(userEmail)
    }
    
    if (!student && userEmail) {
      const emailMatch = userEmail.match(/\.(\d+)\.tc@umindanao\.edu\.ph/)
      if (emailMatch && emailMatch[1]) {
        console.log('⚠️ Student not found by email, trying student_id from email:', emailMatch[1])
        student = await Student.findByStudentId(emailMatch[1])
      }
    }
    
    if (!student) {
      console.error('❌ Student profile not found for user:', { 
        userId, 
        email: userEmail,
        userData: user ? { id: user.id, email: user.email, user_id: user.user_id, role: user.role } : null
      })
      // Return empty array instead of throwing - student might not have profile yet
      console.warn('⚠️ Returning empty notifications - student profile not found')
      return { userMySQLId: null, userType: 'Student' }
    }
    
    userMySQLId = student.id
    userType = 'Student'
    console.log('✅ Student profile found:', { studentId: student.id, name: student.name })
  } else if (userRole === 'Professor') {
    const User = require('../models/User')
    const user = await User.findById(userId)
    
    if (!user) {
      console.error('❌ User not found for ID:', userId)
      console.warn('⚠️ Returning null userMySQLId - user not found')
      return { userMySQLId: null, userType: 'Professor' }
    }

    // user.user_id points to professors.id (the profile ID)
    const professor = user && user.user_id ? await Professor.findById(user.user_id) : null
    
    if (!professor) {
      console.error('❌ Professor profile not found for user:', { userId, email: userEmail })
      console.warn('⚠️ Returning null userMySQLId - professor profile not found')
      return { userMySQLId: null, userType: 'Professor' }
    }
    
    userMySQLId = professor.id
    userType = 'Professor'
    console.log('✅ Professor profile found:', { professorId: professor.id, name: professor.name })
  } else {
    console.error('❌ Invalid user role:', userRole)
    console.warn('⚠️ Returning null userMySQLId - invalid role')
    return { userMySQLId: null, userType: null }
  }

  return { userMySQLId, userType }
}

const getNotifications = async (userId, userEmail, userRole, options = {}) => {
  try {
    const { userMySQLId, userType } = await getUserMySQLId(userId, userEmail, userRole)
    
    if (!userMySQLId || !userType) {
      console.warn('⚠️ No userMySQLId or userType found, returning empty notifications array', {
        userMySQLId,
        userType,
        userId,
        userEmail,
        userRole
      })
      return []
    }
    
    console.log('📬 Calling Notification.findByUser with:', { userMySQLId, userType, options })
    const result = await Notification.findByUser(userMySQLId, userType, options)
    console.log('📬 Notification.findByUser returned:', Array.isArray(result) ? result.length : 'non-array', 'items')
    return result
  } catch (error) {
    console.error('❌ Error in getNotifications service:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      userId,
      userEmail,
      userRole
    })
    // Return empty array instead of throwing
    return []
  }
}

const getUnreadCount = async (userId, userEmail, userRole) => {
  try {
    const { userMySQLId, userType } = await getUserMySQLId(userId, userEmail, userRole)
    
    if (!userMySQLId || !userType) {
      console.warn('⚠️ No userMySQLId or userType found, returning 0 unread count', {
        userMySQLId,
        userType,
        userId,
        userEmail,
        userRole
      })
      return 0
    }
    
    console.log('📬 Calling Notification.getUnreadCount with:', { userMySQLId, userType })
    const result = await Notification.getUnreadCount(userMySQLId, userType)
    console.log('📬 Notification.getUnreadCount returned:', result)
    return result
  } catch (error) {
    console.error('❌ Error in getUnreadCount service:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      userId,
      userEmail,
      userRole
    })
    // Return 0 instead of throwing
    return 0
  }
}

const markAsRead = async (id) => {
  return await Notification.markAsRead(id)
}

const markAllAsRead = async (userId, userEmail, userRole) => {
  const { userMySQLId, userType } = await getUserMySQLId(userId, userEmail, userRole)
  return await Notification.markAllAsRead(userMySQLId, userType)
}

const deleteNotification = async (id) => {
  return await Notification.delete(id)
}

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification
}


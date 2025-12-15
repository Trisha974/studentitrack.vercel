import apiClient from './apiClient'

/**
 * Get all notifications for the authenticated user
 * @param {Object} options - { limit, offset, unreadOnly }
 * @returns {Promise<Array>} Array of notifications
 */
export async function getNotifications(options = {}) {
  const queryParams = new URLSearchParams()
  if (options.limit) queryParams.append('limit', options.limit)
  if (options.offset) queryParams.append('offset', options.offset)
  if (options.unreadOnly) queryParams.append('unreadOnly', 'true')

  const endpoint = queryParams.toString()
    ? `/notifications?${queryParams.toString()}`
    : '/notifications'

  const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
  const fullUrl = `${API_BASE_URL}${endpoint}`
  
  console.log('📬 Fetching notifications from:', fullUrl)
  console.log('📬 API configuration:', {
    apiBaseUrl: API_BASE_URL,
    endpoint,
    fullUrl,
    envVar: import.meta.env.VITE_API_URL || 'not set (using default)'
  })
  
  try {
    const result = await apiClient.get(endpoint)
    
    // Enhanced logging for debugging - log the FULL response structure
    console.log('📬 Notifications API response (raw):', {
      type: typeof result,
      isArray: Array.isArray(result),
      length: Array.isArray(result) ? result.length : 'N/A',
      hasData: !!result,
      dataType: result ? typeof result : 'null',
      isObject: result && typeof result === 'object' && !Array.isArray(result),
      keys: result && typeof result === 'object' && !Array.isArray(result) ? Object.keys(result) : null,
      fullResponse: result, // Log the full response to see structure
      stringified: JSON.stringify(result).substring(0, 500) // First 500 chars of stringified response
    })
    
    // Ensure we return an array
    if (Array.isArray(result)) {
      console.log('✅ Response is direct array, returning', result.length, 'notifications')
      return result
    }
    
    // Handle wrapped responses - check ALL possible object properties
    if (result && typeof result === 'object' && !Array.isArray(result)) {
      const keys = Object.keys(result)
      console.log('🔍 Response is object with keys:', keys)
      
      // Try common array properties
      for (const key of ['data', 'notifications', 'items', 'results', 'list', 'array']) {
        if (Array.isArray(result[key])) {
          console.log(`✅ Found notifications in result.${key}, returning`, result[key].length, 'notifications')
          return result[key]
        }
      }
      
      // Check if any property is an array
      for (const key of keys) {
        if (Array.isArray(result[key])) {
          console.log(`✅ Found array in result.${key}, returning`, result[key].length, 'items')
          return result[key]
        }
      }
      
      // If object has numeric keys (like {0: {...}, 1: {...}}), convert to array
      if (keys.every(k => !isNaN(parseInt(k)))) {
        const arrayFromObject = Object.values(result)
        if (arrayFromObject.length > 0) {
          console.log('✅ Converted object with numeric keys to array, returning', arrayFromObject.length, 'items')
          return arrayFromObject
        }
      }
      
      // Last resort: if object has only one property and it's an array
      if (keys.length === 1 && Array.isArray(result[keys[0]])) {
        console.log(`✅ Found single array property ${keys[0]}, returning`, result[keys[0]].length, 'items')
        return result[keys[0]]
      }
      
      console.error('❌ Response is object but no array found in any property!')
      console.error('❌ Object keys:', keys)
      console.error('❌ Object values:', Object.values(result).map(v => ({ type: typeof v, isArray: Array.isArray(v) })))
      console.error('❌ Full response:', JSON.stringify(result, null, 2))
    }
    
    // If we get here, something unexpected happened
    console.error('❌ Unexpected notifications response format!')
    console.error('❌ Response type:', typeof result)
    console.error('❌ Response value:', result)
    console.error('❌ Full response stringified:', JSON.stringify(result, null, 2).substring(0, 1000))
    
    // Last resort: if result is an error object, check for error message
    if (result && typeof result === 'object' && result.error) {
      console.error('❌ API returned error:', result.error)
      throw new Error(result.error)
    }
    
    return []
  } catch (error) {
    console.error('❌ Error fetching notifications:', error)
    console.error('❌ Error details:', {
      message: error.message,
      endpoint,
      fullUrl,
      apiBaseUrl: API_BASE_URL,
      stack: error.stack
    })
    
    // Provide helpful error message
    if (error.message.includes('Cannot connect to server')) {
      console.error('💡 Troubleshooting tips:')
      console.error('   1. Check if backend server is running: cd server && npm start')
      console.error('   2. Verify API URL in .env file: VITE_API_URL=http://localhost:5000/api')
      console.error('   3. Check CORS settings in server/src/server.js')
      console.error('   4. Verify server is listening on port 5000')
    }
    
    throw error
  }
}

/**
 * Get unread notification count
 * @returns {Promise<number>} Unread count
 */
export async function getUnreadCount() {
  const response = await apiClient.get('/notifications/unread/count')
  
  // Handle different response formats
  if (typeof response === 'number') {
    return response
  }
  if (response && typeof response === 'object') {
    return response.count || response.unreadCount || response.total || 0
  }
  return 0
}

/**
 * Mark notification as read
 * @param {number} notificationId - Notification MySQL ID
 * @returns {Promise<Object>} Updated notification
 */
export async function markAsRead(notificationId) {
  return apiClient.put(`/notifications/${notificationId}/read`)
}

/**
 * Mark all notifications as read
 * @returns {Promise<Object>} Success message
 */
export async function markAllAsRead() {
  return apiClient.put('/notifications/read-all')
}

/**
 * Delete notification
 * @param {number} notificationId - Notification MySQL ID
 * @returns {Promise<Object>} Success message
 */
export async function deleteNotification(notificationId) {
  return apiClient.delete(`/notifications/${notificationId}`)
}

/**
 * Subscribe to notifications using polling
 * @param {Function} callback - Callback function that receives array of notifications
 * @param {Object} options - { limit, unreadOnly }
 * @returns {Function} Unsubscribe function
 */
export function subscribeToNotifications(callback, options = {}) {
  let intervalId = null
  let lastNotifications = [] // Keep last successful notifications

  const poll = async () => {
    try {
      const notifications = await getNotifications(options)
      
      // Only log detailed info in development or when notifications exist
      if (process.env.NODE_ENV === 'development') {
        console.log('📬 Polling notifications - API response:', {
          type: typeof notifications,
          isArray: Array.isArray(notifications),
          length: Array.isArray(notifications) ? notifications.length : 'N/A'
        })
      }
      
      // Ensure notifications is an array
      if (Array.isArray(notifications)) {
        lastNotifications = notifications
        // Only log when notifications exist to reduce console noise
        if (notifications.length > 0 && process.env.NODE_ENV === 'development') {
          console.log(`✅ Setting ${notifications.length} notifications from API`)
        }
        callback(notifications)
      } else if (notifications && typeof notifications === 'object') {
        // Handle wrapped response
        const notificationsArray = notifications.data || notifications.notifications || []
        if (Array.isArray(notificationsArray)) {
          lastNotifications = notificationsArray
          // Only log when notifications exist to reduce console noise
          if (notificationsArray.length > 0 && process.env.NODE_ENV === 'development') {
            console.log(`✅ Setting ${notificationsArray.length} notifications from wrapped response`)
          }
          callback(notificationsArray)
        } else {
          console.warn('⚠️ Notifications API returned object but no array found:', notifications)
          if (lastNotifications.length > 0) {
            callback(lastNotifications)
          }
        }
      } else {
        console.warn('⚠️ Notifications API returned non-array:', notifications)
        // Don't overwrite with empty array, keep last successful data
        if (lastNotifications.length > 0) {
          callback(lastNotifications)
        }
      }
    } catch (error) {
      console.error('❌ Error polling notifications:', error)
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        url: error.config?.url
      })
      
      // Don't overwrite with empty array on error, keep last successful data
      // Only callback if we have previous data
      if (lastNotifications.length > 0) {
        console.log(`⚠️ Using cached notifications (${lastNotifications.length} items) due to error`)
        callback(lastNotifications)
      } else {
        // If no previous data and error is 404 (student not found), callback empty array
        // Otherwise, keep trying silently
        if (error.response?.status === 404) {
          console.warn('⚠️ Student profile not found (404) - cannot load notifications')
          callback([])
        } else {
          console.warn('⚠️ Notification polling error, but no cached data available. Will retry on next poll.')
          // Don't callback empty array - let it retry
        }
      }
    }
  }

  poll() // Initial fetch
  intervalId = setInterval(poll, 5000) // Poll every 5 seconds

  return () => {
    if (intervalId) clearInterval(intervalId)
  }
}



const pool = require('../config/database')

class Notification {
  static async create(data) {
    const { user_id, user_type, type, title, message, course_id, grade_id, attendance_id, enrollment_id } = data
    console.log(`📝 Notification.create called with:`, {
      user_id,
      user_type,
      type,
      title: title?.substring(0, 50) + '...'
    })

    try {
      const [result] = await pool.execute(
        `INSERT INTO notifications (user_id, user_type, type, title, message, course_id, grade_id, attendance_id, enrollment_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [user_id, user_type, type, title, message, course_id || null, grade_id || null, attendance_id || null, enrollment_id || null]
      )
      const notification = await this.findById(result.insertId)
      console.log(`✅ Notification inserted with ID: ${notification.id}`)
      return notification
    } catch (error) {
      console.error('❌ Error in Notification.create:', error)
      console.error('❌ Error details:', {
        message: error.message,
        sqlMessage: error.sqlMessage,
        sqlCode: error.code,
        errno: error.errno
      })
      throw error
    }
  }

  static async findById(id) {
    const [rows] = await pool.execute(
      'SELECT * FROM notifications WHERE id = ?',
      [id]
    )
    return rows[0] || null
  }

  static async findByUser(user_id, user_type, options = {}) {
    try {
      // Validate inputs
      if (user_id === null || user_id === undefined) {
        console.error('❌ Notification.findByUser called with null/undefined user_id')
        return []
      }
      if (user_type === null || user_type === undefined) {
        console.error('❌ Notification.findByUser called with null/undefined user_type')
        return []
      }

      const { limit = 50, offset = 0, unreadOnly = false } = options

      console.log(`🔍 Notification.findByUser called with:`, {
        user_id,
        user_type,
        limit,
        offset,
        unreadOnly
      })

let query = `
        SELECT * FROM notifications
        WHERE user_id = ? AND user_type = ?
      `
      // Ensure user_id is a number
      const userIdNum = typeof user_id === 'number' ? user_id : parseInt(user_id, 10)
      if (isNaN(userIdNum)) {
        console.error(`❌ Invalid user_id: ${user_id} (type: ${typeof user_id})`)
        return []
      }
      
      const params = [userIdNum, user_type]

try {
        const [allRows] = await pool.execute('SELECT DISTINCT user_type FROM notifications')
        console.log(`📊 Available user_types in database:`, allRows.map(r => r.user_type))
        console.log(`📊 Looking for user_type: "${user_type}" (type: ${typeof user_type})`)
      } catch (debugError) {
        console.warn('⚠️ Debug query failed (non-critical):', debugError.message)
      }

try {
        const [checkRows] = await pool.execute('SELECT user_id, user_type, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY user_id, user_type', [userIdNum])
        console.log(`📊 Notifications for user_id ${userIdNum} by type:`, checkRows)
      } catch (debugError) {
        console.warn('⚠️ Debug query failed (non-critical):', debugError.message)
      }

      if (unreadOnly) {
        query += ' AND `read` = FALSE'
      }

      // CRITICAL: Use string interpolation for LIMIT/OFFSET to avoid parameter binding issues
      // Ensure limit and offset are numbers
      const limitNum = typeof limit === 'number' ? limit : parseInt(limit, 10)
      const offsetNum = typeof offset === 'number' ? offset : parseInt(offset, 10)
      
      // Validate numbers
      if (isNaN(limitNum) || isNaN(offsetNum)) {
        console.error(`❌ Invalid limit/offset: limit=${limit} (${typeof limit}), offset=${offset} (${typeof offset})`)
        return []
      }
      
      query += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`
      // Don't push limit/offset to params - they're now in the query string

      console.log(`📝 Executing query:`, query)
      console.log(`📝 With params:`, params)
      console.log(`📝 Param types:`, params.map(p => ({ value: p, type: typeof p })))
      console.log(`📝 Query will search for user_id=${userIdNum} (type: ${typeof userIdNum}) and user_type="${user_type}" (type: ${typeof user_type})`)

try {
        const [testRows] = await pool.execute(
          'SELECT id, user_id, user_type FROM notifications WHERE user_id = ? LIMIT 5',
          [userIdNum]
        )
        console.log(`🧪 TEST: Notifications for user_id ${userIdNum} (any type):`, testRows.length, 'found')
        if (testRows.length > 0) {
          console.log(`🧪 TEST: Sample row:`, {
            id: testRows[0].id,
            user_id: testRows[0].user_id,
            user_type: testRows[0].user_type,
            user_type_type: typeof testRows[0].user_type
          })
        }
      } catch (testError) {
        console.warn('⚠️ Test query failed:', testError.message)
      }

      // CRITICAL: Before executing main query, check if notifications exist at all
      const [preCheckRows] = await pool.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
        [userIdNum]
      )
      const totalExists = preCheckRows[0]?.count || 0
      console.log(`🔍 Pre-check: ${totalExists} total notifications exist for user_id ${userIdNum}`)
      
      let rows = []
      try {
        const [queryResult] = await pool.execute(query, params)
        rows = queryResult
        console.log(`📊 Main query returned ${rows.length} notifications`)
      } catch (queryError) {
        console.error('❌ Error executing main query:', queryError)
        console.error('❌ Query:', query)
        console.error('❌ Params:', params)
        console.error('❌ Error details:', {
          message: queryError.message,
          sqlMessage: queryError.sqlMessage,
          code: queryError.code
        })
        rows = [] // Fall through to fallback query
      }

      // CRITICAL: If query returned 0 results but we know notifications exist, try simpler direct query
      if (rows.length === 0 && totalExists > 0) {
        console.warn(`⚠️ Query with user_type="${user_type}" returned 0 results despite ${totalExists} notifications existing.`)
        console.warn(`⚠️ Attempting simpler direct query (matching getUnreadCount pattern)...`)
        
        try {
          // Use the EXACT same pattern as getUnreadCount - simple direct query
          let simpleQuery = 'SELECT * FROM notifications WHERE user_id = ? AND user_type = ?'
          const simpleParams = [userIdNum, user_type]
          
          if (unreadOnly) {
            simpleQuery += ' AND `read` = FALSE'
          }
          
          // Use string interpolation for LIMIT/OFFSET to avoid parameter binding issues
          const limitNum = typeof limit === 'number' ? limit : parseInt(limit, 10)
          const offsetNum = typeof offset === 'number' ? offset : parseInt(offset, 10)
          simpleQuery += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`
          
          console.log(`🔄 Simple direct query: ${simpleQuery}`)
          console.log(`🔄 Simple params:`, simpleParams)
          
          const [simpleRows] = await pool.execute(simpleQuery, simpleParams)
          console.log(`🔄 Simple query returned ${simpleRows.length} notifications`)
          
          if (simpleRows.length > 0) {
            console.warn(`✅ Found ${simpleRows.length} notifications using simple query!`)
            
            // Normalize and return the results
            const normalized = simpleRows.map(row => {
              const readValue = row.read !== undefined ? row.read : (row['read'] !== undefined ? row['read'] : false)
              const readBool = readValue === 1 || readValue === true || (readValue !== 0 && readValue !== false && readValue !== null)
              return {
                ...row,
                read: Boolean(readBool)
              }
            })
            
            console.log(`✅ Returning ${normalized.length} notifications from simple query`)
            return normalized
          }
          
          // If simple query also fails, try without user_type filter
          console.warn(`⚠️ Simple query also returned 0. Trying without user_type filter...`)
          let noTypeQuery = 'SELECT * FROM notifications WHERE user_id = ?'
          const noTypeParams = [userIdNum]
          
          if (unreadOnly) {
            noTypeQuery += ' AND `read` = FALSE'
          }
          
          noTypeQuery += ` ORDER BY created_at DESC LIMIT ${limitNum} OFFSET ${offsetNum}`
          
          const [noTypeRows] = await pool.execute(noTypeQuery, noTypeParams)
          console.log(`🔄 No-type query returned ${noTypeRows.length} notifications`)
          
          if (noTypeRows.length > 0) {
            console.warn(`✅ Found ${noTypeRows.length} notifications without user_type filter!`)
            
            const normalized = noTypeRows.map(row => {
              const readValue = row.read !== undefined ? row.read : (row['read'] !== undefined ? row['read'] : false)
              const readBool = readValue === 1 || readValue === true || (readValue !== 0 && readValue !== false && readValue !== null)
              return {
                ...row,
                read: Boolean(readBool)
              }
            })
            
            console.log(`✅ Returning ${normalized.length} notifications from no-type query`)
            return normalized
          }
        } catch (fallbackError) {
          console.error('❌ Error in fallback queries:', fallbackError)
          console.error('❌ Fallback error details:', {
            message: fallbackError.message,
            sqlMessage: fallbackError.sqlMessage,
            code: fallbackError.code
          })
        }
      }

if (!Array.isArray(rows)) {
        console.error('❌ Database query did not return an array:', rows)
        return []
      }

const normalized = rows.map(row => {

        const readValue = row.read !== undefined ? row.read : (row['read'] !== undefined ? row['read'] : false)

        const readBool = readValue === 1 || readValue === true || (readValue !== 0 && readValue !== false && readValue !== null)

        return {
          ...row,
          read: Boolean(readBool)
        }
      })

      console.log(`✅ Normalized ${normalized.length} notifications`)
      return normalized
    } catch (error) {
      console.error('❌ Error in Notification.findByUser:', error)
      console.error('❌ Error details:', {
        message: error.message,
        sqlMessage: error.sqlMessage,
        sqlState: error.sqlState,
        sqlCode: error.code,
        errno: error.errno,
        stack: error.stack
      })

console.warn('⚠️ Returning empty array due to error')
      return []
    }
  }

  static async getUnreadCount(user_id, user_type) {
    try {
      // Ensure user_id is a number
      const userIdNum = typeof user_id === 'number' ? user_id : parseInt(user_id, 10)
      if (isNaN(userIdNum)) {
        console.error(`❌ Invalid user_id in getUnreadCount: ${user_id} (type: ${typeof user_id})`)
        return 0
      }
      
      console.log(`🔍 getUnreadCount query: user_id=${userIdNum} (type: ${typeof userIdNum}), user_type="${user_type}" (type: ${typeof user_type})`)
      
      const [rows] = await pool.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_type = ? AND `read` = FALSE',
        [userIdNum, user_type]
      )
      
      const count = rows[0]?.count || 0
      console.log(`📊 getUnreadCount result: ${count} unread notifications`)
      
      // If count > 0 but findByUser returns empty, log warning
      if (count > 0) {
        // Quick check: verify notifications exist
        const [verifyRows] = await pool.execute(
          'SELECT id FROM notifications WHERE user_id = ? AND user_type = ? LIMIT 1',
          [userIdNum, user_type]
        )
        if (verifyRows.length === 0) {
          console.warn(`⚠️ MISMATCH: getUnreadCount found ${count} but direct query found 0 notifications!`)
          console.warn(`⚠️ This suggests a query issue. Trying without user_type filter...`)
          const [fallbackRows] = await pool.execute(
            'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND `read` = FALSE',
            [userIdNum]
          )
          console.warn(`⚠️ Fallback count (no user_type): ${fallbackRows[0]?.count || 0}`)
        }
      }
      
      return count
    } catch (error) {
      console.error('❌ Error in Notification.getUnreadCount:', error)
      throw error
    }
  }

  static async markAsRead(id) {
    await pool.execute(
      'UPDATE notifications SET `read` = TRUE WHERE id = ?',
      [id]
    )
    return this.findById(id)
  }

  static async markAllAsRead(user_id, user_type) {
    await pool.execute(
      'UPDATE notifications SET `read` = TRUE WHERE user_id = ? AND user_type = ? AND `read` = FALSE',
      [user_id, user_type]
    )
    return true
  }

  static async delete(id) {
    await pool.execute('DELETE FROM notifications WHERE id = ?', [id])
    return true
  }
}

module.exports = Notification


require('dotenv').config()
const mysql = require('mysql2/promise')

async function testStudent25Notifications() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  })

  try {
    console.log('🔍 Testing notifications for Student MySQL ID: 25\n')

    // 1. Check unread count (same as getUnreadCount API)
    const [unreadCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_type = ? AND `read` = FALSE',
      [25, 'Student']
    )
    console.log('📊 Unread count query result:', unreadCount[0].count, 'unread notifications')

    // 2. Check all notifications (same as getNotifications API)
    const [notifications] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? AND user_type = ? ORDER BY created_at DESC LIMIT 50',
      [25, 'Student']
    )
    console.log('📊 Notifications query result:', notifications.length, 'total notifications')

    // 3. Check what user_types exist for this user_id
    const [typeRows] = await pool.execute(
      'SELECT user_type, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY user_type',
      [25]
    )
    console.log('\n📊 User types for user_id 25:')
    typeRows.forEach(row => {
      console.log(`  - "${row.user_type}": ${row.count} notifications`)
    })

    // 4. Show sample notifications
    if (notifications.length > 0) {
      console.log('\n📬 Sample notifications:')
      notifications.slice(0, 3).forEach((n, i) => {
        console.log(`  ${i + 1}. ID: ${n.id}, Title: ${n.title}, Read: ${n.read} (type: ${typeof n.read})`)
      })
    } else {
      console.log('\n⚠️ No notifications found with query:')
      console.log('   WHERE user_id = 25 AND user_type = "Student"')
      
      // Check if notifications exist for this user_id with any type
      const [anyType] = await pool.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ?',
        [25]
      )
      console.log(`\n📊 Total notifications for user_id 25 (any type): ${anyType[0].count}`)
      
      if (anyType[0].count > 0) {
        const [allTypes] = await pool.execute(
          'SELECT user_type, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY user_type',
          [25]
        )
        console.log('📊 Found notifications with these user_types:')
        allTypes.forEach(row => {
          console.log(`  - "${row.user_type}" (${row.count} notifications)`)
          console.log(`    ⚠️ Mismatch! Looking for "Student" but found "${row.user_type}"`)
        })
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

testStudent25Notifications()




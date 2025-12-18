/**
 * Test script to verify notifications flow
 * 1. Check if notifications table exists
 * 2. Verify notifications are being created
 * 3. Test notification retrieval for a student
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

async function testNotificationsFlow() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  })

  try {
    console.log('🔍 Testing Notifications Flow...\n')

    // 1. Check if notifications table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'notifications'")
    if (tables.length === 0) {
      console.error('❌ Notifications table does not exist!')
      return
    }
    console.log('✅ Notifications table exists')

    // 2. Check total notifications
    const [count] = await pool.execute('SELECT COUNT(*) as count FROM notifications')
    console.log(`📬 Total notifications: ${count[0].count}`)

    // 3. Check notifications by type
    const [byType] = await pool.execute(
      'SELECT type, COUNT(*) as count FROM notifications GROUP BY type'
    )
    console.log('\n📊 Notifications by type:')
    byType.forEach(row => {
      console.log(`   - ${row.type}: ${row.count}`)
    })

    // 4. Check notifications by user_type
    const [byUserType] = await pool.execute(
      'SELECT user_type, COUNT(*) as count FROM notifications GROUP BY user_type'
    )
    console.log('\n📊 Notifications by user type:')
    byUserType.forEach(row => {
      console.log(`   - ${row.user_type}: ${row.count}`)
    })

    // 5. Check unread notifications
    const [unread] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE `read` = FALSE'
    )
    console.log(`\n🔔 Unread notifications: ${unread[0].count}`)

    // 6. Get a sample student and their notifications
    const [students] = await pool.execute(
      'SELECT id, name, student_id, email FROM students LIMIT 5'
    )
    
    if (students.length > 0) {
      console.log('\n👤 Testing notification retrieval for students:')
      for (const student of students) {
        const [studentNotifications] = await pool.execute(
          'SELECT id, type, title, `read`, created_at FROM notifications WHERE user_id = ? AND user_type = ? ORDER BY created_at DESC LIMIT 3',
          [student.id, 'Student']
        )
        console.log(`\n   Student: ${student.name} (ID: ${student.id}, Student ID: ${student.student_id})`)
        console.log(`   Notifications: ${studentNotifications.length}`)
        if (studentNotifications.length > 0) {
          studentNotifications.forEach(notif => {
            console.log(`     - ${notif.type}: "${notif.title}" (Read: ${notif.read}, Created: ${notif.created_at})`)
          })
        }
      }
    }

    // 7. Check recent notifications (last 10)
    const [recent] = await pool.execute(
      'SELECT id, user_id, user_type, type, title, `read`, created_at FROM notifications ORDER BY created_at DESC LIMIT 10'
    )
    console.log('\n📝 Recent notifications (last 10):')
    recent.forEach(notif => {
      console.log(`   - ID: ${notif.id}, User: ${notif.user_id} (${notif.user_type}), Type: ${notif.type}, Title: "${notif.title.substring(0, 50)}...", Read: ${notif.read}`)
    })

    console.log('\n✅ Notifications flow test completed!')
  } catch (error) {
    console.error('❌ Error testing notifications flow:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

testNotificationsFlow()




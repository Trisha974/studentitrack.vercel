/**
 * Test script to simulate a student fetching notifications via API
 * This will help debug why notifications aren't showing
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

async function testStudentNotificationsAPI() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  })

  try {
    console.log('🔍 Testing Student Notifications API Flow...\n')

    // Get a student with notifications
    const [studentsWithNotifications] = await pool.execute(`
      SELECT DISTINCT s.id, s.name, s.student_id, s.email, s.firebase_uid, COUNT(n.id) as notification_count
      FROM students s
      INNER JOIN notifications n ON s.id = n.user_id AND n.user_type = 'Student'
      GROUP BY s.id, s.name, s.student_id, s.email, s.firebase_uid
      HAVING notification_count > 0
      LIMIT 5
    `)

    if (studentsWithNotifications.length === 0) {
      console.log('⚠️  No students with notifications found')
      return
    }

    console.log('👤 Students with notifications:')
    studentsWithNotifications.forEach(student => {
      console.log(`  - ${student.name} (MySQL ID: ${student.id}, Student ID: ${student.student_id}, Firebase UID: ${student.firebase_uid || 'NULL'}, Notifications: ${student.notification_count})`)
    })

    // Test the notification query for each student
    for (const student of studentsWithNotifications) {
      console.log(`\n📬 Testing notifications for: ${student.name} (MySQL ID: ${student.id})`)
      
      // Simulate the Notification.findByUser query
      const [notifications] = await pool.execute(
        `SELECT * FROM notifications 
         WHERE user_id = ? AND user_type = ?
         ORDER BY created_at DESC LIMIT 50`,
        [student.id, 'Student']
      )

      console.log(`  ✅ Found ${notifications.length} notifications`)
      
      if (notifications.length > 0) {
        console.log(`  📝 Sample notifications:`)
        notifications.slice(0, 3).forEach(notif => {
          console.log(`    - ID: ${notif.id}, Type: ${notif.type}, Title: "${notif.title}", Read: ${notif.read}, Created: ${notif.created_at}`)
        })
        
        // Check read status
        const unread = notifications.filter(n => !n.read || n.read === 0).length
        console.log(`  🔔 Unread: ${unread}, Read: ${notifications.length - unread}`)
      } else {
        console.log(`  ⚠️  No notifications found, but student has ${student.notification_count} notifications in JOIN query`)
        // Check if there's a type mismatch
        const [allForUser] = await pool.execute(
          `SELECT user_type, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY user_type`,
          [student.id]
        )
        console.log(`  🔍 Notifications for user_id ${student.id} by type:`, allForUser)
      }
    }

    // Test with a specific student ID that we know has notifications
    console.log('\n🧪 Testing specific student lookup...')
    const testStudentId = studentsWithNotifications[0].id
    const [testNotifications] = await pool.execute(
      `SELECT id, user_id, user_type, type, title, \`read\`, created_at 
       FROM notifications 
       WHERE user_id = ? AND user_type = 'Student'
       ORDER BY created_at DESC LIMIT 5`,
      [testStudentId]
    )
    
    console.log(`Student ID ${testStudentId} notifications:`, testNotifications.length)
    testNotifications.forEach(n => {
      console.log(`  - ${n.type}: "${n.title}" (Read: ${n.read}, User Type: "${n.user_type}")`)
    })

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

testStudentNotificationsAPI()




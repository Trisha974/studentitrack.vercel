/**
 * Debug script to check why a student cannot see notifications
 * This will check:
 * 1. Student's MySQL ID
 * 2. Notifications for that student
 * 3. Any mismatches
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

async function debugStudentNotifications() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  })

  try {
    console.log('🔍 Debugging Student Notifications...\n')

    // Get all students
    const [students] = await pool.execute(
      'SELECT id, name, student_id, email, firebase_uid FROM students LIMIT 10'
    )
    
    console.log('👤 Students in database:')
    students.forEach(student => {
      console.log(`  - ID: ${student.id}, Name: ${student.name}, Student ID: ${student.student_id}, Email: ${student.email}, Firebase UID: ${student.firebase_uid || 'NULL'}`)
    })

    // Check notifications for each student
    console.log('\n📬 Notifications by student MySQL ID:')
    for (const student of students) {
      const [notifications] = await pool.execute(
        'SELECT id, type, title, user_id, user_type, `read`, created_at FROM notifications WHERE user_id = ? AND user_type = ? ORDER BY created_at DESC LIMIT 5',
        [student.id, 'Student']
      )
      
      if (notifications.length > 0) {
        console.log(`\n  Student: ${student.name} (MySQL ID: ${student.id})`)
        console.log(`  Total notifications: ${notifications.length}`)
        notifications.forEach(notif => {
          console.log(`    - ${notif.type}: "${notif.title}" (Read: ${notif.read}, Created: ${notif.created_at})`)
        })
      } else {
        console.log(`\n  Student: ${student.name} (MySQL ID: ${student.id}) - NO NOTIFICATIONS`)
      }
    }

    // Check all notifications and their user_ids
    console.log('\n📊 All notifications summary:')
    const [allNotifications] = await pool.execute(
      'SELECT user_id, user_type, COUNT(*) as count FROM notifications GROUP BY user_id, user_type ORDER BY count DESC'
    )
    allNotifications.forEach(row => {
      console.log(`  - User ID: ${row.user_id} (${row.user_type}): ${row.count} notifications`)
    })

    // Check if there are notifications with user_ids that don't match any student
    console.log('\n🔍 Checking for orphaned notifications (user_id not matching any student):')
    const [orphaned] = await pool.execute(`
      SELECT n.user_id, n.user_type, COUNT(*) as count
      FROM notifications n
      LEFT JOIN students s ON n.user_id = s.id AND n.user_type = 'Student'
      WHERE n.user_type = 'Student' AND s.id IS NULL
      GROUP BY n.user_id, n.user_type
    `)
    
    if (orphaned.length > 0) {
      console.log('  ⚠️  Found orphaned notifications:')
      orphaned.forEach(row => {
        console.log(`    - User ID: ${row.user_id} has ${row.count} notifications but no matching student`)
      })
    } else {
      console.log('  ✅ No orphaned notifications found')
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error(error.stack)
  } finally {
    await pool.end()
  }
}

debugStudentNotifications()




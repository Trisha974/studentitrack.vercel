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
    console.log('🔍 Debugging Student Notifications Display Issue\n')

    // 1. Check all user_types in database
    const [userTypes] = await pool.execute('SELECT DISTINCT user_type FROM notifications')
    console.log('📊 User types in database:', userTypes.map(r => r.user_type))

    // 2. Get a sample student with notifications
    const [studentsWithNotifs] = await pool.execute(`
      SELECT DISTINCT n.user_id, n.user_type, COUNT(*) as count
      FROM notifications n
      WHERE n.user_type = 'Student'
      GROUP BY n.user_id, n.user_type
      LIMIT 5
    `)
    
    console.log('\n📊 Students with notifications:')
    studentsWithNotifs.forEach(row => {
      console.log(`  - Student MySQL ID: ${row.user_id}, Type: ${row.user_type}, Count: ${row.count}`)
    })

    if (studentsWithNotifs.length === 0) {
      console.log('⚠️ No student notifications found in database')
      await pool.end()
      return
    }

    // 3. Test query for a specific student
    const testStudentId = studentsWithNotifs[0].user_id
    console.log(`\n🧪 Testing queries for student MySQL ID: ${testStudentId}`)

    // Test getUnreadCount query
    const [unreadCount] = await pool.execute(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_type = ? AND `read` = FALSE',
      [testStudentId, 'Student']
    )
    console.log(`  ✅ Unread count query: ${unreadCount[0].count} unread notifications`)

    // Test getNotifications query
    const [notifications] = await pool.execute(
      'SELECT * FROM notifications WHERE user_id = ? AND user_type = ? ORDER BY created_at DESC LIMIT 50',
      [testStudentId, 'Student']
    )
    console.log(`  ✅ Notifications query: ${notifications.length} total notifications`)

    // 4. Check for case sensitivity issues
    const [caseCheck] = await pool.execute(
      'SELECT user_type, COUNT(*) as count FROM notifications WHERE user_id = ? GROUP BY user_type',
      [testStudentId]
    )
    console.log(`\n🔍 User types for student ${testStudentId}:`)
    caseCheck.forEach(row => {
      console.log(`  - Type: "${row.user_type}" (length: ${row.user_type.length}), Count: ${row.count}`)
      console.log(`    Type check: ${row.user_type === 'Student' ? '✅ MATCHES' : '❌ MISMATCH'}`)
    })

    // 5. Check sample notification
    if (notifications.length > 0) {
      const sample = notifications[0]
      console.log(`\n📬 Sample notification:`)
      console.log(`  - ID: ${sample.id}`)
      console.log(`  - User ID: ${sample.user_id} (type: ${typeof sample.user_id})`)
      console.log(`  - User Type: "${sample.user_type}" (type: ${typeof sample.user_type}, length: ${sample.user_type?.length})`)
      console.log(`  - Title: ${sample.title}`)
      console.log(`  - Read: ${sample.read} (type: ${typeof sample.read})`)
    }

    // 6. Test with different case variations
    console.log(`\n🧪 Testing case sensitivity:`)
    const variations = ['Student', 'student', 'STUDENT']
    for (const variation of variations) {
      const [test] = await pool.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND user_type = ?',
        [testStudentId, variation]
      )
      console.log(`  - "${variation}": ${test[0].count} notifications`)
    }

  } catch (error) {
    console.error('❌ Error:', error.message)
    console.error('Stack:', error.stack)
  } finally {
    await pool.end()
  }
}

debugStudentNotifications()




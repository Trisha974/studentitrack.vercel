require('dotenv').config()
const mysql = require('mysql2/promise')

async function checkNotificationsTable() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  })

  try {
    // Check if table exists
    const [tables] = await pool.execute("SHOW TABLES LIKE 'notifications'")
    console.log('📊 Notifications table exists:', tables.length > 0)
    
    if (tables.length > 0) {
      // Check table structure
      const [columns] = await pool.execute('DESCRIBE notifications')
      console.log('\n📋 Table structure:')
      columns.forEach(col => {
        console.log(`  - ${col.Field}: ${col.Type} ${col.Null === 'YES' ? '(nullable)' : '(required)'}`)
      })
      
      // Check notification count
      const [count] = await pool.execute('SELECT COUNT(*) as count FROM notifications')
      console.log(`\n📬 Total notifications in database: ${count[0].count}`)
      
      // Check notifications by user_type
      const [byType] = await pool.execute(
        'SELECT user_type, COUNT(*) as count FROM notifications GROUP BY user_type'
      )
      console.log('\n📊 Notifications by user type:')
      byType.forEach(row => {
        console.log(`  - ${row.user_type}: ${row.count}`)
      })
      
      // Check unread notifications
      const [unread] = await pool.execute(
        'SELECT COUNT(*) as count FROM notifications WHERE `read` = FALSE'
      )
      console.log(`\n🔔 Unread notifications: ${unread[0].count}`)
      
      // Show sample notifications
      const [samples] = await pool.execute(
        'SELECT id, user_id, user_type, type, title, `read`, created_at FROM notifications ORDER BY created_at DESC LIMIT 5'
      )
      if (samples.length > 0) {
        console.log('\n📝 Sample notifications (latest 5):')
        samples.forEach(notif => {
          console.log(`  - ID: ${notif.id}, User: ${notif.user_id} (${notif.user_type}), Type: ${notif.type}, Read: ${notif.read}, Title: ${notif.title.substring(0, 50)}...`)
        })
      }
    } else {
      console.log('\n⚠️  Notifications table does not exist! Creating it...')
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS notifications (
          id INT AUTO_INCREMENT PRIMARY KEY,
          user_id INT NOT NULL,
          user_type ENUM('Student', 'Professor') NOT NULL,
          type ENUM('grade', 'attendance', 'enrollment', 'course', 'system') NOT NULL,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          course_id INT,
          grade_id INT,
          attendance_id INT,
          enrollment_id INT,
          \`read\` BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_user (user_id, user_type),
          INDEX idx_read (\`read\`),
          INDEX idx_created_at (created_at),
          INDEX idx_course_id (course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('✅ Created notifications table')
    }
  } catch (error) {
    console.error('❌ Error checking notifications table:', error.message)
  } finally {
    await pool.end()
  }
}

checkNotificationsTable()




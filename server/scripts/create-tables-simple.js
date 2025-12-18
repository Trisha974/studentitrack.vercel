/**
 * Create Missing Tables (Simple - No Foreign Keys)
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

async function createTables() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  })

  try {
    // Create courses table (without foreign key for now)
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS courses (
          id INT AUTO_INCREMENT PRIMARY KEY,
          code VARCHAR(100) NOT NULL,
          name VARCHAR(255) NOT NULL,
          credits INT DEFAULT 0,
          professor_id INT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_code (code),
          INDEX idx_professor_id (professor_id),
          UNIQUE KEY unique_code_professor (code, professor_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('✅ Created courses table')
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⏭️  Courses table already exists')
      } else {
        console.error('❌ Error creating courses:', e.message)
      }
    }

    // Create enrollments table (without foreign keys for now)
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS enrollments (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT NOT NULL,
          course_id INT NOT NULL,
          enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          INDEX idx_student_id (student_id),
          INDEX idx_course_id (course_id),
          UNIQUE KEY unique_student_course (student_id, course_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('✅ Created enrollments table')
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⏭️  Enrollments table already exists')
      } else {
        console.error('❌ Error creating enrollments:', e.message)
      }
    }

    // Create attendance table (without foreign keys for now)
    try {
      await pool.execute(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INT AUTO_INCREMENT PRIMARY KEY,
          student_id INT NOT NULL,
          course_id INT NOT NULL,
          date DATE NOT NULL,
          status ENUM('present', 'absent', 'late', 'excused') NOT NULL DEFAULT 'absent',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          INDEX idx_student_id (student_id),
          INDEX idx_course_id (course_id),
          INDEX idx_date (date),
          UNIQUE KEY unique_student_course_date (student_id, course_id, date)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `)
      console.log('✅ Created attendance table')
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⏭️  Attendance table already exists')
      } else {
        console.error('❌ Error creating attendance:', e.message)
      }
    }

    // Create notifications table
    try {
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
    } catch (e) {
      if (e.code === 'ER_TABLE_EXISTS_ERROR') {
        console.log('⏭️  Notifications table already exists')
      } else {
        console.error('❌ Error creating notifications:', e.message)
      }
    }

    // Verify
    const [tables] = await pool.execute('SHOW TABLES')
    const tableNames = tables.map(t => Object.values(t)[0])
    const required = ['courses', 'enrollments', 'attendance', 'notifications']
    const missing = required.filter(t => !tableNames.includes(t))

    console.log('\n📊 Tables status:')
    required.forEach(t => {
      const exists = tableNames.includes(t)
      console.log(`   ${exists ? '✅' : '❌'} ${t}`)
    })

    if (missing.length === 0) {
      console.log('\n✅ All required tables exist!')
    } else {
      console.log(`\n⚠️  Missing: ${missing.join(', ')}`)
    }

    await pool.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    await pool.end()
    process.exit(1)
  }
}

createTables()



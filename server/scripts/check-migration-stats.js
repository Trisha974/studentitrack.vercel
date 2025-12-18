/**
 * Check Migration Statistics
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

async function checkStats() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  })

  try {
    const [stats] = await pool.execute(`
      SELECT 
        (SELECT COUNT(*) FROM students) as students,
        (SELECT COUNT(*) FROM professors) as professors,
        (SELECT COUNT(*) FROM courses) as courses,
        (SELECT COUNT(*) FROM enrollments) as enrollments,
        (SELECT COUNT(*) FROM grades) as grades,
        (SELECT COUNT(*) FROM attendance) as attendance,
        (SELECT COUNT(*) FROM notifications) as notifications
    `)

    console.log('\n📊 Current Database Statistics:\n')
    console.log(`   Students: ${stats[0].students}`)
    console.log(`   Professors: ${stats[0].professors}`)
    console.log(`   Courses: ${stats[0].courses}`)
    console.log(`   Enrollments: ${stats[0].enrollments}`)
    console.log(`   Grades: ${stats[0].grades}`)
    console.log(`   Attendance: ${stats[0].attendance}`)
    console.log(`   Notifications: ${stats[0].notifications}\n`)

    // Check for duplicate course codes
    const [duplicates] = await pool.execute(`
      SELECT code, COUNT(*) as count 
      FROM courses 
      GROUP BY code 
      HAVING count > 1
    `)

    if (duplicates.length > 0) {
      console.log('⚠️  Courses with duplicate codes:')
      duplicates.forEach(d => {
        console.log(`   Code "${d.code}": ${d.count} entries`)
      })
      console.log()
    } else {
      console.log('✅ No duplicate course codes found\n')
    }

    await pool.end()
  } catch (error) {
    console.error('❌ Error:', error.message)
    await pool.end()
    process.exit(1)
  }
}

checkStats()



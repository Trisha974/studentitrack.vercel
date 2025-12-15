/**
 * Check and update course terms in MySQL
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

async function checkCourseTerms() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  })

  try {
    // Check courses without term
    const [coursesWithoutTerm] = await pool.execute(`
      SELECT id, code, name, term 
      FROM courses 
      WHERE term IS NULL OR term = ''
    `)
    
    console.log(`\n📊 Found ${coursesWithoutTerm.length} courses without term:`)
    coursesWithoutTerm.forEach(course => {
      console.log(`  - ${course.code} (${course.name}): term=${course.term}`)
    })
    
    // Check all courses
    const [allCourses] = await pool.execute(`
      SELECT id, code, name, term 
      FROM courses 
      ORDER BY code
    `)
    
    console.log(`\n📊 All courses (${allCourses.length} total):`)
    allCourses.forEach(course => {
      console.log(`  - ${course.code} (${course.name}): term="${course.term || 'NULL'}"`)
    })
    
    // Update courses without term to 'first'
    if (coursesWithoutTerm.length > 0) {
      console.log(`\n🔄 Updating ${coursesWithoutTerm.length} courses to default term 'first'...`)
      await pool.execute(`
        UPDATE courses 
        SET term = 'first' 
        WHERE term IS NULL OR term = ''
      `)
      console.log('✅ Updated courses to default term')
    }
    
    await pool.end()
  } catch (error) {
    console.error('❌ Error checking course terms:', error.message)
    await pool.end()
    process.exit(1)
  }
}

checkCourseTerms()








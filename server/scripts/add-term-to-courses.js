/**
 * Add term column to courses table
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

async function addTermColumn() {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  })

  try {
    // Check if term column exists
    const [columns] = await pool.execute(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'courses' 
      AND COLUMN_NAME = 'term'
    `, [process.env.DB_NAME || 'student_itrack'])

    if (columns.length === 0) {
      // Add term column
      await pool.execute(`
        ALTER TABLE courses 
        ADD COLUMN term ENUM('first', 'second') DEFAULT 'first' 
        AFTER credits
      `)
      console.log('✅ Added term column to courses table')
    } else {
      console.log('⏭️  Term column already exists in courses table')
    }

    await pool.end()
  } catch (error) {
    console.error('❌ Error adding term column:', error.message)
    await pool.end()
    process.exit(1)
  }
}

addTermColumn()




/**
 * Test Professor Creation Script
 * This script tests creating/updating a professor profile to identify the 500 error
 */

require('dotenv').config()
const mysql = require('mysql2/promise')

async function testProfessorCreate() {
  console.log('🧪 Testing Professor Creation...\n')
  
  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  })

  try {
    // Test data
    const testData = {
      firebase_uid: 'test-uid-' + Date.now(),
      name: 'Test Professor',
      email: `test${Date.now()}@example.com`,
      department: 'Computer Science',
      photo_url: null
    }

    console.log('📋 Test Data:')
    console.log(JSON.stringify(testData, null, 2))
    console.log()

    // Check if professors table exists
    console.log('1️⃣ Checking if professors table exists...')
    const [tables] = await pool.execute("SHOW TABLES LIKE 'professors'")
    if (tables.length === 0) {
      console.error('❌ Professors table does not exist!')
      console.log('💡 Run: node scripts/create-tables-simple.js')
      process.exit(1)
    }
    console.log('✅ Professors table exists\n')

    // Check table structure
    console.log('2️⃣ Checking table structure...')
    const [columns] = await pool.execute('DESCRIBE professors')
    console.log('Columns:', columns.map(c => `${c.Field} (${c.Type})`).join(', '))
    console.log()

    // Test INSERT
    console.log('3️⃣ Testing INSERT...')
    try {
      const [result] = await pool.execute(
        `INSERT INTO professors (firebase_uid, name, email, department, photo_url)
         VALUES (?, ?, ?, ?, ?)`,
        [testData.firebase_uid, testData.name, testData.email, testData.department, testData.photo_url]
      )
      console.log('✅ INSERT successful!')
      console.log('   Insert ID:', result.insertId)
      console.log()

      // Test SELECT
      console.log('4️⃣ Testing SELECT...')
      const [rows] = await pool.execute(
        'SELECT * FROM professors WHERE id = ?',
        [result.insertId]
      )
      console.log('✅ SELECT successful!')
      console.log('   Professor:', JSON.stringify(rows[0], null, 2))
      console.log()

      // Test UPDATE
      console.log('5️⃣ Testing UPDATE...')
      const [updateResult] = await pool.execute(
        `UPDATE professors 
         SET name = ?, email = ?, department = ?
         WHERE id = ?`,
        ['Updated Test Professor', testData.email, 'Mathematics', result.insertId]
      )
      console.log('✅ UPDATE successful!')
      console.log('   Affected rows:', updateResult.affectedRows)
      console.log()

      // Cleanup
      console.log('6️⃣ Cleaning up test data...')
      await pool.execute('DELETE FROM professors WHERE firebase_uid = ?', [testData.firebase_uid])
      console.log('✅ Test data cleaned up\n')

      console.log('✅ All tests passed! Database operations are working correctly.')
    } catch (dbError) {
      console.error('❌ Database error:', dbError.message)
      console.error('   Code:', dbError.code)
      console.error('   Errno:', dbError.errno)
      console.error('   SQL State:', dbError.sqlState)
      console.error('   SQL Message:', dbError.sqlMessage)
      if (dbError.sql) {
        console.error('   SQL:', dbError.sql)
      }
      throw dbError
    }

    await pool.end()
  } catch (error) {
    console.error('\n❌ Test failed:', error.message)
    console.error('Stack:', error.stack)
    await pool.end()
    process.exit(1)
  }
}

testProfessorCreate()






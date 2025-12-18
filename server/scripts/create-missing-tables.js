/**
 * Create Missing Tables Script
 * Creates the required tables for migration if they don't exist
 */

require('dotenv').config()
const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

async function createMissingTables() {
  console.log('🔧 Creating missing tables from schema...\n')

  const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack',
    multipleStatements: true
  })

  try {
    // Read schema
    const schemaPath = path.join(__dirname, '../src/models/schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')

    // Extract CREATE TABLE statements
    const createTableRegex = /CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?\s*\([^;]+\)[^;]*;/gi
    const matches = schema.match(createTableRegex)

    if (!matches) {
      console.error('❌ No CREATE TABLE statements found in schema')
      process.exit(1)
    }

    console.log(`📋 Found ${matches.length} table definitions\n`)

    for (const statement of matches) {
      try {
        // Extract table name
        const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?/i)
        const tableName = tableMatch ? tableMatch[1] : 'unknown'

        // Execute CREATE TABLE
        await pool.execute(statement)
        console.log(`✅ Created/verified table: ${tableName}`)
      } catch (error) {
        if (error.code === 'ER_TABLE_EXISTS_ERROR') {
          const tableMatch = statement.match(/CREATE TABLE IF NOT EXISTS\s+`?(\w+)`?/i)
          const tableName = tableMatch ? tableMatch[1] : 'unknown'
          console.log(`⏭️  Table already exists: ${tableName}`)
        } else {
          console.error(`❌ Error creating table:`, error.message)
        }
      }
    }

    // Verify tables
    console.log('\n📊 Verifying tables...')
    const [tables] = await pool.execute('SHOW TABLES')
    const tableNames = tables.map(t => Object.values(t)[0])
    
    const requiredTables = ['students', 'professors', 'courses', 'enrollments', 'grades', 'attendance', 'notifications']
    console.log(`\n✅ Found ${tableNames.length} tables:`)
    tableNames.forEach(name => {
      const status = requiredTables.includes(name) ? '✅' : 'ℹ️ '
      console.log(`   ${status} ${name}`)
    })

    const missing = requiredTables.filter(t => !tableNames.includes(t))
    if (missing.length > 0) {
      console.log(`\n⚠️  Missing required tables: ${missing.join(', ')}`)
    } else {
      console.log(`\n✅ All required tables exist!`)
    }

    await pool.end()
    console.log('\n✅ Done!\n')
  } catch (error) {
    console.error('\n❌ Error:', error.message)
    await pool.end()
    process.exit(1)
  }
}

createMissingTables()



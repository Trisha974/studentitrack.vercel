const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')
require('dotenv').config()

async function setupDatabase() {
  console.log('🔧 Setting up MySQL Database...\n')
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  }
  
  console.log('📋 Connection Config:')
  console.log(`   Host: ${config.host}`)
  console.log(`   User: ${config.user}`)
  console.log(`   Password: ${config.password ? '***' : '(empty)'}\n`)
  
  let connection
  
  try {
    // Connect to MySQL server (without database)
    console.log('1️⃣ Connecting to MySQL server...')
    connection = await mysql.createConnection(config)
    console.log('   ✅ Connected to MySQL server\n')
    
    // Read schema file
    console.log('2️⃣ Reading schema file...')
    const schemaPath = path.join(__dirname, '../src/models/schema.sql')
    const schema = fs.readFileSync(schemaPath, 'utf8')
    console.log('   ✅ Schema file loaded\n')
    
    // Split schema into individual statements
    const statements = schema
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'))
    
    console.log(`3️⃣ Executing ${statements.length} SQL statements...\n`)
    
    let successCount = 0
    let errorCount = 0
    
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i]
      if (!statement) continue
      
      try {
        await connection.execute(statement)
        successCount++
        
        // Show progress for important statements
        if (statement.includes('CREATE DATABASE')) {
          console.log(`   ✅ Created database`)
        } else if (statement.includes('CREATE TABLE')) {
          const tableMatch = statement.match(/CREATE TABLE.*?`?(\w+)`?/i)
          if (tableMatch) {
            console.log(`   ✅ Created table: ${tableMatch[1]}`)
          }
        }
      } catch (error) {
        errorCount++
        // Ignore "already exists" errors
        if (error.code === 'ER_DB_CREATE_EXISTS' || error.code === 'ER_TABLE_EXISTS_ERROR') {
          const tableMatch = statement.match(/CREATE TABLE.*?`?(\w+)`?/i)
          if (tableMatch) {
            console.log(`   ℹ️  Table already exists: ${tableMatch[1]}`)
          } else {
            console.log(`   ℹ️  Database already exists`)
          }
        } else {
          console.error(`   ❌ Error executing statement ${i + 1}:`, error.message)
          console.error(`   Statement: ${statement.substring(0, 100)}...`)
        }
      }
    }
    
    console.log(`\n✅ Setup complete!`)
    console.log(`   Successful: ${successCount}`)
    console.log(`   Errors (ignored if already exists): ${errorCount}\n`)
    
    // Verify tables
    console.log('4️⃣ Verifying database structure...')
    await connection.execute('USE student_itrack')
    const [tables] = await connection.execute('SHOW TABLES')
    const tableNames = tables.map(t => Object.values(t)[0])
    
    console.log(`   Found ${tableNames.length} table(s):`)
    tableNames.forEach(table => {
      console.log(`      - ${table}`)
    })
    console.log()
    
  } catch (error) {
    console.error('\n❌ Database setup failed!')
    console.error(`Error: ${error.message}\n`)
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Authentication failed. Check your DB_USER and DB_PASSWORD in .env file.')
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused. Make sure MySQL server is running.')
    } else {
      console.error('💡 Check your database configuration.')
    }
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Run the setup
setupDatabase()
  .then(() => {
    console.log('✅ Database setup completed!')
    process.exit(0)
  })
  .catch(err => {
    console.error('❌ Setup failed:', err)
    process.exit(1)
  })

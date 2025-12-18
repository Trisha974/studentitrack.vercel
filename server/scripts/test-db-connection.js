const mysql = require('mysql2/promise')
require('dotenv').config()

async function testConnection() {
  console.log('🔍 Testing MySQL Database Connection...\n')
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack',
  }
  
  console.log('📋 Connection Config:')
  console.log(`   Host: ${config.host}`)
  console.log(`   User: ${config.user}`)
  console.log(`   Database: ${config.database}`)
  console.log(`   Password: ${config.password ? '***' : '(empty)'}\n`)
  
  let connection
  
  try {
    // Test connection without database first
    console.log('1️⃣ Testing connection to MySQL server...')
    const tempConnection = await mysql.createConnection({
      host: config.host,
      user: config.user,
      password: config.password,
    })
    console.log('   ✅ Connected to MySQL server\n')
    await tempConnection.end()
    
    // Test connection to database
    console.log('2️⃣ Testing connection to database...')
    connection = await mysql.createConnection(config)
    console.log(`   ✅ Connected to database: ${config.database}\n`)
    
    // Check if database exists
    console.log('3️⃣ Checking database structure...')
    const [databases] = await connection.execute(`SHOW DATABASES LIKE '${config.database}'`)
    if (databases.length === 0) {
      console.log(`   ⚠️  Database '${config.database}' does not exist!`)
      console.log(`   💡 Run the schema.sql file to create it.\n`)
    } else {
      console.log(`   ✅ Database '${config.database}' exists\n`)
    }
    
    // Check tables
    console.log('4️⃣ Checking tables...')
    const [tables] = await connection.execute('SHOW TABLES')
    const tableNames = tables.map(t => Object.values(t)[0])
    
    const expectedTables = [
      'professors',
      'students',
      'courses',
      'enrollments',
      'grades',
      'attendance',
      'notifications'
    ]
    
    console.log(`   Found ${tableNames.length} table(s):`)
    tableNames.forEach(table => {
      console.log(`      - ${table}`)
    })
    console.log()
    
    // Check for missing tables
    const missingTables = expectedTables.filter(t => !tableNames.includes(t))
    if (missingTables.length > 0) {
      console.log('   ⚠️  Missing tables:')
      missingTables.forEach(table => {
        console.log(`      - ${table}`)
      })
      console.log(`   💡 Run the schema.sql file to create missing tables.\n`)
    } else {
      console.log('   ✅ All required tables exist\n')
    }
    
    // Check table structures
    console.log('5️⃣ Checking table structures...')
    for (const table of expectedTables) {
      if (tableNames.includes(table)) {
        const [columns] = await connection.execute(`DESCRIBE ${table}`)
        console.log(`   ✅ ${table}: ${columns.length} columns`)
      }
    }
    console.log()
    
    // Check for data
    console.log('6️⃣ Checking for existing data...')
    const counts = {}
    for (const table of expectedTables) {
      if (tableNames.includes(table)) {
        try {
          const [rows] = await connection.execute(`SELECT COUNT(*) as count FROM ${table}`)
          counts[table] = rows[0].count
          console.log(`   ${table}: ${rows[0].count} record(s)`)
        } catch (err) {
          console.log(`   ${table}: Error - ${err.message}`)
        }
      }
    }
    console.log()
    
    // Test a sample query
    console.log('7️⃣ Testing sample queries...')
    
    // Test students table
    if (tableNames.includes('students')) {
      try {
        const [students] = await connection.execute('SELECT COUNT(*) as count FROM students')
        console.log(`   ✅ Students query: ${students[0].count} student(s)`)
      } catch (err) {
        console.log(`   ❌ Students query failed: ${err.message}`)
      }
    }
    
    // Test enrollments table
    if (tableNames.includes('enrollments')) {
      try {
        const [enrollments] = await connection.execute('SELECT COUNT(*) as count FROM enrollments')
        console.log(`   ✅ Enrollments query: ${enrollments[0].count} enrollment(s)`)
      } catch (err) {
        console.log(`   ❌ Enrollments query failed: ${err.message}`)
      }
    }
    
    // Test courses table
    if (tableNames.includes('courses')) {
      try {
        const [courses] = await connection.execute('SELECT COUNT(*) as count FROM courses')
        console.log(`   ✅ Courses query: ${courses[0].count} course(s)`)
      } catch (err) {
        console.log(`   ❌ Courses query failed: ${err.message}`)
      }
    }
    
    console.log()
    console.log('✅ Database connection test completed successfully!')
    
  } catch (error) {
    console.error('\n❌ Database connection test failed!')
    console.error(`Error: ${error.message}\n`)
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Authentication failed. Check your DB_USER and DB_PASSWORD in .env file.')
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused. Make sure MySQL server is running.')
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error(`💡 Database '${config.database}' does not exist. Run schema.sql to create it.`)
    } else {
      console.error('💡 Check your database configuration in .env file.')
    }
    process.exit(1)
  } finally {
    if (connection) {
      await connection.end()
    }
  }
}

// Run the test
testConnection()
  .then(() => {
    console.log('\n✅ All tests passed!')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Test failed:', err)
    process.exit(1)
  })


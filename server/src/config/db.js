const mysql = require('mysql2/promise')
const { DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_SSL } = require('./env')

// Log database configuration (without password)
console.log('📊 Database Configuration:')
console.log(`   Host: ${DB_HOST}`)
console.log(`   User: ${DB_USER}`)
console.log(`   Database: ${DB_NAME}`)
console.log(`   Password: ${DB_PASSWORD ? '***' : '(empty)'}`)

const pool = mysql.createPool({
  host: DB_HOST,
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: DB_SSL ? {} : false,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
})

// Test connection but don't crash if it fails
pool.getConnection()
  .then(connection => {
    console.log('✅ MySQL connected successfully')
    connection.release()
  })
  .catch(err => {
    console.error('❌ MySQL connection error:', err.message)
    console.error('💡 Check your database environment variables:')
    console.error(`   DB_HOST=${DB_HOST}`)
    console.error(`   DB_USER=${DB_USER}`)
    console.error(`   DB_NAME=${DB_NAME}`)
    console.error(`   Available env vars:`, Object.keys(process.env).filter(k => k.includes('MYSQL') || k.includes('DB_')).join(', '))
    console.warn('⚠️ Server will start but database operations will fail until connection is established')
  })

module.exports = pool


const mysql = require('mysql2/promise')
require('dotenv').config()

// Railway provides MySQL variables with MYSQL prefix
// Map them to our expected variable names if Railway variables exist
const DB_HOST = process.env.DB_HOST || process.env.MYSQLHOST || 'localhost'
const DB_USER = process.env.DB_USER || process.env.MYSQLUSER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || ''
const DB_NAME = process.env.DB_NAME || process.env.MYSQLDATABASE || 'student_itrack'

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
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
})

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
  })

module.exports = pool


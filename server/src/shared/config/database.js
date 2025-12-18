const mysql = require('mysql2/promise')
require('dotenv').config()

// Database configuration - supports any MySQL host
// Priority: Railway MySQL variables (MYSQL*) > Custom DB_* variables > defaults
// Railway automatically provides: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT
const DB_HOST = process.env.MYSQLHOST || process.env.DB_HOST || 'localhost'
const DB_USER = process.env.MYSQLUSER || process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || ''
const DB_NAME = process.env.MYSQLDATABASE || process.env.DB_NAME || 'studentitrack'
// Support Railway MySQL port if provided (priority: MYSQLPORT > DB_PORT > default)
const DB_PORT = process.env.MYSQLPORT || process.env.DB_PORT || 46804

// Log database configuration (without password)
console.log('📊 Database Configuration:')
console.log(`   Host: ${DB_HOST}`)
console.log(`   User: ${DB_USER}`)
console.log(`   Database: ${DB_NAME}`)
console.log(`   Password: ${DB_PASSWORD ? '***' : '(empty)'}`)
console.log(`   Port: ${DB_PORT}`)

// Debug: Show all environment variables (for troubleshooting) - Always show in Railway
const allEnvVars = Object.keys(process.env).sort()
const mysqlVars = allEnvVars.filter(k => k.includes('MYSQL') || k.includes('DB_'))
console.log(`   🔍 Environment variables found: ${mysqlVars.length > 0 ? mysqlVars.join(', ') : 'NONE - Set variables in Railway!'}`)
if (mysqlVars.length === 0) {
  console.log('   ⚠️  CRITICAL: No MySQL environment variables detected!')
  console.log('   📝 Go to Railway → Backend Service (not MySQL service) → Variables tab')
  console.log('   📝 Add: MYSQLHOST, MYSQLUSER, MYSQLPASSWORD, MYSQLDATABASE, MYSQLPORT')
  console.log('   📝 Or use: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT')
}

// Enable SSL for Railway MySQL (Railway requires SSL) or if explicitly set
// Railway provides MYSQL* variables, so if those are present, enable SSL
const isRailway = !!process.env.MYSQLHOST
const shouldUseSSL = process.env.DB_SSL === 'true' || (isRailway && process.env.DB_SSL !== 'false')

const pool = mysql.createPool({
  host: DB_HOST,
  port: parseInt(DB_PORT, 10),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  ssl: shouldUseSSL ? {} : false, // Enable SSL for Railway or if DB_SSL=true
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
    console.error(`   DB_HOST=${DB_HOST} (from ${process.env.MYSQLHOST ? 'MYSQLHOST' : process.env.DB_HOST ? 'DB_HOST' : 'default'})`)
    console.error(`   DB_USER=${DB_USER} (from ${process.env.MYSQLUSER ? 'MYSQLUSER' : process.env.DB_USER ? 'DB_USER' : 'default'})`)
    console.error(`   DB_NAME=${DB_NAME} (from ${process.env.MYSQLDATABASE ? 'MYSQLDATABASE' : process.env.DB_NAME ? 'DB_NAME' : 'default'})`)
    console.error(`   DB_PORT=${DB_PORT} (from ${process.env.MYSQLPORT ? 'MYSQLPORT' : process.env.DB_PORT ? 'DB_PORT' : 'default'})`)
    const availableVars = Object.keys(process.env).filter(k => k.includes('MYSQL') || k.includes('DB_'))
    console.error(`   Available env vars: ${availableVars.length > 0 ? availableVars.join(', ') : 'NONE - Set environment variables in Railway!'}`)
    if (availableVars.length === 0) {
      console.error('   ⚠️  No MySQL environment variables found!')
      console.error('   📝 Go to Railway → Backend Service → Variables tab')
      console.error('   📝 Add: DB_HOST=${{MySQL.MYSQLHOST}} (or use MYSQLHOST directly)')
    }
    console.warn('⚠️ Server will start but database operations will fail until connection is established')
  })

module.exports = pool


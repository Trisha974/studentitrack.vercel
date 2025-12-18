/**
 * Export Database Script
 * Exports your local MySQL database to SQL file
 * This includes both schema and data
 */

require('dotenv').config()
const { exec } = require('child_process')
const fs = require('fs')
const path = require('path')

// Get database configuration from .env
const DB_HOST = process.env.DB_HOST || 'localhost'
const DB_USER = process.env.DB_USER || 'root'
const DB_PASSWORD = process.env.DB_PASSWORD || ''
const DB_NAME = process.env.DB_NAME || 'student_itrack'

// Output file path
const outputDir = path.join(__dirname, '../../')
const outputFile = path.join(outputDir, `database_export_${new Date().toISOString().split('T')[0]}.sql`)

console.log('📦 Exporting Database...\n')
console.log('Configuration:')
console.log(`   Host: ${DB_HOST}`)
console.log(`   User: ${DB_USER}`)
console.log(`   Database: ${DB_NAME}`)
console.log(`   Output: ${outputFile}\n`)

// Build mysqldump command
let mysqldumpCmd = `mysqldump -h ${DB_HOST} -u ${DB_USER}`

if (DB_PASSWORD) {
  mysqldumpCmd += ` -p${DB_PASSWORD}`
} else {
  mysqldumpCmd += ` -p`
}

mysqldumpCmd += ` ${DB_NAME} > "${outputFile}"`

console.log('🔄 Running mysqldump...\n')

exec(mysqldumpCmd, (error, stdout, stderr) => {
  if (error) {
    console.error('❌ Export failed!')
    console.error(`Error: ${error.message}\n`)
    
    if (error.message.includes('mysqldump')) {
      console.error('💡 mysqldump not found. Try one of these:')
      console.error('   1. Install MySQL client tools')
      console.error('   2. Use XAMPP/WAMP MySQL (usually in C:\\xampp\\mysql\\bin)')
      console.error('   3. Use MySQL Workbench to export')
      console.error('   4. Use phpMyAdmin if you have it installed locally\n')
    }
    
    if (error.message.includes('Access denied')) {
      console.error('💡 Access denied. Check your .env file:')
      console.error(`   DB_HOST=${DB_HOST}`)
      console.error(`   DB_USER=${DB_USER}`)
      console.error(`   DB_PASSWORD=${DB_PASSWORD ? '***' : '(empty)'}`)
      console.error(`   DB_NAME=${DB_NAME}\n`)
    }
    
    process.exit(1)
  }
  
  if (stderr && !stderr.includes('Warning')) {
    console.warn('⚠️  Warnings:', stderr)
  }
  
  // Check if file was created
  if (fs.existsSync(outputFile)) {
    const stats = fs.statSync(outputFile)
    const fileSizeKB = (stats.size / 1024).toFixed(2)
    
    console.log('✅ Export completed successfully!')
    console.log(`\n📄 File: ${outputFile}`)
    console.log(`📊 Size: ${fileSizeKB} KB`)
    console.log(`\n💡 Next steps:`)
    console.log(`   1. Upload this file to Hostinger`)
    console.log(`   2. Import it via phpMyAdmin`)
    console.log(`   3. Or use: mysql -u user -p database < ${path.basename(outputFile)}`)
  } else {
    console.error('❌ Export file was not created!')
    console.error('   Check if mysqldump is installed and accessible')
    process.exit(1)
  }
})


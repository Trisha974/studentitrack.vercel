/**
 * Export Full Database for Hostinger Deployment
 * Creates a complete SQL dump file with schema and data
 * 
 * Usage: node scripts/export-full-database.js
 * Output: database-export.sql
 */

require('dotenv').config()
const mysql = require('mysql2/promise')
const fs = require('fs')
const path = require('path')

async function exportDatabase() {
  console.log('📦 Exporting database for Hostinger deployment...\n')
  
  const config = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'student_itrack'
  }
  
  console.log('📋 Connection Config:')
  console.log(`   Host: ${config.host}`)
  console.log(`   User: ${config.user}`)
  console.log(`   Database: ${config.database}\n`)
  
  let connection
  
  try {
    // Connect to MySQL
    console.log('1️⃣ Connecting to MySQL...')
    connection = await mysql.createConnection(config)
    console.log('   ✅ Connected\n')
    
    // Start SQL dump
    let sqlDump = `-- Student iTrack Database Export
-- Generated: ${new Date().toISOString()}
-- Database: ${config.database}

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS \`${config.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE \`${config.database}\`;

-- Disable foreign key checks temporarily
SET FOREIGN_KEY_CHECKS = 0;

`
    
    // Get all tables
    console.log('2️⃣ Getting table list...')
    const [tables] = await connection.execute('SHOW TABLES')
    const tableNames = tables.map(t => Object.values(t)[0])
    console.log(`   ✅ Found ${tableNames.length} table(s): ${tableNames.join(', ')}\n`)
    
    if (tableNames.length === 0) {
      console.log('⚠️  No tables found. Creating tables from schema...\n')
      // Include table creation scripts
      sqlDump += getTableCreationScripts()
    } else {
      // Export each table structure and data
      for (const tableName of tableNames) {
        console.log(`3️⃣ Exporting table: ${tableName}...`)
        
        // Get table structure
        const [createTable] = await connection.execute(`SHOW CREATE TABLE \`${tableName}\``)
        if (createTable && createTable[0]) {
          sqlDump += `\n-- Table structure for table \`${tableName}\`\n`
          sqlDump += `DROP TABLE IF EXISTS \`${tableName}\`;\n`
          sqlDump += createTable[0]['Create Table'] + ';\n\n'
        }
        
        // Get table data
        const [rows] = await connection.execute(`SELECT * FROM \`${tableName}\``)
        
        if (rows.length > 0) {
          console.log(`   📊 Found ${rows.length} row(s)`)
          sqlDump += `-- Data for table \`${tableName}\`\n`
          sqlDump += `LOCK TABLES \`${tableName}\` WRITE;\n`
          
          // Build INSERT statements
          const columns = Object.keys(rows[0])
          const columnList = columns.map(c => `\`${c}\``).join(', ')
          
          for (const row of rows) {
            const values = columns.map(col => {
              const val = row[col]
              if (val === null || val === undefined) {
                return 'NULL'
              } else if (typeof val === 'string') {
                // Escape single quotes and backslashes
                return `'${val.replace(/\\/g, '\\\\').replace(/'/g, "''")}'`
              } else if (val instanceof Date) {
                return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`
              } else {
                return val
              }
            }).join(', ')
            
            sqlDump += `INSERT INTO \`${tableName}\` (${columnList}) VALUES (${values});\n`
          }
          
          sqlDump += `UNLOCK TABLES;\n\n`
        } else {
          console.log(`   ℹ️  Table is empty`)
          sqlDump += `-- Table \`${tableName}\` is empty\n\n`
        }
      }
    }
    
    // Re-enable foreign key checks
    sqlDump += `SET FOREIGN_KEY_CHECKS = 1;\n`
    
    // Save to file
    const outputFile = path.join(__dirname, 'database-export.sql')
    fs.writeFileSync(outputFile, sqlDump, 'utf8')
    
    const fileSize = (fs.statSync(outputFile).size / 1024).toFixed(2)
    console.log(`\n✅ Database exported successfully!`)
    console.log(`   File: ${outputFile}`)
    console.log(`   Size: ${fileSize} KB`)
    console.log(`\n📤 Ready to upload to Hostinger!`)
    console.log(`\n💡 Instructions:`)
    console.log(`   1. Go to Hostinger hPanel → phpMyAdmin`)
    console.log(`   2. Select your database`)
    console.log(`   3. Click "Import" tab`)
    console.log(`   4. Choose file: ${outputFile}`)
    console.log(`   5. Click "Go"`)
    
    await connection.end()
  } catch (error) {
    console.error('\n❌ Export failed!')
    console.error(`Error: ${error.message}\n`)
    
    if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.error('💡 Authentication failed. Check your DB_USER and DB_PASSWORD in .env file.')
    } else if (error.code === 'ECONNREFUSED') {
      console.error('💡 Connection refused. Make sure MySQL server is running.')
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.error('💡 Database does not exist. Create it first or check DB_NAME in .env')
    }
    
    if (connection) {
      await connection.end()
    }
    process.exit(1)
  }
}

function getTableCreationScripts() {
  return `-- Table structure for table \`professors\`
CREATE TABLE IF NOT EXISTS \`professors\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`firebase_uid\` varchar(128) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`department\` varchar(100) DEFAULT NULL,
  \`photo_url\` text,
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`firebase_uid\` (\`firebase_uid\`),
  KEY \`email\` (\`email\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table \`students\`
CREATE TABLE IF NOT EXISTS \`students\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`firebase_uid\` varchar(128) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`email\` varchar(255) NOT NULL,
  \`student_id\` varchar(100) DEFAULT NULL,
  \`department\` varchar(255) DEFAULT NULL,
  \`photo_url\` text,
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  UNIQUE KEY \`firebase_uid\` (\`firebase_uid\`),
  KEY \`email\` (\`email\`),
  KEY \`student_id\` (\`student_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table \`courses\`
CREATE TABLE IF NOT EXISTS \`courses\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`code\` varchar(100) NOT NULL,
  \`name\` varchar(255) NOT NULL,
  \`credits\` int DEFAULT '0',
  \`professor_id\` int unsigned DEFAULT NULL,
  \`term\` enum('first','second') DEFAULT 'first',
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`code\` (\`code\`),
  KEY \`professor_id\` (\`professor_id\`),
  UNIQUE KEY \`unique_code_professor\` (\`code\`,\`professor_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table \`enrollments\`
CREATE TABLE IF NOT EXISTS \`enrollments\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`student_id\` int unsigned NOT NULL,
  \`course_id\` int unsigned NOT NULL,
  \`enrolled_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`student_id\` (\`student_id\`),
  KEY \`course_id\` (\`course_id\`),
  UNIQUE KEY \`unique_student_course\` (\`student_id\`,\`course_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table \`grades\`
CREATE TABLE IF NOT EXISTS \`grades\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`student_id\` int unsigned NOT NULL,
  \`course_id\` int unsigned NOT NULL,
  \`assessment_type\` varchar(100) NOT NULL,
  \`assessment_title\` varchar(255) NOT NULL,
  \`score\` decimal(10,2) NOT NULL,
  \`max_points\` decimal(10,2) NOT NULL,
  \`date\` date DEFAULT NULL,
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`student_id\` (\`student_id\`),
  KEY \`course_id\` (\`course_id\`),
  KEY \`date\` (\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table \`attendance\`
CREATE TABLE IF NOT EXISTS \`attendance\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`student_id\` int unsigned NOT NULL,
  \`course_id\` int unsigned NOT NULL,
  \`date\` date NOT NULL,
  \`status\` enum('present','absent','late','excused') NOT NULL DEFAULT 'absent',
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  \`updated_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`student_id\` (\`student_id\`),
  KEY \`course_id\` (\`course_id\`),
  KEY \`date\` (\`date\`),
  UNIQUE KEY \`unique_student_course_date\` (\`student_id\`,\`course_id\`,\`date\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table structure for table \`notifications\`
CREATE TABLE IF NOT EXISTS \`notifications\` (
  \`id\` int unsigned NOT NULL AUTO_INCREMENT,
  \`user_id\` int unsigned NOT NULL,
  \`user_type\` enum('Student','Professor') NOT NULL,
  \`type\` enum('grade','attendance','enrollment','course','system') NOT NULL,
  \`title\` varchar(255) NOT NULL,
  \`message\` text NOT NULL,
  \`course_id\` int unsigned DEFAULT NULL,
  \`grade_id\` int unsigned DEFAULT NULL,
  \`attendance_id\` int unsigned DEFAULT NULL,
  \`enrollment_id\` int unsigned DEFAULT NULL,
  \`read\` tinyint(1) DEFAULT '0',
  \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (\`id\`),
  KEY \`idx_user\` (\`user_id\`,\`user_type\`),
  KEY \`idx_read\` (\`read\`),
  KEY \`idx_created_at\` (\`created_at\`),
  KEY \`idx_course_id\` (\`course_id\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

`
}

// Run the export
exportDatabase()
  .then(() => {
    console.log('\n✅ Export completed successfully!')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ Export failed:', err)
    process.exit(1)
  })








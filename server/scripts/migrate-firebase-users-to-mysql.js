/**
 * Migration script to create MySQL user accounts from existing Firebase users
 * This script reads existing students and professors and creates corresponding user accounts
 * 
 * Usage: node scripts/migrate-firebase-users-to-mysql.js
 */

require('dotenv').config()
const pool = require('../src/shared/config/database')
const bcrypt = require('bcrypt')

async function migrateUsers() {
  try {
    console.log('🔄 Starting Firebase to MySQL user migration...\n')

    // Get all students with Firebase UIDs
    const [students] = await pool.execute(
      'SELECT id, email, firebase_uid FROM students WHERE firebase_uid IS NOT NULL AND firebase_uid != ""'
    )
    console.log(`📚 Found ${students.length} students with Firebase UIDs`)

    // Get all professors with Firebase UIDs
    const [professors] = await pool.execute(
      'SELECT id, email, firebase_uid FROM professors WHERE firebase_uid IS NOT NULL AND firebase_uid != ""'
    )
    console.log(`👨‍🏫 Found ${professors.length} professors with Firebase UIDs\n`)

    let created = 0
    let skipped = 0
    let errors = 0

    // Create user accounts for students
    for (const student of students) {
      try {
        // Check if user already exists
        const [existing] = await pool.execute(
          'SELECT id FROM users WHERE email = ? OR (user_id = ? AND role = "Student")',
          [student.email, student.id]
        )

        if (existing.length > 0) {
          console.log(`⏭️  Skipping student ${student.email} - user account already exists`)
          skipped++
          continue
        }

        // Generate a temporary password (users will need to reset)
        const tempPassword = `temp_${student.firebase_uid.substring(0, 8)}`
        const saltRounds = 10
        const password_hash = await bcrypt.hash(tempPassword, saltRounds)

        await pool.execute(
          `INSERT INTO users (email, password_hash, role, user_id, email_verified)
           VALUES (?, ?, 'Student', ?, TRUE)`,
          [student.email, password_hash, student.id]
        )

        console.log(`✅ Created user account for student: ${student.email}`)
        created++
      } catch (error) {
        console.error(`❌ Error creating user for student ${student.email}:`, error.message)
        errors++
      }
    }

    // Create user accounts for professors
    for (const professor of professors) {
      try {
        // Check if user already exists
        const [existing] = await pool.execute(
          'SELECT id FROM users WHERE email = ? OR (user_id = ? AND role = "Professor")',
          [professor.email, professor.id]
        )

        if (existing.length > 0) {
          console.log(`⏭️  Skipping professor ${professor.email} - user account already exists`)
          skipped++
          continue
        }

        // Generate a temporary password (users will need to reset)
        const tempPassword = `temp_${professor.firebase_uid.substring(0, 8)}`
        const saltRounds = 10
        const password_hash = await bcrypt.hash(tempPassword, saltRounds)

        await pool.execute(
          `INSERT INTO users (email, password_hash, role, user_id, email_verified)
           VALUES (?, ?, 'Professor', ?, TRUE)`,
          [professor.email, password_hash, professor.id]
        )

        console.log(`✅ Created user account for professor: ${professor.email}`)
        created++
      } catch (error) {
        console.error(`❌ Error creating user for professor ${professor.email}:`, error.message)
        errors++
      }
    }

    console.log(`\n📊 Migration Summary:`)
    console.log(`   ✅ Created: ${created}`)
    console.log(`   ⏭️  Skipped: ${skipped}`)
    console.log(`   ❌ Errors: ${errors}`)
    console.log(`\n⚠️  Note: All migrated users have temporary passwords.`)
    console.log(`   Users should use the password reset feature to set their own passwords.`)

    process.exit(0)
  } catch (error) {
    console.error('❌ Migration failed:', error)
    process.exit(1)
  }
}

migrateUsers()


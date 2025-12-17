require('dotenv').config()
const pool = require('../src/shared/config/database')

async function fixFirebaseUidSchema() {
  try {
    console.log('\n🔧 Fixing firebase_uid columns to allow NULL values...\n')

    // Fix professors table
    console.log('1. Fixing professors.firebase_uid...')
    try {
      // First, drop the UNIQUE constraint if it exists (since we're allowing NULL)
      await pool.execute('ALTER TABLE professors DROP INDEX firebase_uid')
      console.log('   ✅ Dropped UNIQUE constraint on firebase_uid')
    } catch (e) {
      if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('   ℹ️  UNIQUE constraint does not exist or already removed')
      } else {
        console.log('   ⚠️  Could not drop UNIQUE constraint:', e.message)
      }
    }

    // Modify column to allow NULL
    await pool.execute('ALTER TABLE professors MODIFY COLUMN firebase_uid VARCHAR(128) NULL')
    console.log('   ✅ Modified professors.firebase_uid to allow NULL')

    // Fix students table
    console.log('\n2. Fixing students.firebase_uid...')
    try {
      // First, drop the UNIQUE constraint if it exists
      await pool.execute('ALTER TABLE students DROP INDEX firebase_uid')
      console.log('   ✅ Dropped UNIQUE constraint on firebase_uid')
    } catch (e) {
      if (e.code === 'ER_CANT_DROP_FIELD_OR_KEY') {
        console.log('   ℹ️  UNIQUE constraint does not exist or already removed')
      } else {
        console.log('   ⚠️  Could not drop UNIQUE constraint:', e.message)
      }
    }

    // Modify column to allow NULL
    await pool.execute('ALTER TABLE students MODIFY COLUMN firebase_uid VARCHAR(128) NULL')
    console.log('   ✅ Modified students.firebase_uid to allow NULL')

    // Verify the changes
    console.log('\n3. Verifying changes...')
    const [profColumns] = await pool.execute('DESCRIBE professors')
    const profFirebaseUid = profColumns.find(col => col.Field === 'firebase_uid')
    console.log(`   Professors.firebase_uid: ${profFirebaseUid.Null === 'YES' ? '✅ Allows NULL' : '❌ Still NOT NULL'}`)

    const [studentColumns] = await pool.execute('DESCRIBE students')
    const studentFirebaseUid = studentColumns.find(col => col.Field === 'firebase_uid')
    console.log(`   Students.firebase_uid: ${studentFirebaseUid.Null === 'YES' ? '✅ Allows NULL' : '❌ Still NOT NULL'}`)

    console.log('\n✅ Database schema fixed successfully!')
    console.log('   You can now create new accounts without firebase_uid.\n')
    
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Error fixing schema:', error.message)
    console.error('Error code:', error.code)
    console.error('Error stack:', error.stack)
    process.exit(1)
  }
}

fixFirebaseUidSchema()


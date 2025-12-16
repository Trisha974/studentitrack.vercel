/**
 * Migrate Enrollments from Professor Dashboard Firestore enrolls object to MySQL
 * 
 * This script reads the enrolls object from the professor dashboard Firestore document
 * and creates corresponding enrollment records in MySQL.
 * 
 * Usage: node server/scripts/migrate-professor-enrolls-to-mysql.js [professorFirebaseUid]
 * If no UID is provided, it will migrate enrollments for all professors.
 */

require('dotenv').config()
const admin = require('firebase-admin')
const mysql = require('mysql2/promise')

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL
      })
    })
    console.log('✅ Firebase Admin initialized')
  } catch (error) {
    console.error('❌ Firebase Admin initialization failed:', error.message)
    process.exit(1)
  }
}

const db = admin.firestore()

// MySQL connection
const mysqlPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'student_itrack',
  waitForConnections: true,
  connectionLimit: 10
})

const DASHBOARD_COLLECTION = 'professorDashboards'

/**
 * Get professor MySQL ID from Firebase UID
 */
async function getProfessorMySQLId(firebaseUid) {
  try {
    const [rows] = await mysqlPool.execute(
      'SELECT id FROM professors WHERE firebase_uid = ?',
      [firebaseUid]
    )
    return rows.length > 0 ? rows[0].id : null
  } catch (error) {
    console.error(`Error getting professor MySQL ID for ${firebaseUid}:`, error)
    return null
  }
}

/**
 * Get student MySQL ID from numerical student ID
 */
async function getStudentMySQLIdByNumericalId(numericalId) {
  try {
    const [rows] = await mysqlPool.execute(
      'SELECT id FROM students WHERE student_id = ?',
      [numericalId]
    )
    return rows.length > 0 ? rows[0].id : null
  } catch (error) {
    console.error(`Error getting student MySQL ID for numerical ID ${numericalId}:`, error)
    return null
  }
}

/**
 * Get course MySQL ID from course code and professor ID
 */
async function getCourseMySQLId(courseCode, professorId) {
  try {
    const [rows] = await mysqlPool.execute(
      'SELECT id FROM courses WHERE code = ? AND professor_id = ?',
      [courseCode, professorId]
    )
    return rows.length > 0 ? rows[0].id : null
  } catch (error) {
    console.error(`Error getting course MySQL ID for ${courseCode}:`, error)
    return null
  }
}

/**
 * Migrate enrollments from professor dashboard enrolls object to MySQL
 */
async function migrateProfessorEnrollments(professorUid) {
  console.log(`\n📦 Migrating enrollments for professor: ${professorUid}`)
  
  try {
    // Get professor MySQL ID
    const professorMySQLId = await getProfessorMySQLId(professorUid)
    if (!professorMySQLId) {
      console.warn(`  ⚠️  Professor MySQL ID not found for ${professorUid}, skipping`)
      return { migrated: 0, skipped: 0, errors: 0 }
    }
    
    // Get professor dashboard from Firestore
    const dashboardDoc = await db.collection(DASHBOARD_COLLECTION).doc(professorUid).get()
    if (!dashboardDoc.exists) {
      console.warn(`  ⚠️  Professor dashboard not found for ${professorUid}, skipping`)
      return { migrated: 0, skipped: 0, errors: 0 }
    }
    
    const dashboardData = dashboardDoc.data()
    const enrolls = dashboardData.enrolls || {}
    const subjects = dashboardData.subjects || []
    
    console.log(`  📚 Found ${Object.keys(enrolls).length} subjects with enrollments`)
    console.log(`  📚 Found ${subjects.length} total subjects`)
    
    let migrated = 0
    let skipped = 0
    let errors = 0
    
    // Process each subject's enrollments
    for (const [courseCode, studentIds] of Object.entries(enrolls)) {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
        continue
      }
      
      // Get course MySQL ID
      const courseMySQLId = await getCourseMySQLId(courseCode, professorMySQLId)
      if (!courseMySQLId) {
        console.warn(`  ⚠️  Course ${courseCode} not found in MySQL, skipping enrollments`)
        errors += studentIds.length
        continue
      }
      
      console.log(`  📚 Processing ${studentIds.length} enrollments for course ${courseCode}...`)
      
      // Process each student enrollment
      for (const studentNumericalId of studentIds) {
        try {
          // Normalize student ID (remove whitespace)
          const normalizedId = String(studentNumericalId).trim()
          if (!normalizedId) {
            skipped++
            continue
          }
          
          // Get student MySQL ID
          const studentMySQLId = await getStudentMySQLIdByNumericalId(normalizedId)
          if (!studentMySQLId) {
            console.warn(`  ⚠️  Student ${normalizedId} not found in MySQL, skipping`)
            skipped++
            continue
          }
          
          // Check if enrollment already exists
          const [existing] = await mysqlPool.execute(
            'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
            [studentMySQLId, courseMySQLId]
          )
          
          if (existing.length > 0) {
            skipped++
            continue
          }
          
          // Create enrollment in MySQL
          await mysqlPool.execute(
            `INSERT INTO enrollments (student_id, course_id, enrolled_at)
             VALUES (?, ?, NOW())`,
            [studentMySQLId, courseMySQLId]
          )
          
          migrated++
          console.log(`    ✅ Migrated: Student ${normalizedId} (MySQL ID: ${studentMySQLId}) → Course ${courseCode} (MySQL ID: ${courseMySQLId})`)
        } catch (error) {
          if (error.code === 'ER_DUP_ENTRY') {
            skipped++
          } else {
            console.error(`    ❌ Error migrating enrollment for student ${studentNumericalId} in ${courseCode}:`, error.message)
            errors++
          }
        }
      }
    }
    
    console.log(`\n✅ Migration complete for ${professorUid}: ${migrated} migrated, ${skipped} skipped, ${errors} errors`)
    return { migrated, skipped, errors }
  } catch (error) {
    console.error(`❌ Error migrating enrollments for ${professorUid}:`, error)
    return { migrated: 0, skipped: 0, errors: 1 }
  }
}

/**
 * Main migration function
 */
async function migrate() {
  const professorUid = process.argv[2]
  
  console.log('🚀 Starting Professor Dashboard Enrollments Migration...\n')
  console.log('⚠️  This will migrate enrollments from Firestore professor dashboard enrolls object to MySQL\n')
  
  try {
    // Test MySQL connection
    await mysqlPool.execute('SELECT 1')
    console.log('✅ MySQL connection successful\n')
    
    let totalMigrated = 0
    let totalSkipped = 0
    let totalErrors = 0
    
    if (professorUid) {
      // Migrate for specific professor
      const result = await migrateProfessorEnrollments(professorUid)
      totalMigrated = result.migrated
      totalSkipped = result.skipped
      totalErrors = result.errors
    } else {
      // Migrate for all professors
      console.log('📚 Migrating enrollments for all professors...\n')
      
      const dashboardsSnapshot = await db.collection(DASHBOARD_COLLECTION).get()
      console.log(`Found ${dashboardsSnapshot.size} professor dashboards\n`)
      
      for (const doc of dashboardsSnapshot.docs) {
        const result = await migrateProfessorEnrollments(doc.id)
        totalMigrated += result.migrated
        totalSkipped += result.skipped
        totalErrors += result.errors
      }
    }
    
    console.log('\n✅ Migration complete!')
    console.log('\n📊 Summary:')
    console.log(`   - Total migrated: ${totalMigrated}`)
    console.log(`   - Total skipped: ${totalSkipped}`)
    console.log(`   - Total errors: ${totalErrors}`)
    
    // Close connections
    await mysqlPool.end()
    process.exit(0)
  } catch (error) {
    console.error('\n❌ Migration failed:', error)
    await mysqlPool.end()
    process.exit(1)
  }
}

// Run migration
migrate()

















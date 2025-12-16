/**
 * Firestore to MySQL Migration Script
 * 
 * Migrates heavy academic data from Firestore to MySQL:
 * - Students, Professors
 * - Courses
 * - Enrollments
 * - Grades (with notifications)
 * - Attendance (with notifications)
 * 
 * Usage: node scripts/migrate-firestore-to-mysql.js
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
    console.error('⚠️ Make sure FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, and FIREBASE_CLIENT_EMAIL are set in .env')
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
  ssl: false, // Railway MySQL requires SSL to be explicitly disabled
  waitForConnections: true,
  connectionLimit: 10
})

// ID mapping caches
const uidToStudentId = new Map() // Firebase UID -> MySQL student ID
const uidToProfessorId = new Map() // Firebase UID -> MySQL professor ID
const courseCodeToId = new Map() // Course code + professor_id -> MySQL course ID (format: "code:professorId" or "code")

/**
 * Migrate Students from Firestore to MySQL
 */
async function migrateStudents() {
  console.log('\n📦 Migrating Students...')
  
  try {
    const studentsSnapshot = await db.collection('students').get()
    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const doc of studentsSnapshot.docs) {
      try {
        const data = doc.data()
        const firebaseUid = doc.id

        // Check if student already exists
        const [existing] = await mysqlPool.execute(
          'SELECT id FROM students WHERE firebase_uid = ?',
          [firebaseUid]
        )

        if (existing.length > 0) {
          console.log(`  ⏭️  Student ${data.name || firebaseUid} already exists, skipping`)
          uidToStudentId.set(firebaseUid, existing[0].id)
          skipped++
          continue
        }

        // Insert student
        const [result] = await mysqlPool.execute(
          `INSERT INTO students (firebase_uid, name, email, student_id, department, photo_url)
           VALUES (?, ?, ?, ?, ?, ?)`,
          [
            firebaseUid,
            data.name || '',
            data.email || '',
            data.studentId || data.student_id || null,
            data.department || null,
            data.photoURL || data.photo_url || null
          ]
        )

        uidToStudentId.set(firebaseUid, result.insertId)
        migrated++
        console.log(`  ✅ Migrated student: ${data.name || firebaseUid} (ID: ${result.insertId})`)
      } catch (error) {
        console.error(`  ❌ Error migrating student ${doc.id}:`, error.message)
        errors++
      }
    }

    console.log(`\n✅ Students migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`)
    return { migrated, skipped, errors }
  } catch (error) {
    console.error('❌ Error migrating students:', error)
    throw error
  }
}

/**
 * Migrate Professors from Firestore to MySQL
 */
async function migrateProfessors() {
  console.log('\n📦 Migrating Professors...')
  
  try {
    const professorsSnapshot = await db.collection('professors').get()
    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const doc of professorsSnapshot.docs) {
      try {
        const data = doc.data()
        const firebaseUid = doc.id

        // Check if professor already exists
        const [existing] = await mysqlPool.execute(
          'SELECT id FROM professors WHERE firebase_uid = ?',
          [firebaseUid]
        )

        if (existing.length > 0) {
          console.log(`  ⏭️  Professor ${data.name || firebaseUid} already exists, skipping`)
          uidToProfessorId.set(firebaseUid, existing[0].id)
          skipped++
          continue
        }

        // Insert professor
        const [result] = await mysqlPool.execute(
          `INSERT INTO professors (firebase_uid, name, email, department, photo_url)
           VALUES (?, ?, ?, ?, ?)`,
          [
            firebaseUid,
            data.name || '',
            data.email || '',
            data.department || null,
            data.photoURL || data.photo_url || null
          ]
        )

        uidToProfessorId.set(firebaseUid, result.insertId)
        migrated++
        console.log(`  ✅ Migrated professor: ${data.name || firebaseUid} (ID: ${result.insertId})`)
      } catch (error) {
        console.error(`  ❌ Error migrating professor ${doc.id}:`, error.message)
        errors++
      }
    }

    console.log(`\n✅ Professors migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`)
    return { migrated, skipped, errors }
  } catch (error) {
    console.error('❌ Error migrating professors:', error)
    throw error
  }
}

/**
 * Migrate Courses from Firestore to MySQL
 */
async function migrateCourses() {
  console.log('\n📦 Migrating Courses...')
  
  try {
    const coursesSnapshot = await db.collection('courses').get()
    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const doc of coursesSnapshot.docs) {
      try {
        const data = doc.data()
        const courseCode = data.code || doc.id

        // Get professor MySQL ID
        const professorFirebaseUid = data.professorId || data.professor_id || data.professorUid || data.professor_uid
        let professorId = null

        if (professorFirebaseUid) {
          professorId = uidToProfessorId.get(professorFirebaseUid)
          if (!professorId) {
            console.warn(`  ⚠️  Professor ${professorFirebaseUid} not found for course ${courseCode}, setting professor_id to NULL`)
          }
        }

        // Check if course already exists (using code + professor_id as unique key)
        // This allows same course code for different professors
        let query = 'SELECT id FROM courses WHERE code = ?'
        const params = [courseCode]
        if (professorId) {
          query += ' AND professor_id = ?'
          params.push(professorId)
        } else {
          // If no professor, check for courses with same code and NULL professor
          query += ' AND professor_id IS NULL'
        }

        const [existing] = await mysqlPool.execute(query, params)

        // Create unique key for mapping: "code:professorId" or "code:null"
        const courseKey = professorId ? `${courseCode}:${professorId}` : `${courseCode}:null`

        if (existing.length > 0) {
          // Course exists, use existing ID for mapping
          courseCodeToId.set(courseKey, existing[0].id)
          // Also map by code only for backward compatibility (use first found)
          if (!courseCodeToId.has(courseCode)) {
            courseCodeToId.set(courseCode, existing[0].id)
          }
          skipped++
          continue
        }

        // Insert course (will fail if unique constraint violated, which is fine)
        try {
          const [result] = await mysqlPool.execute(
            `INSERT INTO courses (code, name, credits, professor_id)
             VALUES (?, ?, ?, ?)`,
            [
              courseCode,
              data.name || data.title || courseCode,
              parseFloat(data.credits) || 0,
              professorId
            ]
          )

          courseCodeToId.set(courseKey, result.insertId)
          // Also map by code only for backward compatibility
          if (!courseCodeToId.has(courseCode)) {
            courseCodeToId.set(courseCode, result.insertId)
          }
          migrated++
          console.log(`  ✅ Migrated course: ${courseCode}${professorId ? ` (Prof: ${professorId})` : ''} (ID: ${result.insertId})`)
        } catch (insertError) {
          // If unique constraint error, course already exists
          if (insertError.code === 'ER_DUP_ENTRY') {
            // Try to get the existing course
            const [existingAfter] = await mysqlPool.execute(query, params)
            if (existingAfter.length > 0) {
              courseCodeToId.set(courseKey, existingAfter[0].id)
              if (!courseCodeToId.has(courseCode)) {
                courseCodeToId.set(courseCode, existingAfter[0].id)
              }
              skipped++
              continue
            }
          }
          throw insertError
        }
      } catch (error) {
        console.error(`  ❌ Error migrating course ${doc.id}:`, error.message)
        errors++
      }
    }

    console.log(`\n✅ Courses migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`)
    return { migrated, skipped, errors }
  } catch (error) {
    console.error('❌ Error migrating courses:', error)
    throw error
  }
}

/**
 * Migrate Enrollments from Firestore to MySQL
 */
async function migrateEnrollments() {
  console.log('\n📦 Migrating Enrollments...')
  
  try {
    const enrollmentsSnapshot = await db.collection('enrollments').get()
    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const doc of enrollmentsSnapshot.docs) {
      try {
        const data = doc.data()

        // Get student MySQL ID
        const studentFirebaseUid = data.studentId || data.student_id || data.studentUid || data.student_uid
        const studentId = uidToStudentId.get(studentFirebaseUid)

        if (!studentId) {
          console.warn(`  ⚠️  Student ${studentFirebaseUid} not found, skipping enrollment ${doc.id}`)
          skipped++
          continue
        }

        // Get course MySQL ID
        const courseCode = data.courseCode || data.course_code || data.courseId || data.course_id
        // Try to get course ID - use code only as fallback (works since we map both composite key and code)
        let courseId = courseCodeToId.get(courseCode)
        
        // If not found by code, try to find course in database by code
        if (!courseId) {
          try {
            const [courses] = await mysqlPool.execute('SELECT id FROM courses WHERE code = ? LIMIT 1', [courseCode])
            if (courses.length > 0) {
              courseId = courses[0].id
              courseCodeToId.set(courseCode, courseId) // Cache it
            }
          } catch (lookupError) {
            // Ignore lookup errors
          }
        }

        if (!courseId) {
          console.warn(`  ⚠️  Course ${courseCode} not found, skipping enrollment ${doc.id}`)
          skipped++
          continue
        }

        // Check if enrollment already exists
        const [existing] = await mysqlPool.execute(
          'SELECT id FROM enrollments WHERE student_id = ? AND course_id = ?',
          [studentId, courseId]
        )

        if (existing.length > 0) {
          skipped++
          continue
        }

        // Insert enrollment
        await mysqlPool.execute(
          `INSERT INTO enrollments (student_id, course_id, enrolled_at)
           VALUES (?, ?, ?)`,
          [
            studentId,
            courseId,
            data.enrolledAt ? new Date(data.enrolledAt) : new Date()
          ]
        )

        migrated++
        console.log(`  ✅ Migrated enrollment: Student ${studentId} -> Course ${courseId}`)
      } catch (error) {
        console.error(`  ❌ Error migrating enrollment ${doc.id}:`, error.message)
        errors++
      }
    }

    console.log(`\n✅ Enrollments migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`)
    return { migrated, skipped, errors }
  } catch (error) {
    console.error('❌ Error migrating enrollments:', error)
    throw error
  }
}

/**
 * Migrate Grades from Firestore to MySQL and create notifications
 */
async function migrateGrades() {
  console.log('\n📦 Migrating Grades...')
  
  try {
    const gradesSnapshot = await db.collection('grades').get()
    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const doc of gradesSnapshot.docs) {
      try {
        const data = doc.data()

        // Get student MySQL ID
        const studentFirebaseUid = data.studentId || data.student_id || data.studentUid || data.student_uid
        const studentId = uidToStudentId.get(studentFirebaseUid)

        if (!studentId) {
          console.warn(`  ⚠️  Student ${studentFirebaseUid} not found, skipping grade ${doc.id}`)
          skipped++
          continue
        }

        // Get course MySQL ID
        const courseCode = data.courseCode || data.course_code || data.courseId || data.course_id
        // Try to get course ID - use code only as fallback (works since we map both composite key and code)
        let courseId = courseCodeToId.get(courseCode)
        
        // If not found by code, try to find course in database by code
        if (!courseId) {
          try {
            const [courses] = await mysqlPool.execute('SELECT id FROM courses WHERE code = ? LIMIT 1', [courseCode])
            if (courses.length > 0) {
              courseId = courses[0].id
              courseCodeToId.set(courseCode, courseId) // Cache it
            }
          } catch (lookupError) {
            // Ignore lookup errors
          }
        }

        if (!courseId) {
          console.warn(`  ⚠️  Course ${courseCode} not found, skipping grade ${doc.id}`)
          skipped++
          continue
        }

        // Insert grade
        const [result] = await mysqlPool.execute(
          `INSERT INTO grades (student_id, course_id, assessment_type, assessment_title, score, max_points, date)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            studentId,
            courseId,
            data.assessmentType || data.assessment_type || 'exam',
            data.assessmentTitle || data.assessment_title || 'Assessment',
            parseFloat(data.score || 0),
            parseFloat(data.maxPoints || data.max_points || 100),
            data.date ? new Date(data.date) : null
          ]
        )

        const gradeId = result.insertId

        // Create notification for the student
        try {
          const { createGradeNotification } = require('../src/utils/notificationHelper')
          await createGradeNotification(studentId, courseId, gradeId, {
            assessment_type: data.assessmentType || data.assessment_type || 'exam',
            assessment_title: data.assessmentTitle || data.assessment_title || 'Assessment',
            score: parseFloat(data.score || 0),
            max_points: parseFloat(data.maxPoints || data.max_points || 100)
          })
        } catch (notifError) {
          console.warn(`  ⚠️  Failed to create notification for grade ${gradeId}:`, notifError.message)
        }

        migrated++
        console.log(`  ✅ Migrated grade: ${data.assessmentTitle || 'Assessment'} (ID: ${gradeId})`)
      } catch (error) {
        console.error(`  ❌ Error migrating grade ${doc.id}:`, error.message)
        errors++
      }
    }

    console.log(`\n✅ Grades migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`)
    return { migrated, skipped, errors }
  } catch (error) {
    console.error('❌ Error migrating grades:', error)
    throw error
  }
}

/**
 * Migrate Attendance from Firestore to MySQL and create notifications
 */
async function migrateAttendance() {
  console.log('\n📦 Migrating Attendance...')
  
  try {
    const attendanceSnapshot = await db.collection('attendance').get()
    let migrated = 0
    let skipped = 0
    let errors = 0

    for (const doc of attendanceSnapshot.docs) {
      try {
        const data = doc.data()

        // Get student MySQL ID
        const studentFirebaseUid = data.studentId || data.student_id || data.studentUid || data.student_uid
        const studentId = uidToStudentId.get(studentFirebaseUid)

        if (!studentId) {
          console.warn(`  ⚠️  Student ${studentFirebaseUid} not found, skipping attendance ${doc.id}`)
          skipped++
          continue
        }

        // Get course MySQL ID
        const courseCode = data.courseCode || data.course_code || data.courseId || data.course_id
        // Try to get course ID - use code only as fallback (works since we map both composite key and code)
        let courseId = courseCodeToId.get(courseCode)
        
        // If not found by code, try to find course in database by code
        if (!courseId) {
          try {
            const [courses] = await mysqlPool.execute('SELECT id FROM courses WHERE code = ? LIMIT 1', [courseCode])
            if (courses.length > 0) {
              courseId = courses[0].id
              courseCodeToId.set(courseCode, courseId) // Cache it
            }
          } catch (lookupError) {
            // Ignore lookup errors
          }
        }

        if (!courseId) {
          console.warn(`  ⚠️  Course ${courseCode} not found, skipping attendance ${doc.id}`)
          skipped++
          continue
        }

        // Parse date
        const date = data.date ? new Date(data.date) : new Date()
        const status = data.status || 'absent'

        // Check if attendance already exists
        const [existing] = await mysqlPool.execute(
          'SELECT id FROM attendance WHERE student_id = ? AND course_id = ? AND date = ?',
          [studentId, courseId, date.toISOString().split('T')[0]]
        )

        if (existing.length > 0) {
          skipped++
          continue
        }

        // Insert attendance
        const [result] = await mysqlPool.execute(
          `INSERT INTO attendance (student_id, course_id, date, status)
           VALUES (?, ?, ?, ?)`,
          [
            studentId,
            courseId,
            date.toISOString().split('T')[0],
            status
          ]
        )

        const attendanceId = result.insertId

        // Create notification for the student (only if status is not 'present')
        if (status !== 'present') {
          try {
            const { createAttendanceNotification } = require('../src/utils/notificationHelper')
            await createAttendanceNotification(studentId, courseId, attendanceId, {
              date: date.toISOString().split('T')[0],
              status: status
            })
          } catch (notifError) {
            console.warn(`  ⚠️  Failed to create notification for attendance ${attendanceId}:`, notifError.message)
          }
        }

        migrated++
        console.log(`  ✅ Migrated attendance: ${date.toISOString().split('T')[0]} - ${status} (ID: ${attendanceId})`)
      } catch (error) {
        console.error(`  ❌ Error migrating attendance ${doc.id}:`, error.message)
        errors++
      }
    }

    console.log(`\n✅ Attendance migration complete: ${migrated} migrated, ${skipped} skipped, ${errors} errors`)
    return { migrated, skipped, errors }
  } catch (error) {
    console.error('❌ Error migrating attendance:', error)
    throw error
  }
}

/**
 * Main migration function
 */
async function migrate() {
  console.log('🚀 Starting Firestore to MySQL Migration...\n')
  console.log('⚠️  This will migrate all heavy academic data from Firestore to MySQL')
  console.log('⚠️  Existing MySQL records will be skipped (not overwritten)\n')

  try {
    // Test MySQL connection
    await mysqlPool.execute('SELECT 1')
    console.log('✅ MySQL connection successful\n')

    // Migrate in order (respecting foreign key constraints)
    await migrateStudents()
    await migrateProfessors()
    await migrateCourses()
    await migrateEnrollments()
    await migrateGrades()
    await migrateAttendance()

    console.log('\n✅ Migration complete!')
    console.log('\n📊 Summary:')
    console.log(`   - Students: ${uidToStudentId.size} mapped`)
    console.log(`   - Professors: ${uidToProfessorId.size} mapped`)
    console.log(`   - Courses: ${courseCodeToId.size} mapped`)

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


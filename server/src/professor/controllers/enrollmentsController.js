const Enrollment = require('../models/Enrollment')
const Student = require('../../student/models/Student')
const { isStudent } = require('../../shared/utils/roleHelpers')

const getEnrollmentsByStudent = async (req, res, next) => {
  try {
    let studentId = req.params.studentId || req.query.studentId

if (isStudent(req.user.role)) {
      const firebaseUid = req.user.uid
      const email = req.user.email

      let student = await Student.findByFirebaseUid(firebaseUid)

if (!student && email) {
        console.log(`📧 Student not found by UID, trying email: ${email}`)
        student = await Student.findByEmail(email)
      }

if (!student && email) {
        const prefix = email.split('@')[0]
        const parts = prefix.split('.')
        const numericPart = parts.reverse().find(p => /^\d+$/.test(p))
        if (numericPart) {
          console.log(`🔢 Student not found by email, trying extracted ID: ${numericPart}`)
          student = await Student.findByStudentId(numericPart)
        }
      }

if (studentId && student) {
        const paramId = parseInt(studentId)
        const studentMySQLId = parseInt(student.id)
        if (paramId === studentMySQLId) {
          console.log(`✅ Student ID parameter matches logged-in student: ${studentId}`)

        } else {
          console.warn(`⚠️ Student ID parameter (${studentId}) does not match logged-in student (${student.id}), using logged-in student's ID`)
          studentId = student.id
        }
      } else if (student) {

        studentId = student.id
      }

      if (!student) {
        console.error(`❌ Student profile not found for Firebase UID: ${firebaseUid}, email: ${email}`)
        return res.status(404).json({ error: 'Student profile not found. Please complete your profile first.' })
      }

      console.log(`📚 Student ${firebaseUid} requesting enrollments for MySQL ID: ${studentId}`)
    } else if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' })
    }

    const enrollments = await Enrollment.findByStudent(studentId)
    console.log(`📚 Found ${enrollments.length} enrollments for student MySQL ID: ${studentId}`)
    if (enrollments.length > 0) {
      console.log(`📚 Enrollment course IDs: ${enrollments.map(e => e.course_id).join(', ')}`)
    }
    res.json(enrollments)
  } catch (error) {
    console.error('Error getting enrollments by student:', error)
    next(error)
  }
}

const getEnrollmentsByCourse = async (req, res, next) => {
  try {
    const courseId = req.params.courseId || req.query.courseId
    if (!courseId) {
      return res.status(400).json({ error: 'Course ID is required' })
    }

if (isStudent(req.user.role)) {
      const student = await Student.findByFirebaseUid(req.user.uid)
      if (!student) {
        return res.status(403).json({ error: 'Student profile not found' })
      }
      const enrollment = await Enrollment.findByStudentAndCourse(student.id, courseId)
      return res.json(enrollment ? [enrollment] : [])
    }

const enrollments = await Enrollment.findByCourse(courseId)
    res.json(enrollments)
  } catch (error) {
    next(error)
  }
}

const createEnrollment = async (req, res, next) => {
  try {
    const enrollment = await Enrollment.create({
      student_id: req.body.studentId || req.body.student_id,
      course_id: req.body.courseId || req.body.course_id
    })

const { createEnrollmentNotification } = require('../../shared/utils/notificationHelper')
    try {
      await createEnrollmentNotification(
        enrollment.student_id,
        enrollment.course_id,
        enrollment.id
      )
    } catch (notifError) {
      console.error('Failed to create enrollment notification:', notifError)
    }

    res.status(201).json(enrollment)
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Student is already enrolled in this course' })
    }
    next(error)
  }
}

const deleteEnrollment = async (req, res, next) => {
  try {
    await Enrollment.delete(req.params.id)
    res.json({ message: 'Enrollment deleted successfully' })
  } catch (error) {
    next(error)
  }
}

const deleteEnrollmentByStudentAndCourse = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.body
    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'Student ID and Course ID are required' })
    }
    await Enrollment.deleteByStudentAndCourse(studentId, courseId)
    res.json({ message: 'Enrollment deleted successfully' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getEnrollmentsByStudent,
  getEnrollmentsByCourse,
  createEnrollment,
  deleteEnrollment,
  deleteEnrollmentByStudentAndCourse
}


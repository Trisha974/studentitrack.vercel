const Attendance = require('../models/Attendance')
const Student = require('../../student/models/Student')
const { isStudent } = require('../../shared/utils/roleHelpers')

const getAttendanceByStudent = async (req, res, next) => {
  try {
    let studentId = req.params.studentId || req.query.studentId
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' })
    }

if (isStudent(req.user.role)) {
      const firebaseUid = req.user.uid
      const email = req.user.email

      let student = await Student.findByFirebaseUid(firebaseUid)

if (!student && email) {
        student = await Student.findByEmail(email)
      }

if (!student && email) {
        const emailMatch = email.match(/\\.(\\d+)\\.tc@umindanao\\.edu\\.ph/)
        if (emailMatch && emailMatch[1]) {
          const extractedStudentId = emailMatch[1]
          student = await Student.findByStudentId(extractedStudentId)
        }
      }

      if (!student) {
        return res.status(404).json({ error: 'Student profile not found' })
      }

studentId = student.id
    }

    const attendance = await Attendance.findByStudent(studentId)
    res.json(attendance)
  } catch (error) {
    next(error)
  }
}

const getAttendanceByCourse = async (req, res, next) => {
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
      const attendance = await Attendance.findByStudentAndCourse(student.id, courseId)
      return res.json(attendance)
    }

const attendance = await Attendance.findByCourse(courseId)
    res.json(attendance)
  } catch (error) {
    next(error)
  }
}

const getAttendanceByStudentAndCourse = async (req, res, next) => {
  try {
    const { studentId, courseId } = req.query
    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'Student ID and Course ID are required' })
    }
    const attendance = await Attendance.findByStudentAndCourse(studentId, courseId)
    res.json(attendance)
  } catch (error) {
    next(error)
  }
}

const createAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.create({
      student_id: req.body.studentId || req.body.student_id,
      course_id: req.body.courseId || req.body.course_id,
      date: req.body.date,
      status: req.body.status || 'absent'
    })

const { createAttendanceNotification } = require('../../shared/utils/notificationHelper')
    try {
      await createAttendanceNotification(
        attendance.student_id,
        attendance.course_id,
        attendance.id,
        {
          date: attendance.date,
          status: attendance.status
        }
      )
    } catch (notifError) {
      console.error('Failed to create attendance notification:', notifError)
    }

    res.status(201).json(attendance)
  } catch (error) {
    next(error)
  }
}

const updateAttendance = async (req, res, next) => {
  try {
    const attendance = await Attendance.update(req.params.id, {
      status: req.body.status,
      date: req.body.date
    })
    if (!attendance) {
      return res.status(404).json({ error: 'Attendance record not found' })
    }

const { createAttendanceNotification } = require('../../shared/utils/notificationHelper')
    try {
      await createAttendanceNotification(
        attendance.student_id,
        attendance.course_id,
        attendance.id,
        {
          date: attendance.date,
          status: attendance.status
        }
      )
    } catch (notifError) {
      console.error('Failed to create attendance update notification:', notifError)
    }

    res.json(attendance)
  } catch (error) {
    next(error)
  }
}

const deleteAttendance = async (req, res, next) => {
  try {
    await Attendance.delete(req.params.id)
    res.json({ message: 'Attendance record deleted successfully' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAttendanceByStudent,
  getAttendanceByCourse,
  getAttendanceByStudentAndCourse,
  createAttendance,
  updateAttendance,
  deleteAttendance
}


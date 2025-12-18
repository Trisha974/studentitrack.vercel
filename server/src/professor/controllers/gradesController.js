const Grade = require('../models/Grade')
const Student = require('../../student/models/Student')
const Course = require('../models/Course')
const { isStudent } = require('../../shared/utils/roleHelpers')

const getGradesByStudent = async (req, res, next) => {
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

    const grades = await Grade.findByStudent(studentId)
    res.json(grades)
  } catch (error) {
    next(error)
  }
}

const getGradesByCourse = async (req, res, next) => {
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
      const grades = await Grade.findByStudentAndCourse(student.id, courseId)
      return res.json(grades)
    }

const grades = await Grade.findByCourse(courseId)
    res.json(grades)
  } catch (error) {
    next(error)
  }
}

const getGradesByStudentAndCourse = async (req, res, next) => {
  try {
    let { studentId, courseId } = req.query
    if (!studentId || !courseId) {
      return res.status(400).json({ error: 'Student ID and Course ID are required' })
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

    const grades = await Grade.findByStudentAndCourse(studentId, courseId)
    res.json(grades)
  } catch (error) {
    next(error)
  }
}

const createGrade = async (req, res, next) => {
  try {
    const grade = await Grade.create({
      student_id: req.body.studentId || req.body.student_id,
      course_id: req.body.courseId || req.body.course_id,
      assessment_type: req.body.assessmentType || req.body.assessment_type,
      assessment_title: req.body.assessmentTitle || req.body.assessment_title,
      score: req.body.score,
      max_points: req.body.maxPoints || req.body.max_points,
      date: req.body.date || null
    })

const { createGradeNotification } = require('../../shared/utils/notificationHelper')
    try {
      await createGradeNotification(
        grade.student_id,
        grade.course_id,
        grade.id,
        {
          assessment_type: grade.assessment_type,
          assessment_title: grade.assessment_title,
          score: grade.score,
          max_points: grade.max_points
        }
      )
    } catch (notifError) {

      console.error('Failed to create grade notification:', notifError)
    }

    res.status(201).json(grade)
  } catch (error) {
    next(error)
  }
}

const updateGrade = async (req, res, next) => {
  try {
    const grade = await Grade.update(req.params.id, {
      assessment_type: req.body.assessmentType || req.body.assessment_type,
      assessment_title: req.body.assessmentTitle || req.body.assessment_title,
      score: req.body.score,
      max_points: req.body.maxPoints || req.body.max_points,
      date: req.body.date
    })
    if (!grade) {
      return res.status(404).json({ error: 'Grade not found' })
    }

const { createGradeNotification } = require('../../shared/utils/notificationHelper')
    try {
      await createGradeNotification(
        grade.student_id,
        grade.course_id,
        grade.id,
        {
          assessment_type: grade.assessment_type,
          assessment_title: grade.assessment_title,
          score: grade.score,
          max_points: grade.max_points
        }
      )
    } catch (notifError) {
      console.error('Failed to create grade update notification:', notifError)
    }

    res.json(grade)
  } catch (error) {
    next(error)
  }
}

const deleteGrade = async (req, res, next) => {
  try {
    await Grade.delete(req.params.id)
    res.json({ message: 'Grade deleted successfully' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getGradesByStudent,
  getGradesByCourse,
  getGradesByStudentAndCourse,
  createGrade,
  updateGrade,
  deleteGrade
}


const Enrollment = require('../professor/models/Enrollment')
const Student = require('../student/models/Student')
const { isStudent } = require('../shared/utils/roleHelpers')

const getEnrollmentsByStudent = async (studentId, user) => {
  let resolvedStudentId = studentId

  if (isStudent(user?.role)) {
    const userId = user.user_id
    const email = user.email

    let student = userId ? await Student.findById(userId) : null

    if (!student && email) {
      student = await Student.findByEmail(email)
    }

    if (!student && email) {
      const prefix = email.split('@')[0]
      const parts = prefix.split('.')
      const numericPart = parts.reverse().find(p => /^\d+$/.test(p))
      if (numericPart) {
        student = await Student.findByStudentId(numericPart)
      }
    }

    if (studentId && student) {
      const paramId = parseInt(studentId)
      const studentMySQLId = parseInt(student.id)
      if (paramId !== studentMySQLId) {
        resolvedStudentId = student.id
      }
    } else if (student) {
      resolvedStudentId = student.id
    }

    if (!student) {
      throw new Error('Student profile not found. Please complete your profile first.')
    }
  } else if (!studentId) {
    throw new Error('Student ID is required')
  }

  return await Enrollment.findByStudent(resolvedStudentId)
}

const getEnrollmentsByCourse = async (courseId, user) => {
  if (isStudent(user?.role)) {
    const student = user.user_id ? await Student.findById(user.user_id) : null
    if (!student) {
      throw new Error('Student profile not found')
    }
    const enrollment = await Enrollment.findByStudentAndCourse(student.id, courseId)
    return enrollment ? [enrollment] : []
  }

  return await Enrollment.findByCourse(courseId)
}

const createEnrollment = async (data) => {
  return await Enrollment.create({
    student_id: data.studentId || data.student_id,
    course_id: data.courseId || data.course_id
  })
}

const deleteEnrollment = async (id) => {
  return await Enrollment.delete(id)
}

const deleteEnrollmentByStudentAndCourse = async (studentId, courseId) => {
  return await Enrollment.deleteByStudentAndCourse(studentId, courseId)
}

module.exports = {
  getEnrollmentsByStudent,
  getEnrollmentsByCourse,
  createEnrollment,
  deleteEnrollment,
  deleteEnrollmentByStudentAndCourse
}


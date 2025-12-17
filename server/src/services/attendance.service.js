const Attendance = require('../professor/models/Attendance')
const Student = require('../student/models/Student')
const { isStudent } = require('../shared/utils/roleHelpers')

const getAttendanceByStudent = async (studentId, user) => {
  let resolvedStudentId = studentId

  if (isStudent(user?.role)) {
    const userId = user.user_id
    const email = user.email

    let student = userId ? await Student.findById(userId) : null
    if (!student && email) {
      student = await Student.findByEmail(email)
    }
    if (!student && email) {
      const emailMatch = email.match(/\.(\d+)\.tc@umindanao\.edu\.ph/)
      if (emailMatch && emailMatch[1]) {
        student = await Student.findByStudentId(emailMatch[1])
      }
    }

    if (!student) {
      throw new Error('Student profile not found')
    }
    resolvedStudentId = student.id
  }

  if (!resolvedStudentId) {
    throw new Error('Student ID is required')
  }

  return await Attendance.findByStudent(resolvedStudentId)
}

const getAttendanceByCourse = async (courseId, user) => {
  if (isStudent(user?.role)) {
    const student = user.user_id ? await Student.findById(user.user_id) : null
    if (!student) {
      throw new Error('Student profile not found')
    }
    return await Attendance.findByStudentAndCourse(student.id, courseId)
  }

  return await Attendance.findByCourse(courseId)
}

const getAttendanceByStudentAndCourse = async (studentId, courseId) => {
  if (!studentId || !courseId) {
    throw new Error('Student ID and Course ID are required')
  }
  return await Attendance.findByStudentAndCourse(studentId, courseId)
}

const createAttendance = async (data) => {
  return await Attendance.create({
    student_id: data.studentId || data.student_id,
    course_id: data.courseId || data.course_id,
    date: data.date,
    status: data.status || 'absent'
  })
}

const updateAttendance = async (id, data) => {
  return await Attendance.update(id, {
    status: data.status,
    date: data.date
  })
}

const deleteAttendance = async (id) => {
  return await Attendance.delete(id)
}

module.exports = {
  getAttendanceByStudent,
  getAttendanceByCourse,
  getAttendanceByStudentAndCourse,
  createAttendance,
  updateAttendance,
  deleteAttendance
}


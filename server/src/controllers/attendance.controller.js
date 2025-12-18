const attendanceService = require('../services/attendance.service')
const { createAttendanceNotification } = require('../shared/utils/notificationHelper')

const getAttendanceByStudent = async (request, reply) => {
  try {
    const studentId = request.params.studentId || request.query.studentId
    const attendance = await attendanceService.getAttendanceByStudent(studentId, request.user)
    return attendance
  } catch (error) {
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: error.message })
    }
    if (error.message.includes('required')) {
      return reply.code(400).send({ error: error.message })
    }
    throw error
  }
}

const getAttendanceByCourse = async (request, reply) => {
  try {
    const courseId = request.params.courseId || request.query.courseId
    if (!courseId) {
      return reply.code(400).send({ error: 'Course ID is required' })
    }
    const attendance = await attendanceService.getAttendanceByCourse(courseId, request.user)
    return attendance
  } catch (error) {
    if (error.message.includes('not found')) {
      return reply.code(403).send({ error: error.message })
    }
    throw error
  }
}

const getAttendanceByStudentAndCourse = async (request, reply) => {
  try {
    const { studentId, courseId } = request.query
    const attendance = await attendanceService.getAttendanceByStudentAndCourse(studentId, courseId)
    return attendance
  } catch (error) {
    if (error.message.includes('required')) {
      return reply.code(400).send({ error: error.message })
    }
    throw error
  }
}

const createAttendance = async (request, reply) => {
  try {
    const attendance = await attendanceService.createAttendance({
      studentId: request.body.studentId || request.body.student_id,
      courseId: request.body.courseId || request.body.course_id,
      date: request.body.date,
      status: request.body.status || 'absent'
    })

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

    return reply.code(201).send(attendance)
  } catch (error) {
    throw error
  }
}

const updateAttendance = async (request, reply) => {
  try {
    const attendance = await attendanceService.updateAttendance(request.params.id, {
      status: request.body.status,
      date: request.body.date
    })

    if (!attendance) {
      return reply.code(404).send({ error: 'Attendance record not found' })
    }

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

    return attendance
  } catch (error) {
    throw error
  }
}

const deleteAttendance = async (request, reply) => {
  try {
    await attendanceService.deleteAttendance(request.params.id)
    return { message: 'Attendance record deleted successfully' }
  } catch (error) {
    throw error
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


const enrollmentsService = require('../services/enrollments.service')
const { createEnrollmentNotification } = require('../shared/utils/notificationHelper')

const getEnrollmentsByStudent = async (request, reply) => {
  try {
    const studentId = request.params.studentId || request.query.studentId
    const enrollments = await enrollmentsService.getEnrollmentsByStudent(studentId, request.user)
    return enrollments
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

const getEnrollmentsByCourse = async (request, reply) => {
  try {
    const courseId = request.params.courseId || request.query.courseId
    if (!courseId) {
      return reply.code(400).send({ error: 'Course ID is required' })
    }
    const enrollments = await enrollmentsService.getEnrollmentsByCourse(courseId, request.user)
    return enrollments
  } catch (error) {
    if (error.message.includes('not found')) {
      return reply.code(403).send({ error: error.message })
    }
    throw error
  }
}

const createEnrollment = async (request, reply) => {
  try {
    // Convert string IDs to integers if needed
    const studentId = parseInt(request.body.studentId || request.body.student_id, 10)
    const courseId = parseInt(request.body.courseId || request.body.course_id, 10)
    
    if (isNaN(studentId) || isNaN(courseId)) {
      return reply.code(400).send({ error: 'Valid studentId and courseId are required' })
    }
    
    const enrollment = await enrollmentsService.createEnrollment({
      studentId,
      courseId
    })

    // Create notification
    try {
      await createEnrollmentNotification(
        enrollment.student_id,
        enrollment.course_id,
        enrollment.id
      )
    } catch (notifError) {
      console.error('Failed to create enrollment notification:', notifError)
    }

    return reply.code(201).send(enrollment)
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return reply.code(409).send({ error: 'Student is already enrolled in this course' })
    }
    throw error
  }
}

const deleteEnrollment = async (request, reply) => {
  try {
    await enrollmentsService.deleteEnrollment(request.params.id)
    return { message: 'Enrollment deleted successfully' }
  } catch (error) {
    throw error
  }
}

const deleteEnrollmentByStudentAndCourse = async (request, reply) => {
  try {
    const { studentId, courseId } = request.body
    if (!studentId || !courseId) {
      return reply.code(400).send({ error: 'Student ID and Course ID are required' })
    }
    await enrollmentsService.deleteEnrollmentByStudentAndCourse(studentId, courseId)
    return { message: 'Enrollment deleted successfully' }
  } catch (error) {
    throw error
  }
}

module.exports = {
  getEnrollmentsByStudent,
  getEnrollmentsByCourse,
  createEnrollment,
  deleteEnrollment,
  deleteEnrollmentByStudentAndCourse
}


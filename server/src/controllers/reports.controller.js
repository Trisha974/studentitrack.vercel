const reportsService = require('../services/reports.service')

const getStudentReport = async (request, reply) => {
  try {
    const studentId = request.params.studentId || request.query.studentId
    if (!studentId) {
      return reply.code(400).send({ error: 'Student ID is required' })
    }
    const report = await reportsService.getStudentReport(studentId)
    return report
  } catch (error) {
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: error.message })
    }
    throw error
  }
}

const getCourseReport = async (request, reply) => {
  try {
    const courseId = request.params.courseId || request.query.courseId
    if (!courseId) {
      return reply.code(400).send({ error: 'Course ID is required' })
    }
    const report = await reportsService.getCourseReport(courseId)
    return report
  } catch (error) {
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: error.message })
    }
    throw error
  }
}

module.exports = {
  getStudentReport,
  getCourseReport
}


const atRiskService = require('../services/atRisk.service')

const checkCourseAtRisk = async (request, reply) => {
  try {
    const courseId = request.params.courseId || request.query.courseId
    
    if (!courseId) {
      return reply.code(400).send({ error: 'Course ID is required' })
    }
    
    const result = await atRiskService.checkAndNotifyAtRiskStudents(courseId)
    
    return reply.send({
      success: true,
      courseId: parseInt(courseId),
      checked: result.checked,
      notified: result.notified
    })
  } catch (error) {
    console.error('❌ Error in checkCourseAtRisk controller:', error)
    return reply.code(500).send({ 
      error: 'Internal server error',
      message: error.message
    })
  }
}

module.exports = {
  checkCourseAtRisk
}


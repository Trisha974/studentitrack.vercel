const dashboardService = require('../services/dashboard.service')

const getDashboardState = async (request, reply) => {
  try {
    const professorId = request.user.user_id // From JWT token
    
    console.log('getDashboardState called with professorId:', professorId)
    
    if (!professorId) {
      console.error('Professor ID not found in token')
      return reply.code(400).send({ error: 'Professor ID not found in token' })
    }

    const dashboardState = await dashboardService.getDashboardState(professorId)
    
    if (!dashboardState) {
      // Return empty state for new professors
      console.log('No dashboard state found, returning empty state')
      return reply.send({
        subjects: [],
        removedSubjects: [],
        recycleBinSubjects: [],
        students: [],
        records: {},
        grades: {},
        alerts: []
      })
    }

    console.log('Dashboard state loaded successfully')
    return reply.send(dashboardState)
  } catch (error) {
    console.error('Error in getDashboardState controller:', error)
    console.error('Error stack:', error.stack)
    return reply.code(500).send({ 
      error: 'Internal server error', 
      message: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

const saveDashboardState = async (request, reply) => {
  try {
    const professorId = request.user.user_id // From JWT token
    
    if (!professorId) {
      return reply.code(400).send({ error: 'Professor ID not found in token' })
    }

    const { subjects, removedSubjects, recycleBinSubjects, students, records, grades, alerts } = request.body

    const dashboardState = await dashboardService.saveDashboardState(professorId, {
      subjects: subjects || [],
      removedSubjects: removedSubjects || [],
      recycleBinSubjects: recycleBinSubjects || [],
      students: students || [],
      records: records || {},
      grades: grades || {},
      alerts: alerts || []
    })

    return reply.send(dashboardState)
  } catch (error) {
    console.error('Error in saveDashboardState controller:', error)
    throw error
  }
}

module.exports = {
  getDashboardState,
  saveDashboardState
}


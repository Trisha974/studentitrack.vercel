const DashboardState = require('../professor/models/DashboardState')

const getDashboardState = async (professorId) => {
  const state = await DashboardState.findByProfessorId(professorId)
  if (!state) {
    return null
  }
  return DashboardState.parseDashboardState(state)
}

const saveDashboardState = async (professorId, data) => {
  const state = await DashboardState.createOrUpdate(professorId, data)
  return DashboardState.parseDashboardState(state)
}

module.exports = {
  getDashboardState,
  saveDashboardState
}


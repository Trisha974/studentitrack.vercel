import apiClient from './apiClient'

export async function getDashboardState() {
  return apiClient.get('/dashboard/state')
}

export async function saveDashboardState(data) {
  return apiClient.put('/dashboard/state', {
    subjects: data.subjects || [],
    removedSubjects: data.removedSubjects || [],
    recycleBinSubjects: data.recycleBinSubjects || [],
    students: data.students || [],
    records: data.records || {},
    grades: data.grades || {},
    alerts: data.alerts || []
  })
}


import * as dashboardApi from './api/dashboardApi'

export async function getDashboardState() {
  return dashboardApi.getDashboardState()
}

export async function saveDashboardState(data) {
  return dashboardApi.saveDashboardState(data)
}


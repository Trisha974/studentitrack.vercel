import apiClient from './apiClient'

export async function getCourseById(id) {
  try {
    const course = await apiClient.get(`/courses/${id}`)
    return course
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null
    }
    throw error
  }
}

export async function getCourseByCode(code, professorId = null) {
  try {
    const encodedCode = encodeURIComponent(code)
    let url = `/courses/code/${encodedCode}`
    
    if (professorId) {
      url += `?professorId=${professorId}`
    }
    
    const course = await apiClient.get(url)
    return course
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null
    }
    throw error
  }
}

export async function getCoursesByProfessor(professorId) {
  return apiClient.get(`/courses/professor/${professorId}`)
}

export async function createCourse(data) {
  return apiClient.post('/courses', {
    code: data.code,
    name: data.name,
    credits: data.credits || 0,
    professorId: data.professorId || data.professor_id,
    term: data.term || 'first'
  })
}

export async function updateCourse(id, data) {
  const updateData = {}
  if (data.code !== undefined) updateData.code = data.code
  if (data.name !== undefined) updateData.name = data.name
  if (data.credits !== undefined) updateData.credits = data.credits
  if (data.professorId !== undefined || data.professor_id !== undefined) {
    updateData.professorId = data.professorId || data.professor_id
  }
  if (data.term !== undefined) updateData.term = data.term
  
  return apiClient.put(`/courses/${id}`, updateData)
}

export async function deleteCourse(id) {
  return apiClient.delete(`/courses/${id}`)
}


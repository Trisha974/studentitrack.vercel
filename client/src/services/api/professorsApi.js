
import apiClient from './apiClient'

export async function getCurrentProfessor() {
  try {
    const professor = await apiClient.get('/professors/me')
    return professor
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null
    }
    throw error
  }
}

export async function getProfessorById(id) {
  try {
    const professor = await apiClient.get(`/professors/${id}`)
    return professor
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null
    }
    throw error
  }
}

export async function getProfessorByEmail(email) {
  try {
    const professor = await apiClient.get(`/professors/email/${encodeURIComponent(email)}`)
    return professor
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null
    }
    throw error
  }
}

export async function createProfessor(data) {
  return apiClient.post('/professors', {
    name: data.name,
    email: data.email,
    department: data.department,
    photoUrl: data.photoUrl || data.photo_url || data.photoURL || null
  })
}

export async function updateProfessor(id, data) {
  return apiClient.put(`/professors/${id}`, {
    name: data.name,
    email: data.email,
    department: data.department,
    photoUrl: data.photoUrl || data.photo_url || data.photoURL || null
  })
}

export async function listProfessors(filters = {}) {
  const queryParams = new URLSearchParams()
  if (filters.department) queryParams.append('department', filters.department)

  const endpoint = queryParams.toString()
    ? `/professors?${queryParams.toString()}`
    : '/professors'

  return apiClient.get(endpoint)
}

export async function setProfessor(profile) {
  if (!profile.name || !profile.name.trim()) {
    throw new Error('Name is required')
  }
  if (!profile.email || !profile.email.trim()) {
    throw new Error('Email is required')
  }

  let professor = await getCurrentProfessor().catch(() => null)

  if (professor && professor.id && !isNaN(professor.id)) {
    const updateData = {
      name: profile.name?.trim(),
      email: profile.email?.trim(),
      department: profile.department?.trim() || null,
      photoUrl: profile.photoUrl || profile.photo_url || profile.photoURL || null
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined || (key !== 'department' && key !== 'photoUrl' && updateData[key] === '')) {
        delete updateData[key]
      }
    })

    if (!updateData.name || !updateData.email) {
      throw new Error('Name and email are required for profile update')
    }

    return updateProfessor(professor.id, updateData)
  } else {
    const createData = {
      name: profile.name?.trim(),
      email: profile.email?.trim(),
      department: profile.department?.trim() || null,
      photoUrl: profile.photoUrl || profile.photo_url || profile.photoURL || null
    }

    if (!createData.name || !createData.email) {
      throw new Error('Name and email are required to create professor profile')
    }

    return createProfessor(createData)
  }
}



import apiClient from './apiClient'

export async function getCurrentStudent() {
  try {
    const student = await apiClient.get('/students/me')
    return student
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null
    }
    throw error
  }
}

export async function getStudentById(id) {
  try {
    const student = await apiClient.get(`/students/${id}`)
    return student
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null
    }
    throw error
  }
}

export async function getStudentByEmail(email) {
  try {
    const student = await apiClient.get(`/students/email/${encodeURIComponent(email)}`)
    return student
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null
    }
    throw error
  }
}

export async function getStudentByNumericalId(studentId) {
  try {
    const student = await apiClient.get(`/students/student-id/${studentId}`)
    return student
  } catch (error) {
    if (error.message.includes('404') || error.message.includes('not found')) {
      return null
    }
    throw error
  }
}

export async function createStudent(data) {
  return apiClient.post('/students', {
    name: data.name,
    email: data.email,
    studentId: data.studentId || data.student_id,
    department: data.department,
    photoUrl: data.photoUrl || data.photo_url
  })
}

export async function updateStudent(id, data) {
  return apiClient.put(`/students/${id}`, {
    name: data.name,
    email: data.email,
    studentId: data.studentId || data.student_id,
    department: data.department,
    photoUrl: data.photoUrl || data.photo_url
  })
}

export async function listStudents(filters = {}) {
  const queryParams = new URLSearchParams()
  if (filters.department) queryParams.append('department', filters.department)

  const endpoint = queryParams.toString()
    ? `/students?${queryParams.toString()}`
    : '/students'

  return apiClient.get(endpoint)
}

export async function setStudent(profile) {
  let student = await getCurrentStudent().catch(() => null)

  if (student && student.id) {
    if (!student.id || isNaN(student.id)) {
      throw new Error('Invalid student ID. Please refresh the page and try again.')
    }

    const updateData = {
      name: profile.name,
      email: profile.email,
      studentId: profile.studentId || profile.student_id,
      department: profile.department,
      photoUrl: profile.photoURL || profile.photoUrl || profile.photo_url
    }

    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key]
      }
    })

    return updateStudent(student.id, updateData)
  } else {
    return createStudent({
      name: profile.name,
      email: profile.email,
      studentId: profile.studentId || profile.student_id,
      department: profile.department,
      photoUrl: profile.photoURL || profile.photoUrl || profile.photo_url
    })
  }
}


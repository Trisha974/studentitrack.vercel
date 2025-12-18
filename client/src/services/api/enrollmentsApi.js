
import apiClient from './apiClient'

export async function createEnrollment(studentId, courseId, metadata = {}) {
  return apiClient.post('/enrollments', {
    studentId,
    courseId
  })
}

export async function getEnrollmentByStudentAndCourse(studentId, courseId) {
  try {
    const enrollments = await apiClient.get(`/enrollments/student/${studentId}`)
    return enrollments.find(e => e.course_id === courseId) || null
  } catch (error) {
    throw error
  }
}

export async function getEnrollmentsByStudent(studentId) {

  if (studentId) {
    return apiClient.get(`/enrollments/student/${studentId}`)
  } else {
    return apiClient.get(`/enrollments/student`)
  }
}

export async function getEnrollmentsByCourse(courseId) {
  return apiClient.get(`/enrollments/course/${courseId}`)
}

export async function deleteEnrollment(enrollmentId) {
  return apiClient.delete(`/enrollments/${enrollmentId}`)
}

export async function deleteEnrollmentByStudentAndCourse(studentId, courseId) {

  const enrollment = await getEnrollmentByStudentAndCourse(studentId, courseId)
  if (!enrollment) return false

return apiClient.delete(`/enrollments/${enrollment.id}`)
}

export function subscribeToCourseEnrollments(courseId, callback) {

  let intervalId = null

  const poll = async () => {
    try {
      const enrollments = await getEnrollmentsByCourse(courseId)
      callback(enrollments)
    } catch (error) {
      console.error('Error polling enrollments:', error)
      callback([])
    }
  }

  poll()
  intervalId = setInterval(poll, 5000)

  return () => {
    if (intervalId) clearInterval(intervalId)
  }
}

export function subscribeToStudentEnrollments(studentId, callback) {

  let intervalId = null

  const poll = async () => {
    try {
      const enrollments = await getEnrollmentsByStudent(studentId)
      callback(enrollments)
    } catch (error) {
      console.error('Error polling enrollments:', error)
      callback([])
    }
  }

  poll()
  intervalId = setInterval(poll, 5000)

  return () => {
    if (intervalId) clearInterval(intervalId)
  }
}


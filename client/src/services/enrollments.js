

import * as enrollmentsApi from './api/enrollmentsApi'

async function createEnrollment(studentId, courseId, metadata = {}) {
  if (!studentId || !courseId) throw new Error('studentId and courseId are required')

const existing = await getEnrollmentByStudentAndCourse(studentId, courseId)
  if (existing) return existing.id.toString()

  const enrollment = await enrollmentsApi.createEnrollment(studentId, courseId, metadata)
  return enrollment.id.toString()
}

async function getEnrollmentByStudentAndCourse(studentId, courseId) {
  if (!studentId || !courseId) return null
  return await enrollmentsApi.getEnrollmentByStudentAndCourse(studentId, courseId)
}

async function getEnrollmentsByStudent(studentId) {
  if (!studentId) return []
  return await enrollmentsApi.getEnrollmentsByStudent(studentId)
}

async function getEnrollmentsByCourse(courseId) {
  if (!courseId) return []
  return await enrollmentsApi.getEnrollmentsByCourse(courseId)
}

async function deleteEnrollment(enrollmentId) {
  if (!enrollmentId) return false
  await enrollmentsApi.deleteEnrollment(enrollmentId)
  return true
}

async function deleteEnrollmentByStudentAndCourse(studentId, courseId) {
  await enrollmentsApi.deleteEnrollmentByStudentAndCourse(studentId, courseId)
  return true
}

function subscribeToCourseEnrollments(courseId, callback) {
  return enrollmentsApi.subscribeToCourseEnrollments(courseId, callback)
}

function subscribeToStudentEnrollments(studentId, callback) {
  return enrollmentsApi.subscribeToStudentEnrollments(studentId, callback)
}

export {
  createEnrollment,
  getEnrollmentByStudentAndCourse,
  getEnrollmentsByStudent,
  getEnrollmentsByCourse,
  deleteEnrollment,
  deleteEnrollmentByStudentAndCourse,
  subscribeToCourseEnrollments,
  subscribeToStudentEnrollments,
}




import * as gradesApi from './api/gradesApi'

async function createGrade(gradeData) {
  const grade = await gradesApi.createGrade(gradeData)
  return grade.id.toString()
}

async function updateGrade(gradeId, updates) {
  if (!gradeId) return null
  return await gradesApi.updateGrade(gradeId, updates)
}

async function getGradesByStudent(studentId) {
  if (!studentId) return []
  return await gradesApi.getGradesByStudent(studentId)
}

async function getGradesByCourse(courseId) {
  if (!courseId) return []
  return await gradesApi.getGradesByCourse(courseId)
}

async function getGradesByStudentAndCourse(studentId, courseId) {
  if (!studentId || !courseId) return []
  return await gradesApi.getGradesByStudentAndCourse(studentId, courseId)
}

function subscribeToStudentGrades(studentId, callback) {
  return gradesApi.subscribeToStudentGrades(studentId, callback)
}

async function deleteGrade(gradeId) {
  if (!gradeId) return false
  await gradesApi.deleteGrade(gradeId)
  return true
}

export {
  createGrade,
  updateGrade,
  getGradesByStudent,
  getGradesByCourse,
  getGradesByStudentAndCourse,
  subscribeToStudentGrades,
  deleteGrade,
}




import * as attendanceApi from './api/attendanceApi'

async function createAttendance(attendanceData) {
  const attendance = await attendanceApi.createAttendance(attendanceData)
  return attendance.id.toString()
}

async function updateAttendance(attendanceId, updates) {
  if (!attendanceId) return null
  return await attendanceApi.updateAttendance(attendanceId, updates)
}

async function setAttendanceForDate(studentId, courseId, date, status) {
  if (!studentId || !courseId || !date || !status) {
    throw new Error('studentId, courseId, date, and status are required')
  }
  const attendance = await attendanceApi.setAttendanceForDate(studentId, courseId, date, status)
  return attendance.id.toString()
}

async function getAttendanceByStudentCourseAndDate(studentId, courseId, date) {
  if (!studentId || !courseId || !date) return null
  return await attendanceApi.getAttendanceByStudentCourseAndDate(studentId, courseId, date)
}

async function getAttendanceByStudent(studentId) {
  if (!studentId) return []
  return await attendanceApi.getAttendanceByStudent(studentId)
}

async function getAttendanceByCourse(courseId) {
  if (!courseId) return []
  return await attendanceApi.getAttendanceByCourse(courseId)
}

async function getAttendanceByStudentAndCourse(studentId, courseId) {
  if (!studentId || !courseId) return []
  return await attendanceApi.getAttendanceByStudentAndCourse(studentId, courseId)
}

function subscribeToStudentAttendance(studentId, callback) {
  return attendanceApi.subscribeToStudentAttendance(studentId, callback)
}

async function deleteAttendance(attendanceId) {
  if (!attendanceId) return false
  await attendanceApi.deleteAttendance(attendanceId)
  return true
}

export {
  createAttendance,
  updateAttendance,
  setAttendanceForDate,
  getAttendanceByStudentCourseAndDate,
  getAttendanceByStudent,
  getAttendanceByCourse,
  getAttendanceByStudentAndCourse,
  subscribeToStudentAttendance,
  deleteAttendance,
}


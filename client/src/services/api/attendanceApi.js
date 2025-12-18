
import apiClient from './apiClient'

export async function createAttendance(attendanceData) {
  return apiClient.post('/attendance', {
    studentId: attendanceData.studentId || attendanceData.student_id,
    courseId: attendanceData.courseId || attendanceData.course_id,
    date: attendanceData.date,
    status: attendanceData.status || 'absent'
  })
}

export async function updateAttendance(attendanceId, updates) {
  return apiClient.put(`/attendance/${attendanceId}`, {
    status: updates.status,
    date: updates.date
  })
}

export async function setAttendanceForDate(studentId, courseId, date, status) {

  try {
    const existing = await getAttendanceByStudentCourseAndDate(studentId, courseId, date)
    if (existing) {
      return updateAttendance(existing.id, { status })
    }
  } catch (error) {

  }

  return createAttendance({ studentId, courseId, date, status })
}

export async function getAttendanceByStudentCourseAndDate(studentId, courseId, date) {
  try {
    const attendance = await apiClient.get(
      `/attendance?studentId=${studentId}&courseId=${courseId}`
    )
    return attendance.find(a => a.date === date) || null
  } catch (error) {
    return null
  }
}

export async function getAttendanceByStudent(studentId) {
  return apiClient.get(`/attendance/student/${studentId}`)
}

export async function getAttendanceByCourse(courseId) {
  return apiClient.get(`/attendance/course/${courseId}`)
}

export async function getAttendanceByStudentAndCourse(studentId, courseId) {
  return apiClient.get(`/attendance?studentId=${studentId}&courseId=${courseId}`)
}

export async function deleteAttendance(attendanceId) {
  return apiClient.delete(`/attendance/${attendanceId}`)
}

export function subscribeToStudentAttendance(studentId, callback) {
  let intervalId = null

  const poll = async () => {
    try {
      const attendance = await getAttendanceByStudent(studentId)
      callback(attendance)
    } catch (error) {
      console.error('Error polling attendance:', error)
      callback([])
    }
  }

  poll()
  intervalId = setInterval(poll, 5000)

  return () => {
    if (intervalId) clearInterval(intervalId)
  }
}


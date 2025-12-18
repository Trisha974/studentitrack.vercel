
import apiClient from './apiClient'

export async function createGrade(gradeData) {
  return apiClient.post('/grades', {
    studentId: gradeData.studentId || gradeData.student_id,
    courseId: gradeData.courseId || gradeData.course_id,
    assessmentType: gradeData.assessmentType || gradeData.assessment_type,
    assessmentTitle: gradeData.assessmentTitle || gradeData.assessment_title,
    score: gradeData.score,
    maxPoints: gradeData.maxPoints || gradeData.max_points,
    date: gradeData.date || null
  })
}

export async function updateGrade(gradeId, updates) {
  return apiClient.put(`/grades/${gradeId}`, {
    assessmentType: updates.assessmentType || updates.assessment_type,
    assessmentTitle: updates.assessmentTitle || updates.assessment_title,
    score: updates.score,
    maxPoints: updates.maxPoints || updates.max_points,
    date: updates.date
  })
}

export async function getGradesByStudent(studentId) {
  return apiClient.get(`/grades/student/${studentId}`)
}

export async function getGradesByCourse(courseId) {
  return apiClient.get(`/grades/course/${courseId}`)
}

export async function getGradesByStudentAndCourse(studentId, courseId) {
  return apiClient.get(`/grades?studentId=${studentId}&courseId=${courseId}`)
}

export async function deleteGrade(gradeId) {
  return apiClient.delete(`/grades/${gradeId}`)
}

export function subscribeToStudentGrades(studentId, callback) {
  let intervalId = null

  const poll = async () => {
    try {
      console.log(`🔍 Polling grades for student ID: ${studentId} (type: ${typeof studentId})`)
      const grades = await getGradesByStudent(studentId)
      console.log(`✅ Polled ${grades.length} grades for student ${studentId}`)
      callback(grades)
    } catch (error) {
      console.error(`❌ Error polling grades for student ${studentId}:`, error)
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      })
      callback([])
    }
  }

  poll()
  intervalId = setInterval(poll, 5000)

  return () => {
    if (intervalId) clearInterval(intervalId)
  }
}


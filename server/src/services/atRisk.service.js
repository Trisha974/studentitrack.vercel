const Grade = require('../professor/models/Grade')
const Student = require('../student/models/Student')
const Course = require('../professor/models/Course')
const Attendance = require('../professor/models/Attendance')
const { createAtRiskNotification, createNotTakingAssessmentsNotification } = require('../shared/utils/notificationHelper')

/**
 * Check if a student is at risk for a course based on grades and attendance
 */
async function checkStudentAtRisk(studentId, courseId) {
  try {
    // Get all grades for this student in this course
    const grades = await Grade.findByStudentAndCourse(studentId, courseId)
    
    // Calculate average grade
    let totalScore = 0
    let totalMax = 0
    let hasGrades = false
    
    grades.forEach(grade => {
      if (grade.score !== null && grade.max_points !== null) {
        totalScore += parseFloat(grade.score)
        totalMax += parseFloat(grade.max_points)
        hasGrades = true
      }
    })
    
    const averageGrade = hasGrades && totalMax > 0 ? (totalScore / totalMax) * 100 : null
    const gradeAtRisk = averageGrade !== null && averageGrade < 75
    
    // Get attendance records
    const attendanceRecords = await Attendance.findByStudentAndCourse(studentId, courseId)
    
    let present = 0
    let total = 0
    
    attendanceRecords.forEach(record => {
      if (record.status) {
        total++
        if (record.status === 'present') {
          present++
        }
      }
    })
    
    const attendanceRate = total > 0 ? (present / total) * 100 : null
    const attendanceAtRisk = attendanceRate !== null && attendanceRate < 75
    
    // Determine reason
    let reason = null
    if (gradeAtRisk && attendanceAtRisk) {
      reason = 'both'
    } else if (gradeAtRisk) {
      reason = 'grades'
    } else if (attendanceAtRisk) {
      reason = 'attendance'
    }
    
    return {
      isAtRisk: gradeAtRisk || attendanceAtRisk,
      reason,
      averageGrade,
      attendanceRate,
      hasGrades,
      hasAttendance: total > 0
    }
  } catch (error) {
    console.error('❌ Error checking student at risk:', error)
    return {
      isAtRisk: false,
      reason: null,
      averageGrade: null,
      attendanceRate: null,
      hasGrades: false,
      hasAttendance: false
    }
  }
}

/**
 * Check if a student is not taking assessments
 */
async function checkStudentNotTakingAssessments(studentId, courseId) {
  try {
    // Get all grades for this student in this course
    const grades = await Grade.findByStudentAndCourse(studentId, courseId)
    
    // Check if there are any assessments for this course (check other students' grades)
    const courseGrades = await Grade.findByCourse(courseId)
    const hasAssessments = courseGrades.length > 0
    
    // Check if student has completed any assessments
    const studentCompleted = grades.filter(g => g.score !== null && g.max_points !== null).length > 0
    
    // Student is not taking assessments if:
    // 1. There are assessments in the course (other students have grades)
    // 2. But this student hasn't completed any
    return hasAssessments && !studentCompleted
  } catch (error) {
    console.error('❌ Error checking student not taking assessments:', error)
    return false
  }
}

/**
 * Check and notify at-risk students for a specific course
 */
async function checkAndNotifyAtRiskStudents(courseId) {
  try {
    const course = await Course.findById(courseId)
    if (!course) {
      console.error('❌ Course not found:', courseId)
      return { checked: 0, notified: 0 }
    }
    
    // Get all enrollments for this course
    const Enrollment = require('../professor/models/Enrollment')
    const enrollments = await Enrollment.findByCourse(courseId)
    
    let checked = 0
    let notified = 0
    
    for (const enrollment of enrollments) {
      checked++
      const studentId = enrollment.student_id
      
      // Check if student is at risk
      const atRiskStatus = await checkStudentAtRisk(studentId, courseId)
      
      if (atRiskStatus.isAtRisk) {
        // Check if notification already exists (avoid duplicates)
        const Notification = require('../shared/models/Notification')
        const existingNotification = await Notification.findRecentAtRisk(studentId, courseId, 'at-risk')
        
        if (!existingNotification) {
          await createAtRiskNotification(studentId, courseId, atRiskStatus.reason)
          notified++
          console.log(`✅ Notified at-risk student ${studentId} for course ${courseId}`)
        }
      }
      
      // Check if student is not taking assessments
      const notTaking = await checkStudentNotTakingAssessments(studentId, courseId)
      if (notTaking) {
        const Notification = require('../shared/models/Notification')
        const existingNotification = await Notification.findRecentAtRisk(studentId, courseId, 'not-taking')
        
        if (!existingNotification) {
          await createNotTakingAssessmentsNotification(studentId, courseId)
          notified++
          console.log(`✅ Notified student ${studentId} for not taking assessments in course ${courseId}`)
        }
      }
    }
    
    return { checked, notified }
  } catch (error) {
    console.error('❌ Error checking and notifying at-risk students:', error)
    return { checked: 0, notified: 0, error: error.message }
  }
}

/**
 * Check and notify at-risk students after grade creation/update
 */
async function checkAndNotifyAfterGradeChange(studentId, courseId) {
  try {
    // Check if student is now at risk
    const atRiskStatus = await checkStudentAtRisk(studentId, courseId)
    
    if (atRiskStatus.isAtRisk) {
      // Check if notification already exists (avoid duplicates)
      const Notification = require('../shared/models/Notification')
      const existingNotification = await Notification.findRecentAtRisk(studentId, courseId, 'at-risk', 7) // Check last 7 days
      
      if (!existingNotification) {
        await createAtRiskNotification(studentId, courseId, atRiskStatus.reason)
        console.log(`✅ Notified at-risk student ${studentId} for course ${courseId} after grade change`)
      }
    }
    
    // Check if student is not taking assessments
    const notTaking = await checkStudentNotTakingAssessments(studentId, courseId)
    if (notTaking) {
      const Notification = require('../shared/models/Notification')
      const existingNotification = await Notification.findRecentAtRisk(studentId, courseId, 'not-taking', 7)
      
      if (!existingNotification) {
        await createNotTakingAssessmentsNotification(studentId, courseId)
        console.log(`✅ Notified student ${studentId} for not taking assessments in course ${courseId}`)
      }
    }
  } catch (error) {
    console.error('❌ Error checking at-risk after grade change:', error)
    // Don't throw - this is non-critical
  }
}

module.exports = {
  checkStudentAtRisk,
  checkStudentNotTakingAssessments,
  checkAndNotifyAtRiskStudents,
  checkAndNotifyAfterGradeChange
}




const Notification = require('../models/Notification')
const Student = require('../../student/models/Student')
const Course = require('../../professor/models/Course')

async function createGradeNotification(studentId, courseId, gradeId, gradeData) {
  try {
    console.log(`📬 Creating grade notification for student_id: ${studentId}, course_id: ${courseId}, grade_id: ${gradeId}`)

    const course = await Course.findById(courseId)
    const courseName = course ? (course.name || course.code) : 'Unknown Course'

    const assessmentType = gradeData.assessment_type || 'Assessment'
    const readableType = assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)
    const title = `${courseName}: ${readableType} Posted`
    const message = `Your ${readableType.toLowerCase()} "${gradeData.assessment_title}" score is ${gradeData.score}/${gradeData.max_points}.`

    const notification = await Notification.create({
      user_id: studentId,
      user_type: 'Student',
      type: 'grade',
      title,
      message,
      course_id: courseId,
      grade_id: gradeId
    })

    console.log(`✅ Grade notification created successfully:`, {
      id: notification.id,
      user_id: notification.user_id,
      user_type: notification.user_type,
      title: notification.title
    })

    // Check if grade is deficient and create deficiency notification
    const score = parseFloat(gradeData.score)
    const maxPoints = parseFloat(gradeData.max_points)
    if (!isNaN(score) && !isNaN(maxPoints) && maxPoints > 0) {
      const percentage = (score / maxPoints) * 100
      const deficiencyThreshold = process.env.DEFICIENCY_THRESHOLD || 75 // Default 75%
      
      if (percentage < deficiencyThreshold) {
        console.log(`⚠️ Grade is deficient: ${percentage.toFixed(1)}% (below ${deficiencyThreshold}%)`)
        await createDeficiencyNotification(studentId, courseId, gradeId, gradeData, percentage).catch(err => {
          console.error('⚠️ Failed to create deficiency notification (non-critical):', err.message)
        })
      }
    }

    return notification
  } catch (error) {
    console.error('❌ Error creating grade notification:', error)
    console.error('❌ Error details:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sqlCode: error.code,
      studentId,
      courseId,
      gradeId
    })
    // Don't throw - notification failure shouldn't block grade creation
    // Return null to indicate notification wasn't created
    return null
  }
}

async function createDeficiencyNotification(studentId, courseId, gradeId, gradeData, percentage) {
  try {
    console.log(`📬 Creating deficiency notification for student_id: ${studentId}, course_id: ${courseId}, grade_id: ${gradeId}`)

    const course = await Course.findById(courseId)
    const courseName = course ? (course.name || course.code) : 'Unknown Course'

    const assessmentType = gradeData.assessment_type || 'Assessment'
    const readableType = assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)
    const percentageStr = percentage.toFixed(1)
    
    const title = `${courseName}: Academic Deficiency Alert`
    const message = `Your ${readableType.toLowerCase()} "${gradeData.assessment_title}" score is ${gradeData.score}/${gradeData.max_points} (${percentageStr}%), which is below the passing threshold. Please review and take necessary action.`

    const notification = await Notification.create({
      user_id: studentId,
      user_type: 'Student',
      type: 'grade', // Use 'grade' type, but with deficiency-specific message
      title,
      message,
      course_id: courseId,
      grade_id: gradeId
    })

    console.log(`✅ Deficiency notification created successfully:`, {
      id: notification.id,
      user_id: notification.user_id,
      user_type: notification.user_type,
      title: notification.title,
      percentage: percentageStr
    })

    return notification
  } catch (error) {
    console.error('❌ Error creating deficiency notification:', error)
    console.error('❌ Error details:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sqlCode: error.code,
      studentId,
      courseId,
      gradeId,
      percentage
    })
    // Don't throw - deficiency notification failure shouldn't block grade creation
    return null
  }
}

async function createAttendanceNotification(studentId, courseId, attendanceId, attendanceData) {
  try {
    console.log(`📬 Creating attendance notification for student_id: ${studentId}, course_id: ${courseId}, attendance_id: ${attendanceId}`)

    const course = await Course.findById(courseId)
    const courseName = course ? (course.name || course.code) : 'Unknown Course'

    const statusLabel = attendanceData.status === 'present' ? 'Present'
      : attendanceData.status === 'absent' ? 'Absent'
      : attendanceData.status === 'late' ? 'Late'
      : 'Excused'

    const dateLabel = new Date(attendanceData.date).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })

    const title = `${courseName} Attendance`
    const message = `You were marked ${statusLabel} on ${dateLabel} for ${courseName}.`

    const notification = await Notification.create({
      user_id: studentId,
      user_type: 'Student',
      type: 'attendance',
      title,
      message,
      course_id: courseId,
      attendance_id: attendanceId
    })

    console.log(`✅ Attendance notification created successfully:`, {
      id: notification.id,
      user_id: notification.user_id,
      user_type: notification.user_type,
      title: notification.title
    })

    return notification
  } catch (error) {
    console.error('❌ Error creating attendance notification:', error)
    console.error('❌ Error details:', {
      message: error.message,
      sqlMessage: error.sqlMessage,
      sqlCode: error.code,
      studentId,
      courseId,
      attendanceId
    })
    throw error
  }
}

async function createEnrollmentNotification(studentId, courseId, enrollmentId) {
  try {
    const course = await Course.findById(courseId)
    const courseName = course ? (course.name || course.code) : 'Unknown Course'
    const courseCode = course ? course.code : 'Unknown'

    const title = `${courseCode}: Enrollment Confirmed`
    const message = `You have been enrolled in ${courseName}.`

    return await Notification.create({
      user_id: studentId,
      user_type: 'Student',
      type: 'enrollment',
      title,
      message,
      course_id: courseId,
      enrollment_id: enrollmentId
    })
  } catch (error) {
    console.error('Error creating enrollment notification:', error)
    throw error
  }
}

async function createProfessorNotification(professorId, type, title, message, courseId = null) {
  try {
    return await Notification.create({
      user_id: professorId,
      user_type: 'Professor',
      type,
      title,
      message,
      course_id: courseId
    })
  } catch (error) {
    console.error('Error creating professor notification:', error)
    throw error
  }
}

module.exports = {
  createGradeNotification,
  createAttendanceNotification,
  createEnrollmentNotification,
  createProfessorNotification,
  createDeficiencyNotification
}


const gradesService = require('../services/grades.service')
const { createGradeNotification, createAtRiskNotification, createNotTakingAssessmentsNotification } = require('../shared/utils/notificationHelper')
const atRiskService = require('../services/atRisk.service')

const getGradesByStudent = async (request, reply) => {
  try {
    const studentId = request.params.studentId || request.query.studentId
    
    console.log('📊 getGradesByStudent controller called:', {
      studentId,
      studentIdType: typeof studentId,
      paramStudentId: request.params.studentId,
      queryStudentId: request.query.studentId,
      userRole: request.user?.role,
      userId: request.user?.id,
      user_user_id: request.user?.user_id
    })
    
    const grades = await gradesService.getGradesByStudent(studentId, request.user)
    
    console.log('✅ getGradesByStudent controller returning', grades.length, 'grades')
    
    return grades
  } catch (error) {
    console.error('❌ Error in getGradesByStudent controller:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      studentId: request.params.studentId || request.query.studentId
    })
    
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: error.message })
    }
    if (error.message.includes('required')) {
      return reply.code(400).send({ error: error.message })
    }
    throw error
  }
}

const getGradesByCourse = async (request, reply) => {
  try {
    const courseId = request.params.courseId || request.query.courseId
    if (!courseId) {
      return reply.code(400).send({ error: 'Course ID is required' })
    }
    const grades = await gradesService.getGradesByCourse(courseId, request.user)
    return grades
  } catch (error) {
    if (error.message.includes('not found')) {
      return reply.code(403).send({ error: error.message })
    }
    throw error
  }
}

const getGradesByStudentAndCourse = async (request, reply) => {
  try {
    const { studentId, courseId } = request.query
    const grades = await gradesService.getGradesByStudentAndCourse(studentId, courseId, request.user)
    return grades
  } catch (error) {
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: error.message })
    }
    if (error.message.includes('required')) {
      return reply.code(400).send({ error: error.message })
    }
    throw error
  }
}

const createGrade = async (request, reply) => {
  try {
    // Validate required fields
    const studentId = request.body.studentId || request.body.student_id
    const courseId = request.body.courseId || request.body.course_id
    const assessmentType = request.body.assessmentType || request.body.assessment_type
    const assessmentTitle = request.body.assessmentTitle || request.body.assessment_title
    const score = request.body.score
    const maxPoints = request.body.maxPoints || request.body.max_points

    // Validate required fields
    if (!studentId) {
      return reply.code(400).send({ error: 'studentId is required' })
    }
    if (!courseId) {
      return reply.code(400).send({ error: 'courseId is required' })
    }
    if (!assessmentType) {
      return reply.code(400).send({ error: 'assessmentType is required' })
    }
    if (!assessmentTitle) {
      return reply.code(400).send({ error: 'assessmentTitle is required' })
    }
    if (score === undefined || score === null) {
      return reply.code(400).send({ error: 'score is required' })
    }
    if (maxPoints === undefined || maxPoints === null) {
      return reply.code(400).send({ error: 'maxPoints is required' })
    }

    // Convert to proper types
    const studentIdInt = parseInt(studentId)
    const courseIdInt = parseInt(courseId)
    const scoreNum = parseFloat(score)
    const maxPointsNum = parseFloat(maxPoints)

    if (isNaN(studentIdInt) || studentIdInt <= 0) {
      return reply.code(400).send({ error: 'studentId must be a positive integer' })
    }
    if (isNaN(courseIdInt) || courseIdInt <= 0) {
      return reply.code(400).send({ error: 'courseId must be a positive integer' })
    }
    if (isNaN(scoreNum) || scoreNum < 0) {
      return reply.code(400).send({ error: 'score must be a non-negative number' })
    }
    if (isNaN(maxPointsNum) || maxPointsNum <= 0) {
      return reply.code(400).send({ error: 'maxPoints must be a positive number' })
    }
    if (scoreNum > maxPointsNum) {
      return reply.code(400).send({ error: `score (${scoreNum}) cannot exceed maxPoints (${maxPointsNum})` })
    }

    console.log('📝 Creating grade with data:', {
      studentId: studentIdInt,
      courseId: courseIdInt,
      assessmentType: assessmentType.trim(),
      assessmentTitle: assessmentTitle.trim(),
      score: scoreNum,
      maxPoints: maxPointsNum,
      date: request.body.date || null
    })

    const grade = await gradesService.createGrade({
      studentId: studentIdInt,
      courseId: courseIdInt,
      assessmentType: assessmentType.trim(),
      assessmentTitle: assessmentTitle.trim(),
      score: scoreNum,
      maxPoints: maxPointsNum,
      date: request.body.date || null
    })

    console.log('✅ Grade created successfully:', { id: grade.id, student_id: grade.student_id, course_id: grade.course_id })

    // Create notification (don't fail grade creation if notification fails)
    // Note: createGradeNotification now returns null on error instead of throwing
    const notification = await createGradeNotification(
      grade.student_id,
      grade.course_id,
      grade.id,
      {
        assessment_type: grade.assessment_type,
        assessment_title: grade.assessment_title,
        score: grade.score,
        max_points: grade.max_points
      }
    ).catch(err => {
      // Extra safety - catch any errors that might still be thrown
      console.error('⚠️ Failed to create grade notification (grade was still saved):', err.message)
      return null
    })

    if (notification) {
      console.log('✅ Grade notification created successfully')
    } else {
      console.log('⚠️ Grade notification not created (non-critical)')
    }

    // Check and notify if student is at risk or not taking assessments (non-blocking)
    atRiskService.checkAndNotifyAfterGradeChange(grade.student_id, grade.course_id).catch(err => {
      console.error('⚠️ Failed to check at-risk status (non-critical):', err.message)
    })

    // Always return success if grade was created, regardless of notification status
    return reply.code(201).send(grade)
  } catch (error) {
    console.error('❌ Error in createGrade controller:', error)
    console.error('❌ Error details:', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    })
    
    // Return more detailed error message
    if (error.code === 'ER_NO_REFERENCED_ROW_2') {
      return reply.code(400).send({ 
        error: 'Invalid student or course ID',
        details: error.sqlMessage || error.message
      })
    }
    if (error.code === 'ER_DATA_TOO_LONG') {
      return reply.code(400).send({ 
        error: 'Data too long for database field',
        details: error.sqlMessage || error.message
      })
    }
    
    throw error
  }
}

const updateGrade = async (request, reply) => {
  try {
    const grade = await gradesService.updateGrade(request.params.id, {
      assessmentType: request.body.assessmentType || request.body.assessment_type,
      assessmentTitle: request.body.assessmentTitle || request.body.assessment_title,
      score: request.body.score,
      maxPoints: request.body.maxPoints || request.body.max_points,
      date: request.body.date
    })

    if (!grade) {
      return reply.code(404).send({ error: 'Grade not found' })
    }

    try {
      await createGradeNotification(
        grade.student_id,
        grade.course_id,
        grade.id,
        {
          assessment_type: grade.assessment_type,
          assessment_title: grade.assessment_title,
          score: grade.score,
          max_points: grade.max_points
        }
      )
    } catch (notifError) {
      console.error('Failed to create grade update notification:', notifError)
    }

    // Check and notify if student is at risk or not taking assessments (non-blocking)
    atRiskService.checkAndNotifyAfterGradeChange(grade.student_id, grade.course_id).catch(err => {
      console.error('⚠️ Failed to check at-risk status (non-critical):', err.message)
    })

    return grade
  } catch (error) {
    throw error
  }
}

const deleteGrade = async (request, reply) => {
  try {
    await gradesService.deleteGrade(request.params.id)
    return { message: 'Grade deleted successfully' }
  } catch (error) {
    throw error
  }
}

module.exports = {
  getGradesByStudent,
  getGradesByCourse,
  getGradesByStudentAndCourse,
  createGrade,
  updateGrade,
  deleteGrade
}


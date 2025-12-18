const Grade = require('../professor/models/Grade')
const Student = require('../student/models/Student')
const { isStudent } = require('../shared/utils/roleHelpers')

const getGradesByStudent = async (studentId, user) => {
  let resolvedStudentId = studentId

  console.log('📊 getGradesByStudent called with:', { 
    studentId, 
    studentIdType: typeof studentId,
    userRole: user?.role, 
    userId: user?.id, 
    user_user_id: user?.user_id,
    userEmail: user?.email
  })

  if (isStudent(user?.role)) {
    // For students, we need to verify they can only see their own grades
    // But we should use the studentId parameter if it's provided and matches
    const userId = user.user_id
    const email = user.email

    let student = userId ? await Student.findById(userId) : null
    if (!student && email) {
      console.log('⚠️ Student not found by user_id, trying email:', email)
      student = await Student.findByEmail(email)
    }

    if (!student) {
      console.error('❌ Student profile not found for authenticated user', {
        userId,
        email,
        userRole: user?.role
      })
      throw new Error('Student profile not found')
    }

    console.log('✅ Student profile found:', {
      studentId: student.id,
      studentIdType: typeof student.id,
      name: student.name,
      email: student.email
    })

    // IMPORTANT: Use the provided studentId if it matches the authenticated student
    // This allows the frontend to query by the student's MySQL ID directly
    if (studentId) {
      const providedId = parseInt(studentId)
      const authenticatedId = student.id
      
      console.log('🔍 Comparing IDs:', {
        providedId,
        providedIdType: typeof providedId,
        authenticatedId,
        authenticatedIdType: typeof authenticatedId,
        match: providedId === authenticatedId
      })
      
      if (providedId === authenticatedId) {
        // IDs match - use the provided ID (this is the correct path)
        resolvedStudentId = providedId
        console.log('✅ Using provided studentId (matches authenticated student):', resolvedStudentId)
      } else {
        // IDs don't match - use authenticated student's ID for security
        console.warn('⚠️ Provided studentId does not match authenticated student, using authenticated student ID', {
          providedStudentId: providedId,
          authenticatedStudentId: authenticatedId
        })
        resolvedStudentId = authenticatedId
      }
    } else {
      // No studentId provided - use authenticated student's ID
      resolvedStudentId = student.id
      console.log('✅ No studentId provided, using authenticated student ID:', resolvedStudentId)
    }
  } else {
    // For professors, use the provided studentId directly
    if (studentId) {
      resolvedStudentId = parseInt(studentId)
      console.log('✅ Professor query - using provided studentId:', resolvedStudentId)
    }
  }

  if (!resolvedStudentId) {
    console.error('❌ No student ID resolved')
    throw new Error('Student ID is required')
  }

  console.log('📊 Querying grades for student ID:', resolvedStudentId, '(type:', typeof resolvedStudentId, ')')
  const grades = await Grade.findByStudent(resolvedStudentId)
  console.log('📊 Found', grades.length, 'grades for student', resolvedStudentId)
  
  if (grades.length > 0) {
    console.log('📊 Grade details:', grades.map(g => ({
      id: g.id,
      student_id: g.student_id,
      course_id: g.course_id,
      assessment_title: g.assessment_title,
      score: g.score,
      max_points: g.max_points
    })))
  } else {
    console.warn('⚠️ No grades found for student', resolvedStudentId)
    console.warn('⚠️ This could mean:')
    console.warn('   1. No grades have been saved for this student')
    console.warn('   2. The student_id in grades table does not match', resolvedStudentId)
    console.warn('   3. Check if grades were saved with a different student_id')
  }
  
  return grades
}

const getGradesByCourse = async (courseId, user) => {
  if (isStudent(user?.role)) {
    const student = user.user_id ? await Student.findById(user.user_id) : null
    if (!student) {
      throw new Error('Student profile not found')
    }
    return await Grade.findByStudentAndCourse(student.id, courseId)
  }

  return await Grade.findByCourse(courseId)
}

const getGradesByStudentAndCourse = async (studentId, courseId, user) => {
  let resolvedStudentId = studentId

  if (isStudent(user?.role)) {
    const userId = user.user_id
    const email = user.email

    let student = userId ? await Student.findById(userId) : null
    if (!student && email) {
      student = await Student.findByEmail(email)
    }

    if (!student) {
      throw new Error('Student profile not found')
    }
    resolvedStudentId = student.id
  }

  if (!resolvedStudentId || !courseId) {
    throw new Error('Student ID and Course ID are required')
  }

  return await Grade.findByStudentAndCourse(resolvedStudentId, courseId)
}

const createGrade = async (data) => {
  try {
    console.log('📝 gradesService.createGrade called with:', {
      studentId: data.studentId || data.student_id,
      courseId: data.courseId || data.course_id,
      assessmentType: data.assessmentType || data.assessment_type,
      assessmentTitle: data.assessmentTitle || data.assessment_title,
      score: data.score,
      maxPoints: data.maxPoints || data.max_points,
      date: data.date || null
    })

    const grade = await Grade.create({
      student_id: data.studentId || data.student_id,
      course_id: data.courseId || data.course_id,
      assessment_type: data.assessmentType || data.assessment_type,
      assessment_title: data.assessmentTitle || data.assessment_title,
      score: data.score,
      max_points: data.maxPoints || data.max_points,
      date: data.date || null
    })

    console.log('✅ Grade created in database:', { id: grade.id })
    return grade
  } catch (error) {
    console.error('❌ Error in gradesService.createGrade:', error)
    console.error('❌ Error details:', {
      message: error.message,
      code: error.code,
      errno: error.errno,
      sqlMessage: error.sqlMessage,
      sqlState: error.sqlState
    })
    throw error
  }
}

const updateGrade = async (id, data) => {
  return await Grade.update(id, {
    assessment_type: data.assessmentType || data.assessment_type,
    assessment_title: data.assessmentTitle || data.assessment_title,
    score: data.score,
    max_points: data.maxPoints || data.max_points,
    date: data.date
  })
}

const deleteGrade = async (id) => {
  return await Grade.delete(id)
}

module.exports = {
  getGradesByStudent,
  getGradesByCourse,
  getGradesByStudentAndCourse,
  createGrade,
  updateGrade,
  deleteGrade
}


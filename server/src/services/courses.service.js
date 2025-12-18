const Course = require('../professor/models/Course')
const Professor = require('../professor/models/Professor')
const { isProfessor } = require('../shared/utils/roleHelpers')

const getAllCourses = async () => {
  return await Course.findAll()
}

const getCourseById = async (id) => {
  return await Course.findById(id)
}

const getCourseByCode = async (code, professorId = null) => {
  let decodedCode = code
  if (code.includes('%')) {
    decodedCode = decodeURIComponent(code)
  } else {
    decodedCode = code.replace(/\+/g, ' ')
  }
  return await Course.findByCode(decodedCode, professorId)
}

const getCoursesByProfessor = async (professorId) => {
  return await Course.findByProfessor(professorId)
}

const createCourse = async (data, user) => {
  let professorId = data.professorId || data.professor_id
  
  if (!professorId && isProfessor(user?.role)) {
    const professor = user.user_id ? await Professor.findById(user.user_id) : null
    if (!professor) {
      throw new Error('Professor profile not found. Please complete your profile first.')
    }
    professorId = professor.id
  }
  
  if (!professorId) {
    throw new Error('Professor ID is required')
  }
  
  if (!data.code || !data.name) {
    throw new Error('Course code and name are required')
  }
  
  return await Course.create({
    code: data.code,
    name: data.name,
    credits: data.credits || 0,
    professor_id: professorId,
    term: data.term || 'first'
  })
}

const updateCourse = async (id, data, user) => {
  // Verify professor owns this course
  if (isProfessor(user?.role)) {
    const professor = user.user_id ? await Professor.findById(user.user_id) : null
    if (!professor) {
      throw new Error('Professor profile not found')
    }
    
    const course = await Course.findById(id)
    if (!course) {
      throw new Error('Course not found')
    }
    
    if (course.professor_id !== professor.id) {
      throw new Error('You can only update courses that you teach')
    }
  }
  
  const updateData = {}
  if (data.code !== undefined) updateData.code = data.code
  if (data.name !== undefined) updateData.name = data.name
  if (data.credits !== undefined) updateData.credits = data.credits
  if (data.professorId !== undefined || data.professor_id !== undefined) {
    updateData.professor_id = data.professorId || data.professor_id
  }
  if (data.term !== undefined) updateData.term = data.term
  
  return await Course.update(id, updateData)
}

const deleteCourse = async (id, user) => {
  // Verify professor owns this course
  if (isProfessor(user?.role)) {
    const professor = user.user_id ? await Professor.findById(user.user_id) : null
    if (!professor) {
      throw new Error('Professor profile not found')
    }
    
    const course = await Course.findById(id)
    if (!course) {
      throw new Error('Course not found')
    }
    
    if (course.professor_id !== professor.id) {
      throw new Error('You can only delete courses that you teach')
    }
  }
  
  return await Course.delete(id)
}

module.exports = {
  getAllCourses,
  getCourseById,
  getCourseByCode,
  getCoursesByProfessor,
  createCourse,
  updateCourse,
  deleteCourse
}


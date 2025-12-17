const coursesService = require('../services/courses.service')

const getAllCourses = async (request, reply) => {
  try {
    const courses = await coursesService.getAllCourses()
    return courses
  } catch (error) {
    throw error
  }
}

const getCourseById = async (request, reply) => {
  try {
    const course = await coursesService.getCourseById(request.params.id)
    if (!course) {
      return reply.code(404).send({ error: 'Course not found' })
    }
    return course
  } catch (error) {
    throw error
  }
}

const getCourseByCode = async (request, reply) => {
  try {
    let code = request.params.code || request.query.code
    if (!code) {
      return reply.code(400).send({ error: 'Course code is required' })
    }
    
    const professorId = request.query.professorId || null
    const course = await coursesService.getCourseByCode(code, professorId)
    
    if (!course) {
      return reply.code(404).send({ error: 'Course not found' })
    }
    
    return course
  } catch (error) {
    throw error
  }
}

const getCoursesByProfessor = async (request, reply) => {
  try {
    const professorId = request.params.professorId || request.query.professorId
    if (!professorId) {
      return reply.code(400).send({ error: 'Professor ID is required' })
    }
    const courses = await coursesService.getCoursesByProfessor(professorId)
    return courses
  } catch (error) {
    throw error
  }
}

const createCourse = async (request, reply) => {
  try {
    const course = await coursesService.createCourse(request.body, request.user)
    return reply.code(201).send(course)
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return reply.code(409).send({ error: 'Course with this code already exists for this professor' })
    }
    if (error.message.includes('Professor profile not found')) {
      return reply.code(404).send({ error: error.message })
    }
    if (error.message.includes('required')) {
      return reply.code(400).send({ error: error.message })
    }
    throw error
  }
}

const updateCourse = async (request, reply) => {
  try {
    const course = await coursesService.updateCourse(request.params.id, request.body, request.user)
    if (!course) {
      return reply.code(404).send({ error: 'Course not found' })
    }
    return course
  } catch (error) {
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: error.message })
    }
    if (error.message.includes('can only')) {
      return reply.code(403).send({ error: error.message })
    }
    throw error
  }
}

const deleteCourse = async (request, reply) => {
  try {
    await coursesService.deleteCourse(request.params.id, request.user)
    return { message: 'Course deleted successfully' }
  } catch (error) {
    if (error.message.includes('not found')) {
      return reply.code(404).send({ error: error.message })
    }
    if (error.message.includes('can only')) {
      return reply.code(403).send({ error: error.message })
    }
    throw error
  }
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


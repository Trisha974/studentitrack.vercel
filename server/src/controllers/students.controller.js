const studentsService = require('../services/students.service')

const getAllStudents = async (request, reply) => {
  try {
    const filters = {}
    if (request.query.department) {
      filters.department = request.query.department
    }
    const students = await studentsService.getAllStudents(filters)
    return students
  } catch (error) {
    throw error
  }
}

const getStudentById = async (request, reply) => {
  try {
    const student = await studentsService.getStudentById(request.params.id)
    if (!student) {
      return reply.code(404).send({ error: 'Student not found' })
    }
    return student
  } catch (error) {
    throw error
  }
}

const getCurrentStudent = async (request, reply) => {
  try {
    // Get student from authenticated user's user_id
    if (!request.user || !request.user.user_id) {
      return reply.code(404).send({ error: 'Student profile not found' })
    }
    const student = await studentsService.getStudentById(request.user.user_id)
    if (!student) {
      return reply.code(404).send({ error: 'Student not found' })
    }
    return student
  } catch (error) {
    throw error
  }
}

const getStudentByEmail = async (request, reply) => {
  try {
    const email = request.params.email || request.query.email
    if (!email) {
      return reply.code(400).send({ error: 'Email is required' })
    }
    const student = await studentsService.getStudentByEmail(email)
    if (!student) {
      return reply.code(404).send({ error: 'Student not found' })
    }
    return student
  } catch (error) {
    throw error
  }
}

const getStudentByNumericalId = async (request, reply) => {
  try {
    const studentId = request.params.studentId || request.query.studentId
    if (!studentId) {
      return reply.code(400).send({ error: 'Student ID is required' })
    }
    const student = await studentsService.getStudentByNumericalId(studentId)
    if (!student) {
      return reply.code(404).send({ error: 'Student not found' })
    }
    return student
  } catch (error) {
    throw error
  }
}

const createStudent = async (request, reply) => {
  try {
    const student = await studentsService.createStudent({
      name: request.body.name,
      email: request.body.email,
      studentId: request.body.studentId || request.body.student_id,
      department: request.body.department,
      photoUrl: request.body.photoUrl || request.body.photo_url
    })
    return reply.code(201).send(student)
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return reply.code(409).send({ error: 'Student with this email or ID already exists' })
    }
    throw error
  }
}

const updateStudent = async (request, reply) => {
  try {
    const studentId = parseInt(request.params.id)
    if (isNaN(studentId)) {
      return reply.code(400).send({ error: 'Invalid student ID' })
    }

    const photoUrl = request.body.photoUrl || request.body.photo_url
    if (photoUrl && photoUrl.length > 16777215) {
      return reply.code(400).send({ error: 'Profile picture is too large. Please use a smaller image.' })
    }

    const existingStudent = await studentsService.getStudentById(studentId)
    if (!existingStudent) {
      return reply.code(404).send({ error: 'Student not found' })
    }

    const student = await studentsService.updateStudent(studentId, {
      name: request.body.name,
      email: request.body.email,
      studentId: request.body.studentId || request.body.student_id,
      department: request.body.department,
      photoUrl: photoUrl
    })

    if (!student) {
      return reply.code(404).send({ error: 'Student not found after update' })
    }

    return student
  } catch (error) {
    if (error.code === 'ER_DATA_TOO_LONG') {
      return reply.code(400).send({ error: 'Profile picture is too large. Please use a smaller image.' })
    }
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return reply.code(500).send({ error: 'Database schema error. Please contact support.' })
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      return reply.code(503).send({ error: 'Database connection error. Please try again later.' })
    }
    throw error
  }
}

const deleteStudent = async (request, reply) => {
  try {
    await studentsService.deleteStudent(request.params.id)
    return { message: 'Student deleted successfully' }
  } catch (error) {
    throw error
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  getCurrentStudent,
  getStudentByEmail,
  getStudentByNumericalId,
  createStudent,
  updateStudent,
  deleteStudent
}


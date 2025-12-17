const Student = require('../student/models/Student')

const getAllStudents = async (filters = {}) => {
  return await Student.findAll(filters)
}

const getStudentById = async (id) => {
  return await Student.findById(id)
}

const getStudentByEmail = async (email) => {
  return await Student.findByEmail(email)
}

const getStudentByNumericalId = async (studentId) => {
  return await Student.findByStudentId(studentId)
}

const createStudent = async (data) => {
  let existingStudent = null
  if (data.email) {
    existingStudent = await Student.findByEmail(data.email)
  }
  if (!existingStudent && data.studentId) {
    existingStudent = await Student.findByStudentId(data.studentId)
  }

  if (existingStudent) {
    return await Student.update(existingStudent.id, {
      name: data.name || existingStudent.name,
      email: data.email || existingStudent.email,
      student_id: data.studentId || existingStudent.student_id,
      department: data.department || existingStudent.department,
      photo_url: data.photoUrl || data.photo_url || existingStudent.photo_url
    })
  }

  return await Student.create({
    firebase_uid: null, // No longer using Firebase
    name: data.name,
    email: data.email,
    student_id: data.studentId,
    department: data.department,
    photo_url: data.photoUrl || data.photo_url
  })
}

const updateStudent = async (id, data) => {
  return await Student.update(id, {
    name: data.name,
    email: data.email,
    student_id: data.studentId || data.student_id,
    department: data.department,
    photo_url: data.photoUrl || data.photo_url
  })
}

const deleteStudent = async (id) => {
  return await Student.delete(id)
}

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentByEmail,
  getStudentByNumericalId,
  createStudent,
  updateStudent,
  deleteStudent
}


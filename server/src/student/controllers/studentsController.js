const Student = require('../models/Student')

const getAllStudents = async (req, res, next) => {
  try {
    const filters = {}
    if (req.query.department) {
      filters.department = req.query.department
    }

    const students = await Student.findAll(filters)
    res.json(students)
  } catch (error) {
    next(error)
  }
}

const getStudentByEmail = async (req, res, next) => {
  try {
    const email = req.params.email || req.query.email
    if (!email) {
      return res.status(400).json({ error: 'Email is required' })
    }

    const student = await Student.findByEmail(email)
    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }
    res.json(student)
  } catch (error) {
    next(error)
  }
}

const getStudentByNumericalId = async (req, res, next) => {
  try {
    const studentId = req.params.studentId || req.query.studentId
    if (!studentId) {
      return res.status(400).json({ error: 'Student ID is required' })
    }

    const student = await Student.findByStudentId(studentId)
    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }
    res.json(student)
  } catch (error) {
    next(error)
  }
}

const getStudentById = async (req, res, next) => {
  try {
    const student = await Student.findById(req.params.id)
    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }
    res.json(student)
  } catch (error) {
    next(error)
  }
}

const getStudentByFirebaseUid = async (req, res, next) => {
  try {
    const student = await Student.findByFirebaseUid(req.params.uid)
    if (!student) {
      return res.status(404).json({ error: 'Student not found' })
    }
    res.json(student)
  } catch (error) {
    next(error)
  }
}

const createStudent = async (req, res, next) => {
  try {
    const firebaseUid = req.body.firebase_uid || req.user?.uid
    const email = req.body.email
    const studentId = req.body.studentId || req.body.student_id

let existingStudent = null
    if (email) {
      existingStudent = await Student.findByEmail(email)
    }
    if (!existingStudent && studentId) {
      existingStudent = await Student.findByStudentId(studentId)
    }

if (existingStudent) {
      if (!existingStudent.firebase_uid || existingStudent.firebase_uid !== firebaseUid) {

        const updated = await Student.update(existingStudent.id, {
          firebase_uid: firebaseUid,
          name: req.body.name || existingStudent.name,
          email: email || existingStudent.email,
          student_id: studentId || existingStudent.student_id,
          department: req.body.department || existingStudent.department,
          photo_url: req.body.photoUrl || req.body.photo_url || existingStudent.photo_url
        })
        return res.status(200).json(updated)
      } else {

        return res.status(200).json(existingStudent)
      }
    }

const student = await Student.create({
      firebase_uid: firebaseUid,
      name: req.body.name,
      email: email,
      student_id: studentId,
      department: req.body.department,
      photo_url: req.body.photoUrl || req.body.photo_url
    })
    res.status(201).json(student)
  } catch (error) {
    console.error('Error creating student:', {
      message: error.message,
      code: error.code,
      stack: error.stack
    })
    if (error.code === 'ER_DUP_ENTRY') {

      return res.status(409).json({ error: 'Student with this email or ID already exists' })
    }
    next(error)
  }
}

const updateStudent = async (req, res, next) => {
  try {

    const studentId = parseInt(req.params.id)
    if (isNaN(studentId)) {
      return res.status(400).json({ error: 'Invalid student ID' })
    }

const photoUrl = req.body.photoUrl || req.body.photo_url
    if (photoUrl && photoUrl.length > 16777215) {
      return res.status(400).json({ error: 'Profile picture is too large. Please use a smaller image.' })
    }

const existingStudent = await Student.findById(studentId)
    if (!existingStudent) {
      return res.status(404).json({ error: 'Student not found' })
    }

    const student = await Student.update(studentId, {
      firebase_uid: req.body.firebase_uid || req.body.firebaseUid,
      name: req.body.name,
      email: req.body.email,
      student_id: req.body.studentId || req.body.student_id,
      department: req.body.department,
      photo_url: photoUrl
    })

    if (!student) {
      return res.status(404).json({ error: 'Student not found after update' })
    }

    res.json(student)
  } catch (error) {
    console.error('Error updating student:', error)

    if (error.code === 'ER_DATA_TOO_LONG') {
      return res.status(400).json({ error: 'Profile picture is too large. Please use a smaller image.' })
    }
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      return res.status(500).json({ error: 'Database schema error. Please contact support.' })
    }
    if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      return res.status(503).json({ error: 'Database connection error. Please try again later.' })
    }
    next(error)
  }
}

const deleteStudent = async (req, res, next) => {
  try {
    await Student.delete(req.params.id)
    res.json({ message: 'Student deleted successfully' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllStudents,
  getStudentById,
  getStudentByFirebaseUid,
  getStudentByEmail,
  getStudentByNumericalId,
  createStudent,
  updateStudent,
  deleteStudent
}


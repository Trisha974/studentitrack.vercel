

import * as studentsApi from './api/studentsApi'

async function addStudent(profile) {
  try {
  const student = await studentsApi.createStudent(profile)
    if (!student || !student.id) {
      console.error('❌ addStudent: Invalid response from API:', student)
      throw new Error('Failed to create student: Invalid response from server')
    }
  return student.id
  } catch (error) {
    console.error('❌ addStudent error:', error)
    throw error
  }
}

async function setStudent(profile) {
  const student = await studentsApi.setStudent(profile)
  if (!student) return null
  return {
    ...student,
    role: 'Student',
    studentId: student.student_id || student.studentId,
    photoURL: student.photo_url || student.photoURL
  }
}

async function getCurrentStudent() {
  const student = await studentsApi.getCurrentStudent()
  if (!student) return null
  return {
    ...student,
    role: 'Student',
    studentId: student.student_id || student.studentId,
    photoURL: student.photo_url || student.photoURL
  }
}

// Backwards compatibility - maps to getCurrentStudent
async function getStudentByUid(uid) {
  return getCurrentStudent()
}

async function getStudentByEmail(email) {
  const student = await studentsApi.getStudentByEmail(email)
  if (!student) return null
  return {
    ...student,
    role: 'Student',
    studentId: student.student_id || student.studentId,
    photoURL: student.photo_url || student.photoURL
  }
}

async function getStudentByNumericalId(studentId) {
  if (!studentId || !/^\d+$/.test(studentId)) return null
  const student = await studentsApi.getStudentByNumericalId(studentId)
  if (!student) return null
  return {
    ...student,
    role: 'Student',
    studentId: student.student_id || student.studentId,
    photoURL: student.photo_url || student.photoURL
  }
}

async function listStudents(filter = {}) {
  const students = await studentsApi.listStudents(filter)
  return students.map(s => ({
    ...s,
    role: 'Student',
    studentId: s.student_id || s.studentId,
    photoURL: s.photo_url || s.photoURL
  }))
}

async function updateStudent(id, updates) {
  let studentId = id

if (id && typeof id !== 'number' && !/^\d+$/.test(String(id))) {
    const student = await getStudentByUid(id)
    if (!student) {
      return null
    }
    studentId = student.id
  }

  const student = await studentsApi.updateStudent(studentId, updates)
  if (!student) return null
  return {
    ...student,
    role: 'Student',
    studentId: student.student_id || student.studentId,
    photoURL: student.photo_url || student.photoURL
  }
}

async function deleteStudent(id) {
  let studentId = id

if (id && typeof id !== 'number' && !/^\d+$/.test(String(id))) {
    const student = await getStudentByUid(id)
    if (!student) {
      return false
    }
    studentId = student.id
  }

  await studentsApi.deleteStudent(studentId)
  return true
}

export { addStudent, setStudent, getCurrentStudent, getStudentByUid, getStudentByEmail, getStudentByNumericalId, listStudents, updateStudent, deleteStudent }

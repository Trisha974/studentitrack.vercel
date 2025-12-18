const User = require('../models/User')
const Student = require('../student/models/Student')
const Professor = require('../professor/models/Professor')
const { generateToken } = require('../utils/jwt')
const { validateEmailByRole } = require('../shared/utils/emailValidation')

const login = async (email, password) => {
  // Normalize email for lookup (case-insensitive)
  const normalizedEmail = email.toLowerCase().trim()
  
  const user = await User.findByEmail(normalizedEmail)
  
  if (!user) {
    console.log(`Login attempt failed: User not found for email: ${normalizedEmail}`)
    throw new Error('Invalid email or password')
  }
  
  // Validate email format based on role
  const emailValidation = validateEmailByRole(normalizedEmail, user.role)
  if (!emailValidation.valid) {
    console.log(`Login attempt failed: Invalid email format for role ${user.role}: ${emailValidation.error}`)
    throw new Error(`Invalid email format: ${emailValidation.error}`)
  }
  
  if (!user.is_active) {
    console.log(`Login attempt failed: Account deactivated for email: ${normalizedEmail}`)
    throw new Error('Account is deactivated')
  }
  
  const isValidPassword = await User.verifyPassword(user, password)
  if (!isValidPassword) {
    console.log(`Login attempt failed: Invalid password for email: ${normalizedEmail}`)
    throw new Error('Invalid email or password')
  }
  
  console.log(`Login successful for email: ${normalizedEmail}, role: ${user.role}, user_id: ${user.user_id}`)
  
  // Update last login
  await User.updateLastLogin(user.id)
  
  // Get user profile (student or professor)
  let profile = null
  if (user.role === 'Student' && user.user_id) {
    profile = await Student.findById(user.user_id)
  } else if (user.role === 'Professor' && user.user_id) {
    profile = await Professor.findById(user.user_id)
  }
  
  // Generate token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    user_id: user.user_id
  })
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      user_id: user.user_id,
      profile
    }
  }
}

const register = async (data) => {
  const { email, password, role, name, student_id, department, photo_url } = data
  
  // Normalize email (case-insensitive)
  const normalizedEmail = email.toLowerCase().trim()
  
  // Validate email format based on role
  const emailValidation = validateEmailByRole(normalizedEmail, role)
  if (!emailValidation.valid) {
    throw new Error(emailValidation.error)
  }
  
  // For students, extract and validate student ID from email if not provided
  if (role === 'Student') {
    const { extractStudentIdFromEmail } = require('../shared/utils/emailValidation')
    const emailStudentId = extractStudentIdFromEmail(normalizedEmail)
    
    if (!student_id && !emailStudentId) {
      throw new Error('Student ID could not be extracted from email. Email must follow pattern: {studentId}.tc@umindanao.edu.ph')
    }
    
    // Use student ID from email if not provided separately
    const finalStudentId = student_id || emailStudentId
    
    // Verify that student ID in email matches provided student_id (if both are present)
    if (student_id && emailStudentId && student_id !== emailStudentId) {
      throw new Error(`Student ID in email (${emailStudentId}) does not match provided student ID (${student_id})`)
    }
  }
  
  // Check if user already exists
  const existingUser = await User.findByEmail(normalizedEmail)
  if (existingUser) {
    throw new Error('User with this email already exists')
  }
  
  let user_id = null
  
  // Create profile first (student or professor)
  if (role === 'Student') {
    // Extract student ID from email if not provided
    const { extractStudentIdFromEmail } = require('../shared/utils/emailValidation')
    const emailStudentId = extractStudentIdFromEmail(normalizedEmail)
    const finalStudentId = student_id || emailStudentId
    
    // Check if student exists by email or student_id
    let student = await Student.findByEmail(normalizedEmail)
    if (!student && finalStudentId) {
      student = await Student.findByStudentId(finalStudentId)
    }
    
    if (student) {
      user_id = student.id
      // Update student with new data if needed
      if (name || department || photo_url) {
        await Student.update(student.id, {
          name: name || student.name,
          department: department || student.department,
          photo_url: photo_url || student.photo_url
        })
      }
    } else {
      // Create new student
      console.log(`Creating new student profile:`, { name, email, student_id, department })
      try {
      const newStudent = await Student.create({
        firebase_uid: null, // No longer using Firebase
        name: name,
        email: normalizedEmail,
        student_id: finalStudentId || null,
        department: department || null,
        photo_url: photo_url || null
      })
      user_id = newStudent.id
        console.log(`Student profile created successfully:`, { id: newStudent.id })
      } catch (studentError) {
        console.error(`Error creating student profile:`, studentError.message)
        console.error(`Error stack:`, studentError.stack)
        throw new Error(`Failed to create student profile: ${studentError.message}`)
      }
    }
  } else if (role === 'Professor') {
    // Check if professor exists by email
    let professor = await Professor.findByEmail(normalizedEmail)
    
    if (professor) {
      user_id = professor.id
      console.log(`Professor profile already exists:`, { id: professor.id, email: professor.email })
      // Update professor with new data if needed
      if (name || department || photo_url) {
        await Professor.update(professor.id, {
          name: name || professor.name,
          department: department || professor.department,
          photo_url: photo_url || professor.photo_url
        })
      }
    } else {
      // Create new professor
      console.log(`Creating new professor profile:`, { name, email, department })
      try {
      const newProfessor = await Professor.create({
        firebase_uid: null, // No longer using Firebase
        name: name,
        email: normalizedEmail,
        department: department || null,
        photo_url: photo_url || null
      })
      user_id = newProfessor.id
        console.log(`Professor profile created successfully:`, { id: newProfessor.id })
      } catch (profError) {
        console.error(`Error creating professor profile:`, profError.message)
        console.error(`Error stack:`, profError.stack)
        throw new Error(`Failed to create professor profile: ${profError.message}`)
      }
    }
  }
  
  // Create user account
  const user = await User.create({
    email: normalizedEmail,
    password,
    role,
    user_id
  })
  
  // Generate token
  const token = generateToken({
    id: user.id,
    email: user.email,
    role: user.role,
    user_id: user.user_id
  })
  
  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      user_id: user.user_id
    }
  }
}

const requestPasswordReset = async (email) => {
  // Normalize email
  const normalizedEmail = email.toLowerCase().trim()
  
  // Validate email format - must be valid umindanao.edu.ph email
  const { isValidProfessorEmail, isValidStudentEmail } = require('../shared/utils/emailValidation')
  if (!isValidProfessorEmail(normalizedEmail) && !isValidStudentEmail(normalizedEmail)) {
    throw new Error('Invalid email format. Must be a valid @umindanao.edu.ph email address.')
  }
  
  const user = await User.findByEmail(normalizedEmail)
  
  if (!user) {
    // Don't reveal if email exists for security
    return { message: 'If an account with that email exists, a password reset instruction has been sent.' }
  }
  
  // Validate email format matches user's role
  const emailValidation = validateEmailByRole(normalizedEmail, user.role)
  if (!emailValidation.valid) {
    throw new Error(emailValidation.error)
  }
  
  if (!user.is_active) {
    throw new Error('Account is deactivated. Please contact support.')
  }
  
  // TODO: In a production system, you would:
  // 1. Generate a reset token
  // 2. Store it in the database with an expiration time
  // 3. Send an email with a reset link containing the token
  // For now, we'll return a message indicating the user should contact support
  // or implement a simple flow that allows direct password reset via API
  
  return { message: 'Password reset is currently handled by administrators. Please contact support.' }
}

const resetPassword = async (email, newPassword) => {
  // Normalize email
  const normalizedEmail = email.toLowerCase().trim()
  
  // Validate email format - must be valid umindanao.edu.ph email
  const { isValidProfessorEmail, isValidStudentEmail } = require('../shared/utils/emailValidation')
  if (!isValidProfessorEmail(normalizedEmail) && !isValidStudentEmail(normalizedEmail)) {
    throw new Error('Invalid email format. Must be a valid @umindanao.edu.ph email address.')
  }
  
  const user = await User.findByEmail(normalizedEmail)
  
  // Validate email format matches user's role
  if (user) {
    const emailValidation = validateEmailByRole(normalizedEmail, user.role)
    if (!emailValidation.valid) {
      throw new Error(emailValidation.error)
    }
  }
  
  if (!user) {
    throw new Error('Invalid email or token')
  }
  
  if (!user.is_active) {
    throw new Error('Account is deactivated')
  }
  
  // Update password
  await User.updatePassword(user.id, newPassword)
  
  return { message: 'Password has been reset successfully' }
}

module.exports = {
  login,
  register,
  requestPasswordReset,
  resetPassword
}


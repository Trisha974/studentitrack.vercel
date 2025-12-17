const User = require('../models/User')
const Student = require('../student/models/Student')
const Professor = require('../professor/models/Professor')
const { generateToken } = require('../utils/jwt')

const login = async (email, password) => {
  const user = await User.findByEmail(email)
  
  if (!user) {
    console.log(`Login attempt failed: User not found for email: ${email}`)
    throw new Error('Invalid email or password')
  }
  
  if (!user.is_active) {
    console.log(`Login attempt failed: Account deactivated for email: ${email}`)
    throw new Error('Account is deactivated')
  }
  
  const isValidPassword = await User.verifyPassword(user, password)
  if (!isValidPassword) {
    console.log(`Login attempt failed: Invalid password for email: ${email}`)
    throw new Error('Invalid email or password')
  }
  
  console.log(`Login successful for email: ${email}, role: ${user.role}, user_id: ${user.user_id}`)
  
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
  
  // Check if user already exists
  const existingUser = await User.findByEmail(email)
  if (existingUser) {
    throw new Error('User with this email already exists')
  }
  
  let user_id = null
  
  // Create profile first (student or professor)
  if (role === 'Student') {
    // Check if student exists by email or student_id
    let student = await Student.findByEmail(email)
    if (!student && student_id) {
      student = await Student.findByStudentId(student_id)
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
          email: email,
          student_id: student_id || null,
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
    let professor = await Professor.findByEmail(email)
    
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
          email: email,
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
    email,
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
  const user = await User.findByEmail(email)
  
  if (!user) {
    // Don't reveal if email exists for security
    return { message: 'If an account with that email exists, a password reset instruction has been sent.' }
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
  const user = await User.findByEmail(email)
  
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


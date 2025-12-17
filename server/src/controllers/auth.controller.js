const authService = require('../services/auth.service')

const login = async (request, reply) => {
  try {
    const { email, password } = request.body
    
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' })
    }
    
    console.log(`Login request received for email: ${email}`)
    const result = await authService.login(email, password)
    console.log(`Login successful, returning token for user: ${result.user.email}`)
    return reply.send(result)
  } catch (error) {
    console.error(`Login error: ${error.message}`)
    if (error.message.includes('Invalid') || error.message.includes('Account')) {
      return reply.code(401).send({ error: error.message })
    }
    console.error('Unexpected login error:', error)
    throw error
  }
}

const register = async (request, reply) => {
  try {
    const { email, password, role, name, student_id, department, photo_url } = request.body
    
    console.log(`Registration request received:`, { email, role, name, hasPassword: !!password })
    
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' })
    }
    
    if (!role || !['Professor', 'Student'].includes(role)) {
      return reply.code(400).send({ error: 'Valid role (Professor or Student) is required' })
    }
    
    if (role === 'Student' && !name) {
      return reply.code(400).send({ error: 'Name is required for students' })
    }
    
    if (role === 'Professor' && !name) {
      return reply.code(400).send({ error: 'Name is required for professors' })
    }
    
    console.log(`Attempting to register ${role}:`, { email, name, department })
    const result = await authService.register({
      email,
      password,
      role,
      name,
      student_id,
      department,
      photo_url
    })
    
    console.log(`Registration successful for:`, { email, role, userId: result.user.id })
    return reply.code(201).send(result)
  } catch (error) {
    console.error(`Registration error:`, error.message)
    console.error(`Error stack:`, error.stack)
    if (error.message.includes('already exists')) {
      return reply.code(409).send({ error: error.message })
    }
    // Return 500 with error message for debugging
    console.error('Full error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    return reply.code(500).send({ 
      error: 'Internal server error',
      message: error.message || 'Unknown error occurred',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    })
  }
}

const requestPasswordReset = async (request, reply) => {
  try {
    const { email } = request.body
    
    if (!email) {
      return reply.code(400).send({ error: 'Email is required' })
    }
    
    const result = await authService.requestPasswordReset(email)
    return reply.send(result)
  } catch (error) {
    if (error.message.includes('deactivated')) {
      return reply.code(403).send({ error: error.message })
    }
    throw error
  }
}

const resetPassword = async (request, reply) => {
  try {
    const { email, password } = request.body
    
    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and new password are required' })
    }
    
    if (password.length < 6) {
      return reply.code(400).send({ error: 'Password must be at least 6 characters long' })
    }
    
    const result = await authService.resetPassword(email, password)
    return reply.send(result)
  } catch (error) {
    if (error.message.includes('Invalid')) {
      return reply.code(401).send({ error: error.message })
    }
    if (error.message.includes('deactivated')) {
      return reply.code(403).send({ error: error.message })
    }
    throw error
  }
}

module.exports = {
  login,
  register,
  requestPasswordReset,
  resetPassword
}


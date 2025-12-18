require('dotenv').config()

const { verifyToken: verifyJWT } = require('../utils/jwt')
const User = require('../models/User')

const VALID_ROLES = ['Professor', 'Student']

async function verifyTokenOnly(request, reply) {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'No token provided' })
    }

    const token = authHeader.split('Bearer ')[1]
    if (!token || token.length < 10) {
      return reply.code(401).send({ error: 'Invalid token format' })
    }

    // Verify JWT token
    const decoded = verifyJWT(token)

    // Get user from database
    const user = await User.findById(decoded.id)
    if (!user || !user.is_active) {
      return reply.code(401).send({ error: 'Invalid or expired token' })
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      user_id: user.user_id
    }
  } catch (error) {
    console.error('Token verification error (verifyTokenOnly):', error.message)
    if (error.message === 'Token expired') {
      return reply.code(401).send({ error: 'Token expired' })
    }
    if (error.message === 'Invalid token') {
      return reply.code(401).send({ error: 'Invalid token' })
    }
    return reply.code(401).send({ error: 'Invalid or expired token' })
  }
}

async function verifyToken(request, reply) {
  try {
    const authHeader = request.headers.authorization

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'No token provided' })
    }

    const token = authHeader.split('Bearer ')[1]
    if (!token || token.length < 10) {
      return reply.code(401).send({ error: 'Invalid token format' })
    }

    // Verify JWT token
    const decoded = verifyJWT(token)

    // Get user from database
    const user = await User.findById(decoded.id)
    if (!user || !user.is_active) {
      return reply.code(401).send({ error: 'Invalid or expired token' })
    }

    if (!user.role || !VALID_ROLES.includes(user.role)) {
      return reply.code(403).send({ error: 'Invalid user role' })
    }

    request.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      user_id: user.user_id
    }
  } catch (error) {
    console.error('Token verification error:', error.message)
    if (error.message === 'Token expired') {
      return reply.code(401).send({ error: 'Token expired' })
    }
    if (error.message === 'Invalid token') {
      return reply.code(401).send({ error: 'Invalid token' })
    }
    return reply.code(401).send({ error: 'Invalid or expired token' })
  }
}

function requireRole(...roles) {
  const invalidRoles = roles.filter(r => !VALID_ROLES.includes(r))
  if (invalidRoles.length > 0) {
    throw new Error(`Invalid roles requested: ${invalidRoles.join(', ')}. Only 'Professor' and 'Student' are allowed.`)
  }

  return async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({ error: 'Authentication required' })
    }

    if (!request.user.role || !VALID_ROLES.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Invalid user role' })
    }

    if (!roles.includes(request.user.role)) {
      return reply.code(403).send({ error: 'Insufficient permissions. Required role: ' + roles.join(' or ') })
    }
  }
}

function requireProfessor(request, reply) {
  return requireRole('Professor')(request, reply)
}

function requireStudent(request, reply) {
  return requireRole('Student')(request, reply)
}

module.exports = {
  verifyToken,
  verifyTokenOnly,
  requireRole,
  requireProfessor,
  requireStudent
}


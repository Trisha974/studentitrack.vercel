

const VALID_ROLES = ['Professor', 'Student']

function isValidRole(role) {
  return role && VALID_ROLES.includes(role)
}

function validateRole(role) {
  if (!isValidRole(role)) {
    throw new Error(`Invalid role: ${role}. Only 'Professor' and 'Student' are allowed.`)
  }
  return true
}

function isProfessor(role) {
  return role === 'Professor'
}

function isStudent(role) {
  return role === 'Student'
}

module.exports = {
  VALID_ROLES,
  isValidRole,
  validateRole,
  isProfessor,
  isStudent
}


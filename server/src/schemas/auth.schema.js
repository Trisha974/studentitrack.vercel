const loginSchema = {
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 }
    },
    required: ['email', 'password']
  }
}

const registerSchema = {
  body: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' },
      password: { type: 'string', minLength: 6 },
      role: { type: 'string', enum: ['Professor', 'Student'] },
      name: { type: 'string', minLength: 1 },
      student_id: { type: 'string' },
      department: { type: 'string' },
      photo_url: { type: 'string' }
    },
    required: ['email', 'password', 'role', 'name']
  }
}

module.exports = {
  loginSchema,
  registerSchema
}


const studentSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      email: { type: 'string', format: 'email' },
      studentId: { type: 'string' },
      student_id: { type: 'string' },
      department: { type: 'string' },
      photoUrl: { type: 'string' },
      photo_url: { type: 'string' },
      firebase_uid: { type: 'string' },
      firebaseUid: { type: 'string' }
    },
    required: ['name', 'email']
  }
}

const studentIdParamSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['id']
  }
}

const studentUidParamSchema = {
  params: {
    type: 'object',
    properties: {
      uid: { type: 'string' }
    },
    required: ['uid']
  }
}

const studentEmailParamSchema = {
  params: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' }
    },
    required: ['email']
  }
}

const studentIdQuerySchema = {
  params: {
    type: 'object',
    properties: {
      studentId: { type: 'string' }
    },
    required: ['studentId']
  }
}

module.exports = {
  studentSchema,
  studentIdParamSchema,
  studentUidParamSchema,
  studentEmailParamSchema,
  studentIdQuerySchema
}


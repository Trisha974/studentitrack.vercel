const professorSchema = {
  body: {
    type: 'object',
    properties: {
      name: { type: 'string', minLength: 1 },
      email: { type: 'string', format: 'email' },
      department: { type: 'string' },
      photoUrl: { type: 'string' },
      photo_url: { type: 'string' },
      firebase_uid: { type: 'string' },
      firebaseUid: { type: 'string' }
    },
    required: ['name', 'email']
  }
}

const professorIdParamSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['id']
  }
}

const professorUidParamSchema = {
  params: {
    type: 'object',
    properties: {
      uid: { type: 'string' }
    },
    required: ['uid']
  }
}

const professorEmailParamSchema = {
  params: {
    type: 'object',
    properties: {
      email: { type: 'string', format: 'email' }
    },
    required: ['email']
  }
}

module.exports = {
  professorSchema,
  professorIdParamSchema,
  professorUidParamSchema,
  professorEmailParamSchema
}


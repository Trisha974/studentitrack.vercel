const courseSchema = {
  body: {
    type: 'object',
    properties: {
      code: { type: 'string', minLength: 1 },
      name: { type: 'string', minLength: 1 },
      credits: { type: 'integer', minimum: 0 },
      professorId: { type: 'string' },
      professor_id: { type: 'string' },
      term: { type: 'string', enum: ['first', 'second'] }
    },
    required: ['code', 'name']
  }
}

const courseIdParamSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['id']
  }
}

const courseCodeParamSchema = {
  params: {
    type: 'object',
    properties: {
      code: { type: 'string' }
    },
    required: ['code']
  }
}

const professorIdParamSchema = {
  params: {
    type: 'object',
    properties: {
      professorId: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['professorId']
  }
}

module.exports = {
  courseSchema,
  courseIdParamSchema,
  courseCodeParamSchema,
  professorIdParamSchema
}


const studentIdParamSchema = {
  params: {
    type: 'object',
    properties: {
      studentId: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['studentId']
  }
}

const courseIdParamSchema = {
  params: {
    type: 'object',
    properties: {
      courseId: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['courseId']
  }
}

module.exports = {
  studentIdParamSchema,
  courseIdParamSchema
}


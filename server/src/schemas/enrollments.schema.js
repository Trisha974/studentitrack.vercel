const enrollmentSchema = {
  body: {
    type: 'object',
    properties: {
      studentId: { type: ['integer', 'string'] },
      student_id: { type: ['integer', 'string'] },
      courseId: { type: ['integer', 'string'] },
      course_id: { type: ['integer', 'string'] }
    },
    required: [],
    anyOf: [
      { required: ['studentId', 'courseId'] },
      { required: ['student_id', 'course_id'] }
    ]
  }
}

const enrollmentIdParamSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['id']
  }
}

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
  enrollmentSchema,
  enrollmentIdParamSchema,
  studentIdParamSchema,
  courseIdParamSchema
}


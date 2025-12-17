const attendanceSchema = {
  body: {
    type: 'object',
    properties: {
      studentId: { type: 'integer' },
      student_id: { type: 'integer' },
      courseId: { type: 'integer' },
      course_id: { type: 'integer' },
      date: { type: 'string', format: 'date' },
      status: { type: 'string', enum: ['present', 'absent', 'late', 'excused'] }
    },
    required: ['date', 'status']
  }
}

const attendanceIdParamSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['id']
  }
}

module.exports = {
  attendanceSchema,
  attendanceIdParamSchema
}


const gradeSchema = {
  body: {
    type: 'object',
    properties: {
      studentId: { type: ['integer', 'string'] },
      student_id: { type: ['integer', 'string'] },
      courseId: { type: ['integer', 'string'] },
      course_id: { type: ['integer', 'string'] },
      assessmentType: { type: 'string', minLength: 1 },
      assessment_type: { type: 'string', minLength: 1 },
      assessmentTitle: { type: 'string', minLength: 1 },
      assessment_title: { type: 'string', minLength: 1 },
      score: { type: ['number', 'string'] },
      maxPoints: { type: ['number', 'string'] },
      max_points: { type: ['number', 'string'] },
      date: { 
        type: ['string', 'null'],
        // Accept both date-time (ISO 8601) and date (YYYY-MM-DD) formats, or null
        oneOf: [
          { type: 'null' },
          { format: 'date-time' },
          { pattern: '^\\d{4}-\\d{2}-\\d{2}$' }
        ]
      }
    },
    // Make schema more flexible - accept either camelCase or snake_case
    anyOf: [
      {
        required: ['assessmentType', 'assessmentTitle', 'score', 'maxPoints']
      },
      {
        required: ['assessment_type', 'assessment_title', 'score', 'max_points']
      }
    ],
    // Don't fail on additional properties
    additionalProperties: true
  }
}

const gradeIdParamSchema = {
  params: {
    type: 'object',
    properties: {
      id: { type: 'string', pattern: '^[0-9]+$' }
    },
    required: ['id']
  }
}

module.exports = {
  gradeSchema,
  gradeIdParamSchema
}


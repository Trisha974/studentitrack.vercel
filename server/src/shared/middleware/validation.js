const { body, param, query, validationResult } = require('express-validator')

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() })
  }
  next()
}

const validateStudent = [
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('studentId').optional().trim(),
  body('department').optional().trim(),
  handleValidationErrors
]

const validateStudentId = [
  param('id').isInt().withMessage('Invalid student ID'),
  handleValidationErrors
]

const validateProfessor = [
  body('name').optional({ checkFalsy: true }).trim().notEmpty().withMessage('Name cannot be empty if provided'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Valid email is required if provided'),
  body('department').optional({ nullable: true }).trim(),
  body('photoUrl').optional({ nullable: true }),
  body('photo_url').optional({ nullable: true }),
  handleValidationErrors
]

const validateCourse = [
  body('code').trim().notEmpty().withMessage('Course code is required'),
  body('name').trim().notEmpty().withMessage('Course name is required'),
  body('credits').optional().isInt({ min: 0 }).withMessage('Credits must be a non-negative integer'),
  body('professorId').optional().trim(),
  body('term').optional().isIn(['first', 'second']).withMessage('Term must be either "first" or "second"'),
  handleValidationErrors
]

const validateCourseUpdate = [
  body('code').optional().trim().notEmpty().withMessage('Course code cannot be empty if provided'),
  body('name').optional().trim().notEmpty().withMessage('Course name cannot be empty if provided'),
  body('credits').optional().isInt({ min: 0 }).withMessage('Credits must be a non-negative integer'),
  body('professorId').optional().trim(),
  body('term').optional().isIn(['first', 'second']).withMessage('Term must be either "first" or "second"'),
  handleValidationErrors
]

const validateCourseId = [
  param('id').isInt().withMessage('Invalid course ID'),
  handleValidationErrors
]

const validateEnrollment = [
  body('studentId').isInt().withMessage('Valid student ID is required'),
  body('courseId').isInt().withMessage('Valid course ID is required'),
  handleValidationErrors
]

const validateGrade = [
  body('studentId').isInt().withMessage('Valid student ID is required'),
  body('courseId').isInt().withMessage('Valid course ID is required'),
  body('assessmentType').trim().notEmpty().withMessage('Assessment type is required'),
  body('assessmentTitle').trim().notEmpty().withMessage('Assessment title is required'),
  body('score').isFloat({ min: 0 }).withMessage('Score must be a non-negative number'),
  body('maxPoints').isFloat({ min: 0 }).withMessage('Max points must be a non-negative number'),
  body('date').optional().isISO8601().withMessage('Date must be valid ISO format'),
  handleValidationErrors
]

const validateAttendance = [
  body('studentId').isInt().withMessage('Valid student ID is required'),
  body('courseId').isInt().withMessage('Valid course ID is required'),
  body('date').isISO8601().withMessage('Date must be valid ISO format'),
  body('status').isIn(['present', 'absent', 'late', 'excused']).withMessage('Invalid status'),
  handleValidationErrors
]

module.exports = {
  validateStudent,
  validateStudentId,
  validateProfessor,
  validateCourse,
  validateCourseUpdate,
  validateCourseId,
  validateEnrollment,
  validateGrade,
  validateAttendance,
  handleValidationErrors
}



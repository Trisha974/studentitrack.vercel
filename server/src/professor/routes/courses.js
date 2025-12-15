const express = require('express')
const router = express.Router()
const {
  getAllCourses,
  getCourseById,
  getCourseByCode,
  getCoursesByProfessor,
  createCourse,
  updateCourse,
  deleteCourse
} = require('../controllers/coursesController')
const { verifyToken, requireProfessor } = require('../../shared/middleware/auth')
const { validateCourse, validateCourseUpdate, validateCourseId } = require('../../shared/middleware/validation')

router.use(verifyToken)

router.get('/', getAllCourses)
router.get('/professor/:professorId', getCoursesByProfessor)
router.get('/code/:code', getCourseByCode)
router.get('/:id', validateCourseId, getCourseById)
router.post('/', requireProfessor, validateCourse, createCourse)
router.put('/:id', requireProfessor, validateCourseId, validateCourseUpdate, updateCourse)
router.delete('/:id', requireProfessor, validateCourseId, deleteCourse)

module.exports = router


const Course = require('../models/Course')
const Professor = require('../models/Professor')
const { isProfessor } = require('../../shared/utils/roleHelpers')

const getAllCourses = async (req, res, next) => {
  try {
    const courses = await Course.findAll()
    res.json(courses)
  } catch (error) {
    next(error)
  }
}

const getCourseByCode = async (req, res, next) => {
  try {
    let code = req.params.code || req.query.code
    if (!code) {
      return res.status(400).json({ error: 'Course code is required' })
    }
    
    if (req.params.code) {
      code = decodeURIComponent(code)
    } else if (req.query.code) {
      code = code.replace(/\+/g, ' ')
    }
    
    const professorId = req.query.professorId || null
    const course = await Course.findByCode(code, professorId)
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }
    
    res.json(course)
  } catch (error) {
    next(error)
  }
}

const getCourseById = async (req, res, next) => {
  try {
    const course = await Course.findById(req.params.id)
    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }
    res.json(course)
  } catch (error) {
    next(error)
  }
}

const getCoursesByProfessor = async (req, res, next) => {
  try {
    const professorId = req.params.professorId || req.query.professorId
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID is required' })
    }
    const courses = await Course.findByProfessor(professorId)
    res.json(courses)
  } catch (error) {
    next(error)
  }
}

const createCourse = async (req, res, next) => {
  try {
    let professorId = req.body.professorId || req.body.professor_id
    
    if (!professorId && isProfessor(req.user.role)) {
      const professor = await Professor.findByFirebaseUid(req.user.uid)
      if (!professor) {
        return res.status(404).json({ error: 'Professor profile not found. Please complete your profile first.' })
      }
      professorId = professor.id
    }
    
    if (!professorId) {
      return res.status(400).json({ error: 'Professor ID is required' })
    }
    
    if (!req.body.code || !req.body.name) {
      return res.status(400).json({ error: 'Course code and name are required' })
    }
    
    const course = await Course.create({
      code: req.body.code,
      name: req.body.name,
      credits: req.body.credits || 0,
      professor_id: professorId,
      term: req.body.term || 'first'
    })
    res.status(201).json(course)
  } catch (error) {
    console.error('Error creating course:', error)
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Course with this code already exists for this professor' })
    }
    // Log the full error for debugging
    if (error.sql) {
      console.error('SQL Error:', error.sql)
      console.error('SQL Message:', error.message)
    }
    next(error)
  }
}

const updateCourse = async (req, res, next) => {
  try {
    // Verify professor owns this course
    if (isProfessor(req.user.role)) {
      const professor = await Professor.findByFirebaseUid(req.user.uid)
      if (!professor) {
        return res.status(404).json({ error: 'Professor profile not found' })
      }
      
      const course = await Course.findById(req.params.id)
      if (!course) {
        return res.status(404).json({ error: 'Course not found' })
      }
      
      if (course.professor_id !== professor.id) {
        return res.status(403).json({ error: 'You can only update courses that you teach' })
      }
    }
    
    // Build update object - only include fields that are provided
    const updateData = {}
    if (req.body.code !== undefined) updateData.code = req.body.code
    if (req.body.name !== undefined) updateData.name = req.body.name
    if (req.body.credits !== undefined) updateData.credits = req.body.credits
    if (req.body.professorId !== undefined || req.body.professor_id !== undefined) {
      updateData.professor_id = req.body.professorId || req.body.professor_id
    }
    if (req.body.term !== undefined) updateData.term = req.body.term
    
    const course = await Course.update(req.params.id, updateData)
    
    if (!course) {
      return res.status(404).json({ error: 'Course not found' })
    }
    
    res.json(course)
  } catch (error) {
    next(error)
  }
}

const deleteCourse = async (req, res, next) => {
  try {
    // Verify professor owns this course
    if (isProfessor(req.user.role)) {
      const professor = await Professor.findByFirebaseUid(req.user.uid)
      if (!professor) {
        return res.status(404).json({ error: 'Professor profile not found' })
      }
      
      const course = await Course.findById(req.params.id)
      if (!course) {
        return res.status(404).json({ error: 'Course not found' })
      }
      
      if (course.professor_id !== professor.id) {
        return res.status(403).json({ error: 'You can only delete courses that you teach' })
      }
    }
    
    await Course.delete(req.params.id)
    res.json({ message: 'Course deleted successfully' })
  } catch (error) {
    next(error)
  }
}

module.exports = {
  getAllCourses,
  getCourseById,
  getCourseByCode,
  getCoursesByProfessor,
  createCourse,
  updateCourse,
  deleteCourse
}


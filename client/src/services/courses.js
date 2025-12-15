import * as coursesApi from './api/coursesApi'

/**
 * Creates a new course
 * @param {Object} courseData - { code, name, credits, professorId }
 * @returns {Promise<string>} Course ID
 */
async function createCourse(courseData) {
  const course = await coursesApi.createCourse(courseData)
  return course.id.toString()
}

/**
 * Gets a course by its ID
 * @param {string|number} courseId - Course ID
 * @returns {Promise<Object|null>} Course document or null
 */
async function getCourseById(courseId) {
  if (!courseId) return null
  return await coursesApi.getCourseById(courseId)
}

/**
 * Gets all courses taught by a professor
 * @param {string|number} professorId - Professor's MySQL ID (not Firebase UID)
 * @returns {Promise<Array>} Array of course documents
 */
async function getCoursesByProfessor(professorId) {
  if (!professorId) return []
  return await coursesApi.getCoursesByProfessor(professorId)
}

/**
 * Gets a course by its code (e.g., "CCE106 2061")
 * @param {string} code - Course code
 * @param {string|number} professorId - Optional professor ID to filter
 * @returns {Promise<Object|null>} Course document or null
 */
async function getCourseByCode(code, professorId = null) {
  if (!code) return null
  return await coursesApi.getCourseByCode(code, professorId)
}

/**
 * Updates a course
 * @param {string|number} courseId - Course ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object|null>} Updated course document
 */
async function updateCourse(courseId, updates) {
  if (!courseId) return null
  return await coursesApi.updateCourse(courseId, updates)
}

/**
 * Deletes a course
 * @param {string|number} courseId - Course ID
 * @returns {Promise<boolean>} Success status
 */
async function deleteCourse(courseId) {
  if (!courseId) return false
  await coursesApi.deleteCourse(courseId)
  return true
}

export {
  createCourse,
  getCourseById,
  getCoursesByProfessor,
  getCourseByCode,
  updateCourse,
  deleteCourse,
}




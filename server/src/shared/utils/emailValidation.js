/**
 * Email validation utilities for secure login
 */

/**
 * Validates professor email - must end with @umindanao.edu.ph
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid professor email
 */
function isValidProfessorEmail(email) {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  const normalizedEmail = email.toLowerCase().trim()
  return normalizedEmail.endsWith('@umindanao.edu.ph')
}

/**
 * Validates student email - must match pattern {studentId}.tc@umindanao.edu.ph
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid student email
 */
function isValidStudentEmail(email) {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  const normalizedEmail = email.toLowerCase().trim()
  
  // Pattern: {studentId}.tc@umindanao.edu.ph
  // Examples: 123456.tc@umindanao.edu.ph, 2021-12345.tc@umindanao.edu.ph
  const studentEmailPattern = /^[0-9A-Za-z\-]+\.tc@umindanao\.edu\.ph$/
  
  return studentEmailPattern.test(normalizedEmail)
}

/**
 * Extracts student ID from student email
 * @param {string} email - Student email address
 * @returns {string|null} - Student ID or null if invalid format
 */
function extractStudentIdFromEmail(email) {
  if (!isValidStudentEmail(email)) {
    return null
  }
  
  // Extract the part before .tc@umindanao.edu.ph
  const normalizedEmail = email.toLowerCase().trim()
  const match = normalizedEmail.match(/^(.+)\.tc@umindanao\.edu\.ph$/)
  
  return match ? match[1] : null
}

/**
 * Validates email based on user role
 * @param {string} email - Email address to validate
 * @param {string} role - User role ('Student' or 'Professor')
 * @returns {{valid: boolean, error?: string}} - Validation result
 */
function validateEmailByRole(email, role) {
  if (!email || typeof email !== 'string') {
    return { valid: false, error: 'Email is required' }
  }
  
  const normalizedEmail = email.toLowerCase().trim()
  
  if (role === 'Professor') {
    if (!isValidProfessorEmail(normalizedEmail)) {
      return { 
        valid: false, 
        error: 'Professor email must end with @umindanao.edu.ph' 
      }
    }
    return { valid: true }
  }
  
  if (role === 'Student') {
    if (!isValidStudentEmail(normalizedEmail)) {
      return { 
        valid: false, 
        error: 'Student email must follow the pattern: {studentId}.tc@umindanao.edu.ph (e.g., 123456.tc@umindanao.edu.ph)' 
      }
    }
    return { valid: true }
  }
  
  return { valid: false, error: 'Invalid role specified' }
}

module.exports = {
  isValidProfessorEmail,
  isValidStudentEmail,
  extractStudentIdFromEmail,
  validateEmailByRole
}


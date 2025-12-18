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
 * Validates student email - must end with .tc@umindanao.edu.ph and contain a student ID
 * @param {string} email - Email address to validate
 * @returns {boolean} - True if valid student email
 */
function isValidStudentEmail(email) {
  if (!email || typeof email !== 'string') {
    return false
  }
  
  const normalizedEmail = email.toLowerCase().trim()
  
  // Pattern: Must end with .tc@umindanao.edu.ph
  // Examples: 
  // - 123456.tc@umindanao.edu.ph (strict format)
  // - t.talamillo.141715.tc@umindanao.edu.ph (flexible format with name)
  // - name.lastname.studentid.tc@umindanao.edu.ph (any format ending in .tc@umindanao.edu.ph)
  const studentEmailPattern = /\.tc@umindanao\.edu\.ph$/
  
  if (!studentEmailPattern.test(normalizedEmail)) {
    return false
  }
  
  // Extract potential student ID (numbers before .tc@)
  // Look for numeric student ID pattern in the email
  const studentIdMatch = normalizedEmail.match(/(\d{6,})\.tc@umindanao\.edu\.ph$/)
  if (studentIdMatch) {
    return true
  }
  
  // Also accept format with name prefix (e.g., name.141715.tc@umindanao.edu.ph)
  // Just check that it ends with .tc@umindanao.edu.ph
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
  
  // Extract the numeric student ID (6+ digits before .tc@umindanao.edu.ph)
  const normalizedEmail = email.toLowerCase().trim()
  
  // Try to match numeric student ID pattern
  // Pattern: {numbers}.tc@umindanao.edu.ph (e.g., 141715.tc@umindanao.edu.ph)
  // Or: {anything}.{numbers}.tc@umindanao.edu.ph (e.g., t.talamillo.141715.tc@umindanao.edu.ph)
  const studentIdMatch = normalizedEmail.match(/(\d{6,})\.tc@umindanao\.edu\.ph$/)
  
  if (studentIdMatch) {
    return studentIdMatch[1] // Return the numeric student ID
  }
  
  // Fallback: extract everything before .tc@umindanao.edu.ph
  const match = normalizedEmail.match(/^(.+)\.tc@umindanao\.edu\.ph$/)
  if (match) {
    // If the entire prefix is numeric, return it
    if (/^\d+$/.test(match[1])) {
      return match[1]
    }
    // Otherwise, try to extract numeric part from the end
    const numericMatch = match[1].match(/(\d{6,})$/)
    return numericMatch ? numericMatch[1] : match[1]
  }
  
  return null
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


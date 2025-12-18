/**
 * Student Verification Utilities
 * Ensures proper linking between numerical Student ID and official university email
 * This is critical for data synchronization between Professor and Student dashboards
 */

import { getStudentByNumericalId, getStudentByEmail } from '../services/students'

/**
 * Verifies and retrieves a student's Firestore UID using the numerical Student ID + Email pairing
 * This ensures data written by Professor is correctly linked to the authenticated student
 * 
 * @param {string} numericalStudentId - The numerical student ID (e.g., "141715")
 * @param {string} email - The official university email address
 * @returns {Promise<{uid: string, verified: boolean, student: Object|null}>}
 *   Returns the student's Firebase Auth UID if verification succeeds, null otherwise
 */
export async function verifyStudentIdEmailPair(numericalStudentId, email) {
  if (!numericalStudentId || !email) {
    return { uid: null, verified: false, student: null, error: 'Missing student ID or email' }
  }

  try {
    // Step 1: Find student by numerical ID (primary lookup method for professors)
    const studentById = await getStudentByNumericalId(numericalStudentId)
    
    if (!studentById) {
      // Student not found by ID - might not be registered yet
      return { uid: null, verified: false, student: null, error: 'Student not found by ID' }
    }

    // Step 2: Verify the email matches (critical security check)
    if (studentById.email && studentById.email.toLowerCase() !== email.toLowerCase()) {
      // Email mismatch - this indicates a potential data integrity issue
      console.warn(`Email mismatch for student ID ${numericalStudentId}: expected ${email}, found ${studentById.email}`)
      return { 
        uid: null, 
        verified: false, 
        student: studentById, 
        error: 'Email mismatch - student ID and email do not match' 
      }
    }

    // Step 3: Return the Firebase Auth UID (firebase_uid field from MySQL)
    return {
      uid: studentById.firebase_uid || studentById.firebaseUid || null, // Firebase Auth UID from MySQL
      verified: true,
      student: studentById,
      error: null
    }
  } catch (error) {
    console.error('Error verifying student ID-email pair:', error)
    return { uid: null, verified: false, student: null, error: error.message }
  }
}

/**
 * Alternative verification method: Find student by email first, then verify ID
 * Useful when email is the primary identifier (e.g., during login)
 * 
 * @param {string} email - The official university email address
 * @param {string} numericalStudentId - The numerical student ID to verify
 * @returns {Promise<{uid: string, verified: boolean, student: Object|null}>}
 */
export async function verifyEmailStudentIdPair(email, numericalStudentId) {
  if (!email || !numericalStudentId) {
    return { uid: null, verified: false, student: null, error: 'Missing email or student ID' }
  }

  try {
    // Step 1: Find student by email (primary lookup for authentication)
    const studentByEmail = await getStudentByEmail(email)
    
    if (!studentByEmail) {
      return { uid: null, verified: false, student: null, error: 'Student not found by email' }
    }

    // Step 2: Verify the numerical student ID matches
    if (studentByEmail.studentId && studentByEmail.studentId !== numericalStudentId) {
      console.warn(`Student ID mismatch for email ${email}: expected ${numericalStudentId}, found ${studentByEmail.studentId}`)
      return { 
        uid: null, 
        verified: false, 
        student: studentByEmail, 
        error: 'Student ID mismatch' 
      }
    }

    return {
      uid: studentByEmail.firebase_uid || studentByEmail.firebaseUid || null, // Firebase Auth UID from MySQL
      verified: true,
      student: studentByEmail,
      error: null
    }
  } catch (error) {
    console.error('Error verifying email-student ID pair:', error)
    return { uid: null, verified: false, student: null, error: error.message }
  }
}

/**
 * Gets student UID for data synchronization
 * Tries numerical ID first (professor's primary method), then falls back to email
 * 
 * @param {string} numericalStudentId - Numerical student ID
 * @param {string} email - Student email (optional, used as fallback)
 * @returns {Promise<string|null>} Firebase Auth UID or null
 */
export async function getStudentUidForSync(numericalStudentId, email = null) {
  if (!numericalStudentId) return null

  try {
    // Primary method: Lookup by numerical ID
    const student = await getStudentByNumericalId(numericalStudentId)
    if (student) {
      // If email provided, verify it matches
      if (email && student.email && student.email.toLowerCase() !== email.toLowerCase()) {
        console.warn(`Email mismatch for student ${numericalStudentId}, but proceeding with ID lookup`)
      }
      // Return Firebase Auth UID (firebase_uid field from MySQL)
      const firebaseUid = student.firebase_uid || student.firebaseUid
      if (firebaseUid && typeof firebaseUid === 'string' && !firebaseUid.startsWith('temp_')) {
        return firebaseUid
      }
      console.warn(`Student ${numericalStudentId} has no valid Firebase UID (found: ${firebaseUid})`)
      return null
    }

    // Fallback: Try email lookup if provided
    if (email) {
      const studentByEmail = await getStudentByEmail(email)
      if (studentByEmail) {
        // Verify the ID matches if studentId field exists
        if (studentByEmail.studentId && studentByEmail.studentId !== numericalStudentId) {
          console.warn(`Student ID mismatch: expected ${numericalStudentId}, found ${studentByEmail.studentId}`)
        }
        // Return Firebase Auth UID (firebase_uid field from MySQL)
        const firebaseUid = studentByEmail.firebase_uid || studentByEmail.firebaseUid
        if (firebaseUid && typeof firebaseUid === 'string' && !firebaseUid.startsWith('temp_')) {
          return firebaseUid
        }
        console.warn(`Student ${email} has no valid Firebase UID (found: ${firebaseUid})`)
        return null
      }
    }

    return null
  } catch (error) {
    console.error('Error getting student UID for sync:', error)
    return null
  }
}


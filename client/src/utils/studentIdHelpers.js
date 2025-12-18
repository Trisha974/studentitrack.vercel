

export function generateStudentEmail(fullName, studentId) {
  if (!fullName || !studentId) return ''

const normalized = fullName.trim().toLowerCase().replace(/\s+/g, ' ')
  const parts = normalized.split(' ')

  if (parts.length === 0) return ''

const firstName = parts[0]

const lastName = parts.length > 1 ? parts[parts.length - 1] : firstName

const email = `${firstName}.${lastName}.${studentId}.tc@umindanao.edu.ph`

  return email
}

export function extractStudentIdFromEmail(email) {
  if (!email || typeof email !== 'string') return null

const match = email.match(/\.(\d+)\.tc@umindanao\.edu\.ph$/)
  return match ? match[1] : null
}

export function isValidNumericalStudentId(studentId) {
  return studentId && /^\d+$/.test(studentId)
}


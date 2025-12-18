

const ID_MIGRATION_MAP = {
  'S101': '141715',
  'S102': '142177',
  'S103': '141800',
  'S104': '141900',
}

export function isLegacyStudentId(studentId) {
  return studentId && typeof studentId === 'string' && /^S\d+$/.test(studentId)
}

export function migrateStudentId(legacyId) {
  if (!isLegacyStudentId(legacyId)) {
    return legacyId
  }
  return ID_MIGRATION_MAP[legacyId] || null
}

export function migrateStudent(student) {
  if (!student || !student.id) return student

  const migratedId = migrateStudentId(student.id)
  const migrated = {
    ...student,

    archivedSubjects: student.archivedSubjects || []
  }

  if (migratedId && migratedId !== student.id) {
    migrated.id = migratedId
  }

  return migrated
}

export function migrateStudents(students) {
  if (!Array.isArray(students)) return students
  return students.map(migrateStudent)
}

export function migrateEnrollments(enrolls) {
  if (!enrolls || typeof enrolls !== 'object') return enrolls

  const migrated = {}
  for (const [subjectCode, studentIds] of Object.entries(enrolls)) {
    if (Array.isArray(studentIds)) {
      migrated[subjectCode] = studentIds.map(id => migrateStudentId(id) || id)
    } else {
      migrated[subjectCode] = studentIds
    }
  }
  return migrated
}

export function migrateRecords(records) {
  if (!records || typeof records !== 'object') return records

  const migrated = {}
  for (const [date, dateRecords] of Object.entries(records)) {
    if (dateRecords && typeof dateRecords === 'object') {
      migrated[date] = {}
      for (const [subjectCode, subjectRecords] of Object.entries(dateRecords)) {
        if (subjectRecords && typeof subjectRecords === 'object') {
          migrated[date][subjectCode] = {}
          for (const [studentId, status] of Object.entries(subjectRecords)) {
            const migratedId = migrateStudentId(studentId) || studentId
            migrated[date][subjectCode][migratedId] = status
          }
        } else {
          migrated[date][subjectCode] = subjectRecords
        }
      }
    } else {
      migrated[date] = dateRecords
    }
  }
  return migrated
}

export function migrateGrades(grades) {
  if (!grades || typeof grades !== 'object') return grades

  const migrated = {}
  for (const [subjectCode, subjectGrades] of Object.entries(grades)) {
    if (subjectGrades && typeof subjectGrades === 'object') {
      migrated[subjectCode] = {}
      for (const [gradeType, assessments] of Object.entries(subjectGrades)) {
        if (Array.isArray(assessments)) {
          migrated[subjectCode][gradeType] = assessments.map(assessment => {
            if (assessment.scores && typeof assessment.scores === 'object') {
              const migratedScores = {}
              for (const [studentId, score] of Object.entries(assessment.scores)) {
                const migratedId = migrateStudentId(studentId) || studentId
                migratedScores[migratedId] = score
              }
              return {
                ...assessment,
                scores: migratedScores
              }
            }
            return assessment
          })
        } else {
          migrated[subjectCode][gradeType] = assessments
        }
      }
    } else {
      migrated[subjectCode] = subjectGrades
    }
  }
  return migrated
}

export function migrateDashboardData(dashboardData) {
  if (!dashboardData || typeof dashboardData !== 'object') return dashboardData

  return {
    ...dashboardData,
    students: migrateStudents(dashboardData.students || []),
    removedStudents: migrateStudents(dashboardData.removedStudents || []),
    enrolls: migrateEnrollments(dashboardData.enrolls || {}),
    records: migrateRecords(dashboardData.records || {}),
    grades: migrateGrades(dashboardData.grades || {}),
  }
}


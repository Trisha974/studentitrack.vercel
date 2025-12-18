
// Firebase/Firestore imports removed - system now uses MySQL/JWT
// import { doc, onSnapshot } from 'firebase/firestore'
// import { db } from '../firebase'
// const db = null // Not needed since Firestore is disabled

const DASHBOARD_COLLECTION = 'professorDashboards'
const STUDENT_DASHBOARD_COLLECTION = 'studentDashboards'

const UPDATE_THROTTLE_MS = 60000

function isRealtimeDisabled() {
  try {
    return localStorage.getItem('disableRealtimeUpdates') === 'true' ||
           process.env.REACT_APP_DISABLE_REALTIME === 'true'
  } catch {
    return false
  }
}

export function subscribeToProfessorDashboard(professorUid, onUpdate) {
  if (!professorUid) {
    return () => {}
  }

  // Real-time updates disabled - system uses MySQL with polling instead
  // No warning needed - this is expected behavior
  return () => {}
}

export function subscribeToStudentDashboard(studentUid, onUpdate) {
  if (!studentUid) {
    return () => {}
  }

  // Real-time updates disabled - system uses MySQL with polling instead
  // No warning needed - this is expected behavior
  return () => {}
}

export function detectDateChanges(oldData, newData) {
  if (!oldData || !newData) return []

  const changes = []
  const oldGrades = oldData.grades || {}
  const newGrades = newData.grades || {}

Object.keys(newGrades).forEach(subjectCode => {
    const oldSubjectGrades = oldGrades[subjectCode] || {}
    const newSubjectGrades = newGrades[subjectCode] || {}

    Object.keys(newSubjectGrades).forEach(assessmentType => {
      const oldAssessments = oldSubjectGrades[assessmentType] || []
      const newAssessments = newSubjectGrades[assessmentType] || []

newAssessments.forEach((newAssessment, index) => {
        const oldAssessment = oldAssessments[index]

        if (!oldAssessment && newAssessment.dueDate) {
          changes.push({
            type: 'added',
            subjectCode,
            assessmentType,
            assessmentTitle: newAssessment.title,
            dueDate: newAssessment.dueDate,
          })
        } else if (oldAssessment && newAssessment.dueDate !== oldAssessment.dueDate) {
          changes.push({
            type: 'updated',
            subjectCode,
            assessmentType,
            assessmentTitle: newAssessment.title,
            oldDueDate: oldAssessment.dueDate,
            newDueDate: newAssessment.dueDate,
          })
        }
      })

if (oldAssessments.length > newAssessments.length) {
        oldAssessments.slice(newAssessments.length).forEach(deletedAssessment => {
          if (deletedAssessment.dueDate) {
            changes.push({
              type: 'deleted',
              subjectCode,
              assessmentType,
              assessmentTitle: deletedAssessment.title,
              dueDate: deletedAssessment.dueDate,
            })
          }
        })
      }
    })
  })

  return changes
}


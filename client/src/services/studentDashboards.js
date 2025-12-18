

// Firebase/Firestore imports removed - system now uses MySQL/JWT
// import { db } from '../firebase'
// import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore'
const db = null

const COLLECTION = 'studentDashboards'

async function getStudentDashboard(uid) {
  if (!uid) return null
  // Firestore disabled - return null (use MySQL backend instead)
  // const docRef = doc(db, COLLECTION, uid)
  // const snap = await getDoc(docRef)
  // return snap.exists() ? { id: snap.id, ...snap.data() } : null
  return null
}

async function setStudentDashboard(uid, data) {
  if (!uid) return null
  // Firestore disabled - return null (use MySQL backend instead)
  // const docRef = doc(db, COLLECTION, uid)
  // const payload = { ...data, updatedAt: new Date().toISOString() }
  // await setDoc(docRef, payload, { merge: true })
  // const snap = await getDoc(docRef)
  // return snap.exists() ? { id: snap.id, ...snap.data() } : null
  return null
}

async function updateStudentDashboard(uid, updates = {}) {
  if (!uid) return null
  const docRef = doc(db, COLLECTION, uid)
  const timestamp = new Date().toISOString()
  const payload = {
    ...updates,
    updatedAt: timestamp,
  }

  try {
    await updateDoc(docRef, payload)
  } catch (error) {

if (error.code === 'not-found') {
      const bootstrapPayload = {
        subjects: [],
        grades: {},
        attendance: {},
        notifications: [],
        createdAt: timestamp,
        ...payload,
      }
      await setDoc(docRef, bootstrapPayload, { merge: true })
    } else {
      throw error
    }
  }

  const snap = await getDoc(docRef)
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

async function syncStudentGrade(studentUid, subjectCode, assessmentType, assessmentTitle, score, maxPoints, options = {}) {
  if (!studentUid) return

  try {
    const dashboard = await getStudentDashboard(studentUid)
    const currentGrades = dashboard?.grades || {}
    const currentNotifications = dashboard?.notifications || []
    const subjectGrades = currentGrades[subjectCode] || {}
    const typeGrades = subjectGrades[assessmentType] || []
    const timestamp = new Date().toISOString()
    const subjectName = options.subjectName || null

const assessmentIndex = typeGrades.findIndex(a => a.title === assessmentTitle)
    const assessment = {
      title: assessmentTitle,
      score,
      maxPoints,
      date: timestamp,
    }

    if (assessmentIndex >= 0) {
      typeGrades[assessmentIndex] = assessment
    } else {
      typeGrades.push(assessment)
    }

    subjectGrades[assessmentType] = typeGrades
    currentGrades[subjectCode] = subjectGrades

    const readableType = assessmentType
      ? assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1)
      : 'Assessment'
    const notification = {
      id: `grade-${subjectCode}-${assessmentTitle}-${Date.now()}`,
      type: 'grade',
      title: `${subjectName || subjectCode}: ${readableType} Posted`,
      message: score !== undefined && maxPoints !== undefined
        ? `Your ${readableType.toLowerCase()} "${assessmentTitle}" score is ${score}/${maxPoints}.`
        : `A new ${readableType.toLowerCase()} "${assessmentTitle}" has been posted.`,
      subjectCode,
      subjectName,
      assessmentType,
      assessmentTitle,
      score,
      maxPoints,
      read: false,
      timestamp,
    }
    const updatedNotifications = [notification, ...currentNotifications].slice(0, 50)

    await updateStudentDashboard(studentUid, { grades: currentGrades, notifications: updatedNotifications })
  } catch (error) {
    console.error('Failed to sync student grade', error)
  }
}

async function syncAllStudentGrades(studentUid, gradesData) {
  if (!studentUid || !gradesData) return

  try {
    await updateStudentDashboard(studentUid, { grades: gradesData })
  } catch (error) {
    console.error('Failed to sync all student grades', error)
  }
}

async function syncAllStudentAttendance(studentUid, recordsData, studentLocalId) {
  if (!studentUid || !recordsData || !studentLocalId) return

  try {

const attendance = {}
    Object.entries(recordsData).forEach(([date, dateRecords]) => {
      Object.entries(dateRecords).forEach(([subjectCode, studentRecords]) => {
        if (studentRecords[studentLocalId]) {
          if (!attendance[date]) attendance[date] = {}
          attendance[date][subjectCode] = studentRecords[studentLocalId]
        }
      })
    })

    await updateStudentDashboard(studentUid, { attendance })
  } catch (error) {
    console.error('Failed to sync all student attendance', error)
  }
}

async function syncStudentAttendance(studentUid, subjectCode, date, status, options = {}) {
  if (!studentUid) return

  try {
    const dashboard = await getStudentDashboard(studentUid)
    const currentAttendance = dashboard?.attendance || {}
    const currentNotifications = dashboard?.notifications || []
    const dateAttendance = currentAttendance[date] || {}
    const timestamp = new Date().toISOString()
    const subjectName = options.subjectName || null
    const dateLabel = options.dateLabel || date

    dateAttendance[subjectCode] = status
    currentAttendance[date] = dateAttendance

    const statusLabel = status === 'present' ? 'Present' : 'Absent'
    const notification = {
      id: `attendance-${subjectCode}-${date}-${Date.now()}`,
      type: 'attendance',
      title: `${subjectName || subjectCode} Attendance`,
      message: `You were marked ${statusLabel} on ${dateLabel} for ${subjectName || subjectCode}.`,
      subjectCode,
      subjectName,
      date,
      status,
      read: false,
      timestamp,
    }
    const updatedNotifications = [notification, ...currentNotifications].slice(0, 50)

    await updateStudentDashboard(studentUid, { attendance: currentAttendance, notifications: updatedNotifications })
  } catch (error) {
    console.error('Failed to sync student attendance', error)
  }
}

async function syncStudentSubjects(studentUid, subjects) {
  if (!studentUid) return

  try {
    const dashboard = await getStudentDashboard(studentUid)
    const currentSubjects = dashboard?.subjects || []
    const currentNotifications = dashboard?.notifications || []
    const currentSubjectCodes = new Set(
      currentSubjects
        .map(subject => subject?.code)
        .filter(Boolean)
    )

    const newSubjects = (subjects || []).filter(subject => {
      if (!subject || !subject.code) return false
      return !currentSubjectCodes.has(subject.code)
    })

    const timestamp = new Date().toISOString()
    const enrollmentNotifications = newSubjects.map(subject => ({
      id: `subject-${subject.code}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      type: 'subject',
      title: `${subject.code}: Enrollment Confirmed`,
      message: subject.name
        ? `You have been enrolled in ${subject.name}.`
        : `You have been enrolled in subject ${subject.code}.`,
      subjectCode: subject.code,
      subjectName: subject.name || subject.code,
      read: false,
      timestamp,
    }))

    const updatePayload = { subjects }
    if (enrollmentNotifications.length > 0) {
      updatePayload.notifications = [
        ...enrollmentNotifications,
        ...currentNotifications,
      ].slice(0, 50)
    }

    await updateStudentDashboard(studentUid, updatePayload)
  } catch (error) {
    console.error('Failed to sync student subjects', error)
  }
}

export {
  getStudentDashboard,
  setStudentDashboard,
  updateStudentDashboard,
  syncStudentGrade,
  syncStudentAttendance,
  syncStudentSubjects,
  syncAllStudentGrades,
  syncAllStudentAttendance,
}


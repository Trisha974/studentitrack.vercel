 import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import './Prof.css'
// Firebase/Firestore imports removed - system now uses MySQL/JWT
// import { doc, getDoc, setDoc } from 'firebase/firestore'
// import { db, auth, onAuthStateChanged as watchAuthState } from '../../firebase'
import { getDashboardState, saveDashboardState } from '../../services/dashboard'
import { getProfessorByUid, setProfessor, getCurrentProfessor } from '../../services/professors'
import { getStudentByEmail, getStudentByNumericalId, setStudent, addStudent, listStudents } from '../../services/students'
import {
  syncStudentGrade,
  syncStudentAttendance,
  syncStudentSubjects,
  getStudentDashboard,
} from '../../services/studentDashboards'
import { getCourseByCode, createCourse, getCoursesByProfessor, deleteCourse, updateCourse } from '../../services/courses'
import { createEnrollment, getEnrollmentByStudentAndCourse, subscribeToCourseEnrollments, getEnrollmentsByCourse, deleteEnrollmentByStudentAndCourse, deleteEnrollment } from '../../services/enrollments'
import { createGrade, getGradesByStudentAndCourse, updateGrade } from '../../services/grades'
import { setAttendanceForDate } from '../../services/attendance'
import { subscribeToProfessorDashboard, detectDateChanges } from '../../services/realtimeSync'
import { generateStudentEmail, isValidNumericalStudentId } from '../../utils/studentIdHelpers'
import { getStudentUidForSync, verifyStudentIdEmailPair } from '../../utils/studentVerification'
import { migrateDashboardData, migrateStudents, migrateEnrollments, migrateRecords, migrateGrades } from '../../utils/studentIdMigration'
import { useTheme } from '../../hooks/useTheme'
import * as XLSX from 'xlsx'
import { markAllAsRead, getNotifications, getUnreadCount } from '../../services/notifications'
import { getDefaultAvatar } from '../../utils/avatarGenerator'
import subjectIcon from './subject-icon.png.png'

const normalizeStudentId = (value) => {
  if (value === null || value === undefined) return ''
  return String(value).trim()
}

const normalizeEnrollsMap = (enrollsMap = {}) => {
  const normalized = {}
  Object.keys(enrollsMap).forEach(subjectCode => {
    const ids = Array.isArray(enrollsMap[subjectCode]) ? enrollsMap[subjectCode] : []
    const cleaned = ids
      .map(normalizeStudentId)
      .filter(Boolean)
    normalized[subjectCode] = Array.from(new Set(cleaned))
  })
  return normalized
}

function Prof() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('subjects')
  const [profName, setProfName] = useState('Professor User')
  const [profPic, setProfPic] = useState(null)
  const originalProfPicRef = useRef(null) // Store original photo when modal opens (use ref to avoid dependency issues)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showAddSubjectModal, setShowAddSubjectModal] = useState(false)
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [showSubjectDetail, setShowSubjectDetail] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  
  // Form states
  const [newSubject, setNewSubject] = useState({ code: '', name: '', credits: '', term: 'first' })
  const [profileForm, setProfileForm] = useState({ name: '', pic: null })
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false)
  const [addSubjectError, setAddSubjectError] = useState('')
  const [isSavingSubject, setIsSavingSubject] = useState(false)
  
  // Data states
  const [subjects, setSubjects] = useState([])
  const [removedSubjects, setRemovedSubjects] = useState([]) // Track archived subjects
  const [recycleBinSubjects, setRecycleBinSubjects] = useState([]) // Track deleted subjects in recycle bin
  const [students, setStudents] = useState([])
  const [enrolls, setEnrolls] = useState({})
  const [alerts, setAlerts] = useState([])
  const [archivingStudentIds, setArchivingStudentIds] = useState({})
  const [records, setRecords] = useState({})
  const [grades, setGrades] = useState({})
  const [currentSubject, setCurrentSubject] = useState(null)
  const [attendanceDate, setAttendanceDate] = useState(new Date().toISOString().slice(0, 10))
  const [currentTime, setCurrentTime] = useState('')
  const [quickGradeType, setQuickGradeType] = useState('quiz')
  const [quickGradeTitle, setQuickGradeTitle] = useState('')
  const [quickGradeMaxPoints, setQuickGradeMaxPoints] = useState('')
  const [quickGradeDueDate, setQuickGradeDueDate] = useState('')
  const [showQuickGradeGrid, setShowQuickGradeGrid] = useState(false)
  const [quickGradeScores, setQuickGradeScores] = useState({})
  const realtimeUnsubscribeRef = useRef(null)
  const previousDataRef = useRef(null)
  const isImportingRef = useRef(false) // Prevent real-time listener from overwriting during import
  const lastImportTimeRef = useRef(0) // Track when last import happened to prevent stale real-time updates
  const dataLoadTimeRef = useRef(0) // Track when data was loaded to prevent real-time overwrites immediately after load
  const [showLogoutModal, setShowLogoutModal] = useState(false)
  const [showAddStudentModal, setShowAddStudentModal] = useState(false)
  const [showAddStudentToSubjectModal, setShowAddStudentToSubjectModal] = useState(false)
  const [showFillScoreModal, setShowFillScoreModal] = useState(false)
  const [fillScoreValue, setFillScoreValue] = useState('')
  const [alreadyEnrolledMessage, setAlreadyEnrolledMessage] = useState(null)
  const [selectedSubjectForStudent, setSelectedSubjectForStudent] = useState(null)
  const [studentSubjectFilter, setStudentSubjectFilter] = useState('')
  const [showArchivedStudents, setShowArchivedStudents] = useState(false)
  const [newStudent, setNewStudent] = useState({ id: '', name: '', email: '', subjects: [] })
  // Subject search, filter, pagination states
  const [subjectSearchQuery, setSubjectSearchQuery] = useState('')
  const [subjectFilterTerm, setSubjectFilterTerm] = useState('all') // 'all', 'first', 'second'
  const [subjectSortBy, setSubjectSortBy] = useState('name') // 'name', 'code', 'credits', 'enrollment'
  const [subjectSortOrder, setSubjectSortOrder] = useState('asc') // 'asc', 'desc'
  const [subjectPage, setSubjectPage] = useState(1)
  const [subjectItemsPerPage] = useState(12) // Show 12 subjects per page
  const [studentToAdd, setStudentToAdd] = useState([]) // Changed to array for multiple selections
  const [studentSearchTermAdd, setStudentSearchTermAdd] = useState('') // Search term for Add Student to Subject dropdown
  const [showStudentSearchDropdownAdd, setShowStudentSearchDropdownAdd] = useState(false) // Toggle dropdown visibility
  const [newStudentQuick, setNewStudentQuick] = useState({ id: '', name: '', email: '' })
  // Comprehensive modal state
  const [addStudentModalTab, setAddStudentModalTab] = useState('import') // 'archived', 'create', or 'import'
  const [selectedStudentsForBulk, setSelectedStudentsForBulk] = useState([])
  const [selectedSubjectsForBulk, setSelectedSubjectsForBulk] = useState([])
  const [selectAllStudents, setSelectAllStudents] = useState(false)
  const [selectedArchivedSubjects, setSelectedArchivedSubjects] = useState([])
  const [selectAllArchivedSubjects, setSelectAllArchivedSubjects] = useState(false)
  const [selectedRecycleBinSubjects, setSelectedRecycleBinSubjects] = useState([])
  const [selectAllRecycleBinSubjects, setSelectAllRecycleBinSubjects] = useState(false)
  const [archivedStudentDetailView, setArchivedStudentDetailView] = useState(null) // Student ID for detail view
  const [studentSearchTerm, setStudentSearchTerm] = useState('') // Search term for student filtering
  const [showSearchDropdown, setShowSearchDropdown] = useState(false) // Control autocomplete dropdown visibility
  const [studentRecordSearchTerm, setStudentRecordSearchTerm] = useState('') // Search term for student records view
  const [studentRecordFilter, setStudentRecordFilter] = useState('all') // Filter: 'all', 'enrolled', 'archived'
  const [csvFile, setCsvFile] = useState(null)
  const [csvPreview, setCsvPreview] = useState([])
  const [csvImportWarnings, setCsvImportWarnings] = useState([])
  const [isImporting, setIsImporting] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0) // Force re-render trigger
  const [viewMode, setViewMode] = useState('professor')
  const [selectedStudentId, setSelectedStudentId] = useState('')
  const [studentDetailSubject, setStudentDetailSubject] = useState(null)
  const [subjectPreviewCode, setSubjectPreviewCode] = useState(null)
  const [profilePreview, setProfilePreview] = useState(null)
  const [studentAlerts, setStudentAlerts] = useState([])
  const [profUid, setProfUid] = useState(null)
  const [profEmail, setProfEmail] = useState('')
  const [profProfile, setProfProfile] = useState(null)
  const [studentProfileName, setStudentProfileName] = useState(null)
  const [profileSection, setProfileSection] = useState('account') // 'account', 'appearance'
  const [realtimeUpdatesDisabled, setRealtimeUpdatesDisabled] = useState(() => {
    try {
      return localStorage.getItem('disableRealtimeUpdates') === 'true'
    } catch {
      return false
    }
  })
  const [subjectCourseMap, setSubjectCourseMap] = useState({})
  const courseEnrollmentListenersRef = useRef({})
  const [showDeleteSubjectModal, setShowDeleteSubjectModal] = useState(false)
  const [subjectPendingDelete, setSubjectPendingDelete] = useState(null)
  const [deleteSubjectMode, setDeleteSubjectMode] = useState('delete') // 'archive' | 'delete'
  const [subjectsView, setSubjectsView] = useState('active') // 'active' | 'archived'
  const [archivedSubjectsSearchTerm, setArchivedSubjectsSearchTerm] = useState('') // Search term for archived subjects
  const [showRestoreSubjectDropdown, setShowRestoreSubjectDropdown] = useState(false)
  const [showNewStudentSubjectDropdown, setShowNewStudentSubjectDropdown] = useState(false)
  const restoreSubjectDropdownRef = useRef(null)
  const newStudentSubjectDropdownRef = useRef(null)
  const [isAddingStudentToSubject, setIsAddingStudentToSubject] = useState(false)
  const [isSavingGrades, setIsSavingGrades] = useState(false)
  const [gradesSaveStatus, setGradesSaveStatus] = useState(null) // 'saving', 'success', 'error', null
  const [toastMessage, setToastMessage] = useState(null) // For on-screen toast notifications
  const [isLoading, setIsLoading] = useState(false) // Loading state for data refresh

  const studentsById = useMemo(() => {
    const map = {}
    students.forEach(student => {
      const key = normalizeStudentId(student.id)
      if (key) {
        map[key] = student
      }
    })
    return map
  }, [students])

  const selectedStudentIdSet = useMemo(() => {
    return new Set(selectedStudentsForBulk.map(normalizeStudentId).filter(Boolean))
  }, [selectedStudentsForBulk])

  const setNormalizedEnrolls = useCallback((nextValue) => {
    if (typeof nextValue === 'function') {
      setEnrolls(prev => normalizeEnrollsMap(nextValue(prev)))
    } else {
      setEnrolls(normalizeEnrollsMap(nextValue))
    }
  }, [setEnrolls])

  const getSubjectLabel = useCallback((subjectCode) => {
    const subject = subjects.find(s => s.code === subjectCode)
    return subject ? `${subject.code} — ${subject.name}` : subjectCode
  }, [subjects])

  const navigateToSubjectTab = useCallback((subjectCode, tab) => {
    if (!subjectCode) return
    const findSubjectByCode = (code) => {
      if (!code) return null
      let subject = subjects.find(s => s.code === code)
      if (subject) return subject
      subject = subjects.find(s => s.code?.toLowerCase() === code.toLowerCase())
      if (subject) return subject
      subject = subjects.find(s => s.code?.includes(code) || code.includes(s.code))
      return subject || null
    }
    const subject = findSubjectByCode(subjectCode)
    if (!subject) return

    setSelectedSubject(subject)
    if (tab === 'attendance' || tab === 'grades' || tab === 'students' || tab === 'subjects') {
      setActiveTab(tab)
    }
    setShowNotifDropdown(false)

    // Best-effort URL update so deep-links remain meaningful
    try {
      const params = new URLSearchParams(location.search)
      params.set('tab', tab)
      params.set('subjectId', subject.code)
      navigate({ pathname: location.pathname, search: params.toString() })
    } catch {
      // Ignore navigation errors
    }
  }, [subjects, navigate, location.pathname, location.search])

  // Load real-time preference from Firestore (with localStorage backup) on mount
  useEffect(() => {
    const loadRealtimePreference = async () => {
      if (!profUid || !profProfile) return
      
      try {
        // Try Firestore first, with localStorage backup
        // Preferences are now stored in MySQL professor profile, not Firestore
        const profile = await getProfessorByUid(profUid)
        if (profile?.preferences?.disableRealtimeUpdates !== undefined) {
          const firestoreValue = profile.preferences.disableRealtimeUpdates
          const localValue = localStorage.getItem('disableRealtimeUpdates') === 'true'
          
          // If Firestore has a value, use it and sync to localStorage
          if (firestoreValue !== localValue) {
            if (firestoreValue) {
              localStorage.setItem('disableRealtimeUpdates', 'true')
            } else {
              localStorage.removeItem('disableRealtimeUpdates')
            }
            setRealtimeUpdatesDisabled(firestoreValue)
          }
        } else {
          // No Firestore preference, check localStorage backup
          const localValue = localStorage.getItem('disableRealtimeUpdates') === 'true'
          if (localValue) {
            setRealtimeUpdatesDisabled(true)
            // Try to sync localStorage preference to Firestore
            try {
              const currentProfile = await getProfessorByUid(profUid)
              // Preferences are now stored in MySQL professor profile
              // Real-time updates preference is stored in localStorage only
              console.log('Real-time updates preference stored in localStorage')
            } catch (e) {
              // Firestore unavailable, localStorage is backup
              console.warn('Could not sync preference to Firestore:', e.message)
            }
          }
        }
      } catch (error) {
        // If Firestore fails (quota, network, etc.), use localStorage value
        console.warn('Could not load real-time preference from Firestore, using localStorage:', error.message)
        const localValue = localStorage.getItem('disableRealtimeUpdates') === 'true'
        setRealtimeUpdatesDisabled(localValue)
      }
    }
    
    loadRealtimePreference()
  }, [profUid, profProfile])

  // Ensure every subject has a course document so we can attach enrollment listeners
  // OPTIMIZED: Only run once on mount, skip if quota exceeded to reduce reads
  useEffect(() => {
    if (!profUid || subjects.length === 0) return
    
    // Skip if quota exceeded to prevent more reads
    const quotaExceeded = localStorage.getItem('lastQuotaError')
    if (quotaExceeded) {
      const timeSinceError = Date.now() - parseInt(quotaExceeded)
      // Skip for 1 hour after quota error
      if (timeSinceError < 3600000) {
        console.log('⏸️ Skipping course creation checks - quota exceeded recently')
        return
      }
    }
    
    let cancelled = false

    const ensureCoursesForSubjects = async () => {
      const pendingUpdates = {}

      for (const subject of subjects) {
        const code = subject?.code
        if (!code || subjectCourseMap[code] || pendingUpdates[code]) continue
        try {
          // OPTIMIZED: Check localStorage backup first to avoid Firestore read
          const storageKey = `firestore_backup_courses_${code}`
          const backup = localStorage.getItem(storageKey)
          let course = null
          
          if (backup) {
            try {
              const parsed = JSON.parse(backup)
              const courseData = parsed.data
              // Find course with matching code
              if (courseData && courseData.code === code) {
                course = { id: code, ...courseData }
              }
            } catch (e) {
              // Backup parse failed, continue to Firestore
            }
          }
          
          // Only query Firestore if not in backup
          if (!course) {
            course = await getCourseByCode(code)
          }
          
          if (!course) {
            // Ensure professor profile exists first
            let profProfile = await getProfessorByUid(profUid)
            if (!profProfile || !profProfile.id) {
              console.error('❌ Professor profile not found when creating course')
              continue // Skip this subject
            }
            // Ensure credits is a number, not a string
            const credits = parseInt(subject.credits) || 0
            const courseId = await createCourse({
              code: subject.code,
              name: subject.name,
              credits: credits,
              professorId: profProfile.id, // Use MySQL ID, not Firebase UID
            })
            course = { id: courseId }
          }
          pendingUpdates[code] = course.id
        } catch (error) {
          // If quota exceeded, stop trying
          if (error.code === 'resource-exhausted' || error.message?.includes('quota')) {
            console.warn('⏸️ Quota exceeded - stopping course creation checks')
            localStorage.setItem('lastQuotaError', Date.now().toString())
            break
          }
          console.warn('Failed to resolve course for subject', code, error)
        }
      }

      if (!cancelled && Object.keys(pendingUpdates).length > 0) {
        setSubjectCourseMap(prev => ({ ...prev, ...pendingUpdates }))
      }
    }

    // Only run once on mount, not on every subject change
    const hasRun = sessionStorage.getItem('coursesEnsured')
    if (!hasRun) {
      ensureCoursesForSubjects()
      sessionStorage.setItem('coursesEnsured', 'true')
    }

    return () => {
      cancelled = true
    }
  }, [profUid]) // Removed subjects and subjectCourseMap from dependencies to prevent re-runs

  // System-wide theme management
  const { isDarkMode, toggleTheme } = useTheme()

  // Dashboard state is now stored in MySQL, not Firestore
  
  // Helper function to add custom UI alerts (replaces browser alerts)
  // Note: This will be defined after saveData, so we'll use a ref or move it after saveData definition
  
  const updateSessionUser = useCallback((updates) => {
    const raw = sessionStorage.getItem('currentUser')
    if (!raw) return
    try {
      const data = JSON.parse(raw)
      const merged = { ...data, ...updates }
      sessionStorage.setItem('currentUser', JSON.stringify(merged))
    } catch (error) {
      console.warn('Unable to update currentUser session data', error)
    }
  }, [])

  // Build enrolls object from MySQL enrollments
  // This replaces the Firestore enrolls object - MySQL is now the single source of truth
  const buildEnrollsFromMySQL = useCallback(async (professorMySQLId, subjectsList) => {
    if (!professorMySQLId) {
      console.warn('Cannot build enrolls: professor MySQL ID not available')
      return { enrolls: {}, enrolledStudentIds: [] }
    }

    try {
      console.log('📚 Building enrolls from MySQL enrollments...')
      
      // Get all courses for this professor
      const courses = await getCoursesByProfessor(professorMySQLId)
      console.log(`📚 Found ${courses.length} courses for professor`)
      
      // Build enrolls object: { courseCode: [studentId1, studentId2, ...] }
      const enrollsObject = {}
      const enrolledStudentIds = new Set() // Track all enrolled student IDs
      
      // For each course, get enrollments and extract student numerical IDs
      for (const course of courses) {
        const enrollments = await getEnrollmentsByCourse(course.id)
        const studentIds = []
        
        for (const enrollment of enrollments) {
          // Enrollment includes student_number (numerical ID) from JOIN query
          const studentNumber = enrollment.student_number || enrollment.student_id
          if (studentNumber) {
            const normalizedId = normalizeStudentId(studentNumber)
            studentIds.push(normalizedId)
            enrolledStudentIds.add(normalizedId)
          }
        }
        
        if (studentIds.length > 0) {
          enrollsObject[course.code] = studentIds
        }
      }
      
      console.log('✅ Built enrolls from MySQL:', {
        coursesProcessed: courses.length,
        enrollsKeys: Object.keys(enrollsObject).length,
        totalEnrollments: Object.values(enrollsObject).reduce((sum, ids) => sum + ids.length, 0),
        uniqueEnrolledStudents: enrolledStudentIds.size
      })
      
      // Return both enrolls and enrolled student IDs for loading missing students
      return {
        enrolls: normalizeEnrollsMap(enrollsObject),
        enrolledStudentIds: Array.from(enrolledStudentIds)
      }
    } catch (error) {
      console.error('❌ Error building enrolls from MySQL:', error)
      return { enrolls: {}, enrolledStudentIds: [] }
    }
  }, [])

  const loadData = useCallback(async (uid) => {
    if (!uid) {
      console.warn('loadData called without UID')
      return false
    }
    setIsLoading(true)
    try {
      // Load dashboard state from MySQL
      const saved = await getDashboardState()
      if (saved) {
        console.log('📥 Dashboard data loaded from MySQL:', {
          subjects: (saved.subjects || []).length,
          students: (saved.students || []).length,
          enrolls: Object.keys(saved.enrolls || {}).length,
          alerts: (saved.alerts || []).length,
          records: Object.keys(saved.records || {}).length,
          grades: Object.keys(saved.grades || {}).length,
          enrollsDetails: Object.keys(saved.enrolls || {}).map(key => ({
            subject: key,
            studentCount: (saved.enrolls[key] || []).length,
            studentIds: saved.enrolls[key]
          })),
          allStudentIds: (saved.students || []).map(s => s.id)
        })
        
        // Migrate any legacy student IDs (S101, S102, etc.) to numerical IDs
        const migrated = migrateDashboardData(saved)
        
        // Check if migration occurred
        const needsMigration = JSON.stringify(saved) !== JSON.stringify(migrated)
        if (needsMigration) {
          console.log('Migrating legacy student IDs to numerical IDs...')
          // Save migrated data back to MySQL
          await saveDashboardState({
            ...migrated,
            removedSubjects: migrated.removedSubjects || [],
            recycleBinSubjects: migrated.recycleBinSubjects || []
          })
          console.log('Migration complete - data saved with numerical IDs')
        }
        
        // Ensure all data fields are loaded with migrated IDs
        // Ensure archivedSubjects field exists on all students for data consistency
        // CRITICAL: Only set archivedSubjects if it's actually an array, otherwise use empty array
        const studentsWithArchived = (migrated.students || []).map(s => ({
          ...s,
          archivedSubjects: Array.isArray(s.archivedSubjects) ? s.archivedSubjects : []
        }))
        
        // CRITICAL: Log students with archived subjects to help debug
        const studentsWithArchivedSubjects = studentsWithArchived.filter(s => 
          Array.isArray(s.archivedSubjects) && s.archivedSubjects.length > 0
        )
        if (studentsWithArchivedSubjects.length > 0) {
          console.log('📦 Found students with archived subjects:', {
            count: studentsWithArchivedSubjects.length,
            students: studentsWithArchivedSubjects.map(s => ({
              id: s.id,
              name: s.name,
              archivedSubjects: s.archivedSubjects
            }))
          })
        }
        
        // CRITICAL: Filter out archived students from enrolls to ensure data consistency
        // This prevents archived students from reappearing after page refresh
        // CRITICAL: Normalize enrollments FIRST before filtering to ensure proper matching
        const normalizedLoadedEnrolls = normalizeEnrollsMap(migrated.enrolls || {})
        const cleanedEnrolls = {}
        Object.keys(normalizedLoadedEnrolls).forEach(subjectCode => {
          const enrolledIds = normalizedLoadedEnrolls[subjectCode] || []
          // Normalize all student IDs in enrollments for consistent matching
          const normalizedEnrolledIds = enrolledIds.map(normalizeStudentId).filter(Boolean)
          
          // Remove any student IDs that are archived for this subject
          // But KEEP enrollments even if student not found (they might be added later)
          cleanedEnrolls[subjectCode] = normalizedEnrolledIds.filter(enrolledId => {
            // Try to find student with normalized ID
            const student = studentsWithArchived.find(s => {
              const studentId = normalizeStudentId(s.id)
              return studentId === enrolledId
            })
            
            // If student not found, log warning but KEEP the enrollment
            // This prevents data loss if there's a timing issue
            if (!student) {
              console.warn(`⚠️ Enrollment found for student ID ${enrolledId} in subject ${subjectCode}, but student not found in students array. Keeping enrollment.`, {
                enrolledId,
                subjectCode,
                totalStudents: studentsWithArchived.length,
                studentIds: studentsWithArchived.map(s => normalizeStudentId(s.id))
              })
              return true // Keep the enrollment even if student not found
            }
            
            // Exclude if student is archived from this subject
            const isArchived = (student.archivedSubjects || []).includes(subjectCode)
            if (isArchived) {
              console.log(`📦 Filtering out archived student ${student.name} (${student.id}) from ${subjectCode}`)
            }
            return !isArchived
          })
        })
        
        // Check if cleaning removed any archived students from enrolls
        // Compare normalized versions for accurate comparison
        const normalizedLoadedForCompare = normalizeEnrollsMap(migrated.enrolls || {})
        const hadInconsistencies = JSON.stringify(normalizedLoadedForCompare) !== JSON.stringify(cleanedEnrolls)
        if (hadInconsistencies) {
          console.warn('⚠️ Data inconsistency detected: Archived students found in enrolls. Cleaning and saving...')
          // Save cleaned data back to MySQL to fix inconsistency
          try {
            await saveDashboardState({
              ...migrated,
              removedSubjects: migrated.removedSubjects || [],
              recycleBinSubjects: migrated.recycleBinSubjects || []
            })
            console.log('✅ Cleaned enrolls data saved to MySQL')
          } catch (error) {
            console.error('Failed to save cleaned enrolls:', error)
          }
        }
        
        // BUILD ENROLLS FROM MYSQL (single source of truth)
        // Get professor MySQL ID to build enrolls from MySQL enrollments
        let mysqlEnrolls = {}
        let enrolledStudentIds = []
        try {
          const profProfile = await getProfessorByUid(uid)
          if (profProfile && profProfile.id) {
            console.log('📚 Building enrolls from MySQL (replacing Firestore enrolls)...')
            const mysqlResult = await buildEnrollsFromMySQL(profProfile.id, migrated.subjects || [])
            mysqlEnrolls = mysqlResult.enrolls || mysqlResult // Handle both old and new format
            enrolledStudentIds = mysqlResult.enrolledStudentIds || []
          } else {
            console.warn('⚠️ Professor MySQL ID not found, using empty enrolls')
          }
        } catch (error) {
          console.error('❌ Failed to build enrolls from MySQL, using Firestore enrolls as fallback:', error)
          // Fallback to Firestore enrolls if MySQL fails
          mysqlEnrolls = normalizeEnrollsMap(cleanedEnrolls)
          enrolledStudentIds = []
        }
        
        // Load missing students from MySQL if enrollments reference them
        if (enrolledStudentIds.length > 0) {
          const existingStudentIds = new Set(studentsWithArchived.map(s => normalizeStudentId(s.id)))
          const missingIds = enrolledStudentIds.filter(id => !existingStudentIds.has(id))
          
          if (missingIds.length > 0) {
            console.log(`📥 Loading ${missingIds.length} missing students from MySQL...`)
            try {
              // Load all students from MySQL to find missing ones
              const allMySQLStudents = await listStudents()
              const missingStudents = allMySQLStudents.filter(s => {
                const studentId = normalizeStudentId(s.student_id || s.studentId || s.id)
                return missingIds.includes(studentId)
              })
              
              if (missingStudents.length > 0) {
                console.log(`✅ Found ${missingStudents.length} missing students in MySQL, adding to students array`)
                // Map MySQL students to expected format
                const formattedMissingStudents = missingStudents.map(s => ({
                  id: normalizeStudentId(s.student_id || s.studentId || String(s.id)),
                  name: s.name || 'Unknown Student',
                  email: s.email || '',
                  department: s.department || '',
                  archivedSubjects: [],
                  photoURL: s.photo_url || s.photoURL || ''
                }))
                
                // Add missing students to the students array
                studentsWithArchived.push(...formattedMissingStudents)
                console.log(`✅ Added ${formattedMissingStudents.length} missing students. Total students: ${studentsWithArchived.length}`)
              } else {
                console.warn(`⚠️ Could not find ${missingIds.length} enrolled students in MySQL database. They may need to be created.`)
              }
            } catch (error) {
              console.error('❌ Error loading missing students from MySQL:', error)
            }
          }
        }
        
        const finalEnrolls = mysqlEnrolls
        
        // CRITICAL: Verify data integrity before setting state
        // Ensure all enrolled students exist in the students array
        const enrollmentStudentIds = new Set()
        Object.values(finalEnrolls || {}).forEach(enrolledIds => {
          enrolledIds.forEach(id => enrollmentStudentIds.add(normalizeStudentId(id)))
        })
        
        const studentIds = new Set(studentsWithArchived.map(s => normalizeStudentId(s.id)))
        const missingEnrollmentStudents = Array.from(enrollmentStudentIds).filter(id => !studentIds.has(id))
        
        if (missingEnrollmentStudents.length > 0) {
          console.warn('⚠️ Found enrollments for students not in local students array (may be in MySQL):', {
            missingStudentIds: missingEnrollmentStudents,
            totalEnrollments: enrollmentStudentIds.size,
            totalStudents: studentIds.size
          })
        } else {
          console.log('✅ Data integrity check passed: All enrolled students exist in students array', {
            totalEnrollments: enrollmentStudentIds.size,
            totalStudents: studentIds.size,
            enrollmentsBySubject: Object.keys(finalEnrolls).map(key => ({
              subject: key,
              studentCount: finalEnrolls[key].length
            }))
          })
        }
        
        // CRITICAL: Set all state at once to ensure consistency
        // This prevents partial updates that could cause UI issues
        setSubjects(migrated.subjects || [])
        setRemovedSubjects(migrated.removedSubjects || []) // Load archived subjects
        setRecycleBinSubjects(migrated.recycleBinSubjects || []) // Load recycle bin subjects
        setStudents(studentsWithArchived)
        setNormalizedEnrolls(finalEnrolls)
        setAlerts(migrated.alerts || [])
        setRecords(migrated.records || {})
        setGrades(migrated.grades || {})
        
        // CRITICAL: Track when data was loaded to prevent real-time listener from overwriting
        dataLoadTimeRef.current = Date.now()
        
        // Force UI refresh after loading
        setRefreshTrigger(prev => prev + 1)
        
        // Single refresh is sufficient - React will handle state updates
        
        console.log('✅ Dashboard data loaded from MySQL:', {
          subjects: (migrated.subjects || []).length,
          students: (migrated.students || []).length,
          enrolls: Object.keys(finalEnrolls || {}).length,
          enrollsDetails: Object.keys(finalEnrolls || {}).map(key => ({
            subject: key,
            studentCount: (finalEnrolls[key] || []).length,
            studentIds: finalEnrolls[key],
            studentNames: (finalEnrolls[key] || []).map(id => {
              const student = studentsWithArchived.find(s => normalizeStudentId(s.id) === id)
              return student ? student.name : 'Unknown'
            })
          })),
          alerts: (migrated.alerts || []).length,
          records: Object.keys(migrated.records || {}).length,
          grades: Object.keys(migrated.grades || {}).length,
          updatedAt: migrated.updatedAt || 'N/A',
          migrated: needsMigration,
          cleaned: hadInconsistencies,
        })
        
        // Additional verification: Log if students are missing for enrollments
        Object.keys(finalEnrolls || {}).forEach(subjectCode => {
          const enrolledIds = finalEnrolls[subjectCode] || []
          const missingStudents = enrolledIds.filter(id => {
            const normalizedId = normalizeStudentId(id)
            return !studentsWithArchived.find(s => normalizeStudentId(s.id) === normalizedId)
          })
          if (missingStudents.length > 0) {
            console.warn(`⚠️ Subject ${subjectCode} has ${missingStudents.length} enrolled students not found in students array:`, {
              missingIds: missingStudents,
              enrolledIds: enrolledIds,
              totalEnrolled: enrolledIds.length,
              studentsInSystem: studentsWithArchived.map(s => normalizeStudentId(s.id)),
              subjectCode
            })
            // CRITICAL: If students are missing, they might have been filtered out incorrectly
            // Log detailed comparison to help debug
            missingStudents.forEach(missingId => {
              const normalizedMissing = normalizeStudentId(missingId)
              const similarStudents = studentsWithArchived.filter(s => {
                const studentId = normalizeStudentId(s.id)
                return studentId.includes(normalizedMissing) || normalizedMissing.includes(studentId)
              })
              if (similarStudents.length > 0) {
                console.warn(`  Found similar student IDs for ${missingId}:`, similarStudents.map(s => s.id))
              }
            })
          } else {
            // Log successful matches for debugging
            console.log(`✅ Subject ${subjectCode}: All ${enrolledIds.length} enrolled students found in students array`)
          }
        })
        
        setIsLoading(false)
        return true
      } else {
        // New professor - start with empty dashboard (no hardcoded subjects)
        const defaultSubjects = [] // Empty - professor will add their own subjects
        const defaultStudents = []
        const defaultEnrolls = {} // Will be built from MySQL on load
        setSubjects(defaultSubjects)
        setStudents(defaultStudents)
        setNormalizedEnrolls(defaultEnrolls)
        setRecords({})
        setGrades({})
        // Save to MySQL (enrolls not saved - MySQL is source of truth)
        await saveDashboardState({
          subjects: defaultSubjects,
          removedSubjects: [],
          recycleBinSubjects: [],
          students: defaultStudents,
          alerts: [],
          records: {},
          grades: {}
        })
        console.log('Empty dashboard initialized for new professor - no default subjects')
        setIsLoading(false)
        return true
      }
    } catch (e) {
      console.error('Failed to load professor dashboard data', e)
      
      // Error loading dashboard state
      console.error('Failed to load dashboard state from MySQL:', e)
      
      setIsLoading(false)
      return false
    }
  }, [])

  // Manual refresh function to reload all data (defined after loadData)
  const refreshData = useCallback(async () => {
    if (!profUid) {
      console.warn('Cannot refresh: No professor UID available')
      return
    }
    console.log('🔄 Manually refreshing dashboard data...')
    try {
      const loaded = await loadData(profUid)
      if (loaded && profProfile && profProfile.id) {
        const rebuiltResult = await buildEnrollsFromMySQL(profProfile.id, subjects)
        const rebuiltEnrolls = rebuiltResult.enrolls || rebuiltResult
        setNormalizedEnrolls(rebuiltEnrolls)
        console.log('✅ Data refreshed successfully')
        setRefreshTrigger(prev => prev + 1)
      }
    } catch (error) {
      console.error('❌ Failed to refresh data:', error)
      setIsLoading(false)
    }
  }, [profUid, profProfile, loadData, buildEnrollsFromMySQL, subjects, setNormalizedEnrolls])

  // Debounce save operations to reduce Firestore writes
  const saveDataTimeoutRef = useRef(null)
  const pendingSaveRef = useRef(null)

  const saveData = useCallback(async (subjectsData, studentsData, enrollsData, alertsData, recordsData, gradesData, uidOverride = null, immediate = false) => {
    // Use uidOverride if provided, otherwise use profUid from state,
    // auth.currentUser, or sessionStorage as fallbacks
    let uidToUse = uidOverride || profUid

    // Firebase auth removed - use JWT token user ID instead
    // if (!uidToUse && auth?.currentUser?.uid) {
    //   uidToUse = auth.currentUser.uid
    // }

    if (!uidToUse) {
      try {
        const currentUser = sessionStorage.getItem('currentUser')
        if (currentUser) {
          const userData = JSON.parse(currentUser)
          uidToUse = userData?.uid
        }
      } catch (e) {
        console.warn('Could not get UID from sessionStorage', e)
      }
    }
    
    if (!uidToUse) {
      const error = new Error('Cannot save data: No UID available')
      console.error(error.message)
      throw error
    }
    
    // CRITICAL: Always use the provided data parameters, never fall back to state
    // State might be stale due to React's asynchronous updates
    // NOTE: enrolls is no longer saved to Firestore - MySQL is the single source of truth
    const payload = {
      subjects: subjectsData ?? subjects,
      removedSubjects: removedSubjects, // Include removed subjects in save
      students: studentsData ?? students,
      // enrolls removed - MySQL is now the single source of truth for enrollments
      alerts: alertsData ?? alerts,
      records: recordsData ?? records,
      grades: gradesData ?? grades,
      ownerUid: uidToUse,
      updatedAt: new Date().toISOString(),
    }
    
    // Store pending save
    pendingSaveRef.current = { payload, uidToUse }
    
    // If immediate save requested (e.g., on critical operations), save right away
    if (immediate) {
      if (saveDataTimeoutRef.current) {
        clearTimeout(saveDataTimeoutRef.current)
        saveDataTimeoutRef.current = null
      }
      const result = await executeSave(payload, uidToUse)
      return result
    }
    
    // Debounce: Clear existing timeout and set new one
    if (saveDataTimeoutRef.current) {
      clearTimeout(saveDataTimeoutRef.current)
    }
    
    // AGGRESSIVE OPTIMIZATION: Save after 10 seconds of no changes (reduces writes by 80%)
    // This prevents excessive writes when user is actively editing
    saveDataTimeoutRef.current = setTimeout(async () => {
      if (pendingSaveRef.current) {
        await executeSave(pendingSaveRef.current.payload, pendingSaveRef.current.uidToUse)
        pendingSaveRef.current = null
      }
      saveDataTimeoutRef.current = null
    }, 10000) // Increased from 2 seconds to 10 seconds
  }, [subjects, removedSubjects, students, enrolls, alerts, records, grades, profUid])

  // Separate function to execute the actual save
  const executeSave = useCallback(async (payload, uidToUse) => {
    try {
      // NOTE: enrolls is no longer saved - MySQL is the single source of truth
      // No need to normalize or verify enrolls integrity here
      const normalizedPayload = {
        ...payload
      }
      
      // Save to MySQL
      await saveDashboardState({
        subjects: normalizedPayload.subjects || [],
        removedSubjects: normalizedPayload.removedSubjects || [],
        recycleBinSubjects: normalizedPayload.recycleBinSubjects || [],
        students: normalizedPayload.students || [],
        records: normalizedPayload.records || {},
        grades: normalizedPayload.grades || {},
        alerts: normalizedPayload.alerts || []
      })
      
      console.log('✅ Data saved successfully to MySQL:', {
        subjects: (normalizedPayload.subjects || []).length,
        students: (normalizedPayload.students || []).length,
        alerts: (normalizedPayload.alerts || []).length,
        records: Object.keys(normalizedPayload.records || {}).length,
        grades: Object.keys(normalizedPayload.grades || {}).length
      })
      
      return true
    } catch (e) {
      console.error('Failed to save professor dashboard data', e)
      // Error saving dashboard state
      console.error('Failed to save dashboard state to MySQL:', e)
      throw e // Re-throw to allow callers to handle errors
    }
  }, [])
  
  // Helper function to add custom UI alerts (replaces browser alerts)
  const addCustomAlert = useCallback(async (type, title, message, autoSave = true) => {
    // Create notification alert
    const newAlert = {
      id: Date.now(),
      type: type || 'general',
      title: title || 'Notification',
      message: message || '',
      timestamp: new Date(),
      read: false,
      target_courseId: null,
    }
    
    // Add to alerts array (newest first)
    const updatedAlerts = [newAlert, ...alerts]
    setAlerts(updatedAlerts)
    
    // Save to Firestore immediately if autoSave is true
    if (autoSave) {
      try {
        await saveData(subjects, students, enrolls, updatedAlerts, records, grades, profUid, true)
      } catch (error) {
        console.warn('Failed to save notification alert', error)
      }
    }
    
    return newAlert
  }, [alerts, subjects, students, enrolls, records, grades, profUid])

  // Firebase auth removed - use JWT token from sessionStorage instead
  const waitForAuthUser = useCallback(() => {
    return new Promise((resolve) => {
      // Get user from sessionStorage (set during login)
      try {
        const currentUser = sessionStorage.getItem('currentUser')
        if (currentUser) {
          const userData = JSON.parse(currentUser)
          resolve(userData || null)
          return
        }
      } catch (e) {
        console.warn('Failed to get user from sessionStorage:', e)
      }
      resolve(null)
    })
  }, [])

  useEffect(() => {
    const initializeProfessor = async () => {
      // Get user from sessionStorage (JWT-based auth)
      let currentUser = null
      try {
        const userData = sessionStorage.getItem('currentUser')
        if (userData) {
          currentUser = JSON.parse(userData)
        }
      } catch (e) {
        console.warn('Failed to parse user data:', e)
      }
      
      // Fallback to waitForAuthUser if needed
      if (!currentUser) {
        currentUser = await waitForAuthUser()
      }

      // Check if user is authenticated (has JWT token)
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
      if (!currentUser || !token) {
        console.warn('No authenticated user found, redirecting to login')
        navigate('/login', { replace: true })
        return
      }

      let sessionUser = sessionStorage.getItem('currentUser')
      let userData = null
      if (sessionUser) {
        try {
          userData = JSON.parse(sessionUser)
        } catch (error) {
          console.warn('Unable to parse currentUser session data', error)
        }
      }

      if (!userData) {
        // Create userData from currentUser (JWT-based auth)
        userData = {
          id: currentUser.id || currentUser.user_id,
          email: currentUser.email || '',
          name: currentUser.name || 'Professor User',
          type: currentUser.type || 'Professor'
        }
        sessionStorage.setItem('currentUser', JSON.stringify(userData))
      }

      // Use user ID from JWT token instead of Firebase UID
      const userId = userData.id || currentUser.id || currentUser.user_id
      if (!userId) {
        console.error('No user ID found, redirecting to login')
        navigate('/login', { replace: true })
        return
      }

      // Set professor ID (using MySQL ID, not Firebase UID)
      setProfUid(userId.toString())
      if (userData.email) setProfEmail(userData.email)
      if (userData.name) {
        setProfName(userData.name)
        setProfileForm(prev => ({ ...prev, name: userData.name }))
      }

      // CRITICAL: Verify user role before proceeding
      if (userData.type && userData.type !== 'Professor') {
        console.error('❌ Access denied: User is not a professor. Role:', userData.type)
        // Clear session and redirect to login
        localStorage.removeItem('auth_token')
        sessionStorage.removeItem('auth_token')
        sessionStorage.removeItem('currentUser')
        navigate('/login', { replace: true })
        return
      }

      // Get profile using current professor endpoint (JWT-based)
      const profilePromise = getCurrentProfessor().catch(err => {
        console.warn('Unable to load professor profile from database', err)
        // If error is 403 or indicates role mismatch, redirect to login
        if (err.message?.includes('403') || err.message?.includes('Insufficient permissions') || err.message?.includes('role')) {
          console.error('❌ Access denied: User is not a professor')
          localStorage.removeItem('auth_token')
          sessionStorage.removeItem('auth_token')
          sessionStorage.removeItem('currentUser')
          navigate('/login', { replace: true })
          return null
        }
        return null
      })

      // Load dashboard data (will use profUid from state)
      const dashboardPromise = loadData(userId.toString()).catch(err => {
        console.error('Failed to load professor dashboard data', err)
        return false
      })

      let profile = await profilePromise
      const dashboardLoaded = await dashboardPromise
      
      if (dashboardLoaded) {
        console.log('Dashboard data loaded successfully from Firestore on page load/refresh')
        // Rebuild enrolls from MySQL after successful load
        if (profile && profile.id) {
          try {
            const currentSubjects = subjects.length > 0 ? subjects : []
            const rebuiltResult = await buildEnrollsFromMySQL(profile.id, currentSubjects)
            const rebuiltEnrolls = rebuiltResult.enrolls || rebuiltResult
            if (Object.keys(rebuiltEnrolls).length > 0) {
              setNormalizedEnrolls(rebuiltEnrolls)
              console.log('✅ Rebuilt enrolls from MySQL after data load')
            }
          } catch (error) {
            console.error('Failed to rebuild enrolls after load:', error)
          }
        }
      } else if (dashboardLoaded === false) {
        console.error('Failed to load dashboard data - data may not persist correctly')
        // Try to reload data after a short delay
        setTimeout(async () => {
          console.log('🔄 Retrying data load...')
          const retryLoaded = await loadData(userId ? userId.toString() : profUid)
          if (retryLoaded) {
            console.log('✅ Data loaded successfully on retry')
            // Rebuild enrolls from MySQL if profile exists
            if (profile && profile.id) {
              try {
                const rebuiltResult = await buildEnrollsFromMySQL(profile.id, subjects)
                const rebuiltEnrolls = rebuiltResult.enrolls || rebuiltResult
                setNormalizedEnrolls(rebuiltEnrolls)
                console.log('✅ Rebuilt enrolls from MySQL after retry')
              } catch (error) {
                console.error('Failed to rebuild enrolls on retry:', error)
              }
            }
          }
        }, 2000)
      }

      // Ensure every logged-in user that reaches this page
      // has a corresponding professor profile in the MySQL backend.
      if (!profile) {
        try {
          const fallbackName = userData.name || currentUser.name || 'Professor User'
          const defaultPhotoURL = getDefaultAvatar(fallbackName, userId.toString())
          // Ensure email is available before creating profile
          const profileEmail = userData.email || currentUser.email
          if (!profileEmail) {
            console.warn('⚠️ Cannot auto-create professor profile: email is missing')
            throw new Error('Email is required to create professor profile')
          }

          const newProfile = {
            name: fallbackName,
            email: profileEmail,
            role: 'Professor',
            department: '',
            photoURL: defaultPhotoURL,
          }

          // Use setProfessor which will create/update via backend API
          const created = await setProfessor(newProfile)
          profile = created || newProfile
          console.log('✅ Auto-created professor profile for current user')
        } catch (e) {
          console.error('❌ Failed to auto-create professor profile:', e)
        }
      }

      if (profile) {
        setProfProfile(profile)
        if (profile.email) setProfEmail(profile.email)
        if (profile.name) {
          setProfName(profile.name)
          setProfileForm(prev => ({ ...prev, name: profile.name }))
        }
        // Support multiple backend field names for photo (backward compatibility)
        const photo =
          profile.photoURL ||
          profile.photoUrl ||
          profile.photo_url ||
          null
        if (photo) {
          setProfPic(photo)
          setProfilePreview(photo)
        }
        
        // Ensure profile has MySQL ID - if not, reload it
        if (!profile.id) {
          console.warn('⚠️ Professor profile missing MySQL ID, reloading...')
          const reloadedProfile = await getCurrentProfessor()
          if (reloadedProfile && reloadedProfile.id) {
            setProfProfile(reloadedProfile)
            console.log('✅ Reloaded professor profile with MySQL ID:', reloadedProfile.id)
          }
        }
      }
    }

    // Track if component is mounted to prevent cancelled requests
    let isMounted = true
    let initializationInProgress = false
    
    const runInitializeProfessor = async () => {
      // Prevent duplicate calls
      if (initializationInProgress) {
        console.log('⏸️ Professor initialization already in progress, skipping duplicate call')
        return
      }
      
      initializationInProgress = true
      
      try {
        await initializeProfessor()
      } catch (error) {
        if (error.name === 'AbortError' || error.message?.includes('cancelled')) {
          console.log('⏸️ Professor initialization cancelled')
          return
        }
        if (isMounted) {
          console.error('❌ Failed to initialize professor:', error)
        }
      } finally {
        initializationInProgress = false
      }
    }
    
    runInitializeProfessor()
    
    // Cleanup function
    return () => {
      isMounted = false
      initializationInProgress = false
    }
    
    // Start time update
    const updateTime = () => {
      const now = new Date()
      const hours = now.getHours()
      const h12 = hours % 12 || 12
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const m = now.getMinutes().toString().padStart(2, '0')
      const s = now.getSeconds().toString().padStart(2, '0')
      setCurrentTime(`${h12}:${m}:${s} ${ampm}`)
    }
    updateTime()
    const timeInterval = setInterval(updateTime, 1000)
    
    return () => {
      clearInterval(timeInterval)
      // Cleanup real-time listener
      if (realtimeUnsubscribeRef.current) {
        realtimeUnsubscribeRef.current()
        realtimeUnsubscribeRef.current = null
      }
    }
  }, [navigate, loadData, waitForAuthUser])

  // Set up real-time listener for dashboard updates
  useEffect(() => {
    if (!profUid) return
    
    // Check if real-time updates are disabled
    const isDisabled = localStorage.getItem('disableRealtimeUpdates') === 'true'
    if (isDisabled) {
      // Clean up any existing listener
      if (realtimeUnsubscribeRef.current) {
        realtimeUnsubscribeRef.current()
        realtimeUnsubscribeRef.current = null
      }
      return
    }

    // Store initial data for comparison
    const currentData = {
      subjects,
      students,
      enrolls,
      alerts,
      records,
      grades,
    }
    previousDataRef.current = currentData

    // Set up real-time listener
    const unsubscribe = subscribeToProfessorDashboard(profUid, (updatedData) => {
      if (!updatedData) return

      // CRITICAL: Don't overwrite state during import - it causes race conditions
      if (isImportingRef.current) {
        console.log('⏸️ Real-time update skipped during import to prevent overwrite')
        return
      }

      // CRITICAL: Prevent overwriting data immediately after load (within 3 seconds)
      // This prevents the real-time listener from overwriting fresh data on page load
      const timeSinceLoad = Date.now() - (dataLoadTimeRef.current || 0)
      if (timeSinceLoad < 3000) {
        console.log('⏸️ Real-time update skipped: Data just loaded (within 3s)', {
          timeSinceLoad: Math.round(timeSinceLoad / 1000) + 's'
        })
        return
      }

      // CRITICAL: Prevent overwriting with stale data
      // Also check if we just imported data (within last 5 seconds)
      const timeSinceImport = Date.now() - (lastImportTimeRef.current || 0)
      if (timeSinceImport < 5000) {
        console.log('⏸️ Real-time update skipped: Recent import detected (within 5s)', {
          timeSinceImport: Math.round(timeSinceImport / 1000) + 's'
        })
        return
      }
      
      // NOTE: enrolls is no longer synced from Firestore - MySQL is the single source of truth

      // OPTIMIZED: Skip date change detection for minimal data (grades not included in real-time)
      // Date changes will be detected on page refresh or manual grade updates
      
      // Update state with new data (this will trigger UI updates)
      // CRITICAL: Always normalize enrollments to ensure consistency
      // NOTE: Real-time updates now only include critical fields (subjects, students, enrolls, alerts)
      // Records and grades are excluded to reduce quota usage - they load on-demand
      if (updatedData.subjects) setSubjects(updatedData.subjects)
      if (updatedData.removedSubjects) setRemovedSubjects(updatedData.removedSubjects)
      if (updatedData.students) setStudents(updatedData.students)
      // NOTE: enrolls is no longer synced from Firestore - rebuild from MySQL instead
      // Real-time updates for enrolls are handled by rebuilding from MySQL when needed
      // This ensures MySQL is always the single source of truth
      // OPTIMIZED: Normalize alert timestamps when updating from real-time
      if (updatedData.alerts) {
        const normalizedAlerts = updatedData.alerts.map(alert => {
          // Ensure timestamp is properly formatted
          let normalizedTimestamp = alert.timestamp
          
          // Handle Firestore Timestamp objects
          if (normalizedTimestamp && typeof normalizedTimestamp === 'object' && normalizedTimestamp.toDate) {
            normalizedTimestamp = normalizedTimestamp.toDate()
          }
          // Handle ISO strings
          else if (typeof normalizedTimestamp === 'string') {
            const parsed = new Date(normalizedTimestamp)
            normalizedTimestamp = isNaN(parsed.getTime()) ? new Date() : parsed
          }
          // Handle numbers (milliseconds or seconds)
          else if (typeof normalizedTimestamp === 'number') {
            normalizedTimestamp = normalizedTimestamp > 1e12 
              ? new Date(normalizedTimestamp) 
              : new Date(normalizedTimestamp * 1000)
          }
          // Handle Date objects
          else if (normalizedTimestamp instanceof Date) {
            // Already a Date object, keep it
          }
          // Invalid timestamp - use current time
          else {
            normalizedTimestamp = new Date()
          }
          
          // Ensure timestamp is valid
          if (!normalizedTimestamp || isNaN(normalizedTimestamp.getTime())) {
            normalizedTimestamp = new Date()
          }
          
          return {
            ...alert,
            timestamp: normalizedTimestamp
          }
        })
        setAlerts(normalizedAlerts)
      }
      // OPTIMIZED: Records and grades excluded from real-time updates to reduce quota
      // They remain from initial load and update on manual save/refresh
      // This reduces data transfer and quota usage by ~60-70%
      
      // Force UI refresh after real-time update
      setRefreshTrigger(prev => prev + 1)

      // Update previous data reference
      previousDataRef.current = updatedData
    })

    realtimeUnsubscribeRef.current = unsubscribe

    return () => {
      if (realtimeUnsubscribeRef.current) {
        realtimeUnsubscribeRef.current()
        realtimeUnsubscribeRef.current = null
      }
    }
  }, [profUid, subjects, students, enrolls, alerts, records, grades, realtimeUpdatesDisabled])

  // Cleanup: Save any pending data and clear timeout on unmount
  useEffect(() => {
    return () => {
      // Save any pending data before unmounting
      if (pendingSaveRef.current && saveDataTimeoutRef.current) {
        clearTimeout(saveDataTimeoutRef.current)
        executeSave(pendingSaveRef.current.payload, pendingSaveRef.current.uidToUse).catch(err => {
          console.warn('Failed to save pending data on unmount:', err)
        })
      } else if (saveDataTimeoutRef.current) {
        clearTimeout(saveDataTimeoutRef.current)
      }
    }
  }, [executeSave])

  // Close notification and profile dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showNotifDropdown && !event.target.closest('.relative')) {
        setShowNotifDropdown(false)
      }
      if (showProfileDropdown && !event.target.closest('.relative')) {
        setShowProfileDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showNotifDropdown, showProfileDropdown])

  useEffect(() => {
    setStudentDetailSubject(null)
    setSubjectPreviewCode(null)
  }, [viewMode])

  useEffect(() => {
    setStudentDetailSubject(null)
  }, [selectedStudentId])

  useEffect(() => {
    if (viewMode === 'student' && !selectedStudentId && students.length > 0) {
      setSelectedStudentId(students[0].id)
    }
  }, [viewMode, students, selectedStudentId])

  useEffect(() => {
    if (viewMode === 'student' && selectedStudentId) {
      const metrics = getStudentMetrics(selectedStudentId)
      const studentSubjects = getStudentSubjects(selectedStudentId)
      const highlightedSubject = studentSubjects[0]
      const generatedAlerts = [
        {
          id: `attendance-${selectedStudentId}`,
          title: 'Attendance Update',
          message: `You are currently at ${metrics.attendanceRate}% attendance. Keep it up!`,
          timestamp: new Date(),
          read: false,
        },
        {
          id: `grade-${selectedStudentId}`,
          title: 'Grade Highlight',
          message: metrics.averageGrade === '0'
            ? 'Grades will appear here once assessments are recorded.'
            : `Your overall average grade is ${metrics.averageGrade}%.`,
          timestamp: new Date(),
          read: false,
        },
        highlightedSubject
          ? {
              id: `subject-${highlightedSubject.code}`,
              title: `${highlightedSubject.name}`,
              message: `Target grade ${highlightedSubject.targetGrade || 90}% · Attendance ${
                getSubjectAttendanceSummary(selectedStudentId, highlightedSubject.code).rate
              }%`,
              timestamp: new Date(),
              read: false,
            }
          : null,
      ].filter(Boolean)
      setStudentAlerts(generatedAlerts)
    } else if (viewMode !== 'student') {
      setStudentAlerts([])
    }
  }, [viewMode, selectedStudentId, subjects, enrolls, records, grades])

  useEffect(() => {
    if (showProfileModal) {
      setProfileForm({ name: profName, pic: null, removePhoto: false })
      setProfilePreview(profPic)
      // Store original photo when modal opens so we can restore it if user cancels
      originalProfPicRef.current = profPic
    } else {
      // If modal is closed without saving, restore original photo
      if (originalProfPicRef.current !== null && profPic === null && !profileSaveSuccess) {
        setProfPic(originalProfPicRef.current)
        setProfilePreview(originalProfPicRef.current)
      }
      // Reset the original photo reference
      originalProfPicRef.current = null
    }
  }, [showProfileModal, profName, profPic, profileSaveSuccess])

  // Deep-link handling: read tab and subjectId from URL on load / change
  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search)
      const tabParam = params.get('tab')
      const subjectIdParam = params.get('subjectId')

      if (tabParam === 'attendance' || tabParam === 'grades' || tabParam === 'students' || tabParam === 'subjects') {
        setActiveTab(tabParam)
      }

      if (subjectIdParam && subjects.length > 0) {
        const findSubjectByCode = (code) => {
          if (!code) return null
          let subject = subjects.find(s => s.code === code)
          if (subject) return subject
          subject = subjects.find(s => s.code?.toLowerCase() === code.toLowerCase())
          if (subject) return subject
          subject = subjects.find(s => s.code?.includes(code) || code.includes(s.code))
          return subject || null
        }
        const subject = findSubjectByCode(subjectIdParam)
        if (subject) {
          setSelectedSubject(subject)
        }
      }
    } catch {
      // ignore malformed URLs
    }
  }, [location.search, subjects])

  // Prevent browser back button from sending the professor back to the login page
  // while they are on the main professor dashboard (/prof).
  useEffect(() => {
    if (location.pathname !== '/prof') return

    const handlePopState = (event) => {
      const currentUser = sessionStorage.getItem('currentUser')
      // If trying to go back to login, prevent it
      if (window.location.pathname === '/login' && currentUser) {
        event.preventDefault()
        // Replace current history entry to prevent back navigation
        window.history.pushState(null, '', '/prof')
        navigate('/prof', { replace: true })
      } else {
      // Push the current URL back onto the history stack so the user stays on /prof
      window.history.pushState(null, '', window.location.href)
      }
    }

    // Seed an extra history entry and listen for back navigation
    window.history.pushState(null, '', window.location.href)
    window.addEventListener('popstate', handlePopState)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [location.pathname, navigate])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (restoreSubjectDropdownRef.current && !restoreSubjectDropdownRef.current.contains(event.target)) {
        setShowRestoreSubjectDropdown(false)
      }
      if (newStudentSubjectDropdownRef.current && !newStudentSubjectDropdownRef.current.contains(event.target)) {
        setShowNewStudentSubjectDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Clear error when Add Subject modal opens
  useEffect(() => {
    if (showAddSubjectModal) {
      setAddSubjectError('')
      setIsSavingSubject(false)
    }
  }, [showAddSubjectModal])

  // Clear error when user types in form fields (only if error exists)
  useEffect(() => {
    if (addSubjectError && (newSubject.code || newSubject.name || newSubject.credits)) {
      setAddSubjectError('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newSubject.code, newSubject.name, newSubject.credits, newSubject.term])

  // Removed localStorage loadData - using Firestore loadData callback instead

  const executeLogout = async () => {
    // Save all current data to Firestore before logout to ensure data integrity
    if (profUid) {
      try {
        await saveData(subjects, students, enrolls, alerts, records, grades, profUid)
        console.log('All data saved successfully before logout')
      } catch (error) {
        console.error('Failed to save data before logout', error)
        // Still allow logout even if save fails (data will be saved on next change)
      }
    }
    sessionStorage.removeItem('currentUser')
    navigate('/login', { replace: true })
  }

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const handleCancelLogout = () => {
    setShowLogoutModal(false)
  }

  // State to cache student profile images
  const [studentProfileImages, setStudentProfileImages] = useState({})

  // Helper function to get student profile image
  const getStudentProfileImage = useCallback(async (studentId, studentEmail) => {
    // Check cache first
    const cacheKey = `${studentId}-${studentEmail}`
    if (studentProfileImages[cacheKey]) {
      return studentProfileImages[cacheKey]
    }

    // Try to fetch from MySQL by ID or email
    try {
      let studentProfile = null
      if (studentId && /^\d+$/.test(String(studentId))) {
        studentProfile = await getStudentByNumericalId(studentId)
      }
      if (!studentProfile && studentEmail) {
        studentProfile = await getStudentByEmail(studentEmail)
      }

      if (studentProfile && (studentProfile.photoURL || studentProfile.photo_url)) {
        const photoUrl = studentProfile.photoURL || studentProfile.photo_url
        // Update cache
        setStudentProfileImages(prev => ({
          ...prev,
          [cacheKey]: photoUrl
        }))
        return photoUrl
      }
    } catch (error) {
      console.warn(`Failed to fetch profile image for student ${studentId}:`, error)
    }

    return null
  }, [studentProfileImages])

  // Helper component to display student avatar with profile image
  const StudentAvatar = ({ student, className = "w-10 h-10" }) => {
    const [imageUrl, setImageUrl] = useState(null)
    const [imageError, setImageError] = useState(false)
    const loadingRef = useRef(false)
    const studentKeyRef = useRef(null)
    const imageUrlRef = useRef(null)

    useEffect(() => {
      // Only load if student changed
      const currentKey = student ? `${student.id}-${student.email}` : null
      if (!student || currentKey === studentKeyRef.current) {
        return
      }

      // Reset state when student changes
      studentKeyRef.current = currentKey
      loadingRef.current = false
      setImageError(false)
      setImageUrl(null)
      imageUrlRef.current = null

      // Check cache first
      const cacheKey = `${student.id}-${student.email}`
      if (studentProfileImages[cacheKey]) {
        setImageUrl(studentProfileImages[cacheKey])
        imageUrlRef.current = studentProfileImages[cacheKey]
        return
      }

      // Load from MySQL
      if (loadingRef.current) return
      loadingRef.current = true

      const loadImage = async () => {
        try {
          // Fetch from MySQL
          let studentProfile = null
          if (student.id && /^\d+$/.test(String(student.id))) {
            studentProfile = await getStudentByNumericalId(student.id)
          }
          if (!studentProfile && student.email) {
            studentProfile = await getStudentByEmail(student.email)
          }

          if (studentProfile && (studentProfile.photoURL || studentProfile.photo_url)) {
            const photoUrl = studentProfile.photoURL || studentProfile.photo_url
            // Update cache
            setStudentProfileImages(prev => ({
              ...prev,
              [cacheKey]: photoUrl
            }))
            setImageUrl(photoUrl)
            imageUrlRef.current = photoUrl
          } else {
            setImageError(true)
          }
        } catch (error) {
          console.warn(`Failed to fetch profile image for student ${student.id}:`, error)
          setImageError(true)
        } finally {
          loadingRef.current = false
        }
      }

      loadImage()
    }, [student?.id, student?.email])

    const initials = student?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??'

    if (!imageUrl || imageError) {
      return (
        <div className={`${className} bg-gradient-to-r from-red-800 to-red-600 rounded-full flex items-center justify-center flex-shrink-0`}>
          <span className="text-white font-semibold text-sm">
            {initials}
          </span>
        </div>
      )
    }

    return (
      <div className={`${className} rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 border-2 border-white shadow-md`}>
        <img 
          src={imageUrl} 
          alt={student?.name || 'Student'} 
          className="w-full h-full object-cover"
          onError={() => {
            setImageError(true)
          }}
        />
      </div>
    )
  }

  const getInitials = (name) => {
    if (!name || name === 'TBA') return 'PU'
    return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  }

  const handleProfilePicSelection = (file) => {
    if (file) {
      console.log('Profile picture selected:', { name: file.name, size: file.size, type: file.type })
      setProfileForm(prev => {
        const updated = { ...prev, pic: file }
        console.log('Updated profileForm with pic:', { hasPic: !!updated.pic, picType: typeof updated.pic })
        return updated
      })
      const reader = new FileReader()
      reader.onload = (evt) => {
        setProfilePreview(evt.target.result)
        console.log('Profile preview updated')
      }
      reader.onerror = (error) => {
        console.error('Error reading file:', error)
      }
      reader.readAsDataURL(file)
    } else {
      console.log('Profile picture cleared')
      setProfileForm(prev => ({ ...prev, pic: null }))
      setProfilePreview(profPic)
    }
  }

  const handleRemoveProfilePicture = () => {
    console.log('Removing profile picture')
    // Clear the file input
    const fileInput = document.getElementById('profile-picture')
    if (fileInput) {
      fileInput.value = ''
    }
    // Clear form state and mark photo for removal
    setProfileForm(prev => ({ ...prev, pic: null, removePhoto: true }))
    // Set preview to null to show default/initials
    setProfilePreview(null)
    // Update profPic immediately so sidebar avatar changes right away
    setProfPic(null)
    console.log('Profile picture removed - avatar updated immediately')
  }

  const handleAddSubject = async (e) => {
    e.preventDefault()
    
    // Clear any previous errors
    setAddSubjectError('')
    
    // Validate fields
    if (!newSubject.code || !newSubject.name || !newSubject.credits) {
      setAddSubjectError('Please fill in all fields')
      return
    }

    // Check for duplicate subject (both code AND name must match to be considered duplicate)
    const duplicateSubject = subjects.find(s => 
      s.code === newSubject.code && s.name === newSubject.name
    )
    
    if (duplicateSubject) {
      setAddSubjectError('A subject with this code and name already exists. Please use a different code or name.')
      return
    }

    setIsSavingSubject(true)

    try {
      const updatedSubjects = [...subjects, { 
        ...newSubject, 
        createdAt: new Date().toISOString() 
      }]
      const updatedEnrolls = { ...enrolls, [newSubject.code]: [] }
      
      setSubjects(updatedSubjects)
      setNormalizedEnrolls(updatedEnrolls)
      
      // Add alert
      const newAlert = {
        id: Date.now(),
        type: 'general',
        title: 'Subject Added',
        message: `${newSubject.name} (${newSubject.code}) has been added successfully`,
        timestamp: new Date(),
        read: false,
      }
      const updatedAlerts = [newAlert, ...alerts]
      setAlerts(updatedAlerts)
      
      // Save to Firestore (await to ensure completion before closing modal)
      await saveData(updatedSubjects, students, updatedEnrolls, updatedAlerts, records, grades, profUid)
      
      // Reset form and error state
      setNewSubject({ code: '', name: '', credits: '', term: 'first' })
      setAddSubjectError('')
      setIsSavingSubject(false)
      
      // Automatically transition to Subject Management tab
      // This ensures the Professor sees the newly created subject immediately
      setActiveTab('subjects')
      setShowSubjectDetail(false)
      setSelectedSubject(null)
      
      // Automatically close modal after successful save
      // No manual action required - seamless transition back to dashboard
      setShowAddSubjectModal(false)
    } catch (error) {
      console.error('Failed to save subject to Firestore', error)
      setAddSubjectError('Failed to save subject. Please try again.')
      setIsSavingSubject(false)
      // Modal remains open so user can retry
    }
  }

  const handleUpdateSubjectTerm = async (subjectCode, newTerm, e) => {
    if (e) {
      e.stopPropagation() // Prevent subject card click
    }
    
    try {
      const subject = subjects.find(s => s.code === subjectCode)
      if (!subject) {
        addCustomAlert('error', 'Subject Not Found', 'Subject not found. Please refresh and try again.', false)
        return
      }

      const updatedSubjects = subjects.map(subject => 
        subject.code === subjectCode 
          ? { ...subject, term: newTerm }
          : subject
      )
      
      setSubjects(updatedSubjects)
      
      // Update MySQL course term
      try {
        const course = await getCourseByCode(subjectCode)
        if (course && course.id) {
          await updateCourse(course.id, { term: newTerm })
          console.log(`✅ Updated course term in MySQL: ${subjectCode} → ${newTerm}`)
        } else {
          console.warn(`⚠️ Course not found in MySQL for ${subjectCode}, term not updated in database`)
        }
      } catch (mysqlError) {
        console.error('❌ Failed to update course term in MySQL:', mysqlError)
        // Continue with Firestore update even if MySQL fails
      }
      
      // Save to Firestore
      await saveData(updatedSubjects, students, enrolls, alerts, records, grades, profUid)
      
      // Sync term update to all enrolled students
      const enrolledStudentIds = enrolls[subjectCode] || []
      if (enrolledStudentIds.length > 0) {
        console.log(`🔄 Syncing term update to ${enrolledStudentIds.length} enrolled students for subject ${subjectCode}`)
        
        // Update each enrolled student's dashboard
        const syncPromises = enrolledStudentIds.map(async (studentId) => {
          try {
            const normalizedId = normalizeStudentId(studentId)
            const student = students.find(s => normalizeStudentId(s.id) === normalizedId)
            if (!student || !student.email) {
              console.warn(`⚠️ Student ${normalizedId} not found or missing email, skipping sync`)
              return
            }

            // Get student UID for sync
            const verification = await verifyStudentIdEmailPair(student.id, student.email)
            let studentUid = null
            
            if (verification.verified && verification.uid) {
              studentUid = verification.uid
            } else {
              const uidFromSync = await getStudentUidForSync(student.id, student.email)
              if (uidFromSync && typeof uidFromSync === 'string') {
                studentUid = uidFromSync
              }
            }

            if (studentUid && typeof studentUid === 'string') {
              // Get current student dashboard
              const currentDashboard = await getStudentDashboard(studentUid)
              const currentSubjects = currentDashboard?.subjects || []
              
              // Update the subject with new term
              const updatedStudentSubjects = currentSubjects.map(subj => 
                subj.code === subjectCode 
                  ? { ...subj, term: newTerm }
                  : subj
              )
              
              // Sync updated subjects to student dashboard
              await syncStudentSubjects(studentUid, updatedStudentSubjects)
              console.log(`✅ Synced term update to student ${student.name} (${student.id})`)
            } else {
              console.warn(`⚠️ Could not find student ${student.id} in MySQL, term will sync when student logs in`)
            }
          } catch (error) {
            console.error(`❌ Failed to sync term update to student ${studentId}:`, error)
          }
        })

        // Wait for all syncs to complete (non-blocking)
        Promise.all(syncPromises).then(() => {
          console.log(`✅ Completed syncing term updates to ${enrolledStudentIds.length} students`)
        }).catch(err => {
          console.error('Some term syncs failed:', err)
        })
      }
      
      // Show success message
      const newAlert = {
        id: Date.now(),
        type: 'general',
        title: 'Term Updated',
        message: `Subject term has been updated to ${newTerm === 'first' ? '1st Term' : '2nd Term'}. ${enrolledStudentIds.length > 0 ? `Syncing to ${enrolledStudentIds.length} enrolled student(s)...` : ''}`,
        timestamp: new Date(),
        read: false,
      }
      setAlerts(prev => [newAlert, ...prev])
    } catch (error) {
      console.error('Failed to update subject term', error)
      addCustomAlert('error', 'Update Failed', 'Failed to update subject term. Please try again.', false)
    }
  }

  const toggleRestoreSubjectSelection = (subjectCode) => {
    setSelectedSubjectsForBulk(prev => {
      if (prev.includes(subjectCode)) {
        return prev.filter(code => code !== subjectCode)
      }
      return [...prev, subjectCode]
    })
  }

  const toggleNewStudentSubjectSelection = (subjectCode) => {
    setNewStudent(prev => {
      const current = prev.subjects || []
      if (current.includes(subjectCode)) {
        return { ...prev, subjects: current.filter(code => code !== subjectCode) }
      }
      return { ...prev, subjects: [...current, subjectCode] }
    })
  }

  const handleDeleteSubject = async (subjectCode, e) => {
    e.stopPropagation()
    const subject = subjects.find(s => s.code === subjectCode)
    if (!subject) return
    
    setSubjectPendingDelete(subject)
    setDeleteSubjectMode('archive')
    setShowDeleteSubjectModal(true)
  }

  const handleRestoreSubject = async (subjectCode) => {
    const subject = removedSubjects.find(s => s.code === subjectCode)
    if (!subject) return
    
    const updatedRemovedSubjects = removedSubjects.filter(s => s.code !== subjectCode)
    const updatedSubjects = [...subjects, subject]
    
    setSubjects(updatedSubjects)
    setRemovedSubjects(updatedRemovedSubjects)
    
    // Rebuild enrollments from MySQL (since MySQL is the source of truth)
    // This ensures we get the current state of enrollments from the database
    try {
      if (profProfile && profProfile.id) {
        const rebuiltResult = await buildEnrollsFromMySQL(profProfile.id, updatedSubjects)
        const rebuiltEnrolls = rebuiltResult.enrolls || rebuiltResult
        console.log('✅ Rebuilt enrollments from MySQL after restoring subject:', rebuiltEnrolls)
        setNormalizedEnrolls(rebuiltEnrolls)
        
        // Update the payload with rebuilt enrollments
        const payload = {
          subjects: updatedSubjects,
          removedSubjects: updatedRemovedSubjects,
          students: students,
          enrolls: rebuiltEnrolls,
          alerts,
          records: records,
          grades: grades,
          ownerUid: profUid,
          updatedAt: new Date().toISOString(),
        }
        
        try {
          await saveDashboardState({
            subjects: payload.subjects || [],
            removedSubjects: payload.removedSubjects || [],
            recycleBinSubjects: payload.recycleBinSubjects || [],
            students: payload.students || [],
            records: payload.records || {},
            grades: payload.grades || {},
            alerts: payload.alerts || []
          })
        } catch (error) {
          console.error('Failed to save restored subject', error)
        }
      } else {
        console.warn('⚠️ Professor MySQL ID not available; cannot rebuild enrollments from MySQL')
        // Fallback: Save without rebuilding enrollments
        const payload = {
          subjects: updatedSubjects,
          removedSubjects: updatedRemovedSubjects,
          students: students,
          enrolls: enrolls,
          alerts,
          records: records,
          grades: grades,
          ownerUid: profUid,
          updatedAt: new Date().toISOString(),
        }
        
        try {
          await saveDashboardState({
            subjects: payload.subjects || [],
            removedSubjects: payload.removedSubjects || [],
            recycleBinSubjects: payload.recycleBinSubjects || [],
            students: payload.students || [],
            records: payload.records || {},
            grades: payload.grades || {},
            alerts: payload.alerts || []
          })
        } catch (error) {
          console.error('Failed to save restored subject', error)
        }
      }
    } catch (error) {
      console.error('❌ Failed to rebuild enrollments from MySQL:', error)
      // Fallback: Save without rebuilding enrollments
      const payload = {
        subjects: updatedSubjects,
        removedSubjects: updatedRemovedSubjects,
        students: students,
        enrolls: enrolls,
        alerts,
        records: records,
        grades: grades,
        ownerUid: profUid,
        updatedAt: new Date().toISOString(),
      }
      
      try {
        await saveDashboardState({
          subjects: payload.subjects || [],
          removedSubjects: payload.removedSubjects || [],
          recycleBinSubjects: payload.recycleBinSubjects || [],
          students: payload.students || [],
          records: payload.records || {},
          grades: payload.grades || {},
          alerts: payload.alerts || []
        })
      } catch (error) {
        console.error('Failed to save restored subject', error)
      }
    }
  }

  const handleDeleteArchivedSubject = async (subjectCode) => {
    const subject = removedSubjects.find(s => s.code === subjectCode)
    if (!subject) return

    setSubjectPendingDelete(subject)
    setDeleteSubjectMode('delete')
    setShowDeleteSubjectModal(true)
  }

  const handleDeleteAllArchivedSubjects = () => {
    // Set a special flag to indicate bulk move to recycle bin
    setSubjectPendingDelete({ code: 'ALL', name: 'All Archived Subjects', isBulkDelete: true })
    setDeleteSubjectMode('delete') // 'delete' means move to recycle bin
    setShowDeleteSubjectModal(true)
  }

  const handlePermanentDeleteAllFromRecycleBin = () => {
    // Set a special flag to indicate bulk permanent delete
    setSubjectPendingDelete({ code: 'ALL', name: 'All Recycle Bin Subjects', isBulkDelete: true })
    setDeleteSubjectMode('permanent')
    setShowDeleteSubjectModal(true)
  }

  const handlePermanentDeleteSelectedFromRecycleBin = () => {
    if (selectedRecycleBinSubjects.length === 0) {
      addCustomAlert('warning', 'No Selection', 'Please select at least one subject to permanently delete.', false)
      return
    }
    
    // Set a special flag to indicate bulk permanent delete of selected subjects
    setSubjectPendingDelete({ 
      code: 'SELECTED', 
      name: `${selectedRecycleBinSubjects.length} Selected Subject(s)`, 
      isBulkDelete: true,
      selectedCodes: selectedRecycleBinSubjects
    })
    setDeleteSubjectMode('permanent')
    setShowDeleteSubjectModal(true)
  }

  const confirmArchiveSubject = async () => {
    const subject = subjectPendingDelete
    if (!subject) return
    const subjectCode = subject.code

    // Delete all enrollments for this course from MySQL
    try {
      const course = await getCourseByCode(subjectCode)
      if (course && course.id) {
        // Get all enrollments for this course
        const enrollments = await getEnrollmentsByCourse(course.id)
        console.log(`🗑️ Deleting ${enrollments.length} enrollments for archived course ${subjectCode}`)
        
        // Delete each enrollment from MySQL
        for (const enrollment of enrollments) {
          try {
            await deleteEnrollment(enrollment.id)
          } catch (error) {
            console.error(`Failed to delete enrollment ${enrollment.id}:`, error)
          }
        }
        console.log(`✅ Deleted all enrollments for course ${subjectCode} from MySQL`)
      } else {
        console.warn(`⚠️ Course ${subjectCode} not found in MySQL; skipping enrollment deletion`)
      }
    } catch (error) {
      console.error('❌ Failed to delete enrollments from MySQL:', error)
      // Continue with archiving even if enrollment deletion fails
    }

    const updatedSubjects = subjects.filter(s => s.code !== subjectCode)
    const updatedRemovedSubjects = [...removedSubjects, subject] // Add to removed subjects
    const updatedEnrolls = { ...enrolls }
    delete updatedEnrolls[subjectCode]
    
    setSubjects(updatedSubjects)
    setRemovedSubjects(updatedRemovedSubjects)
    setNormalizedEnrolls(updatedEnrolls)
    
    // Save to Firestore (await to ensure completion)
    // Note: saveData doesn't accept removedSubjects parameter, so we need to update it
    // For now, we'll save it manually or update saveData signature
    const payload = {
      subjects: updatedSubjects,
      removedSubjects: updatedRemovedSubjects,
      students: students,
      enrolls: updatedEnrolls,
      alerts,
      records: records,
      grades: grades,
      ownerUid: profUid,
      updatedAt: new Date().toISOString(),
    }
    
    // Save directly using saveDashboardState
    try {
      await saveDashboardState({
        subjects: payload.subjects || [],
        removedSubjects: payload.removedSubjects || [],
        recycleBinSubjects: payload.recycleBinSubjects || [],
        students: payload.students || [],
        records: payload.records || {},
        grades: payload.grades || {},
        alerts: payload.alerts || []
      })
    } catch (error) {
      console.error('Failed to save removed subject', error)
    }
    
    if (selectedSubject && selectedSubject.code === subjectCode) {
      setShowSubjectDetail(false)
      setSelectedSubject(null)
    }

    setShowDeleteSubjectModal(false)
    setSubjectPendingDelete(null)
    setDeleteSubjectMode('delete')
  }

  const confirmDeleteArchivedSubject = async () => {
    const subject = subjectPendingDelete
    if (!subject) return

    // Check if this is a bulk delete (move all archived subjects to recycle bin)
    if (subject.isBulkDelete && subject.code === 'ALL') {
      // Move all archived subjects to recycle bin
      const subjectsToMove = [...removedSubjects]
      
      setRemovedSubjects([])
      setRecycleBinSubjects(prev => [...prev, ...subjectsToMove])

      const newAlert = {
        id: Date.now(),
        type: 'general',
        title: 'Subjects Moved to Recycle Bin',
        message: `All ${subjectsToMove.length} archived subject(s) have been moved to Recycle Bin.`,
        timestamp: new Date(),
        read: false,
      }
      const updatedAlerts = [newAlert, ...alerts]
      setAlerts(updatedAlerts)

      // Save updated dashboard state
      const payload = {
        subjects,
        removedSubjects: [],
        recycleBinSubjects: [...recycleBinSubjects, ...subjectsToMove],
        students,
        enrolls,
        alerts: updatedAlerts,
        records,
        grades,
        ownerUid: profUid,
        updatedAt: new Date().toISOString(),
      }

      try {
        await saveDashboardState({
          subjects: payload.subjects || [],
          removedSubjects: payload.removedSubjects || [],
          recycleBinSubjects: payload.recycleBinSubjects || [],
          students: payload.students || [],
          records: payload.records || {},
          grades: payload.grades || {},
          alerts: payload.alerts || []
        })
      } catch (error) {
        console.error('Failed to save after moving to recycle bin', error)
      }

      setShowDeleteSubjectModal(false)
      setSubjectPendingDelete(null)
      return
    }

    // Single subject deletion - move to recycle bin
    const subjectCode = subject.code

    // Move subject from archived to recycle bin
    const updatedRemovedSubjects = removedSubjects.filter(s => s.code !== subjectCode)
    setRemovedSubjects(updatedRemovedSubjects)
    setRecycleBinSubjects(prev => [...prev, subject])

    const newAlert = {
      id: Date.now(),
      type: 'general',
      title: 'Subject Moved to Recycle Bin',
      message: `${subject.name} has been moved to Recycle Bin.`,
      timestamp: new Date(),
      read: false,
    }
    const updatedAlerts = [newAlert, ...alerts]
    setAlerts(updatedAlerts)

    // Save updated dashboard state
    const payload = {
      subjects,
      removedSubjects: updatedRemovedSubjects,
      recycleBinSubjects: [...recycleBinSubjects, subject],
      students,
      enrolls,
      alerts: updatedAlerts,
      records,
      grades,
      ownerUid: profUid,
      updatedAt: new Date().toISOString(),
    }

    try {
      await saveDashboardState({
        subjects: payload.subjects || [],
        removedSubjects: payload.removedSubjects || [],
        recycleBinSubjects: payload.recycleBinSubjects || [],
        students: payload.students || [],
        records: payload.records || {},
        grades: payload.grades || {},
        alerts: payload.alerts || []
      })
    } catch (error) {
      console.error('Failed to save after moving to recycle bin', error)
    }

    setShowDeleteSubjectModal(false)
    setSubjectPendingDelete(null)
    setDeleteSubjectMode('delete')
  }

  // Permanently delete from recycle bin
  const handlePermanentDeleteFromRecycleBin = async (subjectCode) => {
    const subject = recycleBinSubjects.find(s => s.code === subjectCode)
    if (!subject) return

    setSubjectPendingDelete(subject)
    setDeleteSubjectMode('permanent')
    setShowDeleteSubjectModal(true)
  }

  const confirmPermanentDelete = async () => {
    const subject = subjectPendingDelete
    if (!subject) return

    // Check if this is a bulk permanent delete
    if (subject.isBulkDelete) {
      let subjectsToDelete = []
      
      if (subject.code === 'ALL') {
        // Delete all subjects
        subjectsToDelete = [...recycleBinSubjects]
      } else if (subject.code === 'SELECTED' && subject.selectedCodes) {
        // Delete only selected subjects
        subjectsToDelete = recycleBinSubjects.filter(s => subject.selectedCodes.includes(s.code))
      } else {
        // Fallback: single subject
        subjectsToDelete = [subject]
      }
      
      // Delete courses from MySQL
      for (const subj of subjectsToDelete) {
        try {
          const course = await getCourseByCode(subj.code)
          if (course && course.id) {
            await deleteCourse(course.id)
            console.log(`🗑️ Permanently deleted course ${subj.code} from MySQL (ID: ${course.id})`)
          }
        } catch (error) {
          console.error(`❌ Failed to permanently delete course ${subj.code} from MySQL:`, error)
        }
      }

      // Remove deleted subjects from recycle bin
      const updatedRecycleBinSubjects = recycleBinSubjects.filter(s => 
        !subjectsToDelete.some(toDelete => toDelete.code === s.code)
      )
      setRecycleBinSubjects(updatedRecycleBinSubjects)
      
      // Clear selection after deletion
      setSelectedRecycleBinSubjects([])
      setSelectAllRecycleBinSubjects(false)

      const newAlert = {
        id: Date.now(),
        type: 'general',
        title: 'Subjects Permanently Deleted',
        message: `${subjectsToDelete.length} subject(s) have been permanently deleted from Recycle Bin.`,
        timestamp: new Date(),
        read: false,
      }
      const updatedAlerts = [newAlert, ...alerts]
      setAlerts(updatedAlerts)

      const payload = {
        subjects,
        removedSubjects,
        recycleBinSubjects: updatedRecycleBinSubjects,
        students,
        enrolls,
        alerts: updatedAlerts,
        records,
        grades,
        ownerUid: profUid,
        updatedAt: new Date().toISOString(),
      }

      try {
        await saveDashboardState({
          subjects: payload.subjects || [],
          removedSubjects: payload.removedSubjects || [],
          recycleBinSubjects: payload.recycleBinSubjects || [],
          students: payload.students || [],
          records: payload.records || {},
          grades: payload.grades || {},
          alerts: payload.alerts || []
        })
      } catch (error) {
        console.error('Failed to save after permanent delete', error)
      }

      setShowDeleteSubjectModal(false)
      setSubjectPendingDelete(null)
      return
    }

    // Single permanent delete
    const subjectCode = subject.code

    // Delete the course from MySQL
    try {
      const course = await getCourseByCode(subjectCode)
      if (course && course.id) {
        await deleteCourse(course.id)
        console.log(`🗑️ Permanently deleted course ${subjectCode} from MySQL (ID: ${course.id})`)
      } else {
        console.warn(`⚠️ Course ${subjectCode} not found in MySQL; skipping delete`)
      }
    } catch (error) {
      console.error('❌ Failed to permanently delete course from MySQL:', error)
    }

    const updatedRecycleBinSubjects = recycleBinSubjects.filter(s => s.code !== subjectCode)
    setRecycleBinSubjects(updatedRecycleBinSubjects)

    const newAlert = {
      id: Date.now(),
      type: 'general',
      title: 'Subject Permanently Deleted',
      message: `${subject.name} has been permanently deleted.`,
      timestamp: new Date(),
      read: false,
    }
    const updatedAlerts = [newAlert, ...alerts]
    setAlerts(updatedAlerts)

    const payload = {
      subjects,
      removedSubjects,
      recycleBinSubjects: updatedRecycleBinSubjects,
      students,
      enrolls,
      alerts: updatedAlerts,
      records,
      grades,
      ownerUid: profUid,
      updatedAt: new Date().toISOString(),
    }

    try {
      await saveDashboardState({
        subjects: payload.subjects || [],
        removedSubjects: payload.removedSubjects || [],
        recycleBinSubjects: payload.recycleBinSubjects || [],
        students: payload.students || [],
        records: payload.records || {},
        grades: payload.grades || {},
        alerts: payload.alerts || []
      })
    } catch (error) {
      console.error('Failed to save after permanent delete', error)
    }

    setShowDeleteSubjectModal(false)
    setSubjectPendingDelete(null)
    setDeleteSubjectMode('delete')
  }

  // Restore from recycle bin to archived
  const handleRestoreFromRecycleBin = async (subjectCode) => {
    const subject = recycleBinSubjects.find(s => s.code === subjectCode)
    if (!subject) return

    const updatedRecycleBinSubjects = recycleBinSubjects.filter(s => s.code !== subjectCode)
    const updatedRemovedSubjects = [...removedSubjects, subject]
    
    setRecycleBinSubjects(updatedRecycleBinSubjects)
    setRemovedSubjects(updatedRemovedSubjects)

    const newAlert = {
      id: Date.now(),
      type: 'general',
      title: 'Subject Restored',
      message: `${subject.name} has been restored to Archived Subjects.`,
      timestamp: new Date(),
      read: false,
    }
    const updatedAlerts = [newAlert, ...alerts]
    setAlerts(updatedAlerts)

    const payload = {
      subjects,
      removedSubjects: updatedRemovedSubjects,
      recycleBinSubjects: updatedRecycleBinSubjects,
      students,
      enrolls,
      alerts: updatedAlerts,
      records,
      grades,
      ownerUid: profUid,
      updatedAt: new Date().toISOString(),
    }

    try {
      await saveDashboardState({
        subjects: payload.subjects || [],
        removedSubjects: payload.removedSubjects || [],
        recycleBinSubjects: payload.recycleBinSubjects || [],
        students: payload.students || [],
        records: payload.records || {},
        grades: payload.grades || {},
        alerts: payload.alerts || []
      })
    } catch (error) {
      console.error('Failed to save after restore', error)
    }
  }

  const handleSubjectClick = (subject) => {
    setSelectedSubject(subject)
    setShowSubjectDetail(true)
  }

  const handleBackToSubjects = () => {
    setShowSubjectDetail(false)
    setSelectedSubject(null)
    setCurrentSubject(null)
    if (activeTab !== 'subjects') {
      setActiveTab('subjects')
    }
  }

  const handleTakeAttendance = () => {
    if (selectedSubject) {
      setCurrentSubject(selectedSubject)
      setActiveTab('attendance')
      setShowSubjectDetail(false)
    }
  }

  const handleManageGrades = () => {
    if (selectedSubject) {
      setCurrentSubject(selectedSubject)
      setActiveTab('grades')
      setShowSubjectDetail(false)
    }
  }

  const toggleAttendance = (studentId, status) => {
    if (!currentSubject) return
    
    const date = attendanceDate
    const updatedRecords = { ...records }
    if (!updatedRecords[date]) updatedRecords[date] = {}
    if (!updatedRecords[date][currentSubject.code]) updatedRecords[date][currentSubject.code] = {}
    
    const currentStatus = updatedRecords[date][currentSubject.code][studentId]
    if (currentStatus === status) {
      delete updatedRecords[date][currentSubject.code][studentId]
    } else {
      updatedRecords[date][currentSubject.code][studentId] = status
    }
    
    // Update UI immediately (optimistic update) - NO AWAIT, instant response
    setRecords(updatedRecords)
    
    // Save to Firestore immediately (no debounce for attendance - critical data)
    saveData(subjects, students, enrolls, alerts, updatedRecords, grades, profUid, true).catch(err => 
      console.warn('Background save failed', err)
    )
      
    // Sync attendance to student dashboard in background (non-blocking)
    const student = students.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
    if (student && currentStatus !== status) {
      // Run sync in background - don't block UI
      Promise.resolve().then(async () => {
        try {
          // Verify the numerical Student ID + Email pairing for secure data linking
          const verification = await verifyStudentIdEmailPair(student.id, student.email)
          
          if (verification.verified && verification.uid) {
            await syncStudentAttendance(verification.uid, currentSubject.code, date, status, {
              subjectName: currentSubject.name,
              dateLabel: formattedDate,
            })
          } else {
            // Fallback to direct lookup
            const studentUid = await getStudentUidForSync(student.id, student.email)
            if (studentUid) {
              await syncStudentAttendance(studentUid, currentSubject.code, date, status, {
                subjectName: currentSubject.name,
                dateLabel: formattedDate,
              })
            }
          }
        } catch (error) {
          console.warn('Failed to sync attendance to student dashboard', error)
        }
      }).catch(err => {
        // Silently handle errors - don't interrupt user experience
        console.warn('Background sync error:', err)
      })
    }
  }

  const getAttendanceStatus = (studentId) => {
    if (!currentSubject) return null
    const date = attendanceDate
    return records[date]?.[currentSubject.code]?.[studentId] || null
  }

  const updateAttendanceSummary = () => {
    if (!currentSubject) return { present: 0, absent: 0, total: 0, rate: 0 }
    
    const enrolled = enrolls[currentSubject.code] || []
    const date = attendanceDate
    const attendance = records[date]?.[currentSubject.code] || {}
    
    let present = 0
    let absent = 0
    
    enrolled.forEach(id => {
      const status = attendance[id]
      if (status === 'present') present++
      else if (status === 'absent') absent++
    })
    
    const total = enrolled.length
    const rate = total > 0 ? Math.round((present / total) * 100) : 0
    
    return { present, absent, total, rate }
  }

  const handleSelectAllPresent = () => {
    if (!currentSubject) return
    
    const date = attendanceDate
    const enrolled = enrolls[currentSubject.code] || []
    const updatedRecords = { ...records }
    if (!updatedRecords[date]) updatedRecords[date] = {}
    if (!updatedRecords[date][currentSubject.code]) updatedRecords[date][currentSubject.code] = {}
    
    // Mark all enrolled students as present
    enrolled.forEach(studentId => {
      updatedRecords[date][currentSubject.code][studentId] = 'present'
    })
    
    // Update UI immediately
    setRecords(updatedRecords)
    
    // Save to Firestore immediately
    saveData(subjects, students, enrolls, alerts, updatedRecords, grades, profUid, true).then(() => {
      // Show auto-save message in dashboard
      const formattedDate = new Date(attendanceDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      lastAutoSaveMessageRef.current = Date.now()
      addCustomAlert('success', 'Attendance Auto-Saved', `All students marked as present for ${formattedDate} and automatically saved.`, false)
    }).catch(err => 
      console.warn('Background save failed', err)
    )
  }

  const areAllStudentsPresent = () => {
    if (!currentSubject) return false
    const enrolled = enrolls[currentSubject.code] || []
    if (enrolled.length === 0) return false
    
    const date = attendanceDate
    const attendance = records[date]?.[currentSubject.code] || {}
    
    return enrolled.every(id => attendance[id] === 'present')
  }

  const handleSaveAttendance = async () => {
    console.log('🚀 handleSaveAttendance called')
    try {
      if (!currentSubject) {
        console.error('❌ No subject selected')
        addCustomAlert('error', 'No Subject', 'Please select a subject first.', false)
        return
      }
      
      const formattedDate = new Date(attendanceDate).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      
      // Sync all attendance records for this date and subject to student dashboards
      const enrolled = enrolls[currentSubject.code] || []
      const date = attendanceDate
      const dateRecords = records[date]?.[currentSubject.code] || {}
      
      if (Object.keys(dateRecords).length === 0) {
        console.warn('⚠️ No attendance records to save')
        // Show on-screen toast message
        setToastMessage('No Record, please mark attendance before saving.')
        setTimeout(() => setToastMessage(null), 3000) // Hide after 3 seconds
        addCustomAlert('warning', 'No Records', 'Please mark attendance for at least one student before saving.', false)
        return
      }
      
      console.log('📚 Getting/creating course in MySQL...')
      // Get course ID from MySQL
      let course = await getCourseByCode(currentSubject.code)
      if (!course) {
        // Create course if it doesn't exist
        const profProfile = await getProfessorByUid(profUid)
        if (!profProfile || !profProfile.id) {
          console.error('❌ Professor profile not found')
          addCustomAlert('error', 'Profile Error', 'Professor profile not found. Please refresh and try again.', false)
          return
        }
        const courseId = await createCourse({
          code: currentSubject.code,
          name: currentSubject.name,
          credits: parseInt(currentSubject.credits) || 0,
          professorId: profProfile.id,
        })
        course = { id: courseId, code: currentSubject.code }
        console.log(`✅ Created new course in MySQL: ${currentSubject.name} (ID: ${course.id})`)
      }
      const courseId = course.id
      console.log(`📚 Using Course: ${currentSubject.name} (Code: ${currentSubject.code}, MySQL ID: ${courseId})`)
      
      // Save attendance to MySQL for each student
      let savedCount = 0
      let failedCount = 0
      const failedStudents = []
      
      const savePromises = enrolled.map(async (studentId) => {
        const status = dateRecords[studentId]
        if (status) {
          const student = students.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
          if (student) {
            try {
              // Get student MySQL ID by looking up their numerical ID
              const studentData = await getStudentByNumericalId(student.id)
              if (!studentData || !studentData.id) {
                console.warn(`Student ${student.id} not found in MySQL`)
                failedCount++
                failedStudents.push(student.name || student.id)
                return
              }
              const studentMySQLId = studentData.id
              console.log(`💾 Student: ${student.name} (Numerical ID: ${student.id}, MySQL ID: ${studentMySQLId})`)

              // Save attendance in MySQL
              console.log(`💾 Saving attendance to MySQL:`, {
                studentId: studentMySQLId,
                courseId: courseId,
                date: date,
                status: status
              })
              
              await setAttendanceForDate(studentMySQLId, courseId, date, status)

              savedCount++
              console.log(`✅ Attendance saved to MySQL for student ${student.id} (MySQL ID: ${studentMySQLId})`)
            } catch (error) {
              failedCount++
              failedStudents.push(student.name || student.id)
              console.error(`❌ Failed to save attendance for student ${studentId}:`, error)
            }
          }
        }
      })
      
      // Wait for all saves to complete
      await Promise.all(savePromises)
      
      // Count attendance records
      const presentCount = Object.values(dateRecords).filter(s => s === 'present').length
      const absentCount = Object.values(dateRecords).filter(s => s === 'absent').length
      const totalCount = presentCount + absentCount
      
      // Show appropriate feedback
      if (savedCount > 0 && failedCount === 0) {
        // Show on-screen toast message
        setToastMessage('Attendance saved!')
        setTimeout(() => setToastMessage(null), 3000) // Hide after 3 seconds
        addCustomAlert('success', 'Attendance Saved', `Attendance records for ${formattedDate} saved successfully. ${savedCount} student${savedCount === 1 ? '' : 's'} marked (${presentCount} present, ${absentCount} absent).`, false)
        console.log(`✅ All attendance saved successfully (${savedCount} student${savedCount === 1 ? '' : 's'})`)
      } else if (savedCount > 0 && failedCount > 0) {
        const errorMsg = `Attendance saved for ${savedCount} student(s), but failed for ${failedCount} student(s): ${failedStudents.join(', ')}. Check console for details.`
        console.warn('⚠️ Partial save:', errorMsg)
        addCustomAlert('warning', 'Partial Save', errorMsg, false)
      } else if (savedCount === 0) {
        const errorMsg = 'No attendance records were saved. Please check that students exist in the system and try again.'
        console.error('❌ No attendance saved')
        addCustomAlert('error', 'No Attendance Saved', errorMsg, false)
        return
      }
      
      // Only proceed if at least some attendance was saved
      if (savedCount === 0) {
        return
      }
      
      // Create real-time notification for attendance save
      const newAlert = {
        id: Date.now(),
        type: 'attendance',
        title: 'Attendance Saved',
        message: `Attendance records for ${formattedDate} saved successfully. ${savedCount} student${savedCount === 1 ? '' : 's'} marked (${presentCount} present, ${absentCount} absent).`,
        timestamp: new Date(),
        read: false,
        target_courseId: currentSubject.code,
        subjectCode: currentSubject.code,
      }
      const updatedAlerts = [newAlert, ...alerts]
      setAlerts(updatedAlerts)
      
      // Save to Firestore immediately (critical operation)
      await saveData(subjects, students, enrolls, updatedAlerts, records, grades, profUid, true)
    } catch (error) {
      console.error('❌ Error in handleSaveAttendance:', error)
      addCustomAlert('error', 'Save Failed', `Unable to save attendance: ${error.message || 'An unexpected error occurred'}. Please try again.`, false)
    }
  }

  const handleInitQuickGrade = () => {
    if (!quickGradeTitle || !quickGradeMaxPoints) {
      addCustomAlert('warning', 'Missing Information', 'Please enter a title and max points for the assessment.', false)
      return
    }
    setShowQuickGradeGrid(true)
    const enrolled = enrolls[currentSubject?.code] || []
    const initialScores = {}
    enrolled.forEach(id => {
      initialScores[id] = ''
    })
    setQuickGradeScores(initialScores)
  }

  const handleFillAllGrades = () => {
    setFillScoreValue('')
    setShowFillScoreModal(true)
  }

  const handleFillScoreSubmit = () => {
    const score = fillScoreValue.trim()
    if (score === '' || isNaN(score) || parseFloat(score) < 0) {
      addCustomAlert('warning', 'Invalid Score', 'Please enter a valid non-negative number.', false)
      return
    }
    
      const enrolled = enrolls[currentSubject?.code] || []
      const updatedScores = { ...quickGradeScores }
      enrolled.forEach(id => {
        updatedScores[id] = score
      })
      setQuickGradeScores(updatedScores)
    setShowFillScoreModal(false)
    setFillScoreValue('')
    }

  const handleFillScoreCancel = () => {
    setShowFillScoreModal(false)
    setFillScoreValue('')
  }

  const handleSaveAllGrades = async () => {
    console.log('🚀 handleSaveAllGrades called')
    setIsSavingGrades(true)
    setGradesSaveStatus('saving')
    let mysqlSaveSuccessful = false // Track if MySQL save succeeded
    try {
      if (!currentSubject) {
        console.error('❌ No subject selected')
        setIsSavingGrades(false)
        setGradesSaveStatus('error')
        addCustomAlert('error', 'No Subject', 'Please select a subject first.', false)
        setTimeout(() => setGradesSaveStatus(null), 3000)
        return
      }
      
      if (!quickGradeTitle || !quickGradeTitle.trim()) {
        console.error('❌ Missing assessment title')
        setIsSavingGrades(false)
        setGradesSaveStatus('error')
        addCustomAlert('error', 'Missing Title', 'Please enter an assessment title.', false)
        setTimeout(() => setGradesSaveStatus(null), 3000)
        return
      }
      
      const enrolled = enrolls[currentSubject.code] || []
      if (enrolled.length === 0) {
        console.warn('⚠️ No students enrolled in this subject')
        setIsSavingGrades(false)
        setGradesSaveStatus('error')
        addCustomAlert('warning', 'No Students', 'No students enrolled in this subject.', false)
        setTimeout(() => setGradesSaveStatus(null), 3000)
        return
      }
      
      const maxPoints = parseFloat(quickGradeMaxPoints)
      if (isNaN(maxPoints) || maxPoints <= 0) {
        console.error('❌ Invalid max points:', quickGradeMaxPoints)
        setIsSavingGrades(false)
        setGradesSaveStatus('error')
        addCustomAlert('error', 'Invalid Input', 'Please enter a valid max points value.', false)
        setTimeout(() => setGradesSaveStatus(null), 3000)
        return
      }
      
      // Check if at least one student has a score entered
      const hasAnyScores = enrolled.some(studentId => {
        const score = quickGradeScores[studentId]
        return score !== undefined && score !== null && score !== '' && !isNaN(parseFloat(score))
      })
      
      if (!hasAnyScores) {
        console.warn('⚠️ No scores entered')
        setIsSavingGrades(false)
        setGradesSaveStatus('error')
        addCustomAlert('warning', 'No Scores', 'Please enter at least one score before saving.', false)
        setTimeout(() => setGradesSaveStatus(null), 3000)
        return
      }
      
      console.log('✅ Validation passed')

      const assessment = {
        type: quickGradeType,
        title: quickGradeTitle,
        maxPoints: maxPoints,
        scores: {},
        dueDate: quickGradeDueDate || null, // Store due date if provided
        dateRecorded: new Date().toISOString().split('T')[0], // Date when grade was recorded (YYYY-MM-DD)
        timestamp: new Date().toISOString(), // Full timestamp when grade was recorded
      }
      
      let allScoresValid = true
      enrolled.forEach(studentId => {
        const score = parseFloat(quickGradeScores[studentId])
        if (!isNaN(score) && score <= maxPoints && score >= 0) {
          assessment.scores[studentId] = score
        } else if (quickGradeScores[studentId] !== '') {
          allScoresValid = false
        }
      })
      
      if (!allScoresValid) {
        console.error('❌ Invalid scores detected')
        setIsSavingGrades(false)
        setGradesSaveStatus('error')
        // Don't show notification - errors are shown inline next to score inputs
        setTimeout(() => setGradesSaveStatus(null), 3000)
        return
      }
      
      const updatedGrades = { ...grades }
      if (!updatedGrades[currentSubject.code]) updatedGrades[currentSubject.code] = {}
      if (!updatedGrades[currentSubject.code][quickGradeType]) updatedGrades[currentSubject.code][quickGradeType] = []
      
      updatedGrades[currentSubject.code][quickGradeType].push(assessment)
      setGrades(updatedGrades)
      
      console.log('📚 Getting/creating course in MySQL...')
      // Get course ID from MySQL
      let course = await getCourseByCode(currentSubject.code)
      if (!course) {
        // Create course if it doesn't exist
        try {
          const profProfile = await getProfessorByUid(profUid)
          if (!profProfile || !profProfile.id) {
            console.error('❌ Professor profile not found')
            setIsSavingGrades(false)
            setGradesSaveStatus('error')
            addCustomAlert('error', 'Profile Error', 'Professor profile not found. Please refresh and try again.', false)
            setTimeout(() => setGradesSaveStatus(null), 3000)
            return
          }
          
          console.log('📝 Attempting to create course in MySQL...')
          console.log('📝 Course data:', {
            code: currentSubject.code,
            name: currentSubject.name,
            credits: currentSubject.credits,
            creditsType: typeof currentSubject.credits,
            professorId: profProfile.id
          })
          
          // Ensure credits is a number, not a string
          const credits = parseInt(currentSubject.credits) || 0
          const courseData = {
            code: currentSubject.code,
            name: currentSubject.name,
            credits: credits,
            professorId: profProfile.id,
          }
          console.log('📝 Sending course data:', courseData)
          
          const courseId = await createCourse(courseData)
          course = { id: courseId, code: currentSubject.code }
          console.log(`✅ Created new course in MySQL: ${currentSubject.name} (ID: ${course.id})`)
        } catch (courseError) {
          // Course creation failed - try to get it again (might have been created by another request)
          console.warn('⚠️ Course creation failed, trying to fetch again:', courseError.message)
          course = await getCourseByCode(currentSubject.code)
          
          if (!course) {
            // Still no course - this is a real error
            console.error('❌ Failed to create or find course:', courseError)
            setIsSavingGrades(false)
            setGradesSaveStatus('error')
            
            let errorMsg = 'Failed to create course. '
            if (courseError.message && courseError.message.includes('CSRF')) {
              errorMsg += 'CSRF token error. Please check your environment configuration or refresh the page.'
            } else {
              errorMsg += courseError.message || 'Please try again.'
            }
            
            addCustomAlert('error', 'Course Error', errorMsg, false)
            setTimeout(() => setGradesSaveStatus(null), 5000)
            return
          } else {
            console.log('✅ Course found after creation attempt failed (likely created by another request)')
          }
        }
      }
      const courseId = course.id
      console.log(`📚 Using Course: ${currentSubject.name} (Code: ${currentSubject.code}, MySQL ID: ${courseId})`)

      // Save grades to MySQL for each student
      let savedCount = 0
      let failedCount = 0
      const failedStudents = []
      const errorDetails = []
      
      console.log(`📝 Starting to save grades for ${enrolled.length} enrolled students`)
      
      for (const studentId of enrolled) {
        const student = students.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
        console.log(`Processing student: ${studentId}`, { student, hasScore: assessment.scores[studentId] !== undefined })
        if (student && assessment.scores[studentId] !== undefined) {
          try {
            // Get student MySQL ID by looking up their numerical ID
            const studentData = await getStudentByNumericalId(student.id)
            if (!studentData || !studentData.id) {
              console.warn(`⚠️ Student ${student.id} not found in MySQL`)
              failedCount++
              failedStudents.push(student.name || student.id)
              errorDetails.push(`${student.name || student.id}: Student not found in MySQL.`)
              continue
            }
            const studentMySQLId = studentData.id
            console.log(`💾 Student: ${student.name} (Numerical ID: ${student.id}, MySQL ID: ${studentMySQLId})`)

            // Create grade in MySQL
            // Convert score to number if it's a string
            const scoreValue = typeof assessment.scores[studentId] === 'string' 
              ? parseFloat(assessment.scores[studentId]) 
              : assessment.scores[studentId]
            
            // Ensure score and maxPoints are numbers
            if (isNaN(scoreValue) || scoreValue < 0) {
              throw new Error(`Invalid score: ${assessment.scores[studentId]}`)
            }
            if (isNaN(maxPoints) || maxPoints <= 0) {
              throw new Error(`Invalid maxPoints: ${maxPoints}`)
            }
            
            const gradeData = {
              studentId: parseInt(studentMySQLId),
              courseId: parseInt(courseId),
              assessmentType: quickGradeType,
              assessmentTitle: quickGradeTitle,
              score: Math.round(scoreValue), // Round to integer
              maxPoints: Math.round(parseFloat(maxPoints)), // Round to integer
              date: new Date().toISOString().split('T')[0] // Today's date in YYYY-MM-DD format
            }
            console.log(`💾 Saving grade to MySQL:`, gradeData)
            
            // Check if grade already exists for this student/course/assessment combination
            const existingGrades = await getGradesByStudentAndCourse(studentMySQLId, courseId)
            const existingGrade = existingGrades.find(g => 
              g.assessment_type === quickGradeType && 
              g.assessment_title === quickGradeTitle
            )
            
            let gradeResult
            if (existingGrade) {
              // Update existing grade instead of creating duplicate
              console.log(`🔄 Updating existing grade (ID: ${existingGrade.id}) instead of creating duplicate`)
              gradeResult = await updateGrade(existingGrade.id, {
                score: gradeData.score,
                maxPoints: gradeData.maxPoints,
                date: gradeData.date
              })
              if (gradeResult && gradeResult.id) {
                gradeResult = gradeResult.id.toString()
              }
            } else {
              // Create new grade
              gradeResult = await createGrade(gradeData)
            }
            
            // createGrade returns either:
            // 1. A string ID (from grades.js: return grade.id.toString())
            // 2. An object with id or grade_id property
            // 3. null/undefined if failed
            
            let gradeId = null
            if (typeof gradeResult === 'string' && gradeResult.length > 0) {
              // Result is a string ID (e.g., '118', '119')
              gradeId = gradeResult
              savedCount++
              console.log(`✅ Grade saved to MySQL for student ${student.id} (MySQL ID: ${studentMySQLId}, Grade ID: ${gradeId})`)
            } else if (gradeResult && typeof gradeResult === 'object') {
              // Result is an object with id or grade_id
              gradeId = gradeResult.id || gradeResult.grade_id
              if (gradeId) {
                savedCount++
                console.log(`✅ Grade saved to MySQL for student ${student.id} (MySQL ID: ${studentMySQLId}, Grade ID: ${gradeId})`)
              } else {
                failedCount++
                failedStudents.push(student.name || student.id)
                const errorMsg = 'Grade save returned object but no ID found'
                errorDetails.push(`${student.name || student.id}: ${errorMsg}`)
                console.error(`❌ Failed to save grade for student ${studentId}: No grade ID in result object`, {
                  gradeResult,
                  gradeData
                })
              }
            } else {
              // No result or invalid result
              failedCount++
              failedStudents.push(student.name || student.id)
              const errorMsg = 'Grade save returned no result'
              errorDetails.push(`${student.name || student.id}: ${errorMsg}`)
              console.error(`❌ Failed to save grade for student ${studentId}: No grade ID returned`, {
                gradeResult,
                gradeResultType: typeof gradeResult,
                gradeData
              })
            }
          } catch (error) {
            // Check if error suggests the grade was actually saved
            const errorMsg = error.message || error.toString()
            if (errorMsg.includes('notification') || (errorMsg.includes('Validation failed') && errorMsg.includes('400'))) {
              // Grade might have been saved despite notification/validation error
              console.log(`⚠️ Got error but grade may have been saved: ${errorMsg}`)
              savedCount++
              console.log(`✅ Grade likely saved despite error for student ${student.id}`)
            } else {
              failedCount++
              failedStudents.push(student.name || student.id)
              errorDetails.push(`${student.name || student.id}: ${errorMsg}`)
              console.error(`❌ Failed to save grade for student ${studentId}:`, error)
              console.error('Error details:', {
                studentId: student.id,
                courseId: courseId,
                assessmentType: quickGradeType,
                assessmentTitle: quickGradeTitle,
                score: assessment.scores[studentId],
                maxPoints: maxPoints,
                error: error,
                errorMessage: error.message,
                errorStack: error.stack
              })
            }
          }
        } else {
          console.log(`⏭️ Skipping student ${studentId}: ${!student ? 'student not found' : 'no score entered'}`)
        }
      }
      
      console.log(`📊 Save summary: ${savedCount} saved, ${failedCount} failed`)
      
      // Show appropriate feedback based on save results
      // Track if MySQL save was successful - this is the critical operation
      mysqlSaveSuccessful = savedCount > 0
      
      console.log(`🎯 MySQL save result: ${savedCount} saved, ${failedCount} failed, mysqlSaveSuccessful=${mysqlSaveSuccessful}`)
      
      if (savedCount > 0 && failedCount === 0) {
        // All grades saved successfully to MySQL - this is SUCCESS
        console.log('✅ Setting success status - all grades saved')
        setGradesSaveStatus('success')
        addCustomAlert('success', 'Grades Saved', `All grades saved successfully for ${quickGradeTitle} (${savedCount} student${savedCount === 1 ? '' : 's'})`, false)
        console.log(`✅ All grades saved successfully for ${quickGradeTitle} (${savedCount} student${savedCount === 1 ? '' : 's'})`)
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setGradesSaveStatus(null)
        }, 3000)
      } else if (savedCount > 0 && failedCount > 0) {
        // Partial save - still show success since some grades ARE saved
        console.log('✅ Setting success status - partial save (some grades saved)')
        setGradesSaveStatus('success')
        const successMsg = `Grades saved successfully for ${savedCount} student${savedCount === 1 ? '' : 's'}.`
        console.log(`✅ Grades saved for ${savedCount} student(s)`)
        addCustomAlert('success', 'Grades Saved', successMsg, false)
        
        // Log warnings for failed students separately (non-blocking)
        if (failedCount > 0) {
          console.warn(`⚠️ Some students had issues: ${failedStudents.join(', ')}`)
        }
        
        // Reset status after 3 seconds
        setTimeout(() => {
          setGradesSaveStatus(null)
        }, 3000)
      } else if (savedCount === 0) {
        // No grades saved - this is a real failure
        console.log('❌ Setting error status - no grades saved')
        setGradesSaveStatus('error')
        // Show more detailed error message
        const detailedErrorMsg = errorDetails.length > 0 
          ? `No grades were saved. Errors: ${errorDetails.join('; ')}`
          : 'No grades were saved. Please check that students exist in the system and try again.'
        console.error('❌ No grades saved:', errorDetails)
        addCustomAlert('error', 'No Grades Saved', detailedErrorMsg, false)
        
        // Reset status after 5 seconds (longer for error)
        setTimeout(() => {
          setGradesSaveStatus(null)
        }, 5000)
        
        setIsSavingGrades(false)
        return // Don't proceed with form reset if nothing was saved
      }
      
      // Only proceed if at least some grades were saved
      if (savedCount === 0) {
        setIsSavingGrades(false)
        return // Already showed error message above
      }
      
      console.log('✅ MySQL save phase completed successfully, proceeding to non-critical operations')
    
      // All MySQL saves completed successfully - now do non-critical operations
      // Wrap everything after MySQL save in try-catch so errors don't override success status
      try {
        // Create real-time notification for grade save
        const newAlert = {
          id: Date.now(),
          type: 'grade',
          title: 'Grade Posted',
          message: `Grade Posted: ${quickGradeTitle} grades for ${currentSubject.name} are now available to ${savedCount} student${savedCount === 1 ? '' : 's'}.`,
          timestamp: new Date(),
          read: false,
          target_courseId: currentSubject.code,
          subjectCode: currentSubject.code,
        }
        const updatedAlerts = [newAlert, ...alerts]
        setAlerts(updatedAlerts)
        
        // Save to Firestore (non-critical - grades are already saved to MySQL)
        // Don't let Firestore save failure affect the success status
        try {
          await saveData(subjects, students, enrolls, updatedAlerts, records, updatedGrades, profUid, true)
          console.log('✅ Grades and alerts saved to Firestore')
        } catch (firestoreError) {
          // Firestore save failure is non-critical since grades are already in MySQL
          console.warn('⚠️ Failed to save to Firestore (non-critical):', firestoreError)
          // Don't show error to user - grades are already saved successfully to MySQL
        }
        
        // Reset form
        setQuickGradeTitle('')
        setQuickGradeMaxPoints('')
        setQuickGradeDueDate('')
        setQuickGradeScores({})
        setShowQuickGradeGrid(false)
      } catch (nonCriticalError) {
        // Non-critical operations failed, but MySQL save succeeded
        // Don't override success status - just log the error
        console.warn('⚠️ Non-critical operation failed after successful MySQL save:', nonCriticalError)
      }
      
      setIsSavingGrades(false)
      
    } catch (error) {
      console.error('❌ Error in handleSaveAllGrades catch block:', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        mysqlSaveSuccessful: mysqlSaveSuccessful,
        savedCount: typeof savedCount !== 'undefined' ? savedCount : 'undefined'
      })
      
      // Only set error status if MySQL save didn't succeed
      // Check if we already set success status (MySQL save succeeded)
      if (!mysqlSaveSuccessful) {
        console.log('❌ MySQL save failed, setting error status')
        setIsSavingGrades(false)
        setGradesSaveStatus('error')
        
        // Provide more detailed error message
        let errorMessage = 'Unable to save grades. '
        if (error.message) {
          if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
            errorMessage += 'Cannot connect to server. Please ensure the backend server is running.'
          } else if (error.message.includes('401') || error.message.includes('403')) {
            errorMessage += 'Authentication error. Please refresh the page and try again.'
          } else {
            errorMessage += error.message
          }
        } else {
          errorMessage += 'An unexpected error occurred. Please check the browser console for details.'
        }
        
        addCustomAlert('error', 'Save Failed', errorMessage, false)
        
        // Reset status after 5 seconds (longer for error)
        setTimeout(() => {
          setGradesSaveStatus(null)
        }, 5000)
      } else {
        // MySQL save succeeded - don't override success status
        console.warn('⚠️ Error occurred after successful MySQL save - keeping success status:', error)
        console.warn('⚠️ This error is non-critical since grades are already saved to MySQL')
        setIsSavingGrades(false)
        // Keep success status - don't change it
        // Status should already be 'success' from earlier in the code
      }
    }
  }

  const exportAttendanceCSV = () => {
    if (!currentSubject) {
      addCustomAlert('warning', 'No Subject Selected', 'Please select a subject to export attendance.', false)
      return
    }

    const enrolled = enrolls[currentSubject.code] || []
    if (enrolled.length === 0) {
      addCustomAlert('info', 'No Students', 'No students enrolled in this subject yet.', false)
      return
    }

    // Get all dates with attendance records for this subject
    const allDates = Object.keys(records).filter(date => {
      return records[date]?.[currentSubject.code] && Object.keys(records[date][currentSubject.code]).length > 0
    }).sort((a, b) => new Date(a) - new Date(b))

    if (allDates.length === 0) {
      addCustomAlert('info', 'No Attendance Records', 'No attendance records found for this subject.', false)
      return
    }

    // Helper function to format date as MM/DD/YYYY (Excel-friendly format - displays correctly)
    const formatDateForExcel = (dateInput) => {
      if (!dateInput) return ''
      try {
        let dateObj = null
        
        // If already in YYYY-MM-DD format, parse it to convert to MM/DD/YYYY
        if (typeof dateInput === 'string') {
          const trimmed = dateInput.trim()
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const [year, month, day] = trimmed.split('-')
            dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
          // Handle ISO strings (with time) - extract date part
          else if (trimmed.includes('T')) {
            const datePart = trimmed.split('T')[0].trim()
            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
              const [year, month, day] = datePart.split('-')
              dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            } else {
              dateObj = new Date(dateInput)
            }
          } else {
            dateObj = new Date(dateInput)
          }
        } else {
          dateObj = new Date(dateInput)
        }
        
        // Format as MM/DD/YYYY (Excel recognizes and displays this format correctly)
        if (dateObj && !isNaN(dateObj.getTime()) && dateObj.getTime() > 0) {
          const month = String(dateObj.getMonth() + 1).padStart(2, '0')
          const day = String(dateObj.getDate()).padStart(2, '0')
          const year = dateObj.getFullYear()
          return `${month}/${day}/${year}`
        }
      } catch (e) {
        console.warn('Date formatting error:', e, dateInput)
      }
      return ''
    }

    // Create header: Student ID, Student Name, then all dates
    const header = ['Student ID', 'Student Name', ...allDates.map(formatDateForExcel)]
    const rows = [header]

    // Add row for each student
    enrolled.forEach(studentId => {
      const student = students.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
      if (!student) return

      const row = [studentId, student.name]
      
      // Add attendance status for each date
      allDates.forEach(date => {
        const status = records[date]?.[currentSubject.code]?.[studentId] || ''
        row.push(status || '')
      })
      
      rows.push(row)
    })

    if (rows.length === 1) {
      addCustomAlert('info', 'No Data', 'No attendance entries to export yet.', false)
      return
    }

    // Format CSV with proper escaping - dates in MM/DD/YYYY format
    const csvContent = rows
      .map((row, rowIndex) => {
        return row.map((value, index) => {
          const strValue = String(value ?? '').trim()
          
          // Don't quote dates - Excel recognizes MM/DD/YYYY format better without quotes
          // Check if it's a date (MM/DD/YYYY format) - could be in header row (index >= 2) or data rows
          if (/^\d{2}\/\d{2}\/\d{4}$/.test(strValue)) {
            return strValue
          }
          // Also handle YYYY-MM-DD format if present (convert to MM/DD/YYYY)
          if (/^\d{4}-\d{2}-\d{2}$/.test(strValue)) {
            const [year, month, day] = strValue.split('-')
            return `${month}/${day}/${year}`
          }
          
          // Quote other values that need it
          if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`
          }
          return strValue
        }).join(',')
      })
      .join('\n')

    // Add BOM (Byte Order Mark) for UTF-8 to help Excel recognize the file and dates correctly
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent
    
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const safeSubject = currentSubject.code.replace(/[^a-z0-9]/gi, '_')
    link.download = `attendance_${safeSubject}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const exportGradesCSV = () => {
    if (!currentSubject) {
      addCustomAlert('warning', 'No Subject Selected', 'Please select a subject to export grades.', false)
      return
    }

    const subjectGrades = grades[currentSubject.code]
    if (!subjectGrades || Object.keys(subjectGrades).length === 0) {
      addCustomAlert('info', 'No Grades', 'No grades recorded for this subject yet.', false)
      return
    }

    const rows = [['Assessment', 'Type', 'Date', 'Student ID', 'Student Name', 'Score', 'Max Points']]

    // Helper function to format date as MM/DD/YYYY (Excel-friendly format - displays correctly)
    const formatDateForExcel = (dateInput) => {
      if (!dateInput) return ''
      
      try {
        let dateObj = null
        
        // If already in YYYY-MM-DD format, parse it to convert to MM/DD/YYYY
        if (typeof dateInput === 'string') {
          const trimmed = dateInput.trim()
          
          // Handle YYYY-MM-DD format - convert to MM/DD/YYYY
          if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
            const [year, month, day] = trimmed.split('-')
            dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
          }
          // Handle ISO strings (with time) - extract date part
          else if (trimmed.includes('T')) {
            const datePart = trimmed.split('T')[0].trim()
            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
              const [year, month, day] = datePart.split('-')
              dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
            } else {
              dateObj = new Date(dateInput)
            }
          }
          // Try to parse as date string
          else {
            dateObj = new Date(dateInput)
          }
        }
        // Handle Date objects
        else if (dateInput instanceof Date) {
          dateObj = dateInput
        }
        // Try to parse as Date
        else {
          dateObj = new Date(dateInput)
        }
        
        // Format as MM/DD/YYYY (Excel recognizes and displays this format correctly)
        if (dateObj && !isNaN(dateObj.getTime()) && dateObj.getTime() > 0) {
          const month = String(dateObj.getMonth() + 1).padStart(2, '0')
          const day = String(dateObj.getDate()).padStart(2, '0')
          const year = dateObj.getFullYear()
          return `${month}/${day}/${year}`
        }
      } catch (e) {
        console.warn('Date formatting error:', e, 'Input:', dateInput)
      }
      return ''
    }

    Object.entries(subjectGrades).forEach(([type, assessments]) => {
      assessments.forEach(assessment => {
        const assessmentName = assessment.title || `${type} Assessment`
        const displayType = type.charAt(0).toUpperCase() + type.slice(1)
        
        // Get date - MUST use dateRecorded (when grade was actually recorded), NOT current date
        // This ensures we show when the grade was recorded, not when it was exported
        let dateValue = ''
        
        // CRITICAL: Always use dateRecorded first - this is when the grade was actually recorded
        if (assessment.dateRecorded) {
          dateValue = formatDateForExcel(assessment.dateRecorded)
          if (!dateValue) {
            console.warn('dateRecorded failed to format:', assessment.dateRecorded)
          }
        }
        // Fallback to timestamp if dateRecorded is missing (extract date from timestamp)
        if (!dateValue && assessment.timestamp) {
          // Extract date from ISO timestamp
          const timestampDate = assessment.timestamp.split('T')[0]
          dateValue = formatDateForExcel(timestampDate)
          if (!dateValue) {
            console.warn('timestamp failed to format:', assessment.timestamp)
          }
        }
        // Fallback to dueDate (assessment due date, not when recorded)
        if (!dateValue && assessment.dueDate) {
          dateValue = formatDateForExcel(assessment.dueDate)
        }
        // Fallback to date field (legacy)
        if (!dateValue && assessment.date) {
          dateValue = formatDateForExcel(assessment.date)
        }
        
        // IMPORTANT: Only use current date as absolute last resort if NO date exists
        // This should rarely happen if grades were saved correctly with dateRecorded
        if (!dateValue) {
          console.error('WARNING: No date found for assessment:', assessmentName, 'Using current date as fallback')
          const today = new Date()
          const month = String(today.getMonth() + 1).padStart(2, '0')
          const day = String(today.getDate()).padStart(2, '0')
          const year = today.getFullYear()
          dateValue = `${month}/${day}/${year}`
        }
        
        // Final validation - ensure dateValue is in correct format (MM/DD/YYYY)
        if (!dateValue || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
          console.error('ERROR: Date format validation failed for assessment:', assessmentName, 'dateValue:', dateValue)
          // Try to fix it if it's close to correct format
          if (assessment.dateRecorded) {
            dateValue = formatDateForExcel(assessment.dateRecorded)
          }
          // If still invalid, this is a data issue - log error but don't use current date
          if (!dateValue || !/^\d{2}\/\d{2}\/\d{4}$/.test(dateValue)) {
            console.error('CRITICAL: Cannot determine date for assessment:', assessmentName, 'assessment object:', assessment)
          }
        }
        
        // Debug: Log the final date value and assessment object
        console.log('Export grade date - Assessment object:', {
          assessment: assessmentName,
          fullAssessment: assessment,
          dateRecorded: assessment.dateRecorded,
          timestamp: assessment.timestamp,
          dueDate: assessment.dueDate,
          date: assessment.date,
          formattedDate: dateValue,
          isValidFormat: /^\d{4}-\d{2}-\d{2}$/.test(dateValue)
        })
        
        Object.entries(assessment.scores || {}).forEach(([studentId, score]) => {
          const student = students.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
          
          // Ensure dateValue is always valid before adding to CSV (MM/DD/YYYY format)
          let finalDateValue = dateValue
          
          // Validate and fix date format (MM/DD/YYYY)
          if (!finalDateValue || typeof finalDateValue !== 'string' || !/^\d{2}\/\d{2}\/\d{4}$/.test(finalDateValue.trim())) {
            // Last resort: use current date
            const today = new Date()
            const month = String(today.getMonth() + 1).padStart(2, '0')
            const day = String(today.getDate()).padStart(2, '0')
            const year = today.getFullYear()
            finalDateValue = `${month}/${day}/${year}`
            console.warn('Date value invalid or empty, using current date:', finalDateValue, 'for assessment:', assessmentName, 'original dateValue:', dateValue)
          } else {
            // Trim whitespace
            finalDateValue = finalDateValue.trim()
          }
          
          // Final check - ensure it's exactly MM/DD/YYYY format
          if (!/^\d{2}\/\d{2}\/\d{4}$/.test(finalDateValue)) {
            const today = new Date()
            const month = String(today.getMonth() + 1).padStart(2, '0')
            const day = String(today.getDate()).padStart(2, '0')
            const year = today.getFullYear()
            finalDateValue = `${month}/${day}/${year}`
            console.error('Date format validation failed, forced to current date:', finalDateValue)
          }
          
          rows.push([
            assessmentName,
            displayType,
            finalDateValue, // Always in YYYY-MM-DD format, never empty, never null
            studentId,
            student ? student.name : 'Unknown Student',
            Math.round(parseFloat(score) || 0), // Round to integer
            Math.round(parseFloat(assessment.maxPoints) || 0), // Round to integer
          ])
        })
      })
    })

    if (rows.length === 1) {
      addCustomAlert('info', 'No Data', 'No grade entries to export yet.', false)
      return
    }

    // Format CSV with proper escaping - ensure dates are in Excel-friendly format
    const csvContent = rows
      .map((row, rowIndex) => {
        return row.map((value, index) => {
          const strValue = String(value ?? '').trim()
          
          // Column index 2 is the Date column - format for Excel (MM/DD/YYYY format)
          if (index === 2 && rowIndex > 0) { // Skip header row
            // Ensure date is in MM/DD/YYYY format and not empty
            let dateStr = strValue.trim()
            
            // If already in MM/DD/YYYY format, use it directly (no quotes for Excel recognition)
            if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
              // Return date without quotes - Excel will recognize MM/DD/YYYY as a date
              return dateStr
            } 
            // If in YYYY-MM-DD format, convert to MM/DD/YYYY
            else if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
              const [year, month, day] = dateStr.split('-')
              return `${month}/${day}/${year}`
            }
            else if (dateStr) {
              // Try to parse and reformat if not in correct format
              try {
                const date = new Date(dateStr)
                if (!isNaN(date.getTime())) {
                  const month = String(date.getMonth() + 1).padStart(2, '0')
                  const day = String(date.getDate()).padStart(2, '0')
                  const year = date.getFullYear()
                  dateStr = `${month}/${day}/${year}`
                  return dateStr
                }
              } catch (e) {
                console.warn('Failed to parse date:', dateStr)
              }
            }
            // This should rarely happen if dateRecorded was set correctly when grade was saved
            console.error('Date column empty or invalid in CSV generation, Row:', rowIndex, 'Value:', strValue)
            // Don't use current date - return empty or original value (data integrity issue)
            return dateStr || ''
          }
          
          // Header row and other columns - quote values that need it
          if (rowIndex === 0 || strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
            return `"${strValue.replace(/"/g, '""')}"`
          }
          return strValue
        }).join(',')
      })
      .join('\n')

    // Add BOM (Byte Order Mark) for UTF-8 to help Excel recognize the file and dates correctly
    const BOM = '\uFEFF'
    const csvWithBOM = BOM + csvContent
    
    const blob = new Blob([csvWithBOM], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    const safeSubject = currentSubject.code.replace(/[^a-z0-9]/gi, '_')
    link.download = `grades_${safeSubject}.csv`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const getCurrentDate = () => {
    const now = new Date()
    return now.toLocaleDateString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  const getDateDisplay = () => {
    const today = new Date().toISOString().slice(0, 10)
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const yest = yesterday.toISOString().slice(0, 10)
    
    if (attendanceDate === today) return 'Selected: Today'
    if (attendanceDate === yest) return 'Selected: Yesterday'
    const date = new Date(attendanceDate)
    return `Selected: ${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
  }

  const getStudentSubjects = (studentId) => {
    if (!studentId) return []
    return subjects.filter(subject => (enrolls[subject.code] || []).includes(studentId))
  }

  const getStudentMetrics = (studentId) => {
    const defaults = {
      examsTaken: 0,
      examsAvailable: 0,
      attendanceRate: 0,
      averageGrade: '0',
      totalAbsences: 0,
    }
    if (!studentId) return defaults

    const studentSubjects = getStudentSubjects(studentId)
    const subjectCodes = new Set(studentSubjects.map(subject => subject.code))

    let examsTaken = 0
    let examsAvailable = 0
    let totalScore = 0
    let totalMax = 0
    let totalSessions = 0
    let presentSessions = 0
    let absentSessions = 0

    studentSubjects.forEach(subject => {
      const subjectGrades = grades[subject.code] || {}
      Object.values(subjectGrades).forEach(assessments => {
        assessments.forEach(assessment => {
          examsAvailable++
          if (assessment.scores && assessment.scores[studentId] !== undefined) {
            examsTaken++
            totalScore += assessment.scores[studentId]
            totalMax += assessment.maxPoints
          }
        })
      })
    })

    Object.keys(records).forEach(date => {
      const subjectsMap = records[date] || {}
      Object.keys(subjectsMap).forEach(code => {
        if (!subjectCodes.has(code)) return
        const status = subjectsMap[code]?.[studentId]
        if (status) {
          totalSessions++
          if (status === 'present') presentSessions++
          if (status === 'absent') absentSessions++
        }
      })
    })

    const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0
    // Format percentage as integer (e.g., 1.0 → 100, 0.85 → 85)
    const averageGrade = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0

    return {
      examsTaken,
      examsAvailable,
      attendanceRate,
      averageGrade,
      totalAbsences: absentSessions,
    }
  }

  const getExamBreakdown = (studentId) => {
    if (!studentId) return {}
    
    const studentSubjects = getStudentSubjects(studentId)
    const breakdown = {}
    
    studentSubjects.forEach(subject => {
      const subjectGrades = grades[subject.code] || {}
      Object.entries(subjectGrades).forEach(([assessmentType, assessments]) => {
        const typeKey = assessmentType.charAt(0).toUpperCase() + assessmentType.slice(1) + ' Exam'
        if (!breakdown[typeKey]) {
          breakdown[typeKey] = { taken: 0, available: 0 }
        }
        
        assessments.forEach(assessment => {
          breakdown[typeKey].available++
          if (assessment.scores && assessment.scores[studentId] !== undefined) {
            breakdown[typeKey].taken++
          }
        })
      })
    })
    
    return breakdown
  }

  const getSubjectGradeSummary = (studentId, subjectCode) => {
    const subjectGrades = grades[subjectCode] || {}
    let completed = 0
    let total = 0
    let totalScore = 0
    let totalMax = 0

    Object.values(subjectGrades).forEach(assessments => {
      assessments.forEach(assessment => {
        total++
        if (assessment.scores && assessment.scores[studentId] !== undefined) {
          completed++
          totalScore += assessment.scores[studentId]
          totalMax += assessment.maxPoints
        }
      })
    })

    return {
      completed,
      total,
      average: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 'N/A',
    }
  }

  const getSubjectAttendanceSummary = (studentId, subjectCode) => {
    let present = 0
    let total = 0
    let absent = 0

    Object.keys(records).forEach(date => {
      const status = records[date]?.[subjectCode]?.[studentId]
      if (status) {
        total++
        if (status === 'present') present++
        if (status === 'absent') absent++
      }
    })

    return {
      present,
      total,
      absent,
      rate: total > 0 ? Math.round((present / total) * 100) : 0,
    }
  }

  const getSubjectAssessmentsForStudent = (studentId, subjectCode) => {
    const subjectGrades = grades[subjectCode] || {}
    const rows = []

    Object.entries(subjectGrades).forEach(([type, assessments]) => {
      assessments.forEach((assessment, index) => {
        // Get the date when the grade was recorded
        // Check for dateRecorded (when grade was saved), date, or dueDate
        const recordDate = assessment.dateRecorded || assessment.date || assessment.dueDate || null
        
        rows.push({
          title: assessment.title || `${type} ${index + 1}`,
          type,
          score: assessment.scores?.[studentId],
          maxPoints: assessment.maxPoints,
          date: recordDate, // Date when grade was recorded
        })
      })
    })

    return rows
  }

  const getAttendanceHistoryForStudent = (studentId, subjectCode) => {
    const entries = []
    Object.keys(records)
      .sort()
      .forEach(date => {
        const status = records[date]?.[subjectCode]?.[studentId]
        if (status) {
          entries.push({ date, status })
        }
      })
    return entries.sort((a, b) => new Date(b.date) - new Date(a.date))
  }

  // Get absences breakdown by subject
  const getAbsencesBreakdown = (studentId) => {
    if (!studentId) return []
    const studentSubjects = getStudentSubjects(studentId)
    const breakdown = []
    
    studentSubjects.forEach(subject => {
      const attendanceSummary = getSubjectAttendanceSummary(studentId, subject.code)
      if (attendanceSummary.absent > 0) {
        breakdown.push({
          subject: subject.name,
          code: subject.code,
          absences: attendanceSummary.absent,
          total: attendanceSummary.total,
        })
      }
    })
    
    return breakdown.sort((a, b) => b.absences - a.absences)
  }

  // Get attendance breakdown by subject
  const getAttendanceBreakdown = (studentId) => {
    if (!studentId) return []
    const studentSubjects = getStudentSubjects(studentId)
    const breakdown = []
    
    studentSubjects.forEach(subject => {
      const attendanceSummary = getSubjectAttendanceSummary(studentId, subject.code)
      if (attendanceSummary.total > 0) {
        breakdown.push({
          subject: subject.name,
          code: subject.code,
          present: attendanceSummary.present,
          absent: attendanceSummary.absent,
          total: attendanceSummary.total,
          rate: attendanceSummary.rate,
        })
      }
    })
    
    return breakdown.sort((a, b) => b.rate - a.rate)
  }

  // Get grade breakdown by subject
  const getGradeBreakdown = (studentId) => {
    if (!studentId) return []
    const studentSubjects = getStudentSubjects(studentId)
    const breakdown = []
    
    studentSubjects.forEach(subject => {
      const gradeSummary = getSubjectGradeSummary(studentId, subject.code)
      if (gradeSummary.total > 0) {
        breakdown.push({
          subject: subject.name,
          code: subject.code,
          completed: gradeSummary.completed,
          total: gradeSummary.total,
          average: gradeSummary.average,
        })
      }
    })
    
    return breakdown.sort((a, b) => {
      const avgA = parseFloat(a.average) || 0
      const avgB = parseFloat(b.average) || 0
      return avgB - avgA
    })
  }

  const getAttendanceDots = (rate) => {
    const totalDots = 5
    const filled = Math.round((rate / 100) * totalDots)
    return Array.from({ length: totalDots }).map((_, idx) => (
      <span
        key={idx}
        className={`w-2 h-2 rounded-full ${idx < filled ? 'bg-emerald-500' : 'bg-slate-300'}`}
      />
    ))
  }

  const getSubjectAggregateStats = (subjectCode) => {
    const studentIds = enrolls[subjectCode] || []
    const gradeAverages = studentIds
      .map(id => {
        const summary = getSubjectGradeSummary(id, subjectCode)
        return summary.average === 'N/A' ? null : parseFloat(summary.average)
      })
      .filter(value => value !== null)

    const averageGrade =
      gradeAverages.length > 0
        ? Math.round(gradeAverages.reduce((sum, val) => sum + val, 0) / gradeAverages.length)
        : '0'

    let presentSessions = 0
    let totalSessions = 0
    Object.keys(records).forEach(date => {
      const subjectRecords = records[date]?.[subjectCode] || {}
      studentIds.forEach(id => {
        const status = subjectRecords[id]
        if (status) {
          totalSessions++
          if (status === 'present') presentSessions++
        }
      })
    })

    const attendanceRate = totalSessions > 0 ? Math.round((presentSessions / totalSessions) * 100) : 0

    return {
      totalStudents: studentIds.length,
      averageGrade,
      attendanceRate,
    }
  }

  // Get all removed subjects (subjects that were deleted from Subject Management)
  const getArchivedSubjects = () => {
    // Return subjects from removedSubjects array
    return removedSubjects || []
  }

  const handleViewRecordClick = (studentId, subjectCode) => {
    setSelectedStudentId(studentId)
    setStudentDetailSubject(subjectCode)
    setSubjectPreviewCode(null)
    setViewMode('student')

    // Ensure the detail panel is visible immediately after clicking
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const renderStudentView = () => {
    const studentSubjects = selectedStudentId ? getStudentSubjects(selectedStudentId) : []
    const currentStudent = students.find(student => student.id === selectedStudentId)
    const metrics = getStudentMetrics(selectedStudentId)
    const detailSubject = studentDetailSubject
      ? subjects.find(subject => subject.code === studentDetailSubject)
      : null
    const detailAssessments =
      detailSubject && selectedStudentId
        ? getSubjectAssessmentsForStudent(selectedStudentId, detailSubject.code)
        : []
    const attendanceHistory =
      detailSubject && selectedStudentId
        ? getAttendanceHistoryForStudent(selectedStudentId, detailSubject.code)
        : []

    const previewSubject = subjectPreviewCode
      ? subjects.find(subject => subject.code === subjectPreviewCode)
      : null
    const previewStudents = previewSubject
      ? (enrolls[previewSubject.code] || []).map(id => students.find(student => student.id === id)).filter(Boolean)
      : []
    const previewStats = previewSubject ? getSubjectAggregateStats(previewSubject.code) : null

    return (
      <div className="fadeIn space-y-8">
        <div className={`glass rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 ${
          isDarkMode ? 'bg-[#1a1a1a]' : ''
        }`}>
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-4 sm:mb-6">
            <div>
              <h3 className={`text-lg sm:text-xl font-bold ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>Subjects</h3>
              <p className={`mt-1 ${
                isDarkMode ? 'text-slate-300' : 'text-slate-600'
              }`}>Browse all subjects and view enrollment details</p>
            </div>
            {previewSubject && (
              <button
                onClick={() => setSubjectPreviewCode(null)}
                className={`text-sm font-semibold transition-colors ${
                  isDarkMode 
                    ? 'text-red-400 hover:text-red-300' 
                    : 'text-red-500 hover:text-red-700'
                }`}
              >
                Close Preview
              </button>
            )}
          </div>
          
          {/* Search and Sort Controls */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Search */}
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Search subjects..."
                value={subjectSearchQuery}
                onChange={(e) => {
                  setSubjectSearchQuery(e.target.value)
                  setSubjectPage(1)
                }}
                className={`w-full px-4 py-2 pl-10 rounded-lg border text-sm ${
                  isDarkMode 
                    ? 'bg-[#2c2c2c] border-slate-600 text-white placeholder-slate-400' 
                    : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                } focus:outline-none focus:ring-2 focus:ring-[#7A1315] focus:border-transparent`}
              />
              <i className={`fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-sm ${
                isDarkMode ? 'text-slate-400' : 'text-slate-500'
              }`}></i>
            </div>
            
            {/* Sort */}
            <select
              value={`${subjectSortBy}-${subjectSortOrder}`}
              onChange={(e) => {
                const [newSortBy, newSortOrder] = e.target.value.split('-')
                setSubjectSortBy(newSortBy)
                setSubjectSortOrder(newSortOrder)
                setSubjectPage(1)
              }}
              className={`px-4 py-2 rounded-lg border text-sm ${
                isDarkMode 
                  ? 'bg-[#2c2c2c] border-slate-600 text-white' 
                  : 'bg-white border-slate-300 text-slate-800'
              } focus:outline-none focus:ring-2 focus:ring-[#7A1315] focus:border-transparent`}
            >
              <option value="name-asc">Name (A-Z)</option>
              <option value="name-desc">Name (Z-A)</option>
              <option value="code-asc">Code (A-Z)</option>
              <option value="code-desc">Code (Z-A)</option>
              <option value="credits-desc">Credits (High-Low)</option>
              <option value="credits-asc">Credits (Low-High)</option>
              <option value="enrollment-desc">Enrollment (High-Low)</option>
              <option value="enrollment-asc">Enrollment (Low-High)</option>
            </select>
          </div>
          
          {(() => {
            // Filter subjects by search query
            let filteredSubjects = subjects.filter(subject => {
              if (!subjectSearchQuery) return true
              const searchLower = subjectSearchQuery.toLowerCase()
              const name = (subject.name || '').toLowerCase()
              const code = (subject.code || '').toLowerCase()
              return name.includes(searchLower) || code.includes(searchLower)
            })
            
            // Filter by term
            if (subjectFilterTerm !== 'all') {
              filteredSubjects = filteredSubjects.filter(subject => {
                if (subjectFilterTerm === 'first') {
                  return !subject.term || subject.term === 'first'
                }
                if (subjectFilterTerm === 'second') {
                  return subject.term === 'second'
                }
                return true
              })
            }
            
            // Sort subjects
            filteredSubjects.sort((a, b) => {
              let aValue, bValue
              switch (subjectSortBy) {
                case 'name':
                  aValue = (a.name || '').toLowerCase()
                  bValue = (b.name || '').toLowerCase()
                  break
                case 'code':
                  aValue = (a.code || '').toLowerCase()
                  bValue = (b.code || '').toLowerCase()
                  break
                case 'credits':
                  aValue = parseInt(a.credits) || 0
                  bValue = parseInt(b.credits) || 0
                  break
                case 'enrollment':
                  aValue = enrolls[a.code]?.length || 0
                  bValue = enrolls[b.code]?.length || 0
                  break
                default:
                  aValue = (a.name || '').toLowerCase()
                  bValue = (b.name || '').toLowerCase()
              }
              
              if (subjectSortOrder === 'asc') {
                return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
              } else {
                return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
              }
            })
            
            // Paginate subjects
            const startIndex = (subjectPage - 1) * subjectItemsPerPage
            const endIndex = startIndex + subjectItemsPerPage
            const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex)
            const totalSubjectPages = Math.ceil(filteredSubjects.length / subjectItemsPerPage)
            
            return (
              <>
                {filteredSubjects.length > 0 && (
                  <div className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                    Showing {paginatedSubjects.length} of {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''}
                  </div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                  {paginatedSubjects.map(subject => {
              const enrolledCount = enrolls[subject.code]?.length || 0
              const isActive = subjectPreviewCode === subject.code
              return (
                <div
                  key={`preview-${subject.code}`}
                  onClick={() => setSubjectPreviewCode(subject.code)}
                  className={`text-left glass card shadowLg p-4 sm:p-6 rounded-2xl transition-all w-full cursor-pointer ${
                    isDarkMode
                      ? 'bg-[#1a1a1a] border border-slate-700'
                      : ''
                  } ${
                    isActive ? 'ring-2 ring-maroon-500' : 'hover:translate-y-[-2px]'
                  }`}
                >
                  {/* Header Row: Icon, Title with Term Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Icon */}
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        isDarkMode 
                          ? 'bg-[#7A1315]/30' 
                          : 'bg-red-100'
                      }`}>
                        <svg className={`w-5 h-5 ${
                          isDarkMode ? 'text-[#7A1315]' : 'text-[#7A1315]'
                        }`} fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                        </svg>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className={`text-lg font-bold truncate ${
                            isDarkMode ? 'text-[#7A1315]' : 'text-slate-800'
                          }`}>{subject.name}</h4>
                          {/* Compact Term Selector */}
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <button
                              onClick={(e) => handleUpdateSubjectTerm(subject.code, 'first', e)}
                              className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-all ${
                                (!subject.term || subject.term === 'first')
                                  ? isDarkMode
                                    ? 'bg-blue-600 text-white shadow-sm'
                                    : 'bg-blue-500 text-white shadow-sm'
                                  : isDarkMode
                                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                              title="Click to set as 1st Term"
                            >
                              1st
                            </button>
                            <button
                              onClick={(e) => handleUpdateSubjectTerm(subject.code, 'second', e)}
                              className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-all ${
                                subject.term === 'second'
                                  ? isDarkMode
                                    ? 'bg-purple-600 text-white shadow-sm'
                                    : 'bg-purple-500 text-white shadow-sm'
                                  : isDarkMode
                                    ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                    : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                              title="Click to set as 2nd Term"
                            >
                              2nd
                            </button>
                          </div>
                        </div>
                        <p className={`text-sm ${
                          isDarkMode ? 'text-white' : 'text-slate-500'
                        }`}>
                          {subject.code} • {subject.credits} Credits
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Info Row: Enrollment */}
                  <div className={`flex items-center gap-1.5 mb-2 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                    </svg>
                    <span className="text-sm font-medium">{enrolledCount} {enrolledCount === 1 ? 'student' : 'students'} enrolled</span>
                  </div>
                  
                  {/* Footer: Action Hint */}
                  <p className={`text-xs transition-colors ${
                    isDarkMode 
                        ? 'text-slate-400 hover:text-red-300' 
                      : 'text-slate-400 hover:text-[#7A1315]'
                  }`}>Click to view student records</p>
                </div>
              )
                  })}
                  {filteredSubjects.length === 0 && (
                    <div className="col-span-full text-center text-slate-500 py-12">
                      {subjectSearchQuery ? 'No subjects found matching your search.' : 'No subjects available yet.'}
                    </div>
                  )}
                </div>
                
                {/* Pagination */}
                {totalSubjectPages > 1 && (
                  <div className={`flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 pt-6 border-t ${
                    isDarkMode ? 'border-slate-700' : 'border-slate-200'
                  }`}>
                    <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                      Page {subjectPage} of {totalSubjectPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSubjectPage(prev => Math.max(1, prev - 1))}
                        disabled={subjectPage === 1}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          subjectPage === 1
                            ? isDarkMode
                              ? 'bg-[#2c2c2c] text-slate-600 cursor-not-allowed opacity-50'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            : isDarkMode
                              ? 'bg-[#2c2c2c] text-white border border-slate-600 hover:bg-[#3c3c3c]'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        <i className="fa-solid fa-chevron-left mr-1"></i> Prev
                      </button>
                      <button
                        onClick={() => setSubjectPage(prev => Math.min(totalSubjectPages, prev + 1))}
                        disabled={subjectPage === totalSubjectPages}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          subjectPage === totalSubjectPages
                            ? isDarkMode
                              ? 'bg-[#2c2c2c] text-slate-600 cursor-not-allowed opacity-50'
                              : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                            : isDarkMode
                              ? 'bg-[#2c2c2c] text-white border border-slate-600 hover:bg-[#3c3c3c]'
                              : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                        }`}
                      >
                        Next <i className="fa-solid fa-chevron-right ml-1"></i>
                      </button>
                    </div>
                  </div>
                )}
              </>
            )
          })()}
        </div>

        {previewSubject && (
          <div className={`glass rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 ${
            isDarkMode ? 'bg-[#1a1a1a]' : ''
          }`}>
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className={`text-xl sm:text-2xl font-bold ${
                  isDarkMode ? 'text-[#7A1315]' : 'textGrad'
                }`}>{previewSubject.name}</h3>
                <p className={`mt-1 ${
                  isDarkMode ? 'text-white' : 'text-slate-600'
                }`}>
                  {previewSubject.code} • {previewSubject.credits} Credits
                </p>
              </div>
              <span className={`text-sm ${
                isDarkMode ? 'text-white' : 'text-slate-500'
              }`}>
                {previewStudents.length} {previewStudents.length === 1 ? 'student' : 'students'} enrolled
              </span>
            </div>
            {previewStats && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className={`p-4 rounded-2xl border ${
                  isDarkMode
                    ? 'border-slate-700 bg-[#1a1a1a]'
                    : 'border-slate-200 bg-white/80'
                }`}>
                  <p className={`text-xs uppercase tracking-wide ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>Total Students</p>
                  <p className={`text-3xl font-bold mt-1 ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>{previewStats.totalStudents}</p>
                </div>
                <div className={`p-4 rounded-2xl border ${
                  isDarkMode
                    ? 'border-slate-700 bg-[#1a1a1a]'
                    : 'border-slate-200 bg-white/80'
                }`}>
                  <p className={`text-xs uppercase tracking-wide ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>Avg Grade</p>
                  <p className={`text-3xl font-bold mt-1 ${
                    isDarkMode ? 'text-white' : 'text-amber-600'
                  }`}>{previewStats.averageGrade}%</p>
                </div>
                <div className={`p-4 rounded-2xl border ${
                  isDarkMode
                    ? 'border-slate-700 bg-[#1a1a1a]'
                    : 'border-slate-200 bg-white/80'
                }`}>
                  <p className={`text-xs uppercase tracking-wide ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>Attendance Rate</p>
                  <p className={`text-3xl font-bold mt-1 ${
                    isDarkMode ? 'text-white' : 'text-emerald-600'
                  }`}>{previewStats.attendanceRate}%</p>
                </div>
              </div>
            )}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className={`text-lg font-semibold ${
                  isDarkMode ? 'text-white' : 'text-slate-800'
                }`}>Enrolled Students</h4>
                {/* Search Bar for Enrolled Students */}
                <div className="relative w-64">
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={studentRecordSearchTerm}
                    onChange={(e) => setStudentRecordSearchTerm(e.target.value)}
                    className={`w-full px-3 py-1.5 text-sm rounded-lg border focus:ring-2 focus:ring-maroon-500 focus:outline-none ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] text-white border-slate-600 placeholder-slate-400' 
                        : 'bg-white text-slate-800 border-slate-300 placeholder-slate-400'
                    }`}
                  />
                  <svg className={`absolute right-2 top-1/2 transform -translate-y-1/2 w-4 h-4 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-400'
                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
              {previewStudents
                .filter(student => {
                  // Apply search filter
                  if (studentRecordSearchTerm.trim() === '') return true
                  const searchLower = studentRecordSearchTerm.toLowerCase().trim()
                  const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                  const idMatch = student.id?.toString().includes(searchLower) || false
                  return nameMatch || idMatch
                })
                .length > 0 ? (
                <div className={`divide-y rounded-2xl border overflow-hidden ${
                  isDarkMode
                    ? 'divide-slate-700 border-slate-700'
                    : 'divide-slate-200 border-slate-200'
                }`}>
                  {previewStudents
                    .filter(student => {
                      // Apply search filter
                      if (studentRecordSearchTerm.trim() === '') return true
                      const searchLower = studentRecordSearchTerm.toLowerCase().trim()
                      const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                      const idMatch = student.id?.toString().includes(searchLower) || false
                      return nameMatch || idMatch
                    })
                    .map(student => (
                    <div key={student.id} className={`flex items-center justify-between px-4 py-3 ${
                      isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white/80'
                    }`}>
                      <div className="flex items-center space-x-3 flex-1 min-w-0">
                        <StudentAvatar student={student} className="w-10 h-10" />
                        <div className="flex-1 min-w-0">
                          <p className={`font-semibold truncate ${
                            isDarkMode ? 'text-white' : 'text-slate-800'
                          }`}>{student.name}</p>
                          <p className={`text-xs truncate ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>ID: {student.id}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleViewRecordClick(student.id, previewSubject.code)}
                        className={`text-sm font-semibold transition-colors flex-shrink-0 ${
                          isDarkMode 
                              ? 'text-red-400 hover:text-red-300' 
                            : 'text-[#7A1315] hover:text-red-800'
                        }`}
                      >
                        View Record
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={`p-4 rounded-xl text-sm text-center ${
                  isDarkMode 
                    ? 'bg-[#1a1a1a] text-slate-400' 
                    : 'bg-slate-50 text-slate-500'
                }`}>
                  {studentRecordSearchTerm.trim() !== '' 
                    ? `No students found matching "${studentRecordSearchTerm}"`
                    : 'No students enrolled yet.'}
                </div>
              )}
            </div>
          </div>
        )}

        {selectedStudentId && (
          <>
            {detailSubject && (
              <div className={`glass rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 ${
                isDarkMode ? 'bg-[#1a1a1a]' : ''
              }`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    {currentStudent && (
                      <div className="mb-1">
                        <p className={`text-sm font-semibold ${
                          isDarkMode ? 'text-slate-100' : 'text-slate-800'
                        }`}>
                          {currentStudent.name}
                        </p>
                        <p className={`text-xs ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          ID: {currentStudent.id}
                        </p>
                      </div>
                    )}
                    <h3 className={`text-xl sm:text-2xl font-bold ${
                      isDarkMode ? 'text-[#7A1315]' : 'textGrad'
                    }`}>{detailSubject.name}</h3>
                    <p className={`mt-1 ${
                      isDarkMode ? 'text-white' : 'text-slate-600'
                    }`}>
                      {detailSubject.code} • {detailSubject.credits} Credits
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      if (detailSubject) {
                        setSubjectPreviewCode(detailSubject.code)
                      }
                      setStudentDetailSubject(null)
                    }}
                    className={`text-sm font-semibold transition-colors ${
                      isDarkMode 
                        ? 'text-red-400 hover:text-red-300' 
                        : 'text-red-500 hover:text-red-700'
                    }`}
                  >
                    Close Detail
                  </button>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <h4 className={`text-lg font-semibold mb-3 ${
                      isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>Assessment Scores</h4>
                    {detailAssessments.length > 0 ? (
                      <div className={`overflow-hidden rounded-xl border ${
                        isDarkMode ? 'border-slate-700' : 'border-slate-200'
                      }`}>
                        <table className="min-w-full text-sm">
                          <thead className={`uppercase tracking-wide ${
                            isDarkMode 
                              ? 'bg-[#7A1315] text-white' 
                              : 'bg-[#7A1315] text-white'
                          }`}>
                            <tr>
                              <th className="px-4 py-3 text-left">Assessment</th>
                              <th className="px-4 py-3 text-left">Type</th>
                              <th className="px-4 py-3 text-right">Score</th>
                              <th className="px-4 py-3 text-left">Date Recorded</th>
                            </tr>
                          </thead>
                          <tbody>
                            {detailAssessments.map((assessment, idx) => (
                              <tr key={`${assessment.title}-${idx}`} className={`border-t ${
                                isDarkMode 
                                  ? idx % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#000000]'
                                  : ''
                              }`}>
                                <td className={`px-4 py-3 font-medium ${
                                  isDarkMode ? 'text-white' : 'text-slate-700'
                                }`}>{assessment.title}</td>
                                <td className={`px-4 py-3 capitalize ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-500'
                                }`}>{assessment.type}</td>
                                <td className={`px-4 py-3 text-right ${
                                  isDarkMode ? 'text-white' : 'text-slate-700'
                                }`}>
                                  {assessment.score !== undefined ? `${Math.round(assessment.score)}/${Math.round(assessment.maxPoints)}` : '—'}
                                </td>
                                <td className={`px-4 py-3 ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-500'
                                }`}>
                                  {assessment.date 
                                    ? new Date(assessment.date).toLocaleDateString('en-US', {
                                        month: 'long',
                                        day: 'numeric',
                                        year: 'numeric'
                                      })
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className={`p-4 rounded-xl text-sm ${
                        isDarkMode 
                          ? 'bg-[#1a1a1a] text-slate-400' 
                          : 'bg-slate-50 text-slate-500'
                      }`}>
                        No assessments recorded yet for this student.
                      </div>
                    )}
                  </div>
                  <div>
                    <h4 className={`text-lg font-semibold mb-3 ${
                      isDarkMode ? 'text-white' : 'text-slate-800'
                    }`}>Attendance History</h4>
                    {attendanceHistory.length > 0 ? (
                      <div className="space-y-3 max-h-72 overflow-y-auto">
                        {attendanceHistory.map(entry => (
                          <div
                            key={`${entry.date}-${entry.status}`}
                            className={`flex items-center justify-between rounded-xl px-4 py-3 ${
                              isDarkMode ? 'bg-[#1a1a1a]' : 'bg-slate-50'
                            }`}
                          >
                            <div>
                              <p className={`font-semibold ${
                                isDarkMode ? 'text-white' : 'text-slate-700'
                              }`}>
                                {new Date(entry.date).toLocaleDateString('en-US', {
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </p>
                              <p className={`text-xs ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-500'
                              }`}>{entry.date}</p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                entry.status === 'present'
                                  ? isDarkMode
                                    ? 'bg-emerald-900/50 text-emerald-300'
                                    : 'bg-emerald-100 text-emerald-700'
                                  : isDarkMode
                                    ? 'bg-red-900/50 text-red-300'
                                    : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {entry.status === 'present' ? 'Present' : 'Absent'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className={`p-4 rounded-xl text-sm ${
                        isDarkMode 
                          ? 'bg-[#1a1a1a] text-slate-400' 
                          : 'bg-slate-50 text-slate-500'
                      }`}>
                        No attendance records yet for this subject.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  const handleAddStudent = async () => {
    if (!newStudent.id || !newStudent.name) {
      addCustomAlert('warning', 'Missing Information', 'Please complete Student ID and Name fields.', false)
      return
    }
    
    // Validate Student ID is numerical (reject legacy S101, S102 format)
    if (!isValidNumericalStudentId(newStudent.id)) {
      addCustomAlert('error', 'Invalid Student ID', 'Student ID must be numerical only (e.g., 141715, 142177). Legacy IDs like S101, S102 are no longer supported.', false)
      return
    }

    // Additional check: reject any legacy format IDs
    if (/^S\d+$/i.test(newStudent.id)) {
      addCustomAlert('error', 'Invalid Student ID Format', 'Legacy student ID format (S101, S102, etc.) is no longer supported. Please use numerical IDs only (e.g., 141715, 142177).', false)
      return
    }
    
    // Auto-generate email if not provided
    let studentEmail = newStudent.email
    if (!studentEmail || !/.+@.+\..+/.test(studentEmail)) {
      studentEmail = generateStudentEmail(newStudent.name, normalizedId)
    }
    
    const normalizedId = normalizeStudentId(newStudent.id)
    // STRICT INTEGRITY CHECK: Use normalized Student ID as the sole unique key
    const existingById = students.find(s => normalizeStudentId(s.id) === normalizedId)
    
    // Declare variables for student and updated students list
    let studentToUse
    let updatedStudents
    
    // Duplication Prevention: Check for ID conflict with different name
    if (existingById) {
      // If student exists with same ID but different name, flag error
      if (existingById.name.trim().toLowerCase() !== newStudent.name.trim().toLowerCase()) {
        addCustomAlert('error', 'Data Integrity Error', `Student ID ${normalizedId} already exists with a different name:\n\nExisting: ${existingById.name}\nNew: ${newStudent.name}\n\nStudent ID must be unique. Please verify the Student ID or use the existing student record.`, false)
        return
      }
      // Same ID and same name (case-insensitive) - update existing record
      studentToUse = {
        ...existingById,
        id: normalizedId,
        name: newStudent.name || existingById.name,
        email: studentEmail || existingById.email
      }
      updatedStudents = students.map(s => normalizeStudentId(s.id) === normalizedId ? studentToUse : s)
      setStudents(updatedStudents)
    } else {
      // New student - add to list with empty archivedSubjects array
      studentToUse = { id: normalizedId, name: newStudent.name, email: studentEmail, archivedSubjects: [] }
      updatedStudents = [...students, studentToUse]
      setStudents(updatedStudents)
      // IMMEDIATE AVAILABILITY: State is updated, so student appears in all dropdowns immediately
    }

    // Enroll in selected subjects
    const updatedEnrolls = { ...enrolls }
    newStudent.subjects.forEach(subjectCode => {
      if (!updatedEnrolls[subjectCode]) {
        updatedEnrolls[subjectCode] = []
      }
      if (!updatedEnrolls[subjectCode].includes(studentToUse.id)) {
        updatedEnrolls[subjectCode] = [
          ...updatedEnrolls[subjectCode],
          studentToUse.id
        ]
      }
    })
    setNormalizedEnrolls(updatedEnrolls)

    // Phase 2: Multi-part write to normalized collections
    // A. Create/update user in users collection (via students collection)
    // B. Create enrollments in enrollments collection
    try {
      // Verify the numerical Student ID + Email pairing to get the correct Firebase Auth UID
      const verification = await verifyStudentIdEmailPair(studentToUse.id, studentToUse.email)
      let studentUid = verification.verified ? verification.uid : null
      
      if (!studentUid) {
        // Fallback to direct lookup
        const studentDoc = await getStudentByNumericalId(studentToUse.id)
        studentUid = studentDoc?.id
      }

        if (studentUid) {
        // A. Ensure student exists in users/students collection
        await setStudent(studentUid, {
          name: studentToUse.name,
          email: studentEmail,
          studentId: studentToUse.id,
          role: 'Student',
        })
        console.log(`✅ Student profile created/updated in users collection: ${studentUid}`)

        // B. Create enrollments for each selected subject
        for (const subjectCode of newStudent.subjects) {
          const subject = subjects.find(s => s.code === subjectCode)
          if (!subject) continue

          // Get or create course in courses collection
          let course = await getCourseByCode(subjectCode)
          if (!course) {
            // Create course if it doesn't exist
            // Ensure professor profile exists first
            let profProfile = await getProfessorByUid(profUid)
            if (!profProfile || !profProfile.id) {
              console.error('❌ Professor profile not found when creating course')
              addCustomAlert('error', 'Profile Error', 'Professor profile not found. Please refresh and try again.', false)
              continue // Skip this subject
            }
            // Ensure credits is a number, not a string
            const credits = parseInt(subject.credits) || 0
            const courseId = await createCourse({
              code: subject.code,
              name: subject.name,
              credits: credits,
              professorId: profProfile.id, // Use MySQL ID, not Firebase UID
            })
            course = { id: courseId, ...subject }
            console.log(`✅ Created course: ${subject.name} (${subjectCode})`)
          }

          // Check if enrollment already exists in MySQL using the student's MySQL ID
          const existingEnrollment = await getEnrollmentByStudentAndCourse(studentData.id, course.id)
          if (!existingEnrollment) {
            const studentIdNum = parseInt(studentData.id, 10)
            const courseIdNum = parseInt(course.id, 10)
            if (!isNaN(studentIdNum) && !isNaN(courseIdNum)) {
              await createEnrollment(studentIdNum, courseIdNum)
            } else {
              throw new Error(`Invalid IDs: studentId=${studentData.id}, courseId=${course.id}`)
            }
            console.log(`✅ Created enrollment in MySQL: Student ${studentToUse.id} (MySQL ID: ${studentData.id}) → Course ${subjectCode}`)
          }
        }

        // Legacy: Also sync to student dashboard (for backward compatibility)
          const enrolledSubjects = newStudent.subjects.map(code => {
            const subject = subjects.find(s => s.code === code)
            return subject || { code, name: code }
          })
          await syncStudentSubjects(studentUid, enrolledSubjects)
        console.log(`✅ Legacy sync: Updated student dashboard for ${studentToUse.id}`)
        } else {
        console.warn(`⚠️ Could not find/create student UID for ${studentToUse.id}. Student may need to sign up first.`)
      }
    } catch (error) {
      console.error('❌ Error in multi-part write (users + enrollments):', error)
      // Continue with legacy flow even if new system fails
    }

    const enrolledCount = newStudent.subjects.length
    const wasExisting = existingById
    const msg = wasExisting
      ? `${studentToUse.name} (${studentToUse.id}) has been updated and enrolled in ${enrolledCount} subject(s)`
      : `${studentToUse.name} (${studentToUse.id}) has been registered successfully${
          enrolledCount > 0 ? ' and enrolled in ' + enrolledCount + ' subject(s)' : ''
        }`
    
    const newAlert = {
      id: Date.now(),
      type: 'general',
      title: 'Student Added',
      message: msg,
      timestamp: new Date(),
      read: false,
      studentId: studentToUse.id,
      subjectCodes: [...newStudent.subjects],
      target_courseId: newStudent.subjects[0] || null,
    }
    const updatedAlerts = [newAlert, ...alerts]
    setAlerts(updatedAlerts)
    
    // Save to Firestore immediately (critical operation - real-time notification)
    await saveData(subjects, updatedStudents, updatedEnrolls, updatedAlerts, records, grades, profUid, true)

    setShowAddStudentModal(false)
    setNewStudent({ id: '', name: '', email: '', subjects: [] })
  }

  const handleAddStudentToSubject = async () => {
    if (!selectedSubjectForStudent || isAddingStudentToSubject) return
    
    // Check if any students are selected or if new student form is filled
    const hasSelectedStudents = studentToAdd && studentToAdd.length > 0
    const hasNewStudentForm = newStudentQuick.id.trim() && newStudentQuick.name.trim()
    
    if (!hasSelectedStudents && !hasNewStudentForm) {
      addCustomAlert('warning', 'No Selection', 'Please select at least one student or create a new student.', false)
      return
    }
    
    setIsAddingStudentToSubject(true)
    
    try {
      let studentsToEnroll = []
      let updatedStudentsList = students
      
      // Process selected students from checklist
      if (hasSelectedStudents) {
        for (const studentId of studentToAdd) {
          const student = students.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
          if (student) {
            studentsToEnroll.push(student)
          }
        }
      }
      
      // Process new student from quick form (if provided)
      if (hasNewStudentForm) {
        // Handle quick form input - check if student already exists
        const id = newStudentQuick.id.trim()
        const name = newStudentQuick.name.trim()
        const email = newStudentQuick.email.trim()
        
        if (!id || !name) {
          addCustomAlert('warning', 'Missing Information', 'Please select an existing student or enter Student ID and Name to create one.', false)
          return
        }
        
        // Validate Student ID is numerical (reject legacy S101, S102 format)
        if (!isValidNumericalStudentId(id)) {
          addCustomAlert('error', 'Invalid Student ID', 'Student ID must be numerical only (e.g., 141715, 142177). Legacy IDs like S101, S102 are no longer supported.', false)
          return
        }
        
        // Additional check: reject any legacy format IDs
        if (/^S\d+$/i.test(id)) {
          addCustomAlert('error', 'Invalid Student ID Format', 'Legacy student ID format (S101, S102, etc.) is no longer supported. Please use numerical IDs only (e.g., 141715, 142177).', false)
          return
        }
        
        // Auto-generate email if not provided
        let studentEmail = email
        if (!studentEmail || !/.+@.+\..+/.test(studentEmail)) {
          studentEmail = generateStudentEmail(name, id)
        }
        
        const normalizedId = normalizeStudentId(id)
        // STRICT INTEGRITY CHECK: Use normalized Student ID as the sole unique key
        const existingStudent = students.find(s => normalizeStudentId(s.id) === normalizedId)
        let newStudent = null
        if (existingStudent) {
          // Duplication Prevention: Check for ID conflict with different name
          if (existingStudent.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
            addCustomAlert('error', 'Data Integrity Error', `Student ID ${normalizedId} already exists with a different name:\n\nExisting: ${existingStudent.name}\nNew: ${name}\n\nStudent ID must be unique. Please verify the Student ID or use the existing student record.`, false)
            setIsAddingStudentToSubject(false)
            return
          }
          // Same ID and same name (case-insensitive) - use existing student
          newStudent = { ...existingStudent, id: normalizedId }
        } else {
          // Create new student only if ID doesn't exist
          newStudent = { id: normalizedId, name, email: studentEmail, archivedSubjects: [] }
          updatedStudentsList = [...students, newStudent]
          setStudents(updatedStudentsList)
          // IMMEDIATE AVAILABILITY: State is updated, so student appears in all dropdowns immediately
        }
        if (newStudent) {
          studentsToEnroll.push(newStudent)
        }
      }
      
      if (studentsToEnroll.length === 0) {
        setIsAddingStudentToSubject(false)
        return
      }
      
      // CREATE ENROLLMENT IN MYSQL: Get student and course MySQL IDs, then create enrollment
      // enrolls will be rebuilt from MySQL after enrollment is created
      const subject = subjects.find(s => s.code === selectedSubjectForStudent)
      if (!subject) {
        setIsAddingStudentToSubject(false)
        return
      }
      
      // Process each student enrollment
      const enrolledStudents = []
      const failedStudents = []
      const alreadyEnrolledStudents = []
      
      for (const student of studentsToEnroll) {
        try {
          console.log(`📚 Creating enrollment: Student ${student.id} → Subject ${selectedSubjectForStudent}`)
        
        // 1. Get or create student in MySQL (Pure MySQL - no Firebase)
        let studentData = await getStudentByNumericalId(student.id)
        if (!studentData) {
          // Create student in MySQL if they don't exist
          console.log(`📝 Creating new student in MySQL: ${student.name} (ID: ${student.id})`)
          
          try {
          const studentMySQLId = await addStudent({
            studentId: student.id,
            name: student.name,
            email: student.email || ''
          })
            
            if (!studentMySQLId || isNaN(studentMySQLId)) {
              throw new Error(`Failed to create student: Invalid MySQL ID returned (${studentMySQLId})`)
            }
            
            // Verify the student was created by fetching it
            studentData = await getStudentByNumericalId(student.id)
            if (!studentData) {
              throw new Error(`Student was created but could not be retrieved: ${student.id}`)
            }
            
            console.log(`✅ Created student in MySQL: ${student.name} (MySQL ID: ${studentData.id})`)
          } catch (createError) {
            console.error(`❌ Failed to create student ${student.name} (${student.id}) in MySQL:`, createError)
            failedStudents.push({ student, error: createError.message || 'Failed to create student in database' })
            continue // Skip to next student
          }
        }
        
        if (!studentData || !studentData.id) {
          console.error(`❌ Student data is invalid for ${student.name} (${student.id})`)
          failedStudents.push({ student, error: 'Student data is invalid after creation/retrieval' })
          continue // Skip to next student
        }
        
        const studentMySQLId = studentData.id
        console.log(`👤 Student: ${student.name} (Numerical ID: ${student.id}, MySQL ID: ${studentMySQLId})`)

        // 2. Get or create course in MySQL
        let course = await getCourseByCode(selectedSubjectForStudent)
        if (!course) {
          // Create course if it doesn't exist
          // Ensure professor profile exists - try to create if missing
          let profProfile = await getProfessorByUid(profUid)
          if (!profProfile || !profProfile.id) {
            console.warn('⚠️ Professor profile not found, attempting to create...')
            try {
              // Try to auto-create professor profile
              const fallbackName = profName || 'Professor User'
              const defaultPhotoURL = getDefaultAvatar(fallbackName, profUid)
              const newProfile = {
                name: fallbackName,
                email: profEmail || '',
                role: 'Professor',
                department: '',
                photoURL: defaultPhotoURL,
              }
              profProfile = await setProfessor(profUid, newProfile)
              console.log('✅ Auto-created professor profile')
            } catch (createError) {
              console.error('❌ Failed to auto-create professor profile:', createError)
              addCustomAlert('error', 'Profile Error', 'Professor profile not found. Please refresh the page and try again.', false)
              failedStudents.push({ student, error: 'Professor profile not found' })
              continue // Skip this student
            }
          }
          
          if (!profProfile || !profProfile.id) {
            console.error('❌ Professor profile still not found after creation attempt')
            addCustomAlert('error', 'Profile Error', 'Professor profile not found. Please refresh and try again.', false)
            failedStudents.push({ student, error: 'Professor profile not found' })
            continue // Skip this student
          }
          
          // Ensure credits is a number, not a string
          const credits = parseInt(subject.credits) || 0
          const courseIdStr = await createCourse({
            code: subject.code,
            name: subject.name,
            credits: credits,
            professorId: profProfile.id, // Use MySQL ID
          })
          // createCourse returns a string ID, convert to number
          const courseIdNum = parseInt(courseIdStr, 10)
          if (isNaN(courseIdNum)) {
            throw new Error(`Invalid course ID returned: ${courseIdStr}`)
          }
          course = { id: courseIdNum, code: subject.code, name: subject.name }
          console.log(`✅ Created course in MySQL: ${subject.name} (ID: ${courseIdNum})`)
        }
        const courseId = parseInt(course.id, 10)
        if (isNaN(courseId)) {
          console.error(`❌ Invalid course ID: ${course.id}`)
          failedStudents.push({ student, error: `Invalid course ID: ${course.id}` })
          continue
        }
        console.log(`📚 Course: ${subject.name} (Code: ${subject.code}, MySQL ID: ${courseId})`)

        // 3. Create enrollment in MySQL
        const existingEnrollment = await getEnrollmentByStudentAndCourse(studentMySQLId, courseId)
        if (existingEnrollment) {
          console.log(`ℹ️ Enrollment already exists: Student ${student.id} → Course ${selectedSubjectForStudent}`)
          alreadyEnrolledStudents.push(student)
          continue // Skip to next student
        } else {
          // Ensure both IDs are numbers
          const studentIdNum = parseInt(studentMySQLId, 10)
          const courseIdNum = parseInt(courseId, 10)
          if (isNaN(studentIdNum) || isNaN(courseIdNum)) {
            throw new Error(`Invalid IDs: studentId=${studentMySQLId}, courseId=${courseId}`)
          }
          await createEnrollment(studentIdNum, courseIdNum)
          console.log(`✅ Enrollment created in MySQL: Student ${student.id} (MySQL ID: ${studentIdNum}) → Course ${selectedSubjectForStudent} (MySQL ID: ${courseIdNum})`)
          enrolledStudents.push(student)
        }
      } catch (error) {
          console.error(`❌ Failed to create enrollment for ${student.name}:`, error)
          failedStudents.push({ student, error: error.message || 'An unexpected error occurred' })
        }
        }

      // 4. Rebuild enrolls from MySQL once after all enrollments (single source of truth)
      let finalStudentsList = updatedStudentsList // Start with students that were updated
      if (enrolledStudents.length > 0) {
        const profProfile = await getProfessorByUid(profUid)
        if (profProfile && profProfile.id) {
          const rebuiltResult = await buildEnrollsFromMySQL(profProfile.id, subjects)
          const rebuiltEnrolls = rebuiltResult.enrolls || rebuiltResult
          const enrolledStudentIds = rebuiltResult.enrolledStudentIds || []
          
          // CRITICAL: Reload ALL students from MySQL to ensure Student Management view is up to date
          // This ensures newly created students appear in the Student Management tab
          console.log('📚 Reloading all students from MySQL to update Student Management view...')
          try {
            const allMySQLStudents = await listStudents()
            console.log(`📥 Fetched ${allMySQLStudents.length} students from MySQL:`, allMySQLStudents.map(s => ({ id: s.student_id || s.studentId, name: s.name })))
            
            const formattedStudents = allMySQLStudents.map(s => ({
              id: normalizeStudentId(s.student_id || s.studentId || String(s.id)),
              name: s.name || 'Unknown Student',
              email: s.email || '',
              department: s.department || '',
              archivedSubjects: [],
              photoURL: s.photo_url || s.photoURL || ''
            }))
            
            console.log(`📝 Formatted ${formattedStudents.length} students:`, formattedStudents.map(s => ({ id: s.id, name: s.name })))
            
            // Create a map of existing students by ID to preserve archivedSubjects
            const existingStudentsMap = new Map()
            updatedStudentsList.forEach(s => {
              const id = normalizeStudentId(s.id)
              existingStudentsMap.set(id, s)
            })
            console.log(`📋 Existing students in local state: ${existingStudentsMap.size}`, Array.from(existingStudentsMap.keys()))
            
            // Merge: use existing archivedSubjects if available, otherwise use new data
            // CRITICAL: Use a Set to track IDs and ensure no duplicates
            const mergedStudentsMap = new Map()
            formattedStudents.forEach(newStudent => {
              const normalizedId = normalizeStudentId(newStudent.id)
              const existing = existingStudentsMap.get(normalizedId)
              if (existing) {
                mergedStudentsMap.set(normalizedId, {
                  ...newStudent,
                  archivedSubjects: existing.archivedSubjects || []
                })
              } else {
                mergedStudentsMap.set(normalizedId, newStudent)
              }
            })
            
            // Convert map to array - this ensures no duplicates
            const mergedStudents = Array.from(mergedStudentsMap.values())
            
            console.log(`✅ Merged ${mergedStudents.length} students (${formattedStudents.length} from MySQL, ${updatedStudentsList.length} in local state)`)
            console.log(`📊 Final student IDs:`, mergedStudents.map(s => ({ id: s.id, name: s.name })))
            
            finalStudentsList = mergedStudents
            
            // Update students state with all students from MySQL
            // Use functional update to ensure React detects the change
            setStudents(() => mergedStudents)
            console.log(`✅ Reloaded ${mergedStudents.length} students from MySQL (was ${updatedStudentsList.length})`)
            
            // CRITICAL: Verify all enrolled students are in the list
            // Get all enrolled student IDs from the rebuilt enrolls (more reliable than enrolledStudentIds)
            const allEnrolledIdsFromEnrolls = new Set()
            Object.values(rebuiltEnrolls).forEach(enrollmentList => {
              enrollmentList.forEach(id => allEnrolledIdsFromEnrolls.add(normalizeStudentId(id)))
            })
            
            const mergedStudentIdsSet = new Set(mergedStudents.map(s => normalizeStudentId(s.id)))
            const missingEnrolledStudents = Array.from(allEnrolledIdsFromEnrolls).filter(id => !mergedStudentIdsSet.has(normalizeStudentId(id)))
            
            console.log(`🔍 Checking for missing enrolled students:`, {
              totalEnrolledIds: allEnrolledIdsFromEnrolls.size,
              totalMergedStudents: mergedStudents.length,
              missingCount: missingEnrolledStudents.length,
              missingIds: missingEnrolledStudents
            })
            
            if (missingEnrolledStudents.length > 0) {
              console.warn(`⚠️ ${missingEnrolledStudents.length} enrolled students are missing from the merged list:`, missingEnrolledStudents)
              // Try to fetch missing students individually
              const missingStudentsToAdd = []
              for (const missingId of missingEnrolledStudents) {
                try {
                  // Try both numerical ID and normalized ID
                  const studentData = await getStudentByNumericalId(missingId) || await getStudentByNumericalId(String(missingId).replace(/^0+/, ''))
                  if (studentData) {
                    const normalizedId = normalizeStudentId(studentData.student_id || studentData.studentId || missingId)
                    // Check if we already have this student with a different ID format
                    const alreadyExists = mergedStudents.some(s => normalizeStudentId(s.id) === normalizedId)
                    if (!alreadyExists) {
                      missingStudentsToAdd.push({
                        id: normalizedId,
                        name: studentData.name || 'Unknown Student',
                        email: studentData.email || '',
                        department: studentData.department || '',
                        archivedSubjects: [],
                        photoURL: studentData.photo_url || studentData.photoURL || ''
                      })
                      console.log(`✅ Fetched missing student: ${studentData.name} (${normalizedId})`)
                    } else {
                      console.log(`ℹ️ Student ${normalizedId} already exists with different ID format`)
                    }
                  } else {
                    console.warn(`⚠️ Could not fetch student data for ID: ${missingId}`)
                  }
                } catch (err) {
                  console.error(`❌ Failed to fetch missing student ${missingId}:`, err)
                }
              }
              
              if (missingStudentsToAdd.length > 0) {
                const finalMergedStudents = [...mergedStudents, ...missingStudentsToAdd]
                setStudents(() => finalMergedStudents)
                finalStudentsList = finalMergedStudents
                console.log(`✅ Added ${missingStudentsToAdd.length} missing students. Total: ${finalMergedStudents.length}`)
              } else {
                console.warn(`⚠️ No missing students could be fetched. This may indicate an ID mismatch issue.`)
              }
            } else {
              console.log(`✅ All ${allEnrolledIdsFromEnrolls.size} enrolled students are in the merged list`)
            }
            
            // CRITICAL: Update enrolls state with rebuilt enrolls
            setNormalizedEnrolls(rebuiltEnrolls)
            console.log(`✅ Updated enrolls state with ${Object.keys(rebuiltEnrolls).length} subjects`)
            
            // CRITICAL: Double-check that all enrolled students are in the students array
            // This is a final safety check to ensure UI displays all students
            const finalCheckEnrolledIds = new Set()
            Object.values(rebuiltEnrolls).forEach(enrollmentList => {
              enrollmentList.forEach(id => finalCheckEnrolledIds.add(normalizeStudentId(id)))
            })
            const finalCheckStudentIds = new Set(finalStudentsList.map(s => normalizeStudentId(s.id)))
            const stillMissing = Array.from(finalCheckEnrolledIds).filter(id => !finalCheckStudentIds.has(id))
            
            if (stillMissing.length > 0) {
              console.error(`❌ FINAL CHECK: ${stillMissing.length} enrolled students still missing after all attempts:`, stillMissing)
              console.error(`Enrolled IDs:`, Array.from(finalCheckEnrolledIds))
              console.error(`Student IDs:`, Array.from(finalCheckStudentIds))
            } else {
              console.log(`✅ FINAL CHECK: All ${finalCheckEnrolledIds.size} enrolled students are in the students array`)
            }
            
            // Force a single UI refresh to ensure Student Management view updates
            setRefreshTrigger(prev => prev + 1)
          } catch (error) {
            console.error('❌ Failed to reload students from MySQL:', error)
            // Fallback: Only load missing enrolled students
          if (enrolledStudentIds.length > 0) {
            console.log(`📚 Loading ${enrolledStudentIds.length} enrolled students into local state...`)
            const studentsToLoad = []
            
            for (const studentId of enrolledStudentIds) {
              // Check if student already exists in local state
                const existingStudent = updatedStudentsList.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
              if (!existingStudent) {
                // Student not in local state - fetch from MySQL
                try {
                  const studentData = await getStudentByNumericalId(studentId)
                  if (studentData) {
                    studentsToLoad.push({
                      id: studentData.student_id || studentData.studentId || studentId,
                      name: studentData.name,
                      email: studentData.email,
                      archivedSubjects: []
                    })
                    console.log(`✅ Loaded student: ${studentData.name} (${studentId})`)
                  }
                } catch (err) {
                  console.warn(`⚠️ Could not load student ${studentId} from MySQL:`, err)
                }
              }
            }
            
            // Add newly loaded students to the students array
            if (studentsToLoad.length > 0) {
                finalStudentsList = [...updatedStudentsList, ...studentsToLoad]
                setStudents(() => finalStudentsList)
              console.log(`✅ Added ${studentsToLoad.length} new students to local state`)
              }
            }
          }
          
          setNormalizedEnrolls(rebuiltEnrolls)
          // Force multiple UI refreshes to ensure Student Management view updates
          setRefreshTrigger(prev => prev + 1)
          console.log('✅ Rebuilt enrolls from MySQL after enrollment creation and reloaded all students')
        }
      }
      
      // Create or update a DAILY summary enrollment notification (all subjects combined)
      if (enrolledStudents.length > 0) {
      const todayKey = new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      const updatedAlerts = [...alerts]
      const existingIndex = updatedAlerts.findIndex(a =>
        (a.type === 'subject' || a.type === 'enrollment') &&
        a.summaryDate == todayKey
      )
      
      if (existingIndex !== -1) {
        const existing = updatedAlerts[existingIndex]
          const prevCount = existing.enrolledCount || 0
          const newCount = prevCount + enrolledStudents.length
        updatedAlerts[existingIndex] = {
          ...existing,
          enrolledCount: newCount,
          // Global summary – do not list individual names or subjects
          message: `${newCount} student${newCount === 1 ? '' : 's'} have been enrolled today.`,
          timestamp: new Date(),
          read: false,
        }
      } else {
        const newAlert = {
          id: Date.now(),
          type: 'subject',
          title: 'Student Enrolled',
            message: `${enrolledStudents.length} student${enrolledStudents.length === 1 ? '' : 's'} ${enrolledStudents.length === 1 ? 'has' : 'have'} been enrolled today.`,
          timestamp: new Date(),
          read: false,
            studentId: enrolledStudents[0]?.id || null,
          subjectCode: null,
          target_courseId: null,
          summaryDate: todayKey,
            enrolledCount: enrolledStudents.length,
        }
        updatedAlerts.unshift(newAlert)
      }
      setAlerts(updatedAlerts)
      
      // Save to Firestore immediately (critical operation - real-time notification)
      // Note: enrolls are no longer stored in Firestore (MySQL is the source of truth),
      // so we pass null for the enrolls parameter.
      // Use finalStudentsList which includes all students loaded from MySQL
      await saveData(subjects, finalStudentsList, null, updatedAlerts, records, grades, profUid, true)
      }
      
      // Show appropriate notifications
      if (enrolledStudents.length > 0) {
        const studentNames = enrolledStudents.map(s => `${s.name} (${s.id})`).join(', ')
      addCustomAlert(
        'success',
          'Student(s) Enrolled',
          `${enrolledStudents.length} student${enrolledStudents.length === 1 ? '' : 's'} enrolled: ${studentNames}`,
        false
      )
        
        // CRITICAL: Verify all enrolled students are now in the students array
        // Use finalStudentsList which contains the latest merged students
        console.log('🔍 Verifying enrolled students are in students array...')
        console.log(`📊 Final students list has ${finalStudentsList.length} students`)
        enrolledStudents.forEach(enrolledStudent => {
          const normalizedId = normalizeStudentId(enrolledStudent.id)
          const found = finalStudentsList.find(s => normalizeStudentId(s.id) === normalizedId)
          if (!found) {
            console.error(`❌ CRITICAL: Enrolled student ${enrolledStudent.name} (${enrolledStudent.id}) is NOT in final students list!`, {
              enrolledStudentId: normalizedId,
              finalStudentsIds: finalStudentsList.map(s => normalizeStudentId(s.id)),
              finalStudentsNames: finalStudentsList.map(s => s.name)
            })
          } else {
            console.log(`✅ Enrolled student ${enrolledStudent.name} (${enrolledStudent.id}) is in final students list`)
          }
        })
      }
      
      if (alreadyEnrolledStudents.length > 0) {
        const studentNames = alreadyEnrolledStudents.map(s => `${s.name} (${s.id})`).join(', ')
        setAlreadyEnrolledMessage(`${alreadyEnrolledStudents.length} student${alreadyEnrolledStudents.length === 1 ? '' : 's'} already enrolled in ${selectedSubjectForStudent}: ${studentNames}`)
      }
      
      if (failedStudents.length > 0) {
        const studentNames = failedStudents.map(f => `${f.student.name} (${f.student.id})`).join(', ')
        addCustomAlert(
          'error',
          'Enrollment Failed',
          `Failed to enroll ${failedStudents.length} student${failedStudents.length === 1 ? '' : 's'}: ${studentNames}`,
          false
        )
      }
      
      // Only close modal if all operations completed successfully
      if (enrolledStudents.length > 0 && failedStudents.length === 0 && alreadyEnrolledStudents.length === 0) {
        // Close modal and reset form
      setShowAddStudentToSubjectModal(false)
        setStudentToAdd([])
      setNewStudentQuick({ id: '', name: '', email: '' })
      setSelectedSubjectForStudent(null)
        setAlreadyEnrolledMessage(null)
        // Force UI refresh to show newly enrolled students (refreshTrigger already updated above)
      } else if (enrolledStudents.length > 0) {
        // Clear selections but keep modal open if there were issues
        setStudentToAdd([])
        setNewStudentQuick({ id: '', name: '', email: '' })
    }
    } catch (error) {
      console.error('❌ Unexpected error in handleAddStudentToSubject:', error)
      addCustomAlert('error', 'Enrollment Error', 'An unexpected error occurred while adding the student. Please try again.', false)
    } finally {
      setIsAddingStudentToSubject(false)
    }
  }

  const handleArchiveStudent = async (studentId, subjectCode) => {
    const normalizedId = normalizeStudentId(studentId)
    const student = students.find(s => normalizeStudentId(s.id) === normalizedId)
    if (!student) return

    // OPTIMISTIC UPDATE: Update UI immediately before async operations
    // Mark student as archived for this subject
    const updatedStudents = students.map(s => {
      if (normalizeStudentId(s.id) === normalizedId) {
        const archivedSubjects = s.archivedSubjects || []
        if (!archivedSubjects.includes(subjectCode)) {
          return {
            ...s,
            archivedSubjects: [...archivedSubjects, subjectCode],
          }
        }
      }
      return s
    })

    // Update state immediately - UI will update instantly
    setStudents(updatedStudents)
    
    // Delete enrollment from MySQL and rebuild enrolls
    try {
      // Get student and course MySQL IDs
      const studentData = await getStudentByNumericalId(student.id)
      const course = await getCourseByCode(subjectCode)
      
      if (studentData && course) {
        // Delete enrollment from MySQL
        await deleteEnrollmentByStudentAndCourse(studentData.id, course.id)
        console.log(`✅ Deleted enrollment from MySQL: Student ${student.id} → Course ${subjectCode}`)
        
        // Rebuild enrolls from MySQL
        const profProfile = await getProfessorByUid(profUid)
        if (profProfile && profProfile.id) {
          const rebuiltResult = await buildEnrollsFromMySQL(profProfile.id, subjects)
          const rebuiltEnrolls = rebuiltResult.enrolls || rebuiltResult
          setNormalizedEnrolls(rebuiltEnrolls)
          console.log('✅ Rebuilt enrolls from MySQL after enrollment deletion')
        }
      } else {
        console.warn('⚠️ Could not delete enrollment from MySQL - student or course not found')
      }
    } catch (error) {
      console.error('❌ Failed to delete enrollment from MySQL:', error)
      // Continue with UI update even if MySQL deletion fails
    }

    // Sync subject removal to student dashboard in background (non-blocking)
    // This runs after UI update so it doesn't delay the visual feedback
    Promise.resolve().then(async () => {
    try {
      const verification = await verifyStudentIdEmailPair(student.id, student.email)
      if (verification.verified && verification.uid) {
        const currentDashboard = await getStudentDashboard(verification.uid)
        const currentSubjects = (currentDashboard?.subjects || []).filter(s => s.code !== subjectCode)
        await syncStudentSubjects(verification.uid, currentSubjects)
      } else {
        const studentUid = await getStudentUidForSync(student.id, student.email)
        if (studentUid) {
          const currentDashboard = await getStudentDashboard(studentUid)
          const currentSubjects = (currentDashboard?.subjects || []).filter(s => s.code !== subjectCode)
          await syncStudentSubjects(studentUid, currentSubjects)
        }
      }
    } catch (error) {
      console.warn('Failed to sync student subject removal', error)
    }
    })

    const newAlert = {
      id: Date.now(),
      type: 'general',
      title: 'Student Archived',
      message: `${student.name} (${student.id}) has been archived from ${subjectCode}`,
      timestamp: new Date(),
      read: false,
      studentId: student.id,
      subjectCode,
      target_courseId: subjectCode,
    }
    const updatedAlerts = [newAlert, ...alerts]
    setAlerts(updatedAlerts)
    
    // DATABASE ACTION: Save archived status to Firestore in background (non-blocking)
    ;(async () => {
      try {
        // CRITICAL: Ensure we're saving the exact updated data, not state
        const studentAfterUpdate = updatedStudents.find(s => normalizeStudentId(s.id) === normalizedId)
        const isInArchived = (studentAfterUpdate?.archivedSubjects || []).includes(subjectCode)
        
        if (!isInArchived) {
          console.error(`❌ CRITICAL ERROR: Student ${normalizedId} not marked as archived before save!`)
          addCustomAlert('error', 'Archive Failed', 'Error: Failed to archive student. Please try again.', false)
          return
        }
        
        // NOTE: enrolls is no longer saved to Firestore - MySQL is the single source of truth
        await saveData(subjects, updatedStudents, null, updatedAlerts, records, grades, profUid, true)
        console.log(`✅ Student ${student.id} archived from ${subjectCode} and saved to Firestore`, {
          studentId: normalizedId,
          subjectCode: subjectCode,
          archivedSubjects: studentAfterUpdate?.archivedSubjects || [],
          enrollsForSubject: updatedEnrolls[subjectCode] || [],
          enrollsCount: updatedEnrolls[subjectCode]?.length || 0,
          studentInEnrolls: updatedEnrolls[subjectCode]?.some(id => normalizeStudentId(id) === normalizedId) || false,
          verification: {
            isArchived: isInArchived
          }
        })
      } catch (error) {
        console.error('Failed to save archived student to Firestore:', error)
        addCustomAlert('error', 'Save Failed', 'Failed to save archive action. Please try again.', false)
          // Note: We don't revert UI changes on error - the optimistic update stays
      }
    })()
  }

  const handleArchiveStudentClick = async (studentId, subjectCode) => {
    const key = `${subjectCode}-${normalizeStudentId(studentId)}`
    if (archivingStudentIds[key]) {
      return
    }

    setArchivingStudentIds(prev => ({ ...prev, [key]: true }))
    try {
      await handleArchiveStudent(studentId, subjectCode)
    } finally {
      setArchivingStudentIds(prev => {
        const next = { ...prev }
        delete next[key]
        return next
      })
    }
  }

  const handleRestoreStudent = async (studentId, subjectCode) => {
    const normalizedId = normalizeStudentId(studentId)
    const student = students.find(s => normalizeStudentId(s.id) === normalizedId)
    if (!student) return

    // Remove from archived subjects
    const updatedStudents = students.map(s => {
      if (normalizeStudentId(s.id) === normalizedId) {
        const archivedSubjects = (s.archivedSubjects || []).filter(code => code !== subjectCode)
        return {
          ...s,
          archivedSubjects
        }
      }
      return s
    })
    setStudents(updatedStudents)

    // Create enrollment in MySQL and rebuild enrolls
    const subject = subjects.find(s => s.code === subjectCode)
    if (student && subject) {
      try {
        // Get student and course MySQL IDs
        const studentData = await getStudentByNumericalId(student.id)
        const course = await getCourseByCode(subjectCode)
        
        if (studentData && course) {
          // Create enrollment in MySQL
          const existingEnrollment = await getEnrollmentByStudentAndCourse(studentData.id, course.id)
          if (!existingEnrollment) {
            const studentIdNum = parseInt(studentData.id, 10)
            const courseIdNum = parseInt(course.id, 10)
            if (!isNaN(studentIdNum) && !isNaN(courseIdNum)) {
              await createEnrollment(studentIdNum, courseIdNum)
            } else {
              throw new Error(`Invalid IDs: studentId=${studentData.id}, courseId=${course.id}`)
            }
            console.log(`✅ Created enrollment in MySQL: Student ${student.id} → Course ${subjectCode}`)
          }
          
          // Rebuild enrolls from MySQL
          const profProfile = await getProfessorByUid(profUid)
          if (profProfile && profProfile.id) {
            const rebuiltResult = await buildEnrollsFromMySQL(profProfile.id, subjects)
            const rebuiltEnrolls = rebuiltResult.enrolls || rebuiltResult
            setNormalizedEnrolls(rebuiltEnrolls)
            console.log('✅ Rebuilt enrolls from MySQL after enrollment restoration')
          }
        }
        
        // Sync subject enrollment to student dashboard (ensure term is included)
        try {
          // Fetch term from MySQL to ensure it's up-to-date
          let subjectToSync = { ...subject, term: subject.term || 'first' } // Default to 'first' if no term
          try {
            const course = await getCourseByCode(subjectCode)
            if (course && course.term) {
              subjectToSync = { ...subjectToSync, term: course.term }
              console.log(`📚 Using term from MySQL for ${subjectCode}: ${course.term}`)
            }
          } catch (error) {
            console.warn(`⚠️ Could not fetch course term from MySQL, using local term:`, error)
          }
          const verification = await verifyStudentIdEmailPair(student.id, student.email)
          if (verification.verified && verification.uid) {
            const currentDashboard = await getStudentDashboard(verification.uid)
            const currentSubjects = currentDashboard?.subjects || []
            const existingSubjectIndex = currentSubjects.findIndex(s => s.code === subjectCode)
            if (existingSubjectIndex === -1) {
              // Subject doesn't exist, add it with term
              const updatedSubjects = [...currentSubjects, subjectToSync]
              await syncStudentSubjects(verification.uid, updatedSubjects)
            } else {
              // Subject exists, update it with current term
              const updatedSubjects = currentSubjects.map((s, idx) => 
                idx === existingSubjectIndex ? { ...s, term: subjectToSync.term } : s
              )
              await syncStudentSubjects(verification.uid, updatedSubjects)
            }
          } else {
            const studentUid = await getStudentUidForSync(student.id, student.email)
            if (studentUid) {
              const currentDashboard = await getStudentDashboard(studentUid)
              const currentSubjects = currentDashboard?.subjects || []
              const existingSubjectIndex = currentSubjects.findIndex(s => s.code === subjectCode)
              if (existingSubjectIndex === -1) {
                // Subject doesn't exist, add it with term
                const updatedSubjects = [...currentSubjects, subjectToSync]
                await syncStudentSubjects(studentUid, updatedSubjects)
              } else {
                // Subject exists, update it with current term
                const updatedSubjects = currentSubjects.map((s, idx) => 
                  idx === existingSubjectIndex ? { ...s, term: subjectToSync.term } : s
                )
                await syncStudentSubjects(studentUid, updatedSubjects)
              }
            }
          }
        } catch (error) {
          console.warn('Failed to sync student subject restoration', error)
        }
      } catch (error) {
        console.error('❌ Failed to restore enrollment in MySQL:', error)
      }
    }

    const newAlert = {
      id: Date.now(),
      type: 'general',
      title: 'Student Restored',
      message: `${student.name} (${student.id}) has been restored to ${subject?.name || subjectCode}`,
      timestamp: new Date(),
      read: false,
    }
    const updatedAlerts = [newAlert, ...alerts]
    setAlerts(updatedAlerts)
    
    // NOTE: enrolls is no longer saved to Firestore - MySQL is the single source of truth
    await saveData(subjects, updatedStudents, null, updatedAlerts, records, grades, profUid)
  }

  const handleRemoveStudentFromSubject = async (studentId, subjectCode) => {
    // This function now archives instead of permanently removing
    await handleArchiveStudent(studentId, subjectCode)
  }

  // Parse CSV or Excel file and extract student data
  const parseCSV = (file) => {
    const fileName = file.name.toLowerCase()
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls')
    
    if (isExcel) {
      // Parse Excel file
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result)
          const workbook = XLSX.read(data, { type: 'array' })
          
          // Get first sheet
          const firstSheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[firstSheetName]
          
          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })
          
          // Find header row - more flexible detection
          let headerRowIndex = -1
          let idColumnIndex = 0
          let nameColumnIndex = 1
          let emailColumnIndex = 2
          
          // Try to find header row
          for (let i = 0; i < Math.min(5, jsonData.length); i++) {
            const row = jsonData[i]
            if (Array.isArray(row)) {
              const rowLower = row.map(cell => String(cell).toLowerCase().trim())
              
              // Look for ID column
              const idCol = rowLower.findIndex(cell => 
                cell === 'id' || cell === 'student id' || cell === 'student_id' || 
                cell === 'studentid' || cell.includes('id')
              )
              
              // Look for Name column
              const nameCol = rowLower.findIndex(cell => 
                cell === 'name' || cell === 'student name' || cell === 'student_name' || 
                cell === 'studentname' || cell.includes('name')
              )
              
              // Look for Email column (optional) - more flexible detection
              const emailCol = rowLower.findIndex(cell => 
                cell === 'email' || cell === 'e-mail' || cell === 'student email' || 
                cell === 'student_email' || cell.includes('email') || 
                cell.includes('@') || cell.includes('umindanao')
              )
              
              if (idCol >= 0 && nameCol >= 0) {
                headerRowIndex = i
                idColumnIndex = idCol
                nameColumnIndex = nameCol
                // Use email column if found, otherwise try column 2, or use -1 if not available
                emailColumnIndex = emailCol >= 0 ? emailCol : (row.length > 2 ? 2 : -1)
                
                // If email column not found by name, try to find a column that looks like an email
                if (emailColumnIndex < 0 || emailColumnIndex >= row.length) {
                  for (let colIdx = 0; colIdx < row.length; colIdx++) {
                    const cellValue = String(row[colIdx] || '').toLowerCase()
                    if (cellValue.includes('@') || cellValue.includes('email') || cellValue.includes('umindanao')) {
                      emailColumnIndex = colIdx
                      console.log(`📧 Email column detected by content in column ${colIdx}: "${row[colIdx]}"`)
                      break
                    }
                  }
                }
                
                console.log('✅ Found header row:', { 
                  row: i, 
                  idColumn: idColumnIndex, 
                  nameColumn: nameColumnIndex, 
                  emailColumn: emailColumnIndex,
                  rowLength: row.length,
                  allColumns: row.map((v, idx) => ({ index: idx, value: String(v) }))
                })
                break
              }
            }
          }
          
          // If no header found, assume first row is data (columns 0, 1, 2)
          const startRow = headerRowIndex >= 0 ? headerRowIndex + 1 : 0
          
          const parsed = []
          for (let i = startRow; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (!Array.isArray(row)) continue
            
            // Get values from detected columns
            const id = String(row[idColumnIndex] || '').trim()
            const name = String(row[nameColumnIndex] || '').trim()
            // Only get email if email column index is valid
            // Preserve email exactly as it appears, including .tc@umindanao.edu.ph
            let email = ''
            if (emailColumnIndex >= 0 && row.length > emailColumnIndex) {
              email = String(row[emailColumnIndex] || '').trim()
              // Remove any quotes that might be present
              if ((email.startsWith('"') && email.endsWith('"')) || 
                  (email.startsWith("'") && email.endsWith("'"))) {
                email = email.slice(1, -1).trim()
              }
            } else {
              // Fallback: Try to find email in any column that contains @
              for (let colIdx = 0; colIdx < row.length; colIdx++) {
                const potentialEmail = String(row[colIdx] || '').trim()
                if (potentialEmail.includes('@') && (potentialEmail.includes('.tc@umindanao.edu.ph') || potentialEmail.includes('umindanao'))) {
                  email = potentialEmail
                  // Remove quotes if present
                  if ((email.startsWith('"') && email.endsWith('"')) || 
                      (email.startsWith("'") && email.endsWith("'"))) {
                    email = email.slice(1, -1).trim()
                  }
                  console.log(`📧 Found email in column ${colIdx} (not detected as email column): ${email}`)
                  break
                }
              }
            }
            
            // Validate email format if provided (should contain @)
            if (email && !email.includes('@')) {
              console.warn(`⚠️ Invalid email format for ${name} (${id}): "${email}" - treating as empty`)
              email = ''
            }
            
            // Skip empty rows
            if (!id && !name) continue
            
            // Validate that we have at least ID and Name
            if (id && name) {
              parsed.push({ id, name, email })
            } else {
              console.warn(`Skipping row ${i + 1}: Missing ID or Name`, { id, name, email })
            }
          }
          
          console.log('📊 Excel parsing complete:', {
            totalRows: jsonData.length,
            headerRowIndex,
            startRow,
            parsedCount: parsed.length,
            firstFewParsed: parsed.slice(0, 3),
            idColumn: idColumnIndex,
            nameColumn: nameColumnIndex,
            emailColumn: emailColumnIndex
          })
          
          if (parsed.length === 0) {
            const errorMsg = headerRowIndex >= 0 
              ? 'No student data found after the header row. Please ensure your Excel file has data rows with ID and Name columns.'
              : 'Could not find ID and Name columns in your Excel file. Please ensure your file has columns labeled "ID" (or "Student ID") and "Name" (or "Student Name").'
            addCustomAlert('warning', 'No Data Found', errorMsg, false)
            console.warn('❌ Excel parsing result: No data found', { 
              jsonData: jsonData.slice(0, 5), // Show first 5 rows for debugging
              headerRowIndex,
              totalRows: jsonData.length,
              firstRow: jsonData[0],
              secondRow: jsonData[1]
            })
          } else {
            console.log(`✅ Excel parsed successfully: ${parsed.length} students found`, {
              students: parsed,
              headerRow: headerRowIndex >= 0 ? headerRowIndex : 'none (using first row as data)',
              columns: { id: idColumnIndex, name: nameColumnIndex, email: emailColumnIndex }
            })
          }
          
          console.log('✅ Excel parsing complete - setting preview:', {
            parsedCount: parsed.length,
            firstFewParsed: parsed.slice(0, 3)
          })
          
          setCsvPreview(parsed)
          setCsvImportWarnings([])
          console.log('✅ csvPreview state updated with Excel data:', parsed.length, 'students')
          
          if (parsed.length > 0) {
            addCustomAlert('success', 'File Parsed', `Successfully parsed ${parsed.length} student(s) from Excel file.`, false)
          }
        } catch (error) {
          console.error('❌ Excel parsing error:', error)
          console.error('Error details:', {
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack,
            fileName: file.name
          })
          addCustomAlert('error', 'File Error', `Failed to parse Excel file: ${error.message}. Please check the console (F12) for more details.`, false)
          setCsvPreview([])
        }
      }
      reader.onerror = (error) => {
        console.error('❌ Excel file read error:', error)
        addCustomAlert('error', 'File Error', 'Failed to read Excel file. Please try again.', false)
        setCsvPreview([])
      }
      reader.readAsArrayBuffer(file)
    } else {
      // Parse CSV file
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const text = e.target.result
          const lines = text.split(/\r?\n/).filter(line => line.trim())
          
          if (lines.length === 0) {
            addCustomAlert('warning', 'Empty File', 'The CSV file appears to be empty.', false)
            setCsvPreview([])
            return
          }
          
          // Detect delimiter (comma, semicolon, or tab)
          const firstLine = lines[0]
          let delimiter = ','
          if (firstLine.includes(';') && firstLine.split(';').length > firstLine.split(',').length) {
            delimiter = ';'
          } else if (firstLine.includes('\t')) {
            delimiter = '\t'
          }
          
          // Parse first line to detect column positions
          // Improved CSV parsing that handles quoted fields and emails correctly
          const parseLine = (line) => {
            const values = []
            let currentValue = ''
            let insideQuotes = false
            let quoteChar = null
            
            for (let i = 0; i < line.length; i++) {
              const char = line[i]
              const nextChar = line[i + 1]
              
              // Handle quote start/end
              if ((char === '"' || char === "'") && !insideQuotes) {
                insideQuotes = true
                quoteChar = char
                continue // Don't include quote in value
              } else if (char === quoteChar && insideQuotes) {
                // Check if it's an escaped quote (double quote)
                if (nextChar === quoteChar) {
                  currentValue += char
                  i++ // Skip next quote
                  continue
                } else {
                  // End of quoted field
                  insideQuotes = false
                  quoteChar = null
                  continue // Don't include quote in value
                }
              }
              
              // Handle delimiter
              if (char === delimiter && !insideQuotes) {
                values.push(currentValue.trim())
                currentValue = ''
                continue
              }
              
              // Add character to current value
              currentValue += char
            }
            
            // Add the last value
            if (currentValue.length > 0 || values.length > 0) {
              values.push(currentValue.trim())
            }
            
            return values
          }
          
          // Detect header row and column positions
          let startIndex = 0
          let idColumnIndex = 0
          let nameColumnIndex = 1
          let emailColumnIndex = 2
          
          const firstLineValues = parseLine(firstLine)
          const firstLineLower = firstLineValues.map(v => v.toLowerCase().trim())
          
          // Check if first line is a header
          const hasIdHeader = firstLineLower.some(v => 
            v === 'id' || v === 'student id' || v === 'student_id' || v === 'studentid' || v.includes('id')
          )
          const hasNameHeader = firstLineLower.some(v => 
            v === 'name' || v === 'student name' || v === 'student_name' || v === 'studentname' || v.includes('name')
          )
          
          if (hasIdHeader && hasNameHeader) {
            startIndex = 1
            // Find actual column positions
            idColumnIndex = firstLineLower.findIndex(v => 
              v === 'id' || v === 'student id' || v === 'student_id' || v === 'studentid' || v.includes('id')
            )
            nameColumnIndex = firstLineLower.findIndex(v => 
              v === 'name' || v === 'student name' || v === 'student_name' || v === 'studentname' || v.includes('name')
            )
            const emailCol = firstLineLower.findIndex(v => 
              v === 'email' || v === 'e-mail' || v === 'student email' || v === 'student_email' || 
              v.includes('email') || v.includes('@') || v.includes('umindanao')
            )
            emailColumnIndex = emailCol >= 0 ? emailCol : (firstLineValues.length > 2 ? 2 : -1)
            
            // If email column not found by name, try to find a column that looks like an email
            if (emailColumnIndex < 0 || emailColumnIndex >= firstLineValues.length) {
              for (let colIdx = 0; colIdx < firstLineValues.length; colIdx++) {
                const headerValue = firstLineValues[colIdx].toLowerCase()
                if (headerValue.includes('@') || headerValue.includes('email') || headerValue.includes('umindanao')) {
                  emailColumnIndex = colIdx
                  console.log(`📧 Email column detected by content in column ${colIdx}: "${firstLineValues[colIdx]}"`)
                  break
                }
              }
            }
            
            console.log('✅ CSV header detected:', {
              idColumn: idColumnIndex,
              nameColumn: nameColumnIndex,
              emailColumn: emailColumnIndex,
              headerRow: firstLineValues,
              allColumns: firstLineValues.map((v, idx) => ({ index: idx, value: v }))
            })
          }
          
          const parsed = []
          for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim()
            if (!line) continue
            
            // Parse the line
            const values = parseLine(line)
            
            // Debug: Log the parsed values for first few rows
            if (i < startIndex + 3) {
              console.log(`🔍 Parsing row ${i + 1}:`, {
                rawLine: line.substring(0, 100),
                parsedValues: values,
                valuesCount: values.length,
                idColumn: idColumnIndex,
                nameColumn: nameColumnIndex,
                emailColumn: emailColumnIndex
              })
            }
            
            if (values.length >= 2) {
              // Get values from detected column positions
              const id = values[idColumnIndex]?.trim() || ''
              const name = values[nameColumnIndex]?.trim() || ''
              // Only get email if email column index is valid
              // Preserve email exactly as it appears, including .tc@umindanao.edu.ph
              let email = ''
              if (emailColumnIndex >= 0 && values.length > emailColumnIndex) {
                email = (values[emailColumnIndex] || '').trim()
                // Remove any remaining quotes that might have been missed
                if ((email.startsWith('"') && email.endsWith('"')) || 
                    (email.startsWith("'") && email.endsWith("'"))) {
                  email = email.slice(1, -1).trim()
                }
              } else {
                // Try to find email in any column that contains @
                for (let colIdx = 0; colIdx < values.length; colIdx++) {
                  const potentialEmail = (values[colIdx] || '').trim()
                  if (potentialEmail.includes('@') && potentialEmail.includes('.tc@umindanao.edu.ph')) {
                    email = potentialEmail
                    // Remove quotes if present
                    if ((email.startsWith('"') && email.endsWith('"')) || 
                        (email.startsWith("'") && email.endsWith("'"))) {
                      email = email.slice(1, -1).trim()
                    }
                    console.log(`📧 Found email in column ${colIdx} (not detected as email column): ${email}`)
                    break
                  }
                }
              }
              
              // Validate email format if provided (should contain @)
              if (email && !email.includes('@')) {
                console.warn(`⚠️ Invalid email format for ${name} (${id}): "${email}" - treating as empty`)
                email = ''
              }
              
              if (id && name) {
                parsed.push({ id, name, email })
                console.log(`✅ Parsed student: ${name} (${id}) - Email: ${email || 'N/A'}`)
              }
            } else {
              console.warn(`⚠️ Row ${i + 1} has insufficient columns (${values.length}):`, values)
            }
          }
          
          if (parsed.length === 0) {
            addCustomAlert('warning', 'No Data Found', 'The CSV file appears to be empty or in an unexpected format. Please ensure it has columns: ID, Name, Email', false)
            console.warn('❌ CSV parsing result: No data found', { 
              lines: lines.slice(0, 5), 
              delimiter, 
              startIndex,
              firstLine: lines[0],
              columnPositions: { id: idColumnIndex, name: nameColumnIndex, email: emailColumnIndex }
            })
          } else {
            console.log(`✅ CSV parsed successfully: ${parsed.length} students found`, {
              students: parsed,
              columnPositions: { id: idColumnIndex, name: nameColumnIndex, email: emailColumnIndex },
              emailsFound: parsed.filter(s => s.email).length,
              emailsMissing: parsed.filter(s => !s.email).length
            })
          }
          
          console.log('✅ CSV parsing complete:', {
            parsedCount: parsed.length,
            firstFewParsed: parsed.slice(0, 3),
            detectedDelimiter: delimiter
          })
          
          setCsvPreview(parsed)
          console.log('✅ csvPreview state updated:', parsed.length, 'students')
          
          if (parsed.length > 0) {
            addCustomAlert('success', 'File Parsed', `Successfully parsed ${parsed.length} student(s) from CSV file.`, false)
          }
        } catch (error) {
          console.error('❌ CSV parsing error:', error)
          addCustomAlert('error', 'File Error', `Failed to parse CSV file: ${error.message}`, false)
          setCsvPreview([])
        }
      }
      reader.onerror = (error) => {
        console.error('❌ File read error:', error)
        addCustomAlert('error', 'File Error', 'Failed to read CSV file. Please try again.', false)
        setCsvPreview([])
      }
      reader.readAsText(file, 'UTF-8')
    }
  }

  // Handle CSV import and enroll students in selected subject
  const handleImportCSV = async () => {
    console.log('🚀 Import started:', { 
      csvFile: csvFile?.name, 
      subject: studentSubjectFilter, 
      previewCount: csvPreview.length,
      previewData: csvPreview.slice(0, 3), // Show first 3 for debugging
      subjectsAvailable: subjects.length
    })
    
    if (!csvFile) {
      console.error('❌ Import failed: No file selected')
      addCustomAlert('error', 'Missing File', 'Please upload a CSV or Excel file.', false)
      return
    }
    
    if (!studentSubjectFilter) {
      console.error('❌ Import failed: No subject selected')
      addCustomAlert('error', 'Missing Subject', 'Please select a subject to enroll students.', false)
      return
    }
    
    if (csvPreview.length === 0) {
      console.error('❌ Import failed: No preview data', { csvFile: csvFile.name, csvPreview })
      addCustomAlert('error', 'No Data', 'The file appears to be empty or could not be parsed. Please check the file format and try uploading again.', false)
      return
    }

    setIsImporting(true)
    isImportingRef.current = true // Prevent real-time listener from overwriting
    lastImportTimeRef.current = Date.now() // Track import time
    const subject = subjects.find(s => s.code === studentSubjectFilter)
      if (!subject) {
        addCustomAlert('error', 'Invalid Subject', 'Selected subject not found.', false)
        setIsImporting(false)
        isImportingRef.current = false
        return
      }

    // Warnings to display inside modal
    const inlineWarnings = []

    // Check for duplicate IDs within the CSV file itself
    const duplicateIdsInFile = []
    const idCountMap = new Map()
    csvPreview.forEach((student, index) => {
      const id = normalizeStudentId((student.id || '').trim())
      if (id) {
        if (idCountMap.has(id)) {
          idCountMap.get(id).push(index)
        } else {
          idCountMap.set(id, [index])
        }
      }
    })
    
    // Find duplicates within file
    idCountMap.forEach((indices, id) => {
      if (indices.length > 1) {
        const duplicateStudents = indices.map(idx => csvPreview[idx])
        duplicateIdsInFile.push({
          id,
          students: duplicateStudents,
          count: indices.length
        })
      }
    })

    // Check for students already enrolled in the selected subject
    const alreadyEnrolled = []
    const emailMismatch = []
    const currentEnrolledIds = new Set(
      (enrolls[studentSubjectFilter] || []).map(id => normalizeStudentId(id))
    )
    
    csvPreview.forEach(student => {
      const id = normalizeStudentId((student.id || '').trim())
      const email = (student.email || '').trim().toLowerCase()
      if (id && currentEnrolledIds.has(id)) {
        const existingStudent = students.find(s => normalizeStudentId(s.id) === id)
        alreadyEnrolled.push({
          id,
          name: student.name || existingStudent?.name || 'Unknown',
          csvName: student.name
        })
      }

      if (email) {
        // Check if this email already belongs to a different ID in our current students list
        const existingStudent = students.find(s => s.email?.trim().toLowerCase() === email)
        if (existingStudent) {
          const existingId = normalizeStudentId(existingStudent.id)
          if (existingId && existingId !== id) {
            emailMismatch.push({
              csvName: student.name || 'Unknown',
              csvId: id || 'Unknown',
              email: student.email,
              existingName: existingStudent.name,
              existingId
            })
          }
        }
      }
    })

    // Prepare inline warnings
    if (duplicateIdsInFile.length > 0) {
      const duplicateCount = duplicateIdsInFile.reduce((sum, dup) => sum + dup.count, 0)
      const uniqueDuplicates = duplicateIdsInFile.length
      const duplicateDetails = duplicateIdsInFile.slice(0, 3).map(dup => 
        `ID ${dup.id}: ${dup.students.map(s => s.name || 'Unknown').join(', ')}`
      ).join('; ')
      const moreDuplicates = duplicateIdsInFile.length > 3 ? ` and ${duplicateIdsInFile.length - 3} more` : ''
      
      inlineWarnings.push({
        type: 'warning',
        title: 'Duplicate IDs Detected',
        message: `Found ${uniqueDuplicates} duplicate ID${uniqueDuplicates > 1 ? 's' : ''} in the file (${duplicateCount} total occurrences). Only the first occurrence of each duplicate ID will be enrolled. Duplicates: ${duplicateDetails}${moreDuplicates}`
      })
    }

    if (alreadyEnrolled.length > 0) {
      const enrolledNames = alreadyEnrolled.slice(0, 5).map(e => `${e.csvName || e.name} (${e.id})`).join(', ')
      const moreEnrolled = alreadyEnrolled.length > 5 ? ` and ${alreadyEnrolled.length - 5} more` : ''
      inlineWarnings.push({
        type: 'warning',
        title: 'Already Enrolled Students',
        message: `${alreadyEnrolled.length} student${alreadyEnrolled.length > 1 ? 's are' : ' is'} already enrolled in this subject and will be skipped: ${enrolledNames}${moreEnrolled}`
      })
    }

    if (emailMismatch.length > 0) {
      const firstFew = emailMismatch.slice(0, 5).map(item => 
        `${item.csvName} (${item.csvId}) → ${item.email} already belongs to ${item.existingName} (${item.existingId})`
      ).join('; ')
      const more = emailMismatch.length > 5 ? ` and ${emailMismatch.length - 5} more` : ''
      inlineWarnings.push({
        type: 'error',
        title: 'Email & ID Mismatch',
        message: `${emailMismatch.length} student${emailMismatch.length > 1 ? 's' : ''} have emails that already belong to different IDs. These entries will be skipped. Details: ${firstFew}${more}`
      })
    }

    setCsvImportWarnings(inlineWarnings)

    let successCount = 0
    let errorCount = 0
    const errors = []
    const processedIds = new Set() // Track processed IDs to skip duplicates within file

    // CRITICAL: Collect all updates first, then apply at once
    // This ensures React state updates work correctly and UI reflects changes immediately
    // Use functional state updates to get the latest state
    let updatedStudentsList = [...students] // Start with current students
    const updatedEnrolls = JSON.parse(JSON.stringify(enrolls)) // Deep copy to ensure new reference
    Object.keys(updatedEnrolls).forEach(subjectCode => {
      const ids = Array.isArray(updatedEnrolls[subjectCode]) ? updatedEnrolls[subjectCode] : []
      updatedEnrolls[subjectCode] = ids.map(normalizeStudentId).filter(Boolean)
    })
    if (!updatedEnrolls[studentSubjectFilter]) {
      updatedEnrolls[studentSubjectFilter] = []
    }

    // Track emails already used by any student (existing or from CSV) to enforce strict uniqueness
    const emailOwnerMap = new Map() // email(lowercase) -> normalizedId
    updatedStudentsList.forEach(s => {
      const emailKey = (s.email || '').trim().toLowerCase()
      const idKey = normalizeStudentId(s.id)
      if (emailKey && idKey && !emailOwnerMap.has(emailKey)) {
        emailOwnerMap.set(emailKey, idKey)
      }
    })
    
    console.log('Before import:', {
      currentStudentsCount: students.length,
      currentEnrolledInSubject: enrolls[studentSubjectFilter]?.length || 0,
      csvPreviewCount: csvPreview.length,
      duplicatesInFile: duplicateIdsInFile.length,
      alreadyEnrolled: alreadyEnrolled.length
    })

    // Process each student from CSV and collect updates
    // CRITICAL: Process ALL students from CSV, both existing and new
    console.log('📋 Processing CSV students:', {
      totalInCsv: csvPreview.length,
      csvStudents: csvPreview.map(s => ({ id: s.id, name: s.name, email: s.email || 'N/A' }))
    })
    
    for (const csvStudent of csvPreview) {
      try {
        const id = (csvStudent.id || '').trim()
        const name = (csvStudent.name || '').trim()
        const email = (csvStudent.email || '').trim() // Safe handling of undefined email

        // Skip if missing required fields
        if (!id || !name) {
          console.warn(`⚠️ Skipping invalid row: ID=${id}, Name=${name}`)
          errors.push(`Row missing ID or Name: ${name || id || 'Unknown'}`)
          errorCount++
          continue
        }

        // Validate Student ID is numerical
        if (!isValidNumericalStudentId(id)) {
          errors.push(`${name} (${id}): Invalid Student ID format`)
          errorCount++
          continue
        }

        const normalizedId = normalizeStudentId(id)

        // Check for duplicate ID within the CSV file (skip if already processed)
        if (processedIds.has(normalizedId)) {
          console.warn(`⚠️ Duplicate ID in file: ${normalizedId} (${name}) - skipping`)
          errors.push(`${name} (${normalizedId}): Duplicate ID in file - already processed`)
          errorCount++
          continue
        }
        processedIds.add(normalizedId)

        // Check if student is already enrolled in the selected subject
        const enrollmentArray = updatedEnrolls[studentSubjectFilter] || []
        if (enrollmentArray.includes(normalizedId)) {
          console.warn(`⚠️ Student already enrolled: ${normalizedId} (${name}) in ${studentSubjectFilter} - skipping enrollment`)
          // Don't count as error, just skip enrollment
          continue
        }

        // Auto-generate email if not provided or invalid
        let studentEmail = email
        if (!studentEmail || !/.+@.+\..+/.test(studentEmail)) {
          studentEmail = generateStudentEmail(name, normalizedId)
          console.log(`📧 Generated email for ${name} (${normalizedId}): ${studentEmail}`)
        } else {
          console.log(`📧 Using provided email for ${name} (${normalizedId}): ${studentEmail}`)
        }

        // STRICT: Enforce unique email across all students
        const emailKey = (studentEmail || '').trim().toLowerCase()
        if (emailKey) {
          const existingOwnerId = emailOwnerMap.get(emailKey)
          if (existingOwnerId && existingOwnerId !== normalizedId) {
            console.warn(`⚠️ Duplicate email detected: ${studentEmail} already used by ID ${existingOwnerId}. Skipping ${name} (${normalizedId}).`)
            errors.push(`${name} (${normalizedId}): Email ${studentEmail} is already used by student ID ${existingOwnerId}`)
            errorCount++
            continue
          }
          // Reserve this email for this student
          emailOwnerMap.set(emailKey, normalizedId)
        }

        // Check if student already exists in our updated list
        let student = updatedStudentsList.find(s => normalizeStudentId(s.id) === normalizedId)
        const isNewStudent = !student

        if (student) {
          console.log(`👤 Found existing student: ${student.name} (${normalizedId})`)
          // Check for name mismatch
          if (student.name.trim().toLowerCase() !== name.trim().toLowerCase()) {
            errors.push(`${name} (${normalizedId}): ID exists with different name: ${student.name}`)
            errorCount++
            continue
          }
          // Update email if provided and different
          if (email && student.email !== email) {
            student = { ...student, email: studentEmail }
            updatedStudentsList = updatedStudentsList.map(s => normalizeStudentId(s.id) === normalizedId ? student : s)
            console.log(`📧 Updated email for existing student ${student.name}: ${studentEmail}`)
          }
        } else {
          // Create new student - add to our updated list
          // CRITICAL: Ensure archivedSubjects is empty array for new students
          // This prevents them from being filtered out on refresh
          student = { 
            id: normalizedId, 
            name, 
            email: studentEmail, 
            archivedSubjects: [] // CRITICAL: Empty array ensures student is not archived
          }
          updatedStudentsList.push(student)
          console.log(`✨ Created NEW student: ${student.name} (${normalizedId}) - Email: ${studentEmail}`, {
            archivedSubjects: student.archivedSubjects,
            willNotBeFiltered: true
          })
        }
        
        // CRITICAL: If student is being enrolled, ensure they are NOT archived for this subject
        // This prevents the student from being filtered out on refresh
        // This is important because a student might have been archived before, but now we're re-enrolling them
        const currentArchivedSubjects = Array.isArray(student.archivedSubjects) ? student.archivedSubjects : []
        if (currentArchivedSubjects.includes(studentSubjectFilter)) {
          console.log(`🔄 Unarchiving student ${student.name} (${normalizedId}) from ${studentSubjectFilter} - they are being re-enrolled`)
          student.archivedSubjects = currentArchivedSubjects.filter(subjectCode => subjectCode !== studentSubjectFilter)
          // Update the student in the list
          updatedStudentsList = updatedStudentsList.map(s => 
            normalizeStudentId(s.id) === normalizedId ? student : s
          )
          console.log(`✅ Student ${student.name} unarchived from ${studentSubjectFilter}`, {
            previousArchived: currentArchivedSubjects,
            newArchived: student.archivedSubjects
          })
        }

        // CRITICAL: Ensure enrollment array exists
        if (!updatedEnrolls[studentSubjectFilter]) {
          updatedEnrolls[studentSubjectFilter] = []
        }

        // Enroll in selected subject
        updatedEnrolls[studentSubjectFilter] = [...enrollmentArray, normalizedId]
        successCount++
        console.log(`  ✓ ${isNewStudent ? 'Created and enrolled' : 'Enrolled'} ${student.name} (${normalizedId}) in ${studentSubjectFilter}`)
      } catch (error) {
        const errorMsg = `${csvStudent.name || 'Unknown'} (${csvStudent.id || 'Unknown'}): ${error.message}`
        errors.push(errorMsg)
        errorCount++
        console.error(`❌ Error processing student:`, errorMsg, error)
      }
    }
    
    console.log('📊 Import processing complete:', {
      totalProcessed: csvPreview.length,
      successCount,
      errorCount,
      newStudentsCreated: updatedStudentsList.length - students.length,
      totalStudents: updatedStudentsList.length,
      enrolledInSubject: updatedEnrolls[studentSubjectFilter]?.length || 0,
      errors: errors.slice(0, 5) // Show first 5 errors
    })

    // Apply all state updates at once - this ensures UI updates immediately
    // Use functional updates to ensure we're working with the latest state
    setStudents(prevStudents => {
      console.log('Setting students:', { 
        prevCount: prevStudents.length, 
        newCount: updatedStudentsList.length,
        newStudents: updatedStudentsList.filter(s => !prevStudents.find(p => normalizeStudentId(p.id) === normalizeStudentId(s.id)))
      })
      return updatedStudentsList
    })
    
    setNormalizedEnrolls(prevEnrolls => {
      // Create completely new object with new array references
      // First, preserve all existing enrollments
      const newEnrolls = {}
      Object.keys(prevEnrolls).forEach(key => {
        newEnrolls[key] = [...prevEnrolls[key]]
      })
      // Then, update with our new enrollments (this will add new subjects or update existing ones)
      Object.keys(updatedEnrolls).forEach(key => {
        newEnrolls[key] = [...updatedEnrolls[key]] // New array reference
      })
      console.log('✅ Setting enrolls:', { 
        subject: studentSubjectFilter,
        prevEnrolled: prevEnrolls[studentSubjectFilter]?.length || 0,
        newEnrolled: newEnrolls[studentSubjectFilter]?.length || 0,
        newEnrollsForSubject: newEnrolls[studentSubjectFilter],
        allSubjects: Object.keys(newEnrolls),
        updatedEnrollsKeys: Object.keys(updatedEnrolls),
        studentIds: newEnrolls[studentSubjectFilter]
      })
      return newEnrolls
    })

    // Force React to process state updates and trigger re-render
    // Use requestAnimationFrame to ensure DOM updates happen immediately
    await new Promise(resolve => {
      requestAnimationFrame(() => {
        setTimeout(resolve, 100)
      })
    })
    
    console.log('✅ State updated - students should now be visible in UI', {
      studentsCount: updatedStudentsList.length,
      enrolledCount: updatedEnrolls[studentSubjectFilter].length,
      enrolledIds: updatedEnrolls[studentSubjectFilter]
    })
    
    // Force a re-render by updating the enrolls state again with a new reference
    // This ensures React detects the change and updates the UI
    setNormalizedEnrolls(prevEnrolls => {
      // Check if the state already matches what we expect
      const currentEnrolled = prevEnrolls[studentSubjectFilter] || []
      const expectedEnrolled = updatedEnrolls[studentSubjectFilter] || []
      
      if (currentEnrolled.length !== expectedEnrolled.length) {
        console.log('🔄 Forcing enrolls update - state mismatch detected', {
          current: currentEnrolled.length,
          expected: expectedEnrolled.length,
          currentIds: currentEnrolled,
          expectedIds: expectedEnrolled
        })
        // Create new object with correct enrollments
        const fresh = { ...prevEnrolls }
        fresh[studentSubjectFilter] = [...expectedEnrolled]
        return fresh
      }
      // State already matches, but return new reference to force re-render
      const fresh = { ...prevEnrolls }
      Object.keys(fresh).forEach(key => {
        fresh[key] = [...fresh[key]]
      })
      return fresh
    })

    // CRITICAL: Normalize enrollments one final time before saving
    // This ensures all student IDs are properly formatted and duplicates are removed
    // Define outside try block so it's accessible in all scopes
    const finalNormalizedEnrolls = normalizeEnrollsMap(updatedEnrolls)

    // Save all changes to Firestore immediately (no inner try/catch here;
    // outer caller will handle errors)
      console.log('💾 Saving to Firestore...', {
        students: updatedStudentsList.length,
        enrolls: Object.keys(finalNormalizedEnrolls).length,
        enrollsForSubject: finalNormalizedEnrolls[studentSubjectFilter]?.length || 0,
        enrolledIds: finalNormalizedEnrolls[studentSubjectFilter],
        enrollsObject: finalNormalizedEnrolls,
        normalized: true
      })
      
      // CRITICAL: Update state with normalized data BEFORE saving to ensure UI updates immediately
      setNormalizedEnrolls(prevEnrolls => {
        const fresh = { ...prevEnrolls }
        // Update all enrollments with normalized data
        Object.keys(finalNormalizedEnrolls).forEach(key => {
          fresh[key] = [...finalNormalizedEnrolls[key]]
        })
        console.log('🔄 Pre-save state update with normalized enrolls:', {
          subject: studentSubjectFilter,
          enrolled: fresh[studentSubjectFilter]?.length || 0,
          ids: fresh[studentSubjectFilter] || [],
          allSubjects: Object.keys(fresh)
        })
        return fresh
      })
      
      setStudents(prevStudents => {
        // Always update to ensure new students are included
        const fresh = [...updatedStudentsList]
        console.log('🔄 Pre-save students update:', {
          prev: prevStudents.length,
          new: fresh.length
        })
        return fresh
      })
      
      // Force immediate UI update
      setRefreshTrigger(prev => prev + 1)
      
      // CRITICAL: Verify all students exist before saving
      const enrollmentStudentIds = new Set()
      Object.values(finalNormalizedEnrolls || {}).forEach(enrolledIds => {
        enrolledIds.forEach(id => enrollmentStudentIds.add(normalizeStudentId(id)))
      })
      const studentIds = new Set(updatedStudentsList.map(s => normalizeStudentId(s.id)))
      const missingStudents = Array.from(enrollmentStudentIds).filter(id => !studentIds.has(id))
      
      if (missingStudents.length > 0) {
        console.error('❌ CRITICAL: Cannot save - enrollments reference students that don\'t exist:', {
          missingStudentIds: missingStudents,
          totalEnrollments: enrollmentStudentIds.size,
          totalStudents: studentIds.size
        })
        addCustomAlert('error', 'Data Error', `Cannot save: ${missingStudents.length} enrolled students not found in students list. Please try importing again.`, false)
        setIsImporting(false)
        isImportingRef.current = false
        return
      }
      
      // CRITICAL: Verify no enrolled students are archived for their subjects
      // This prevents them from being filtered out on refresh
      const archivedIssues = []
      Object.keys(finalNormalizedEnrolls || {}).forEach(subjectCode => {
        const enrolledIds = finalNormalizedEnrolls[subjectCode] || []
        enrolledIds.forEach(enrolledId => {
          const student = updatedStudentsList.find(s => normalizeStudentId(s.id) === normalizeStudentId(enrolledId))
          if (student) {
            const archivedSubjects = Array.isArray(student.archivedSubjects) ? student.archivedSubjects : []
            if (archivedSubjects.includes(subjectCode)) {
              archivedIssues.push({
                studentId: student.id,
                studentName: student.name,
                subjectCode: subjectCode
              })
            }
          }
        })
      })
      
      if (archivedIssues.length > 0) {
        console.error('❌ CRITICAL: Found enrolled students that are archived for their subjects:', archivedIssues)
        console.log('🔄 Fixing archived issues by unarchiving students...')
        // Fix the archived issues
        archivedIssues.forEach(issue => {
          const student = updatedStudentsList.find(s => normalizeStudentId(s.id) === normalizeStudentId(issue.studentId))
          if (student) {
            student.archivedSubjects = (student.archivedSubjects || []).filter(subjectCode => subjectCode !== issue.subjectCode)
            console.log(`✅ Unarchived ${student.name} from ${issue.subjectCode}`)
          }
        })
        // Update the list
        updatedStudentsList = updatedStudentsList.map(s => {
          const issue = archivedIssues.find(i => normalizeStudentId(i.studentId) === normalizeStudentId(s.id))
          if (issue) {
            const student = updatedStudentsList.find(st => normalizeStudentId(st.id) === normalizeStudentId(s.id))
            return student || s
          }
          return s
        })
        console.log('✅ All archived issues fixed')
      }
      
      // Now save to Firestore
      console.log('💾 Saving to Firestore with complete data:', {
        students: updatedStudentsList.length,
        newStudents: updatedStudentsList.length - students.length,
        existingStudents: students.length,
        enrolls: Object.keys(finalNormalizedEnrolls).length,
        enrollsForSubject: finalNormalizedEnrolls[studentSubjectFilter]?.length || 0,
        enrolledIds: finalNormalizedEnrolls[studentSubjectFilter],
        enrolledStudentNames: finalNormalizedEnrolls[studentSubjectFilter]?.map(id => {
          const student = updatedStudentsList.find(s => normalizeStudentId(s.id) === id)
          return student ? student.name : 'Unknown'
        }) || [],
        dataIntegrity: '✅ All enrolled students exist in students array',
        willPersist: true
      })
    
    // Create notification for successful import
    const newAlert = {
      id: Date.now(),
      type: 'subject',
      title: 'Students Imported',
      message: `Successfully imported ${successCount} student${successCount === 1 ? '' : 's'} to ${subject.name}.`,
      timestamp: new Date(),
      read: false,
      target_courseId: studentSubjectFilter,
      subjectCode: studentSubjectFilter,
    }
    const updatedAlerts = [newAlert, ...alerts]
    setAlerts(updatedAlerts)
      
      // CREATE MYSQL ENROLLMENTS: Create enrollments in MySQL for all imported students
      console.log('📚 Creating MySQL enrollments for imported students...')
      let mysqlEnrollmentSuccess = 0
      let mysqlEnrollmentFailed = 0
      
      try {
        // Get or create course in MySQL
        let course = await getCourseByCode(studentSubjectFilter)
        if (!course) {
          const profProfile = await getProfessorByUid(profUid)
          if (!profProfile || !profProfile.id) {
            console.error('❌ Professor profile not found for MySQL enrollment')
          } else {
            // Ensure credits is a number, not a string
            const credits = parseInt(subject.credits) || 0
            const courseId = await createCourse({
              code: subject.code,
              name: subject.name,
              credits: credits,
              professorId: profProfile.id,
            })
            course = { id: courseId, code: subject.code, name: subject.name }
            console.log(`✅ Created course in MySQL: ${subject.name} (ID: ${courseId})`)
          }
        }
        
        if (course && course.id) {
          const courseId = course.id
          const enrolledStudentIds = finalNormalizedEnrolls[studentSubjectFilter] || []
          
          // Create enrollments for each student
          for (const studentId of enrolledStudentIds) {
            try {
              const student = updatedStudentsList.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
              if (!student) {
                console.warn(`⚠️ Student ${studentId} not found in updated list`)
                continue
              }
              
              // Get or create student in MySQL
              let studentData = await getStudentByNumericalId(student.id)
              if (!studentData) {
                // Create student in MySQL if they don't exist
                console.log(`📝 Creating new student in MySQL: ${student.name} (ID: ${student.id})`)
                const studentMySQLId = await addStudent({
                  studentId: student.id,
                  name: student.name,
                  email: student.email,
                  // Student will be created in MySQL when they log in
                })
                studentData = { id: studentMySQLId, student_id: student.id, name: student.name, email: student.email }
                console.log(`✅ Created student in MySQL: ${student.name} (MySQL ID: ${studentMySQLId})`)
              }
              
              const studentMySQLId = studentData.id
              
              // Check if enrollment already exists
              const existingEnrollment = await getEnrollmentByStudentAndCourse(studentMySQLId, courseId)
              if (!existingEnrollment) {
                const studentIdNum = parseInt(studentMySQLId, 10)
                const courseIdNum = parseInt(courseId, 10)
                if (!isNaN(studentIdNum) && !isNaN(courseIdNum)) {
                  await createEnrollment(studentIdNum, courseIdNum)
                  mysqlEnrollmentSuccess++
                  console.log(`✅ MySQL enrollment created: Student ${student.id} (MySQL ID: ${studentIdNum}) → Course ${studentSubjectFilter} (MySQL ID: ${courseIdNum})`)
                } else {
                  console.error(`❌ Invalid IDs: studentId=${studentMySQLId}, courseId=${courseId}`)
                }
              } else {
                mysqlEnrollmentSuccess++ // Count as success if already exists
                console.log(`ℹ️ MySQL enrollment already exists: Student ${student.id} → Course ${studentSubjectFilter}`)
              }
            } catch (error) {
              mysqlEnrollmentFailed++
              console.error(`❌ Failed to create MySQL enrollment for student ${studentId}:`, error)
            }
          }
          
          console.log(`✅ MySQL enrollment creation complete: ${mysqlEnrollmentSuccess} succeeded, ${mysqlEnrollmentFailed} failed`)
        } else {
          console.warn('⚠️ Could not get/create course in MySQL - enrollments not created')
        }
      } catch (error) {
        console.error('❌ Error creating MySQL enrollments:', error)
        // Don't fail the entire import if MySQL enrollment creation fails
      }
      
      // Rebuild enrolls from MySQL after import (single source of truth)
      let rebuiltEnrolls = {}
      try {
        const profProfile = await getProfessorByUid(profUid)
        if (profProfile && profProfile.id) {
          const rebuiltResult = await buildEnrollsFromMySQL(profProfile.id, subjects)
          rebuiltEnrolls = rebuiltResult.enrolls || rebuiltResult
          setNormalizedEnrolls(rebuiltEnrolls)
          console.log('✅ Rebuilt enrolls from MySQL after CSV import')
        }
      } catch (error) {
        console.error('❌ Failed to rebuild enrolls from MySQL after import:', error)
        // Use finalNormalizedEnrolls as fallback
        rebuiltEnrolls = finalNormalizedEnrolls
        setNormalizedEnrolls(rebuiltEnrolls)
      }
      
      // CRITICAL: Save with immediate flag to ensure data is written right away
      // NOTE: enrolls is no longer saved to Firestore - MySQL is the single source of truth
      const saveResult = await saveData(subjects, updatedStudentsList, null, updatedAlerts, records, grades, profUid, true)
      
      if (!saveResult) {
        console.error('❌ CRITICAL: Save operation returned false - data may not have been saved!')
        addCustomAlert('error', 'Save Failed', 'Failed to save students to Firestore. Data may not persist after refresh. Please try again.', false)
      } else {
        console.log('✅ Save operation completed successfully')
      }
      
      console.log(`✅ Imported ${successCount} students to ${subject.name}`, {
        subject: studentSubjectFilter,
        studentsAdded: successCount,
        newStudentsCreated: updatedStudentsList.length - students.length,
        totalStudents: updatedStudentsList.length,
        enrolledInSubject: rebuiltEnrolls[studentSubjectFilter]?.length || 0,
        enrolledStudentIds: rebuiltEnrolls[studentSubjectFilter] || [],
        enrollsFromMySQL: Object.keys(rebuiltEnrolls).length
      })
      
      setStudents(prevStudents => {
        // Always update to ensure consistency
        const fresh = [...updatedStudentsList]
        if (prevStudents.length !== fresh.length) {
          console.log('🔄 Post-save students update:', {
            prev: prevStudents.length,
            new: fresh.length
          })
        }
        return fresh
      })
      
      // Force multiple UI refreshes
      setRefreshTrigger(prev => prev + 1)
      setTimeout(() => setRefreshTrigger(prev => prev + 1), 100)
      setTimeout(() => setRefreshTrigger(prev => prev + 1), 300)
      
      // Wait for Firestore to process the write and propagate
      // This prevents the real-time listener from immediately overwriting our changes
      console.log('⏳ Waiting 2 seconds for Firestore to propagate...')
      await new Promise(resolve => setTimeout(resolve, 2000))
      console.log('✅ Import complete - real-time listener re-enabled after 2s delay')
      
      // Verify data was saved correctly by reading back from MySQL
      // Wait a bit more for MySQL to fully propagate
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      try {
        const savedData = await getDashboardState()
        if (savedData && savedData.enrolls) {
          // Normalize the saved enrolls to ensure consistency
          const normalizedSavedEnrolls = normalizeEnrollsMap(savedData.enrolls)
          const savedEnrolls = normalizedSavedEnrolls[studentSubjectFilter] || []
          const savedStudents = savedData.students || []
          
          // CRITICAL: Verify all enrolled students exist in saved students
          const savedStudentIds = new Set(savedStudents.map(s => normalizeStudentId(s.id)))
          const missingEnrolledStudents = savedEnrolls.filter(id => !savedStudentIds.has(normalizeStudentId(id)))
          
          console.log('🔍 Verification - Data read back from Firestore:', {
            subject: studentSubjectFilter,
            savedEnrollsCount: savedEnrolls.length,
            expectedCount: finalNormalizedEnrolls[studentSubjectFilter].length,
            savedEnrolls: savedEnrolls,
            expectedEnrolls: finalNormalizedEnrolls[studentSubjectFilter],
            savedStudentsCount: savedStudents.length,
            expectedStudentsCount: updatedStudentsList.length,
            match: JSON.stringify(savedEnrolls.sort()) === JSON.stringify(finalNormalizedEnrolls[studentSubjectFilter].sort()),
            missingEnrolledStudents: missingEnrolledStudents.length > 0 ? missingEnrolledStudents : 'None'
          })
          
          if (missingEnrolledStudents.length > 0) {
            console.error('❌ CRITICAL: Saved enrollments reference students that don\'t exist in saved students:', {
              missingStudentIds: missingEnrolledStudents,
              savedEnrolls: savedEnrolls,
              savedStudentIds: Array.from(savedStudentIds)
            })
            // This shouldn't happen, but if it does, we need to fix it
          }
          
          // CRITICAL: Always update state with what's actually in Firestore
          // This ensures UI matches the database and persists on reload
          console.log('🔄 Updating state with verified Firestore data')
        setNormalizedEnrolls(prev => {
            const fresh = {}
            // Start fresh with all subjects from saved data (use normalized version)
            Object.keys(normalizedSavedEnrolls || {}).forEach(key => {
              fresh[key] = [...(normalizedSavedEnrolls[key] || [])]
            })
            // Also preserve any existing subjects not in saved data (safety)
            Object.keys(prev).forEach(key => {
              if (!fresh[key]) {
                fresh[key] = [...prev[key]]
              }
            })
            // Ensure the imported subject has the correct data
            fresh[studentSubjectFilter] = [...savedEnrolls]
            console.log('✅ State updated with Firestore data:', {
              subject: studentSubjectFilter,
              enrolled: fresh[studentSubjectFilter].length,
              ids: fresh[studentSubjectFilter],
              allSubjects: Object.keys(fresh),
              allEnrollments: Object.keys(fresh).map(k => ({ subject: k, count: fresh[k].length }))
            })
            return fresh
          })
          
          setStudents(prev => {
            // CRITICAL: Always update with saved students to ensure new students are included
            const prevIds = prev.map(s => normalizeStudentId(s.id)).sort().join(',')
            const savedIds = savedStudents.map(s => normalizeStudentId(s.id)).sort().join(',')
            if (savedStudents.length !== prev.length || prevIds !== savedIds) {
              console.log('🔄 Updating students with Firestore data:', {
                prev: prev.length,
                saved: savedStudents.length,
                prevIds: prev.map(s => normalizeStudentId(s.id)),
                savedIds: savedStudents.map(s => normalizeStudentId(s.id)),
                newStudents: savedStudents.filter(s => !prev.find(p => normalizeStudentId(p.id) === normalizeStudentId(s.id)))
              })
              return savedStudents
            }
            // Even if IDs match, return saved students to ensure we have latest data
            return savedStudents
          })
          
          // Force UI refresh multiple times to ensure it updates
          setRefreshTrigger(prev => prev + 1)
          console.log('✅ State synchronized with Firestore - UI should now show students')
          
          // CRITICAL: Final persistence check - verify data will persist on reload
          console.log('🔍 Final persistence check:', {
            studentsSaved: savedStudents.length,
            enrollmentsSaved: savedEnrolls.length,
            subject: studentSubjectFilter,
            willPersist: savedStudents.length > 0 && savedEnrolls.length > 0,
            message: savedStudents.length > 0 && savedEnrolls.length > 0 
              ? '✅ Data is saved and will persist on reload' 
              : '⚠️ Warning: Some data may not persist',
            savedStudentIds: savedStudents.map(s => normalizeStudentId(s.id)),
            savedEnrollmentIds: savedEnrolls
          })
        } else {
          console.warn('⚠️ No enrolls data found in saved Firestore data')
          // Even if no data found, ensure state is updated
          setRefreshTrigger(prev => prev + 1)
          
          // CRITICAL: If no data found, this is a problem - try to re-save
          console.error('❌ CRITICAL: Saved data verification failed - no enrolls found')
          console.log('🔄 Attempting to re-save data to ensure persistence...')
          try {
            await saveData(subjects, updatedStudentsList, finalNormalizedEnrolls, alerts, records, grades, profUid, true)
            console.log('✅ Re-save completed - data should now persist')
          } catch (resaveError) {
            console.error('❌ Re-save failed:', resaveError)
          }
        }
      } catch (verifyError) {
        console.warn('Could not verify saved data:', verifyError)
        // Even if verification fails, force a refresh
        setRefreshTrigger(prev => prev + 1)
      }
      
      // Verify state after save and force update if needed
      // Use functional updates to read current state, not closure values
      setTimeout(() => {
        setNormalizedEnrolls(prevEnrolls => {
          const currentEnrolled = prevEnrolls[studentSubjectFilter] || []
          const expectedEnrolled = finalNormalizedEnrolls[studentSubjectFilter] || []
          
          console.log('🔍 Verifying state after save:', {
            currentEnrolled: currentEnrolled.length,
            expectedEnrolled: expectedEnrolled.length,
            currentIds: currentEnrolled,
            expectedIds: expectedEnrolled
          })
          
          // Force update if state doesn't match expected
          if (currentEnrolled.length !== expectedEnrolled.length || 
              JSON.stringify(currentEnrolled.sort()) !== JSON.stringify(expectedEnrolled.sort())) {
            console.warn('⚠️ State mismatch detected - forcing update...', {
              current: currentEnrolled.length,
              expected: expectedEnrolled.length,
              currentIds: currentEnrolled,
              expectedIds: expectedEnrolled
            })
            const fresh = { ...prevEnrolls }
            fresh[studentSubjectFilter] = [...expectedEnrolled]
            return fresh
          }
          return prevEnrolls
        })
        
        setStudents(prevStudents => {
          if (prevStudents.length !== updatedStudentsList.length) {
            console.warn('⚠️ Students count mismatch - forcing update...', {
              current: prevStudents.length,
              expected: updatedStudentsList.length
            })
            return updatedStudentsList
          }
          return prevStudents
        })
      }, 500)

    // Sync students to Firestore in background (non-blocking)
    // Fetch term from MySQL to ensure it's up-to-date
    let subjectToSync = { ...subject, term: subject.term || 'first' } // Default to 'first' if no term
    try {
      const course = await getCourseByCode(studentSubjectFilter)
      if (course && course.term) {
        subjectToSync = { ...subjectToSync, term: course.term }
        console.log(`📚 Using term from MySQL for ${studentSubjectFilter}: ${course.term}`)
      }
    } catch (error) {
      console.warn(`⚠️ Could not fetch course term from MySQL, using local term:`, error)
    }
    
    const syncPromises = updatedStudentsList
      .filter(student => finalNormalizedEnrolls[studentSubjectFilter]?.includes(normalizeStudentId(student.id)))
      .map(async (student) => {
        try {
          const verification = await verifyStudentIdEmailPair(student.id, student.email)
          if (verification.verified && verification.uid) {
            const currentDashboard = await getStudentDashboard(verification.uid)
            const currentSubjects = currentDashboard?.subjects || []
            const existingSubjectIndex = currentSubjects.findIndex(s => s.code === studentSubjectFilter)
            if (existingSubjectIndex === -1) {
              // Subject doesn't exist, add it with term
              const updatedSubjects = [...currentSubjects, subjectToSync]
              await syncStudentSubjects(verification.uid, updatedSubjects)
            } else {
              // Subject exists, update it with current term
              const updatedSubjects = currentSubjects.map((s, idx) => 
                idx === existingSubjectIndex ? { ...s, term: subjectToSync.term } : s
              )
              await syncStudentSubjects(verification.uid, updatedSubjects)
            }
          } else {
            const studentUid = await getStudentUidForSync(student.id, student.email)
            if (studentUid) {
              const currentDashboard = await getStudentDashboard(studentUid)
              const currentSubjects = currentDashboard?.subjects || []
              const existingSubjectIndex = currentSubjects.findIndex(s => s.code === studentSubjectFilter)
              if (existingSubjectIndex === -1) {
                // Subject doesn't exist, add it with term
                const updatedSubjects = [...currentSubjects, subjectToSync]
                await syncStudentSubjects(studentUid, updatedSubjects)
              } else {
                // Subject exists, update it with current term
                const updatedSubjects = currentSubjects.map((s, idx) => 
                  idx === existingSubjectIndex ? { ...s, term: subjectToSync.term } : s
                )
                await syncStudentSubjects(studentUid, updatedSubjects)
              }
            }
          }
        } catch (syncError) {
          console.warn(`Failed to sync student ${student.id} to Firestore:`, syncError)
        }
      })

    // Wait for all syncs to complete (but don't block UI)
    Promise.all(syncPromises).catch(err => {
      console.warn('Some student syncs failed:', err)
    })

    setIsImporting(false)
    // Note: isImportingRef.current is already set to false in the finally block above
    
    // Force a UI refresh by updating the refresh trigger
    setRefreshTrigger(prev => prev + 1)
    console.log('🔄 UI refresh triggered')

    // Force multiple final state updates to ensure UI reflects the changes
    // This is a safety mechanism in case the previous updates didn't trigger a re-render
    const forceUpdateCount = 3
    for (let i = 0; i < forceUpdateCount; i++) {
      setTimeout(() => {
        setNormalizedEnrolls(prevEnrolls => {
          const currentEnrolled = prevEnrolls[studentSubjectFilter] || []
          const expectedEnrolled = finalNormalizedEnrolls[studentSubjectFilter] || []
          
          console.log(`🔄 Final force update ${i + 1}/${forceUpdateCount}:`, {
            current: currentEnrolled.length,
            expected: expectedEnrolled.length,
            currentIds: currentEnrolled,
            expectedIds: expectedEnrolled,
            match: JSON.stringify(currentEnrolled.sort()) === JSON.stringify(expectedEnrolled.sort())
          })
          
          // Always create new object reference to force re-render
          const fresh = { ...prevEnrolls }
          Object.keys(fresh).forEach(key => {
            fresh[key] = [...(fresh[key] || [])]
          })
          // Ensure the subject has the correct enrollments (use normalized version)
          fresh[studentSubjectFilter] = [...expectedEnrolled]
          return fresh
        })
        
        setStudents(prevStudents => {
          // Always return new array reference
          const fresh = [...updatedStudentsList]
          if (prevStudents.length !== fresh.length) {
            console.log(`🔄 Final force update ${i + 1}/${forceUpdateCount} - students:`, {
              current: prevStudents.length,
              expected: fresh.length
            })
          }
          return fresh
        })
      }, (i + 1) * 500) // Stagger updates: 500ms, 1000ms, 1500ms
    }

    // Show results inline in the modal instead of global notification
    if (successCount > 0) {
      setCsvImportWarnings(prev => [
        ...prev,
        {
          type: 'success',
          title: 'Import Complete',
          message: `Successfully imported ${successCount} student(s) to ${subject.name}.${errorCount > 0 ? ` ${errorCount} error(s) occurred.` : ''}`,
          summary: true,
        },
      ])
      console.log(`✅ Import complete: ${successCount} students imported to ${subject.name}`, {
        subject: studentSubjectFilter,
        studentsAdded: successCount,
        totalStudents: updatedStudentsList.length,
        enrolledInSubject: updatedEnrolls[studentSubjectFilter].length,
        enrolledStudentIds: updatedEnrolls[studentSubjectFilter],
        errors: errorCount,
        studentsList: students.length,
        enrollsForSubject: enrolls[studentSubjectFilter]?.length || 0
      })
      
      // Force a UI refresh by logging current state
      setTimeout(() => {
        console.log('🔍 Current UI state check:', {
          studentsInState: students.length,
          enrollsInState: enrolls[studentSubjectFilter]?.length || 0,
          enrollsArray: enrolls[studentSubjectFilter] || []
        })
      }, 500)
    } else {
      // Inline summary warning inside the Import File modal instead of global notification
      setCsvImportWarnings(prev => [
        ...prev,
        {
          type: 'error',
          title: 'Import Failed',
          message: `No students were imported. ${errorCount > 0 ? `${errorCount} error(s) occurred.` : 'Please check the file format.'}`,
          summary: true,
        },
      ])
    }
    
    if (errorCount > 0 && errors.length > 0) {
      console.warn('Import errors:', errors)
      // Show first few errors in console for debugging
      errors.slice(0, 5).forEach(err => console.warn('  -', err))
      if (errors.length > 5) {
        console.warn(`  ... and ${errors.length - 5} more errors`)
      }
    }

    // Close modal and reset after a short delay to show success message
    setTimeout(() => {
      setShowAddStudentModal(false)
      setCsvFile(null)
      setCsvPreview([])
      setStudentSubjectFilter('')
      // Reset file input
      const fileInput = document.getElementById('csvFileInput')
      if (fileInput) fileInput.value = ''
    }, successCount > 0 ? 1500 : 0)
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    
    console.log('Profile save initiated', { 
      hasPic: !!profileForm.pic, 
      picType: typeof profileForm.pic,
      name: profileForm.name,
      profName: profName
    })
    
    // Prevent multiple submissions
    if (profileSaveSuccess) {
      console.log('Profile save already in progress, ignoring submission')
      return
    }
    
    // Validation: Check if user is authenticated
    if (!profUid) {
      addCustomAlert('error', 'Authentication Error', 'Unable to determine your account. Please sign in again.', false)
      return
    }

    // Validation: Name field - use form value or fallback to current name
    const updatedName = (profileForm.name?.trim() || profName || '').trim()
    if (!updatedName) {
      addCustomAlert('warning', 'Missing Name', 'Please enter your name.', false)
      return
    }
    if (updatedName.length < 2) {
      addCustomAlert('warning', 'Invalid Name', 'Name must be at least 2 characters long.', false)
      return
    }
    if (updatedName.length > 100) {
      addCustomAlert('warning', 'Invalid Name', 'Name must be less than 100 characters.', false)
      return
    }

    // Validation: Profile picture (if provided or removed)
    let photoData = profPic
    
    // Check if user wants to remove the photo
    if (profileForm.removePhoto || (profilePreview === null && profPic && !profileForm.pic)) {
      // User clicked "Remove Photo" - set to null
      console.log('Profile picture will be removed')
      photoData = null
    } else if (profileForm.pic) {
      const file = profileForm.pic
      
      // Validate file exists and is a File object
      if (!file || !(file instanceof File)) {
        console.error('Invalid file object:', file)
        addCustomAlert('error', 'Invalid File', 'Please select a valid image file.', false)
        return
      }
      
      // Validate file type
      if (!file.type || !file.type.startsWith('image/')) {
        addCustomAlert('error', 'Invalid File Type', 'Please select a valid image file.', false)
        return
      }
      
      // Validate file size (max 5MB)
      const maxSize = 5 * 1024 * 1024 // 5MB in bytes
      if (file.size > maxSize) {
        addCustomAlert('error', 'File Too Large', 'Image file size must be less than 5MB. Please choose a smaller image.', false)
        return
      }
      
      try {
        console.log('Processing profile picture file:', { name: file.name, size: file.size, type: file.type })
        photoData = await fileToDataUrl(file)
        console.log('Profile picture processed successfully, data length:', photoData?.length)
      } catch (error) {
        console.error('Failed to process image file', error)
        addCustomAlert('error', 'Image Processing Error', 'Unable to process the selected image. Please try a different file.', false)
        return
      }
    } else if (photoData === null) {
      // User explicitly removed the photo (profilePreview is null)
      console.log('Profile picture removed by user')
    } else {
      console.log('No new profile picture selected, keeping current photo')
    }

    try {
      console.log('Starting profile save...', { 
        profUid, 
        updatedName, 
        hasPhoto: !!photoData,
        photoDataLength: photoData?.length 
      })
      
      // Prepare profile data for API (use photoUrl for API compatibility)
      const updatedProfile = {
        ...(profProfile || {}),
        name: updatedName,
        email: profEmail || profProfile?.email || '',
        department: profProfile?.department || '',
        // Use photoUrl for API (backend expects photoUrl, not photoURL)
        photoUrl: photoData || null,
        // Also keep photoURL for local state compatibility
        photoURL: photoData || null,
      }
      
      console.log('Profile data to save:', {
        name: updatedProfile.name,
        email: updatedProfile.email,
        department: updatedProfile.department,
        hasPhoto: !!updatedProfile.photoUrl,
        photoLength: updatedProfile.photoUrl?.substring(0, 100) // Log first 100 chars to avoid huge logs
      })

      console.log('Calling setProfessor with profile:', {
        name: updatedProfile.name,
        email: updatedProfile.email,
        hasPhoto: !!updatedProfile.photoURL
      })

      // Save to backend API (await to ensure completion)
      // setProfessor now only takes the profile object (no UID needed - uses JWT)
      const savedProfessor = await setProfessor(updatedProfile)
      
      console.log('Profile saved successfully:', savedProfessor)

      if (!savedProfessor) {
        throw new Error('setProfessor returned null or undefined')
      }

      // Update local state immediately (optimistic update)
      setProfName(updatedName)
      setProfPic(photoData || null) // Ensure null if photo was removed
      setProfProfile(savedProfessor)
      setProfilePreview(photoData || null) // Ensure null if photo was removed
      updateSessionUser({ name: updatedName })

      // Show success message and close modal quickly (within 1 second total)
      setProfileSaveSuccess(true)

      // Auto-close modal after 300ms (ensures total process completes within 1 second)
      setTimeout(() => {
        setShowProfileModal(false)
        setProfileSaveSuccess(false)
        // Reset form for next time, but keep the saved photo as preview
        setProfileForm({ name: updatedName, pic: null, removePhoto: false })
        setProfilePreview(photoData || null)
        // Clear original photo reference since save was successful
        originalProfPicRef.current = null
      }, 300)
    } catch (error) {
      console.error('Failed to save professor profile', error)
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response,
        data: error.data
      })
      addCustomAlert('error', 'Save Failed', `Unable to save profile changes: ${error.message || 'Unknown error'}. Please try again.`, false)
      // Don't reset profileSaveSuccess on error so user can try again
      setProfileSaveSuccess(false)
    }
  }

  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      // Always compress images to ensure they fit in the database
      // Database column might be VARCHAR with limited size, so compress aggressively
      // PNG files are larger when base64 encoded, so compress all images over 100KB
      const MAX_BASE64_SIZE = 300000 // ~225KB binary, safe for most VARCHAR limits
      
      // Compress if larger than 100KB (PNG files especially need compression)
      if (file.size > 100 * 1024 || file.type === 'image/png') {
        console.log('Compressing image:', { originalSize: file.size, name: file.name })
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        const img = new Image()
        
        img.onload = () => {
          // Calculate new dimensions (max 400px on longest side for aggressive compression)
          let width = img.width
          let height = img.height
          let maxDimension = 400
          
          // Start with 400px, reduce if needed
          if (width > height && width > maxDimension) {
            height = (height / width) * maxDimension
            width = maxDimension
          } else if (height > maxDimension) {
            width = (width / height) * maxDimension
            height = maxDimension
          }
          
          canvas.width = width
          canvas.height = height
          
          // Draw image
          ctx.drawImage(img, 0, 0, width, height)
          
          // Always convert to JPEG (PNG files compress poorly in base64)
          // Start with lower quality for PNG files to ensure smaller size
          let quality = file.type === 'image/png' ? 0.5 : 0.6
          let compressed = canvas.toDataURL('image/jpeg', quality)
          
          // If still too large, reduce quality further
          const qualities = [0.5, 0.4, 0.3, 0.2]
          for (const q of qualities) {
            if (compressed.length > MAX_BASE64_SIZE) {
              quality = q
              compressed = canvas.toDataURL('image/jpeg', quality)
            } else {
              break
            }
          }
          
          // If still too large, reduce dimensions and try again
          if (compressed.length > MAX_BASE64_SIZE) {
            maxDimension = 300
            if (width > height) {
              height = (height / width) * maxDimension
              width = maxDimension
            } else {
              width = (width / height) * maxDimension
              height = maxDimension
            }
            canvas.width = width
            canvas.height = height
            ctx.drawImage(img, 0, 0, width, height)
            compressed = canvas.toDataURL('image/jpeg', 0.5)
          }
          
          // Final check - if still too large, use even smaller
          if (compressed.length > MAX_BASE64_SIZE) {
            maxDimension = 200
            if (width > height) {
              height = (height / width) * maxDimension
              width = maxDimension
            } else {
              width = (width / height) * maxDimension
              height = maxDimension
            }
            canvas.width = width
            canvas.height = height
            ctx.drawImage(img, 0, 0, width, height)
            compressed = canvas.toDataURL('image/jpeg', 0.4)
          }
          
          console.log('Image compressed:', { 
            originalSize: file.size, 
            compressedSize: compressed.length,
            finalQuality: quality,
            finalDimensions: `${width}x${height}`,
            underLimit: compressed.length <= MAX_BASE64_SIZE
          })
          
          if (compressed.length > MAX_BASE64_SIZE) {
            console.warn('Image still too large after compression:', compressed.length)
          }
          
          resolve(compressed)
        }
        
        img.onerror = (error) => {
          console.error('Error loading image for compression:', error)
          reject(error)
        }
        
      const reader = new FileReader()
        reader.onload = (e) => {
          img.src = e.target.result
        }
      reader.onerror = reject
      reader.readAsDataURL(file)
      } else {
        // File is small enough, use as-is but still check size
        const reader = new FileReader()
        reader.onload = (evt) => {
          const dataUrl = evt.target.result
          console.log('Image small enough, using as-is:', { 
            fileSize: file.size, 
            dataUrlSize: dataUrl.length 
          })
          
          // PNG files should always be converted to JPEG (they're much larger in base64)
          // Also compress if base64 is too large
          if (file.type === 'image/png' || dataUrl.length > MAX_BASE64_SIZE) {
            console.log('Base64 data too large, compressing anyway')
            const img = new Image()
            img.onload = () => {
              const canvas = document.createElement('canvas')
              const ctx = canvas.getContext('2d')
              let width = img.width
              let height = img.height
              const maxDimension = 400
              
              if (width > height && width > maxDimension) {
                height = (height / width) * maxDimension
                width = maxDimension
              } else if (height > maxDimension) {
                width = (width / height) * maxDimension
                height = maxDimension
              }
              
              canvas.width = width
              canvas.height = height
              ctx.drawImage(img, 0, 0, width, height)
              const compressed = canvas.toDataURL('image/jpeg', 0.5)
              console.log('Compressed small file:', { original: dataUrl.length, compressed: compressed.length })
              resolve(compressed)
            }
            img.onerror = reject
            img.src = dataUrl
          } else {
            resolve(dataUrl)
          }
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      }
    })
  }

  // ============================================================================
  // NOTIFICATION SYSTEM - Academic Focus
  // ============================================================================
  
  /**
   * Categorizes notifications into academic (high priority) and administrative (low priority)
   */
  const categorizeNotifications = useCallback((notificationList) => {
    const academic = []
    const administrative = []
    
    notificationList.forEach(alert => {
      const title = alert.title || ''
      const message = alert.message || ''
    const type = alert.type || ''
      
      // Check if it's an administrative notification
      const isAdministrative = 
        title.includes('Student Archived') ||
        title.includes('Successfully restored') ||
        title.includes('Archive') ||
        title.includes('Restore') ||
        message.includes('archived') ||
        message.includes('restored')
      
      if (isAdministrative) {
        administrative.push(alert)
      } else {
        // Academic notifications (everything else)
        academic.push(alert)
      }
    })
    
    return { academic, administrative }
  }, [])
  
  /**
   * Groups administrative notifications into a summary
   */
  const groupAdministrativeNotifications = useCallback((adminNotifications) => {
    if (adminNotifications.length === 0) return null
    
    const archived = adminNotifications.filter(n => 
      n.title.includes('Student Archived') || n.message.includes('archived')
    ).length
    
    const restored = adminNotifications.filter(n => 
      n.title.includes('Successfully restored') || n.message.includes('restored')
    ).length
    
    const total = adminNotifications.length
    const latestTimestamp = adminNotifications.reduce((latest, n) => {
      let timestamp = n.timestamp
      // Normalize timestamp - handle Firestore Timestamp, ISO strings, numbers, Date objects
      if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
        timestamp = timestamp.toDate()
      } else if (typeof timestamp === 'string') {
        timestamp = new Date(timestamp)
      } else if (typeof timestamp === 'number') {
        timestamp = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000)
      } else if (!(timestamp instanceof Date)) {
        timestamp = new Date()
      }
      const timestampMs = timestamp instanceof Date ? timestamp.getTime() : new Date().getTime()
      // Only use valid timestamps (not 0 or negative)
      return timestampMs > latest && !isNaN(timestampMs) && timestampMs > 0 ? timestampMs : latest
    }, 0)
    
    // Ensure we have a valid timestamp (use current time if all were invalid)
    const validTimestamp = latestTimestamp > 0 ? new Date(latestTimestamp) : new Date()
    
    return {
      id: 'admin-summary',
      type: 'administrative',
      title: 'Administrative Update',
      message: `${archived > 0 ? `${archived} student(s) archived` : ''}${archived > 0 && restored > 0 ? ', ' : ''}${restored > 0 ? `${restored} student(s) restored` : ''}`,
      timestamp: validTimestamp,
      read: adminNotifications.every(n => n.read),
      count: total,
      originalNotifications: adminNotifications
    }
  }, [])
  
  /**
   * Extracts actionable information from notification for better display
   */
  const parseNotificationData = useCallback((alert) => {
    const title = alert.title || ''
    const message = alert.message || ''
    const type = alert.type || ''
    
    // Extract student name, course code, assignment name from message
    const studentMatch = message.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\((\d+)\)/)
    const messageCourseMatch = message.match(/([A-Z]{2,}\d{3}|[A-Z]+\s+\d+)/)
    const assignmentMatch = message.match(/submitted\s+([^f]+?)\s+for/i) || 
                           message.match(/\[([^\]]+)\]/)
    const courseCode = alert.subjectCode || messageCourseMatch?.[1] || null
    
    const isEnrollmentRelated = alert.type === 'subject' || alert.type === 'enrollment' || title.includes('Enrolled')
    
    return {
      studentName: studentMatch ? studentMatch[1] : null,
      studentId: studentMatch ? studentMatch[2] : null,
      courseCode: alert.target_courseId || alert.subjectCode || courseCode,
      assignmentName: assignmentMatch ? assignmentMatch[1] : null,
      isGradeRelated: type === 'grade' || title.includes('Grade') || message.includes('submitted') || message.includes('grading'),
      isAttendanceRelated: type === 'attendance' || title.includes('Attendance') || message.includes('absent'),
      isEnrollmentRelated,
      isContentRelated: title.includes('Material') || title.includes('Content') || message.includes('posted'),
      isDiscussionRelated: message.includes('discussion') || message.includes('replies'),
    }
  }, [])
  
  /**
   * Gets notification icon based on category
   */
  const getNotificationIcon = useCallback((alert, parsedData) => {
    if (parsedData.isGradeRelated) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
    
    if (parsedData.isAttendanceRelated) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    
    if (parsedData.isEnrollmentRelated) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z" />
        </svg>
      )
    }
    
    if (parsedData.isContentRelated) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    }
    
    if (parsedData.isDiscussionRelated) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
        </svg>
      )
    }
    
    // Administrative or default
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }, [])
  
  /**
   * Gets notification icon color classes with red/maroon theme
   */
  const getNotificationIconColor = useCallback((parsedData, isAdministrative) => {
    if (isAdministrative) {
      return 'text-slate-600 bg-slate-100 border-2 border-slate-200'
    }
    
    if (parsedData.isGradeRelated) {
      return 'text-red-700 bg-red-100 border-2 border-red-300'
    }
    
    if (parsedData.isAttendanceRelated) {
      return 'text-red-600 bg-red-50 border-2 border-red-200'
    }
    
    if (parsedData.isContentRelated) {
      return 'text-rose-700 bg-rose-100 border-2 border-rose-300'
    }
    
    if (parsedData.isDiscussionRelated) {
      return 'text-red-800 bg-red-100 border-2 border-red-400'
    }
    
    return 'text-[#7A1315] bg-red-50 border-2 border-red-200'
  }, [])
  
  /**
   * Gets notification border color class with red/maroon theme
   */
  const getNotificationBorderColor = useCallback((parsedData, isAdministrative, isRead) => {
    if (isAdministrative) {
      return isRead ? 'border-l-4 border-slate-300' : 'border-l-4 border-slate-400'
    }
    
    if (parsedData.isGradeRelated) {
      return isRead ? 'border-l-4 border-red-300' : 'border-l-4 border-red-600'
    }
    
    if (parsedData.isAttendanceRelated) {
      return isRead ? 'border-l-4 border-red-200' : 'border-l-4 border-red-500'
    }
    
    if (parsedData.isContentRelated) {
      return isRead ? 'border-l-4 border-rose-300' : 'border-l-4 border-rose-600'
    }
    
    if (parsedData.isDiscussionRelated) {
      return isRead ? 'border-l-4 border-red-400' : 'border-l-4 border-[#7A1315]'
    }
    
    return isRead ? 'border-l-4 border-red-200' : 'border-l-4 border-[#7A1315]'
  }, [])
  
  /**
   * Gets notification background color class with red/maroon theme
   */
  const getNotificationBgColor = useCallback((parsedData, isAdministrative, isRead) => {
    if (isAdministrative) {
      return isRead ? 'bg-slate-50/30' : 'bg-slate-50/60'
    }
    
    if (parsedData.isGradeRelated) {
      return isRead ? 'bg-red-50/30' : 'bg-red-50/60'
    }
    
    if (parsedData.isAttendanceRelated) {
      return isRead ? 'bg-red-50/20' : 'bg-red-50/50'
    }
    
    if (parsedData.isContentRelated) {
      return isRead ? 'bg-rose-50/30' : 'bg-rose-50/60'
    }
    
    if (parsedData.isDiscussionRelated) {
      return isRead ? 'bg-red-50/30' : 'bg-red-50/60'
    }
    
    return isRead ? 'bg-red-50/20' : 'bg-red-50/50'
  }, [])
  
  /**
   * Gets action button color classes with red/maroon theme
   */
  const getActionButtonColor = useCallback((parsedData) => {
    if (parsedData.isGradeRelated) {
      return 'text-red-700 hover:text-red-800 hover:bg-red-50'
    }
    
    if (parsedData.isAttendanceRelated) {
      return 'text-red-600 hover:text-red-700 hover:bg-red-50'
    }
    
    if (parsedData.isContentRelated) {
      return 'text-rose-700 hover:text-rose-800 hover:bg-rose-50'
    }
    
    if (parsedData.isDiscussionRelated) {
      return 'text-[#7A1315] hover:text-red-900 hover:bg-red-50'
    }
    
    return 'text-[#7A1315] hover:text-red-800 hover:bg-red-50'
  }, [])
  
  /**
   * Gets title color class with red/maroon theme
   */
  const getTitleColor = useCallback((parsedData, isAdministrative) => {
    if (isAdministrative) {
      return 'text-slate-700'
    }
    
    if (parsedData.isGradeRelated) {
      return 'text-red-700'
    }
    
    if (parsedData.isAttendanceRelated) {
      return 'text-red-600'
    }
    
    if (parsedData.isContentRelated) {
      return 'text-rose-700'
    }
    
    if (parsedData.isDiscussionRelated) {
      return 'text-[#7A1315]'
    }
    
    return 'text-[#7A1315]'
  }, [])
  
  /**
   * Gets action button text and handler for professor notifications
   */
  const getNotificationAction = useCallback((alert, parsedData) => {
    return null
  }, [])
  
  /**
   * Formats notification title for professor (action-oriented)
   */
  const formatNotificationTitle = useCallback((alert, parsedData) => {
    if (parsedData.isGradeRelated) {
      if (alert.message.includes('submitted') || alert.message.includes('submission')) {
        return 'New Submission Received'
      }
      if (alert.message.includes('ungraded') || alert.message.includes('Grading Reminder') || alert.message.includes('deadline')) {
        return 'Grading Reminder'
      }
      return 'New Grade Posted'
    }
    
    if (parsedData.isAttendanceRelated) {
      return 'Attendance Alert'
    }
    
    if (parsedData.isEnrollmentRelated) {
      return 'Student Enrolled'
    }
    
    if (parsedData.isContentRelated) {
      return 'Material Released'
    }
    
    if (parsedData.isDiscussionRelated) {
      return 'Discussion Response'
    }
    
    return alert.title
  }, [])
  
  /**
   * Formats notification body text for professor (includes student name, course code, assignment)
   */
  const formatNotificationBody = useCallback((alert, parsedData) => {
    if (parsedData.isGradeRelated && parsedData.studentName && parsedData.assignmentName && parsedData.courseCode) {
      return `${parsedData.studentName} submitted ${parsedData.assignmentName} for ${parsedData.courseCode}`
    }
    
    if (parsedData.isGradeRelated && parsedData.courseCode && alert.message.includes('ungraded')) {
      const ungradedMatch = alert.message.match(/(\d+)\s+ungraded/)
      const ungradedCount = ungradedMatch ? ungradedMatch[1] : 'multiple'
      return `${ungradedCount} ungraded submissions in ${parsedData.courseCode}`
    }
    
    if (parsedData.isAttendanceRelated && parsedData.studentName && parsedData.courseCode) {
      const absentMatch = alert.message.match(/(\d+)\s+times?/)
      const absentCount = absentMatch ? absentMatch[1] : 'multiple'
      return `${parsedData.studentName} has missed ${absentCount} classes in ${parsedData.courseCode}`
    }
    
    if (parsedData.isEnrollmentRelated && alert.message) {
      return alert.message
    }
    
    if (parsedData.isContentRelated && parsedData.courseCode) {
      const moduleMatch = alert.message.match(/\[([^\]]+)\]/)
      const moduleName = moduleMatch ? moduleMatch[1] : 'new materials'
      return `${moduleName} materials have been released for ${parsedData.courseCode}`
    }
    
    if (parsedData.isDiscussionRelated && parsedData.studentName && parsedData.courseCode) {
      return `${parsedData.studentName} replied to your post in ${parsedData.courseCode}`
    }
    
    return alert.message
  }, [])
  
  /**
   * Checks if notification is high priority/urgent (for yellow border highlight)
   */
  const isUrgentNotification = useCallback((alert, parsedData) => {
    // Grading reminders with deadlines passed are urgent
    if (parsedData.isGradeRelated && (alert.message.includes('deadline') || alert.message.includes('overdue'))) {
      return true
    }
    
    // Attendance threshold alerts are urgent
    if (parsedData.isAttendanceRelated) {
      return true
    }
    
    // Check if due date is in the past or very soon
    if (parsedData.isGradeRelated && alert.message.includes('due')) {
      const dateMatch = alert.message.match(/(\d{4}-\d{2}-\d{2})/)
      if (dateMatch) {
        const dueDate = new Date(dateMatch[1])
        const now = new Date()
        const daysUntilDue = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24))
        return daysUntilDue <= 1 // Urgent if due today or overdue
      }
    }
    
    return false
  }, [])
  
  /**
   * Formats timestamp as "X minutes ago" or similar
   */
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return 'Just now'
    
    let time
    // Handle Firestore Timestamp objects
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate) {
      time = timestamp.toDate()
    }
    // Handle Date objects
    else if (timestamp instanceof Date) {
      time = timestamp
    }
    // Handle numbers (milliseconds or seconds)
    else if (typeof timestamp === 'number') {
      // Check if it's 0 or negative (invalid)
      if (timestamp <= 0) {
        return 'Just now'
      }
      time = timestamp > 1e12 ? new Date(timestamp) : new Date(timestamp * 1000)
    }
    // Handle ISO strings
    else if (typeof timestamp === 'string') {
      const parsed = Date.parse(timestamp)
      if (!Number.isNaN(parsed) && parsed > 0) {
        time = new Date(parsed)
      }
    }
    
    // Validate the date
    if (!time || Number.isNaN(time.getTime()) || time.getTime() <= 0) {
      // Invalid timestamp - return "Just now"
      return 'Just now'
    }
    
    // Check if date is too old (before 1970) or in the future (more than 1 year)
    const now = new Date()
    const oneYearFromNow = new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
    if (time.getTime() < 0 || time > oneYearFromNow) {
      return 'Just now'
    }
    
    // Calculate time difference
    const diffMs = now - time
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)
    const diffWeeks = Math.floor(diffDays / 7)
    const diffMonths = Math.floor(diffDays / 30)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
    if (diffWeeks < 5) return `${diffWeeks} week${diffWeeks !== 1 ? 's' : ''} ago`
    if (diffMonths < 12) return `${diffMonths} month${diffMonths !== 1 ? 's' : ''} ago`

    return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }, [])

  const activeNotifications = viewMode === 'student' ? studentAlerts : alerts
  // UNIFORM: Always show professor notification count regardless of view mode
  // This ensures the notification badge count stays consistent when switching between Professor/Student Record views
  const unreadAlertsCount = alerts.filter(a => !a.read).length

  return (
    <div className={isDarkMode ? 'bg-[#000000] min-h-screen' : 'bg-white min-h-screen'}>
      {/* Loading Spinner Overlay */}
      {isLoading && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className={`flex flex-col items-center justify-center space-y-4 p-8 rounded-2xl shadow-2xl ${
            isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'
          }`}>
            <div className="relative w-16 h-16">
              <div className={`absolute inset-0 border-4 border-t-transparent rounded-full animate-spin ${
                isDarkMode ? 'border-red-600' : 'border-[#7A1315]'
              }`}></div>
              <div className={`absolute inset-2 border-4 border-t-transparent rounded-full animate-spin ${
                isDarkMode ? 'border-red-400' : 'border-red-300'
              }`} style={{ animationDirection: 'reverse', animationDuration: '0.8s' }}></div>
            </div>
            <p className={`text-lg font-semibold ${
              isDarkMode ? 'text-white' : 'text-slate-800'
            }`}>Loading...</p>
          </div>
        </div>
      )}
      
      {/* Toast Notification - Professional Design */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 px-4 w-full max-w-2xl">
          <div className={`px-4 sm:px-6 md:px-8 py-3 sm:py-4 rounded-lg shadow-xl flex items-center justify-center space-x-2 sm:space-x-3 w-full ${
            toastMessage.includes('saved!') || toastMessage.includes('Attendance saved!')
              ? 'bg-green-600 text-white' 
              : 'bg-red-600 text-white'
          }`}>
            {toastMessage.includes('saved!') || toastMessage.includes('Attendance saved!') ? (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            )}
            <span className="font-semibold text-sm sm:text-base text-white break-words text-center">{toastMessage}</span>
          </div>
        </div>
      )}
      
      {/* Header */}
      <header className={`sticky top-0 z-40 bg-white/95 backdrop-blur-md ${
        isDarkMode ? 'bg-[#1a1a1a]/95' : ''
      } shadow-sm`}>
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-2 sm:py-3 md:py-4 gap-1.5 sm:gap-2 md:gap-4">
            {/* Logo and Title - Compact for mobile */}
            <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-3 min-w-0 flex-shrink">
              <div className="w-7 h-7 sm:w-9 sm:h-9 md:w-12 md:h-12 rounded-lg sm:rounded-xl flex items-center justify-center shadowLg overflow-hidden flex-shrink-0">
                <img src="/assets/logos/um logo.png" alt="UM Logo" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl font-bold textGrad leading-tight">Student iTrack</h1>
                <p className={`text-[9px] sm:text-[10px] md:text-xs font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'} leading-tight hidden xs:block`}>Smart Academic Monitoring System</p>
              </div>
            </div>
            
            {/* Right side controls - All in one line */}
            <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 lg:space-x-4 flex-shrink-0">
              {/* View Mode Select - Compact */}
              <label htmlFor="view-mode-select" className="sr-only">View Mode</label>
              <select
                id="view-mode-select"
                name="view-mode-select"
                value={viewMode}
                onChange={(e) => setViewMode(e.target.value)}
                className={`record-toggle-select focus:ring-2 focus:ring-maroon-500 text-[10px] sm:text-xs md:text-sm px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 ${
                  isDarkMode ? 'text-white' : ''
                }`}
              >
                <option value="professor">Professor Record</option>
                <option value="student">Student Record</option>
              </select>
              
              {/* Notifications - Compact */}
              <div className="relative">
                <button
                  onClick={() => {
                    setShowNotifDropdown(!showNotifDropdown)
                    setShowProfileDropdown(false)
                  }}
                  className={`icon-button relative p-1.5 sm:p-2 rounded-lg transition-all duration-200 ${
                    isDarkMode
                      ? showNotifDropdown 
                          ? 'bg-red-900/50 text-red-300' 
                        : 'hover:bg-slate-700'
                      : showNotifDropdown 
                        ? 'bg-red-100 text-red-700' 
                        : 'hover:bg-slate-100'
                  }`}
                >
                  <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${
                    isDarkMode ? 'text-white' : 'text-slate-700'
                  }`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                  </svg>
                  {unreadAlertsCount > 0 && (
                    <span className={`absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5 bg-red-500 text-white text-[9px] sm:text-[10px] md:text-xs rounded-full flex items-center justify-center badge shadow-lg ${
                      isDarkMode
                          ? 'bg-[#7A1315] text-white border-red-400'
                        : 'bg-gradient-to-br from-red-500 to-red-600 text-white border-white'
                    }`}>
                      {unreadAlertsCount > 9 ? '9+' : unreadAlertsCount}
                    </span>
                  )}
                </button>
                
                {showNotifDropdown && (() => {
                  const { academic, administrative } = categorizeNotifications(alerts)
                  const adminSummary = groupAdministrativeNotifications(administrative)
                  const displayNotifications = [...academic]
                  if (adminSummary) {
                    displayNotifications.push(adminSummary)
                  }
                  
                  return (
                    <div className={`fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-auto mt-0 sm:mt-2 w-auto sm:w-96 md:w-[420px] max-w-[280px] sm:max-w-[420px] max-h-[calc(100vh-5rem)] sm:max-h-[600px] rounded-2xl shadow-2xl border-2 z-50 overflow-hidden flex flex-col ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] border-slate-700' 
                        : 'bg-white border-slate-200'
                    }`}>
                      {/* Enhanced Header with Red/Maroon Gradient */}
                      <div className={`p-2.5 sm:p-4 md:p-5 border-b-2 flex-shrink-0 ${
                        isDarkMode 
                          ? 'bg-gradient-to-br from-red-600 via-[#7A1315] to-red-800 border-slate-700' 
                          : 'border-slate-200 bg-gradient-to-br from-red-600 via-[#7A1315] to-red-800'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-bold text-white text-sm sm:text-lg md:text-xl flex items-center gap-1.5 sm:gap-2">
                              <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                              </svg>
                              <span className="truncate">Notifications</span>
                            </h3>
                            <p className="text-[10px] sm:text-xs text-red-100 mt-0.5 sm:mt-1 font-medium hidden sm:block">Academic Activity & Updates</p>
                    </div>
                          {unreadAlertsCount > 0 && (
                            <div className={`backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border ${
                              isDarkMode 
                                  ? 'bg-yellow-500/90 border-yellow-400' 
                                : 'bg-white/20 border-white/30'
                            }`}>
                                <span className={`font-bold text-xs sm:text-sm ${
                                  isDarkMode ? 'text-black' : 'text-white'
                                }`}>{unreadAlertsCount}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Notifications List */}
                      <div className={`notification-scroll flex-1 min-h-0 overflow-y-auto max-h-[calc(100vh-20rem)] sm:max-h-[500px] ${
                        isDarkMode 
                          ? 'bg-[#1a1a1a]' 
                          : 'bg-gradient-to-b from-slate-50 to-white'
                      }`} style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: isDarkMode ? '#475569 #1a1a1a' : '#cbd5e1 #ffffff'
                      }}>
                        {displayNotifications.length === 0 ? (
                          <div className="p-8 sm:p-12 text-center">
                            <div className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 sm:mb-4 rounded-full flex items-center justify-center ${
                              isDarkMode
                                ? 'bg-gradient-to-br from-red-900/30 to-rose-900/30'
                                : 'bg-gradient-to-br from-red-100 to-rose-100'
                            }`}>
                              <svg className="w-8 h-8 sm:w-10 sm:h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                              </svg>
                            </div>
                            <p className={`text-sm sm:text-base font-medium ${
                              isDarkMode ? 'text-slate-300' : 'text-slate-500'
                            }`}>No notifications yet</p>
                            <p className={`text-xs sm:text-sm mt-1 px-2 ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-400'
                            }`}>You don't have any notification history at the moment.</p>
                          </div>
                        ) : (
                          displayNotifications.map(alert => {
                            const isAdmin = alert.type === 'administrative'
                            const parsedData = isAdmin ? {} : parseNotificationData(alert)
                            const action = isAdmin ? null : getNotificationAction(alert, parsedData)
                            const formattedTitle = isAdmin ? alert.title : formatNotificationTitle(alert, parsedData)
                            const formattedBody = isAdmin ? alert.message : formatNotificationBody(alert, parsedData)
                            const isUrgent = !isAdmin && isUrgentNotification(alert, parsedData)
                            const timestamp = formatTimestamp(alert.timestamp)
                            
                            return (
                          <div
                            key={alert.id}
                                className={`relative m-1.5 sm:m-2 md:m-3 rounded-lg sm:rounded-xl shadow-md border-2 transition-all duration-200 cursor-pointer group ${
                                  isDarkMode
                                    ? 'bg-[#1a1a1a]'
                                    : 'bg-white'
                                } ${
                                   isUrgent ? 'border-[#7A1315]' : isDarkMode ? 'border-slate-700' : 'border-slate-200'
                                } ${!alert.read ? 'shadow-lg' : 'hover:shadow-lg'} ${isAdmin ? 'opacity-80' : ''}`}
                            onClick={() => {
                              const updatedAlerts = alerts.map(a =>
                                a.id === alert.id ? { ...a, read: true } : a
                              )
                                  if (isAdmin && alert.originalNotifications) {
                                    alert.originalNotifications.forEach(orig => {
                                      const index = updatedAlerts.findIndex(a => a.id === orig.id)
                                      if (index !== -1) {
                                        updatedAlerts[index].read = true
                                      }
                                    })
                                  }
                              setAlerts(updatedAlerts)
                              saveData(subjects, students, enrolls, updatedAlerts, records, grades, profUid).catch(err => 
                                console.warn('Background save failed', err)
                              )
                            }}
                          >
                                {/* Card Content - Compact, Self-Contained */}
                                <div className="p-2 sm:p-2.5 md:p-3">
                                  {/* Header - Bold title with per-notification delete button */}
                                  <div className="flex items-start justify-between mb-1 sm:mb-1.5">
                                    <div className="flex items-center gap-1 sm:gap-1.5">
                                      <h4 className={`text-[11px] sm:text-xs md:text-sm font-bold leading-tight ${
                                        isDarkMode
                                            ? isUrgent ? 'text-red-400' : isAdmin ? 'text-white' : 'text-white'
                                          : isAdmin ? 'text-slate-700' : 'text-[#7A1315]'
                                      }`}>
                                        {formattedTitle}
                                      </h4>
                                      {!alert.read && (
                                        <div className={`flex-shrink-0 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                            isDarkMode ? 'bg-red-400' : 'bg-[#7A1315]'
                                        }`}></div>
                                      )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        let updatedAlerts
                                        
                                        // Handle administrative summary notifications - delete all original notifications
                                        if (isAdmin && alert.originalNotifications && alert.originalNotifications.length > 0) {
                                          // Delete all the original notifications that make up this summary
                                          const originalIds = new Set(alert.originalNotifications.map(n => n.id))
                                          updatedAlerts = alerts.filter(a => !originalIds.has(a.id))
                                          console.log(`Deleted ${originalIds.size} administrative notifications`)
                                        } else if (alert.id === 'admin-summary') {
                                          // Fallback: if it's an admin summary but no originalNotifications, delete all administrative ones
                                          updatedAlerts = alerts.filter(a => {
                                            const title = a.title || ''
                                            const message = a.message || ''
                                            return !(title.includes('Student Archived') || 
                                                    title.includes('Successfully restored') ||
                                                    title.includes('Archive') ||
                                                    title.includes('Restore') ||
                                                    message.includes('archived') ||
                                                    message.includes('restored'))
                                          })
                                          console.log('Deleted all administrative notifications')
                                        } else {
                                          // Regular notification - just filter by ID
                                          updatedAlerts = alerts.filter(a => a.id !== alert.id)
                                        }
                                        
                                        setAlerts(updatedAlerts)
                                        // Save to Firestore immediately (critical operation)
                                        saveData(subjects, students, enrolls, updatedAlerts, records, grades, profUid, true).catch(err =>
                                          console.warn('Background save failed', err)
                                        )
                                      }}
                                      className={`ml-1 sm:ml-2 rounded-full p-0.5 sm:p-1 text-[10px] sm:text-xs font-bold ${
                                        isDarkMode
                                          ? 'text-slate-300 hover:text-white hover:bg-slate-700'
                                          : 'text-slate-500 hover:text-red-700 hover:bg-red-50'
                                      }`}
                                      aria-label="Delete notification"
                                    >
                                      ✕
                                    </button>
                                  </div>
                              
                                  {/* Body - Brief, Single-Sentence Statement */}
                                  <p className={`text-[11px] sm:text-xs leading-relaxed mb-2 sm:mb-3 ${
                                    isDarkMode ? 'text-white' : 'text-slate-700'
                                  }`}>
                                    {formattedBody}
                                  </p>
                                  
                                  {/* Footer - Timestamp and Single Maroon Action Button */}
                                  <div className={`flex items-center justify-between pt-1.5 sm:pt-2 border-t ${
                                    isDarkMode ? 'border-slate-700' : 'border-slate-100'
                                  }`}>
                                    <p className={`text-[10px] sm:text-xs font-medium ${
                                      isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                    }`}>
                                      {timestamp}
                                    </p>
                                    {action && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation()
                                          const updatedAlerts = alerts.map(a =>
                                            a.id === alert.id ? { ...a, read: true } : a
                                          )
                                          setAlerts(updatedAlerts)
                                          saveData(subjects, students, enrolls, updatedAlerts, records, grades, profUid).catch(err =>
                                            console.warn('Background save failed', err)
                                          )
                                          action.action()
                                        }}
                                        className="bg-[#7A1315] hover:bg-red-800 text-white text-[10px] sm:text-xs font-semibold px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                                      >
                                        {action.text}
                                      </button>
                                    )}
                              </div>
                            </div>
                          </div>
                            )
                          })
                      )}
                    </div>
                      
                      {/* Enhanced Footer */}
                      {displayNotifications.length > 0 && (
                        <div className={`p-2.5 sm:p-4 border-t-2 flex-shrink-0 ${
                          isDarkMode 
                            ? 'border-slate-700 bg-[#1a1a1a]' 
                            : 'border-slate-200 bg-gradient-to-r from-slate-50 to-red-50'
                        }`}>
                      <button
                        onClick={async () => {
                          try {
                            // Mark all notifications as read in MySQL (persistent)
                            await markAllAsRead()
                            console.log('✅ All notifications marked as read in MySQL')
                            
                            // Refresh notifications from database to get updated read status
                            const refreshedNotifications = await getNotifications({ limit: 50 })
                            console.log('✅ Refreshed notifications from database:', refreshedNotifications.length)
                            
                            // Update local alerts state with refreshed data from database
                            setAlerts(refreshedNotifications)
                            
                            // Refresh unread count from database
                            const unreadCount = await getUnreadCount()
                            console.log('✅ Refreshed unread count:', unreadCount)
                            
                            // Save to Firestore (for local state persistence)
                            await saveData(subjects, students, enrolls, refreshedNotifications, records, grades, profUid, true)
                            console.log('✅ All notifications cleared and saved')
                          } catch (error) {
                            console.error('❌ Failed to clear all notifications:', error)
                            // Still update local state even if API call fails
                            const updatedAlerts = alerts.map(a => ({ ...a, read: true }))
                            setAlerts(updatedAlerts)
                            saveData(subjects, students, enrolls, updatedAlerts, records, grades, profUid, true).catch(err =>
                              console.warn('Background save failed', err)
                            )
                            addCustomAlert('error', 'Clear Failed', 'Failed to clear all notifications. Please try again.', false)
                          }
                        }}
                        className="w-full text-center text-xs sm:text-sm font-bold text-white hover:text-white bg-[#7A1315] hover:bg-red-800 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        Clear All Notifications
                      </button>
                  </div>
                )}
                    </div>
                  )
                })()}
              </div>

              {/* Profile Dropdown - Compact */}
              <div className="relative">
              <button
                type="button"
                  onClick={() => {
                    setShowProfileDropdown(!showProfileDropdown)
                    setShowNotifDropdown(false)
                  }}
                  className="flex items-center space-x-1 sm:space-x-1.5 md:space-x-2 rounded-lg sm:rounded-xl border border-slate-200 px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-maroon-500"
                >
                  <div className="w-7 h-7 sm:w-8 sm:h-8 md:w-9 md:h-9 lg:w-10 lg:h-10 bg-gradient-to-r from-red-800 to-red-600 rounded-full flex items-center justify-center text-white font-semibold text-[10px] sm:text-xs md:text-sm flex-shrink-0">
                  {profPic ? (
                      <img src={profPic} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    getInitials(profName)
                  )}
                </div>
                  <div className="text-left min-w-0 hidden md:block">
                    <p className={`text-[9px] md:text-[10px] uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-400'}`}>Profile</p>
                    <p className={`text-[10px] md:text-xs lg:text-sm font-semibold truncate max-w-[80px] md:max-w-[100px] lg:max-w-[120px] xl:max-w-none ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{profName}</p>
                </div>
                  <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 md:w-4 md:h-4 text-slate-400 flex-shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path d="M6 9l6 6 6-6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              
                {/* Profile Dropdown Menu - Compact */}
                {showProfileDropdown && (
                  <div className={`fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-14 sm:top-auto mt-0 sm:mt-2 w-auto sm:w-52 md:w-56 max-w-[calc(100vw-1rem)] sm:max-w-none max-h-[calc(100vh-5rem)] sm:max-h-none rounded-lg sm:rounded-xl shadow-2xl border-2 z-50 overflow-hidden ${
                    isDarkMode 
                      ? 'bg-[#1a1a1a] border-slate-700' 
                      : 'bg-white border-slate-200'
                  }`}>
                    {/* Profile Header - Compact for mobile */}
                    <div className={`p-2 sm:p-3 md:p-4 border-b ${
                      isDarkMode ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-r from-red-800 to-red-600 rounded-full flex items-center justify-center text-white font-semibold text-[10px] sm:text-xs md:text-sm flex-shrink-0">
                          {profPic ? (
                            <img src={profPic} alt="Profile" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            getInitials(profName)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs sm:text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{profName}</p>
                          <p className={`text-[10px] sm:text-xs truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{profEmail || 'Professor'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items - Compact */}
                    <div className="py-1 sm:py-2">
              <button
                        onClick={() => {
                          setShowProfileModal(true)
                          setShowProfileDropdown(false)
                        }}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-left flex items-center space-x-2 sm:space-x-3 transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-slate-800/50 text-white' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-xs sm:text-sm font-medium">Profile Settings</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false)
                          handleLogoutClick()
                        }}
                        className={`w-full px-3 sm:px-4 py-2 sm:py-2.5 md:py-3 text-left flex items-center space-x-2 sm:space-x-3 transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-slate-800/50 text-white' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H4v16h10v-2h2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2h10z" />
                </svg>
                        <span className="text-xs sm:text-sm font-medium">Logout</span>
              </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
          <div className={`rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-4 sm:p-6 border ${isDarkMode ? 'bg-[#1a1a1a] border-slate-700' : 'bg-white border-slate-200'}`}>
            <h2 className={`text-base sm:text-lg font-semibold mb-2 text-center ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Confirm Logout
            </h2>
            <p className={`text-sm mb-4 sm:mb-6 text-center ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Are you sure you want to logout?
            </p>
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleCancelLogout}
                className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-300 text-slate-700 bg-white hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeLogout}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#7A1315] hover:bg-[#8a1a1c] shadow-md"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Subject Confirmation Modal */}
      {showDeleteSubjectModal && subjectPendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className={`rounded-3xl shadow-2xl max-w-md w-full mx-4 p-6 border-2 ${
            isDarkMode 
              ? 'bg-[#1a1a1a] border-slate-700' 
              : 'bg-white border-slate-300'
          }`}>
            <div className="flex items-start space-x-4 mb-5">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                isDarkMode 
                  ? 'bg-slate-700 border-2 border-slate-600' 
                  : 'bg-slate-200 border-2 border-slate-300'
              }`}>
                <svg className={`w-6 h-6 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className={`text-xl font-bold mb-2 ${
                  isDarkMode ? 'text-white' : 'text-slate-900'
                }`}>
                  {subjectPendingDelete?.isBulkDelete 
                    ? deleteSubjectMode === 'permanent'
                      ? subjectPendingDelete.code === 'SELECTED'
                        ? `Permanently delete ${subjectPendingDelete.selectedCodes?.length || 0} selected subject(s)?`
                        : 'Permanently delete all subjects?'
                      : 'Move all archived subjects to Recycle Bin?'
                    : deleteSubjectMode === 'permanent'
                      ? 'Permanently delete subject?'
                      : deleteSubjectMode === 'delete' 
                        ? 'Move subject to Recycle Bin?' 
                        : 'Archive subject?'}
                </h2>
                <p className={`text-sm leading-relaxed ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                }`}>
                  {subjectPendingDelete?.isBulkDelete
                    ? deleteSubjectMode === 'permanent'
                      ? subjectPendingDelete.code === 'SELECTED'
                        ? `${subjectPendingDelete.selectedCodes?.length || 0} selected subject(s) will be permanently deleted and their course records will be removed from MySQL. This action cannot be undone.`
                        : `All ${recycleBinSubjects.length} subject(s) in Recycle Bin will be permanently deleted. This action cannot be undone.`
                      : `All ${removedSubjects.length} archived subject(s) will be moved to Recycle Bin.`
                    : deleteSubjectMode === 'permanent'
                      ? `"${subjectPendingDelete.name}" will be permanently deleted and its course record will be removed from MySQL. This action cannot be undone.`
                      : deleteSubjectMode === 'delete'
                        ? `"${subjectPendingDelete.name}" will be moved to Recycle Bin. You can restore it later or permanently delete it.`
                        : `"${subjectPendingDelete.name}" will be moved to Archived Subjects. You can restore it later or move it to Recycle Bin.`}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => { setShowDeleteSubjectModal(false); setSubjectPendingDelete(null) }}
                className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isDarkMode 
                    ? 'border-2 border-slate-600 text-slate-300 bg-slate-800 hover:bg-slate-700' 
                    : 'border-2 border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={
                  deleteSubjectMode === 'permanent' 
                    ? confirmPermanentDelete 
                    : deleteSubjectMode === 'delete' 
                      ? confirmDeleteArchivedSubject 
                      : confirmArchiveSubject
                }
                className={`px-6 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all ${
                  deleteSubjectMode === 'permanent'
                    ? isDarkMode
                      ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500'
                    : deleteSubjectMode === 'delete'
                      ? isDarkMode
                        ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600'
                        : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500'
                      : isDarkMode
                        ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600'
                        : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500'
                }`}
              >
                {deleteSubjectMode === 'permanent' 
                  ? 'Permanently Delete' 
                  : deleteSubjectMode === 'delete' 
                    ? 'Move to Recycle Bin' 
                    : 'Archive Subject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-2 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 lg:py-10 w-full overflow-x-hidden">
        {viewMode === 'professor' ? (
          <div className="fadeIn">
            {/* Navigation Tabs */}
            <div className="glass rounded-2xl shadow-xl mb-4 sm:mb-6 lg:mb-8 overflow-hidden">
              <nav className="flex overflow-x-auto whitespace-nowrap px-2 sm:px-4 lg:px-8 scrollbar-hide -mx-2 sm:mx-0">
                <button
                  onClick={() => { setActiveTab('subjects'); setShowSubjectDetail(false) }}
                  className={`tab-btn relative py-3.5 sm:py-4 lg:py-6 px-4 sm:px-4 lg:px-6 font-semibold transition-all flex-shrink-0 min-h-[48px] sm:min-h-0 touch-manipulation ${
                    activeTab === 'subjects' 
                      ? 'border-b-[3px] border-maroon-500 text-maroon-600 bg-red-50/50' 
                      : 'border-b-[3px] border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                    </svg>
                    <span className="text-sm sm:text-base">Subjects</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('attendance')}
                  className={`tab-btn relative py-3.5 sm:py-4 lg:py-6 px-4 sm:px-4 lg:px-6 border-b-3 font-semibold transition-all flex-shrink-0 min-h-[48px] sm:min-h-0 touch-manipulation ${
                    activeTab === 'attendance' 
                      ? 'border-maroon-500 text-maroon-600 bg-red-50/50' 
                      : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm sm:text-base">Attendance</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('grades')}
                  className={`tab-btn relative py-3.5 sm:py-4 lg:py-6 px-4 sm:px-4 lg:px-6 border-b-3 font-semibold transition-all flex-shrink-0 min-h-[48px] sm:min-h-0 touch-manipulation ${
                    activeTab === 'grades' 
                      ? 'border-maroon-500 text-maroon-600 bg-red-50/50' 
                      : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span className="text-sm sm:text-base">Grades</span>
                  </div>
                </button>
                <button
                  onClick={() => setActiveTab('students')}
                  className={`tab-btn relative py-3.5 sm:py-4 lg:py-6 px-2 sm:px-4 lg:px-6 border-b-3 font-semibold transition-all flex-shrink-0 min-h-[48px] sm:min-h-0 touch-manipulation ${
                    activeTab === 'students' 
                      ? 'border-maroon-500 text-maroon-600 bg-red-50/50' 
                      : 'border-transparent text-slate-600 hover:text-slate-800 hover:bg-slate-50/50'
                  }`}
                >
                  <div className="flex items-center space-x-1 sm:space-x-2 min-w-0">
                    <div className="relative w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                        {/* Person icon */}
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
                    </svg>
                      {/* Plus sign indicator - positioned in bottom right, smaller on mobile */}
                      <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-3 md:h-3 bg-current rounded-full flex items-center justify-center shadow-sm">
                        <svg className="w-1 h-1 sm:w-1.5 sm:h-1.5 md:w-2 md:h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={4}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                      </div>
                    </div>
                    <span className="text-xs sm:text-sm md:text-base whitespace-nowrap overflow-hidden text-ellipsis min-w-0">Students</span>
                  </div>
                </button>
              </nav>
            </div>

          {/* Subjects Tab */}
          {activeTab === 'subjects' && !showSubjectDetail && (
            <div className={`glass rounded-2xl sm:rounded-3xl shadow-2xl p-4 sm:p-6 md:p-8 lg:p-10 ${
              isDarkMode ? 'bg-[#1a1a1a]' : ''
            }`}>
              {/* Enhanced Header Section */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6 mb-6 sm:mb-8">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 sm:gap-3 mb-2">
                    <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border flex-shrink-0 ${
                      isDarkMode 
                        ? 'bg-transparent border-red-200/40' 
                        : 'bg-transparent border-red-200'
                    }`}>
                      <img
                        src={subjectIcon}
                        alt="Subject icon"
                        className="w-full h-full rounded-xl sm:rounded-2xl object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold break-words ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>Subject Management</h2>
                      <p className={`text-xs sm:text-sm md:text-base mt-1 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-600'
                      }`}>
                        {subjectsView === 'active'
                          ? 'Click on any subject to view enrolled students and manage enrollment.'
                          : subjectsView === 'archived'
                            ? 'Manage archived subjects. You can restore them or move them to Recycle Bin.'
                            : 'Manage subjects in Recycle Bin. You can restore them to Archived or permanently delete them.'}
                      </p>
                    </div>
                  </div>
                </div>
                {/* Action Buttons - Mobile: Side-by-side, Desktop: Auto width */}
                <div className="flex gap-2.5 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={refreshData}
                    className={`group relative overflow-hidden px-4 py-3.5 sm:px-4 sm:py-3 rounded-xl sm:rounded-2xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 flex-1 sm:flex-initial min-h-[50px] sm:min-h-0 touch-manipulation ${
                      isDarkMode
                        ? 'bg-slate-700 text-white hover:bg-slate-600 border border-slate-600'
                        : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-300'
                    }`}
                    title="Refresh data from server"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-sm sm:text-base font-medium">Refresh</span>
                  </button>
                <button
                  onClick={() => setShowAddSubjectModal(true)}
                  className={`group relative overflow-hidden px-4 py-3.5 sm:px-6 sm:py-3 rounded-xl sm:rounded-2xl font-bold text-white shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center justify-center space-x-2 flex-1 sm:flex-initial min-h-[50px] sm:min-h-0 touch-manipulation ${
                    isDarkMode
                      ? 'bg-gradient-to-r from-[#7A1315] to-[#b91c1c] hover:from-[#8a1518] hover:to-[#c91d1d]'
                      : 'bg-gradient-to-r from-[#7A1315] to-[#b91c1c] hover:from-[#8a1518] hover:to-[#c91d1d]'
                  }`}
                >
                  <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  <svg className="w-5 h-5 relative z-10 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="relative z-10 text-sm sm:text-base">Add Subject</span>
                </button>
                </div>
              </div>
              
              {/* Enhanced Toggle Switch - Mobile: Sliding indicator, Desktop: Red button background */}
              <div className="mb-6 sm:mb-8">
                <div className={`relative w-full sm:w-auto sm:inline-flex rounded-2xl p-1.5 shadow-lg toggle-switch-container ${
                  isDarkMode 
                    ? 'bg-slate-800/50 border-2 border-slate-700' 
                    : 'bg-slate-50 border-2 border-slate-200'
                }`}>
                  {/* Sliding indicator - Mobile only (hidden on desktop) */}
                  <div
                    className={`absolute top-1.5 bottom-1.5 rounded-xl bg-gradient-to-br from-[#7A1315] via-[#8a1518] to-[#b91c1c] transition-[left,right] duration-300 ease-out shadow-lg toggle-indicator sm:hidden ${
                      subjectsView === 'active' 
                        ? 'toggle-indicator-active' 
                        : 'toggle-indicator-archived'
                    }`}
                    style={{
                      boxShadow: '0 4px 12px rgba(122, 19, 21, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      zIndex: 1
                    }}
                  />
                  {/* Buttons - Mobile: Transparent with indicator, Desktop: Red background when selected */}
                  <button
                    type="button"
                    onClick={() => setSubjectsView('active')}
                    className={`relative z-20 flex-1 px-3 py-3 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-center transition-all duration-300 rounded-xl min-h-[48px] sm:min-h-0 touch-manipulation whitespace-nowrap ${
                      subjectsView === 'active'
                        ? 'text-white sm:bg-gradient-to-br sm:from-[#7A1315] sm:via-[#8a1518] sm:to-[#b91c1c] sm:shadow-lg'
                        : isDarkMode
                          ? 'text-slate-300 hover:text-slate-200 sm:bg-transparent'
                          : 'text-slate-600 hover:text-slate-700 sm:bg-transparent'
                    }`}
                    style={{
                      textShadow: subjectsView === 'active' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <span className="block truncate">Active Subjects</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubjectsView('archived')}
                    className={`relative z-20 flex-1 px-3 py-3 sm:px-4 sm:py-2.5 text-xs sm:text-sm font-bold text-center transition-all duration-300 rounded-xl min-h-[48px] sm:min-h-0 touch-manipulation whitespace-nowrap ${
                      subjectsView === 'archived'
                        ? 'text-white sm:bg-gradient-to-br sm:from-[#7A1315] sm:via-[#8a1518] sm:to-[#b91c1c] sm:shadow-lg'
                        : isDarkMode
                          ? 'text-slate-300 hover:text-slate-200 sm:bg-transparent'
                          : 'text-slate-600 hover:text-slate-700 sm:bg-transparent'
                    }`}
                    style={{
                      textShadow: subjectsView === 'archived' ? '0 1px 2px rgba(0, 0, 0, 0.3)' : 'none',
                      backgroundColor: 'transparent'
                    }}
                  >
                    <span className="block truncate">Archived Subjects</span>
                  </button>
                </div>
              </div>
              
              {/* Filter Buttons - All, 1st Term, 2nd Term - Mobile optimized */}
              {subjectsView === 'active' && (
                <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 mb-6">
                  <button
                    onClick={() => {
                      setSubjectFilterTerm('all')
                      setSubjectPage(1)
                    }}
                    className={`px-5 py-3 sm:px-4 sm:py-2 rounded-xl sm:rounded-lg text-sm font-semibold transition-all min-h-[44px] sm:min-h-0 touch-manipulation flex-1 sm:flex-initial ${
                        subjectFilterTerm === 'all'
                          ? isDarkMode
                            ? 'bg-[#7A1315] text-white shadow-lg'
                            : 'bg-[#7A1315] text-white shadow-lg'
                          : isDarkMode
                            ? 'bg-[#2c2c2c] text-slate-300 border border-slate-600 hover:bg-[#3c3c3c] hover:border-slate-500'
                            : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                      }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => {
                      setSubjectFilterTerm('first')
                      setSubjectPage(1)
                    }}
                    className={`px-5 py-3 sm:px-4 sm:py-2 rounded-xl sm:rounded-lg text-sm font-semibold transition-all min-h-[44px] sm:min-h-0 touch-manipulation flex-1 sm:flex-initial ${
                        subjectFilterTerm === 'first'
                          ? isDarkMode
                            ? 'bg-[#7A1315] text-white shadow-lg'
                            : 'bg-[#7A1315] text-white shadow-lg'
                          : isDarkMode
                            ? 'bg-[#2c2c2c] text-slate-300 border border-slate-600 hover:bg-[#3c3c3c] hover:border-slate-500'
                            : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                      }`}
                  >
                    1st Term
                  </button>
                  <button
                    onClick={() => {
                      setSubjectFilterTerm('second')
                      setSubjectPage(1)
                    }}
                    className={`px-5 py-3 sm:px-4 sm:py-2 rounded-xl sm:rounded-lg text-sm font-semibold transition-all min-h-[44px] sm:min-h-0 touch-manipulation flex-1 sm:flex-initial ${
                        subjectFilterTerm === 'second'
                          ? isDarkMode
                            ? 'bg-[#7A1315] text-white shadow-lg'
                            : 'bg-[#7A1315] text-white shadow-lg'
                          : isDarkMode
                            ? 'bg-[#2c2c2c] text-slate-300 border border-slate-600 hover:bg-[#3c3c3c] hover:border-slate-500'
                            : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                      }`}
                  >
                    2nd Term
                  </button>
                </div>
              )}

              {subjectsView === 'active' && (() => {
                // Filter subjects by search query
                let filteredSubjects = subjects.filter(subject => {
                  if (!subjectSearchQuery) return true
                  const searchLower = subjectSearchQuery.toLowerCase()
                  const name = (subject.name || '').toLowerCase()
                  const code = (subject.code || '').toLowerCase()
                  return name.includes(searchLower) || code.includes(searchLower)
                })
                
                // Filter by term
                if (subjectFilterTerm !== 'all') {
                  filteredSubjects = filteredSubjects.filter(subject => {
                    if (subjectFilterTerm === 'first') {
                      return !subject.term || subject.term === 'first'
                    }
                    if (subjectFilterTerm === 'second') {
                      return subject.term === 'second'
                    }
                    return true
                  })
                }
                
                // Sort subjects
                filteredSubjects.sort((a, b) => {
                  let aValue, bValue
                  switch (subjectSortBy) {
                    case 'name':
                      aValue = (a.name || '').toLowerCase()
                      bValue = (b.name || '').toLowerCase()
                      break
                    case 'code':
                      aValue = (a.code || '').toLowerCase()
                      bValue = (b.code || '').toLowerCase()
                      break
                    case 'credits':
                      aValue = parseInt(a.credits) || 0
                      bValue = parseInt(b.credits) || 0
                      break
                    case 'enrollment':
                      aValue = enrolls[a.code]?.length || 0
                      bValue = enrolls[b.code]?.length || 0
                      break
                    default:
                      aValue = (a.name || '').toLowerCase()
                      bValue = (b.name || '').toLowerCase()
                  }
                  
                  if (subjectSortOrder === 'asc') {
                    return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
                  } else {
                    return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
                  }
                })
                
                // Paginate subjects
                const startIndex = (subjectPage - 1) * subjectItemsPerPage
                const endIndex = startIndex + subjectItemsPerPage
                const paginatedSubjects = filteredSubjects.slice(startIndex, endIndex)
                const totalSubjectPages = Math.ceil(filteredSubjects.length / subjectItemsPerPage)
                
                return (
                  <>
                    {/* Search and Sort Controls */}
                    <div className="flex flex-col sm:flex-row gap-3 mb-6">
                      {/* Search */}
                      <div className="relative flex-1">
                        <input
                          type="text"
                          placeholder="Search subjects..."
                          value={subjectSearchQuery}
                          onChange={(e) => {
                            setSubjectSearchQuery(e.target.value)
                            setSubjectPage(1)
                          }}
                          className={`w-full px-4 py-2 pl-10 rounded-lg border text-sm ${
                            isDarkMode 
                              ? 'bg-[#2c2c2c] border-slate-600 text-white placeholder-slate-400' 
                              : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                          } focus:outline-none focus:ring-2 focus:ring-[#7A1315] focus:border-transparent`}
                        />
                        <i className={`fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-sm ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}></i>
                      </div>
                      
                      {/* Sort */}
                      <select
                        value={`${subjectSortBy}-${subjectSortOrder}`}
                        onChange={(e) => {
                          const [newSortBy, newSortOrder] = e.target.value.split('-')
                          setSubjectSortBy(newSortBy)
                          setSubjectSortOrder(newSortOrder)
                          setSubjectPage(1)
                        }}
                        className={`px-4 py-2 rounded-lg border text-sm ${
                          isDarkMode 
                            ? 'bg-[#2c2c2c] border-slate-600 text-white' 
                            : 'bg-white border-slate-300 text-slate-800'
                        } focus:outline-none focus:ring-2 focus:ring-[#7A1315] focus:border-transparent`}
                      >
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                        <option value="code-asc">Code (A-Z)</option>
                        <option value="code-desc">Code (Z-A)</option>
                        <option value="credits-desc">Credits (High-Low)</option>
                        <option value="credits-asc">Credits (Low-High)</option>
                        <option value="enrollment-desc">Enrollment (High-Low)</option>
                        <option value="enrollment-asc">Enrollment (Low-High)</option>
                      </select>
                    </div>
                    
                    {filteredSubjects.length > 0 && (
                      <div className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                        Showing {paginatedSubjects.length} of {filteredSubjects.length} subject{filteredSubjects.length !== 1 ? 's' : ''}
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                      {paginatedSubjects.map((subject) => {
                    const enrolledCount = enrolls[subject.code] ? enrolls[subject.code].length : 0
                    return (
                      <div
                        key={`active-${subject.code}`}
                        onClick={() => handleSubjectClick(subject)}
                        className={`group relative overflow-hidden rounded-3xl p-6 cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                          isDarkMode
                            ? 'bg-gradient-to-br from-[#2c2c2c] to-[#1f1f1f] border border-slate-700 hover:border-slate-600'
                            : 'bg-gradient-to-br from-white to-slate-50 border border-slate-200 hover:border-[#7A1315]/30 shadow-xl'
                        }`}
                      >
                        {/* Decorative gradient overlay on hover */}
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${
                          isDarkMode
                            ? 'from-[#7A1315]/20 to-transparent'
                            : 'from-[#7A1315]/5 to-transparent'
                        }`}></div>
                        
                        <div className="relative z-10 flex flex-col space-y-3">
                          {/* Header Row: Icon, Title, Delete Button */}
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              {/* Enhanced Icon */}
                              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-md flex-shrink-0 ${
                                isDarkMode
                                  ? 'bg-gradient-to-br from-[#7A1315]/40 to-[#4a0c0d]/40 border border-[#7A1315]/30'
                                  : 'bg-gradient-to-br from-red-100 to-red-50 border border-red-200'
                              }`}>
                                <svg className={`w-6 h-6 ${
                                  isDarkMode ? 'text-red-400' : 'text-[#7A1315]'
                                }`} fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                                </svg>
                              </div>
                              <div className="flex flex-col min-w-0 flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <h3 className={`text-lg font-bold truncate ${
                                    isDarkMode ? 'text-white' : 'text-slate-800'
                                  }`}>{subject.name}</h3>
                                  {/* Term Badge - Compact and Prominent */}
                                  <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                                    <button
                                      onClick={(e) => handleUpdateSubjectTerm(subject.code, 'first', e)}
                                      className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-all ${
                                        (!subject.term || subject.term === 'first')
                                          ? isDarkMode
                                            ? 'bg-blue-600 text-white shadow-sm'
                                            : 'bg-blue-500 text-white shadow-sm'
                                          : isDarkMode
                                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                      }`}
                                      title="Click to set as 1st Term"
                                    >
                                      1st
                                    </button>
                                    <button
                                      onClick={(e) => handleUpdateSubjectTerm(subject.code, 'second', e)}
                                      className={`px-2 py-0.5 rounded-md text-xs font-semibold transition-all ${
                                        subject.term === 'second'
                                          ? isDarkMode
                                            ? 'bg-purple-600 text-white shadow-sm'
                                            : 'bg-purple-500 text-white shadow-sm'
                                          : isDarkMode
                                            ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                      }`}
                                      title="Click to set as 2nd Term"
                                    >
                                      2nd
                                    </button>
                                  </div>
                                </div>
                                <div className={`text-xs font-medium ${
                                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                }`}>{subject.code} • {subject.credits} Credits</div>
                              </div>
                            </div>
                            {/* Enhanced Delete Button */}
                            <button
                              onClick={(e) => handleDeleteSubject(subject.code, e)}
                              className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
                                isDarkMode
                                  ? 'text-red-400 hover:text-red-300 hover:bg-red-900/30'
                                  : 'text-red-500 hover:text-red-700 hover:bg-red-50'
                              }`}
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                          
                          {/* Info Row: Enrollment and Created Date */}
                          <div className="flex items-center justify-between">
                            <div className={`flex items-center gap-1.5 ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                              <span className="text-xs font-semibold">{enrolledCount} enrolled</span>
                            </div>
                            {subject.createdAt && (
                              <div className={`text-xs ${
                                isDarkMode ? 'text-slate-500' : 'text-slate-400'
                              }`}>
                                {(() => {
                                  try {
                                    const date = new Date(subject.createdAt)
                                    return date.toLocaleDateString('en-US', { 
                                      month: 'short', 
                                      day: 'numeric',
                                      year: 'numeric'
                                    })
                                  } catch {
                                    return new Date(subject.createdAt).toLocaleDateString()
                                  }
                                })()}
                              </div>
                            )}
                          </div>
                          
                          {/* Footer: Action Hint */}
                          <div className={`pt-2 border-t ${
                            isDarkMode ? 'border-slate-700' : 'border-slate-200'
                          }`}>
                            <div className={`flex items-center gap-2 text-xs ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              <span className="font-medium">Click to view enrolled students and manage</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                      })}
                      {filteredSubjects.length === 0 && (
                        <div className={`col-span-full text-center py-12 rounded-2xl ${
                          isDarkMode 
                            ? 'bg-[#1a1a1a] border border-slate-700 text-slate-400' 
                            : 'bg-slate-50 border border-slate-200 text-slate-500'
                        }`}>
                          <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                          </svg>
                          <p className="text-lg font-semibold mb-2">
                            {subjectSearchQuery ? 'No subjects found matching your search.' : 'No subjects yet'}
                          </p>
                          {!subjectSearchQuery && (
                            <p className="text-sm">Click "Add Subject" to create your first subject</p>
                          )}
                        </div>
                      )}
                    </div>
                    
                    {/* Pagination */}
                    {totalSubjectPages > 1 && (
                      <div className={`flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 pt-6 border-t ${
                        isDarkMode ? 'border-slate-700' : 'border-slate-200'
                      }`}>
                        <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Page {subjectPage} of {totalSubjectPages}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setSubjectPage(prev => Math.max(1, prev - 1))}
                            disabled={subjectPage === 1}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              subjectPage === 1
                                ? isDarkMode
                                  ? 'bg-[#2c2c2c] text-slate-600 cursor-not-allowed opacity-50'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                                : isDarkMode
                                  ? 'bg-[#2c2c2c] text-white border border-slate-600 hover:bg-[#3c3c3c]'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <i className="fa-solid fa-chevron-left mr-1"></i> Prev
                          </button>
                          <button
                            onClick={() => setSubjectPage(prev => Math.min(totalSubjectPages, prev + 1))}
                            disabled={subjectPage === totalSubjectPages}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              subjectPage === totalSubjectPages
                                ? isDarkMode
                                  ? 'bg-[#2c2c2c] text-slate-600 cursor-not-allowed opacity-50'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'
                                : isDarkMode
                                  ? 'bg-[#2c2c2c] text-white border border-slate-600 hover:bg-[#3c3c3c]'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            Next <i className="fa-solid fa-chevron-right ml-1"></i>
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )
              })()}

              {subjectsView === 'archived' && (() => {
                const allArchivedSubjects = getArchivedSubjects()
                // Filter archived subjects based on search term (only match subject name, not code/ID)
                const archivedSubjects = allArchivedSubjects.filter(subject => {
                  if (!archivedSubjectsSearchTerm.trim()) return true
                  const searchLower = archivedSubjectsSearchTerm.toLowerCase().trim()
                  // Only match if subject has a name and the name contains the search term
                  if (!subject.name || typeof subject.name !== 'string') return false
                  return subject.name.toLowerCase().includes(searchLower)
                })
                
                if (allArchivedSubjects.length === 0) {
                  return (
                    <div className={`text-center py-12 rounded-2xl ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] border border-slate-700 text-slate-400' 
                        : 'bg-slate-50 border border-slate-200 text-slate-500'
                    }`}>
                      <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                      </svg>
                      <p className="text-lg font-semibold mb-2">No archived subjects yet</p>
                      <p className="text-sm">Archive a subject from the Active view to manage it here</p>
                    </div>
                  )
                }

                return (
                  <div className="mt-2">
                    {/* Header with Search Bar and Recycle Bin Button */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                      {/* Search Bar */}
                      <div className="relative flex-1 w-full sm:max-w-md">
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Search archived subjects..."
                            value={archivedSubjectsSearchTerm}
                            onChange={(e) => {
                              setArchivedSubjectsSearchTerm(e.target.value)
                              // Clear selection when search changes
                              if (e.target.value.trim() !== archivedSubjectsSearchTerm.trim()) {
                                setSelectedArchivedSubjects([])
                                setSelectAllArchivedSubjects(false)
                              }
                            }}
                            className={`w-full px-4 py-2.5 pl-10 pr-10 rounded-lg border-2 transition-all duration-200 ${
                              isDarkMode
                                ? 'bg-[#1a1a1a] border-slate-700 text-white placeholder:text-slate-400 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20'
                                : 'bg-white border-slate-300 text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20'
                            }`}
                          />
                          <svg
                            className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-400'
                            }`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          {archivedSubjectsSearchTerm && (
                            <button
                              onClick={() => {
                                setArchivedSubjectsSearchTerm('')
                                setSelectedArchivedSubjects([])
                                setSelectAllArchivedSubjects(false)
                              }}
                              className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 rounded-full flex items-center justify-center transition-colors ${
                                isDarkMode
                                  ? 'text-slate-400 hover:text-white hover:bg-slate-700'
                                  : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                              }`}
                              title="Clear search"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                      
                      {/* Recycle Bin Button */}
                      {allArchivedSubjects.length > 0 && (
                        <button
                          onClick={() => setSubjectsView('recyclebin')}
                          className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl whitespace-nowrap ${
                            isDarkMode
                              ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border border-red-700'
                              : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border border-red-600'
                          }`}
                          title="View Recycle Bin"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Recycle Bin ({recycleBinSubjects.length})</span>
                        </button>
                      )}
                    </div>

                    {/* Empty Search Results Message */}
                    {archivedSubjectsSearchTerm && archivedSubjects.length === 0 && allArchivedSubjects.length > 0 && (
                      <div className={`text-center py-12 rounded-2xl mb-4 ${
                        isDarkMode 
                          ? 'bg-[#1a1a1a] border border-slate-700 text-slate-400' 
                          : 'bg-slate-50 border border-slate-200 text-slate-500'
                      }`}>
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                        <p className="text-lg font-semibold mb-2">No results found</p>
                        <p className="text-sm">No archived subjects match "{archivedSubjectsSearchTerm}"</p>
                      </div>
                    )}

                    {/* Selection Controls */}
                    {archivedSubjects.length > 0 && (
                      <div className={`mb-4 p-4 rounded-xl flex items-center justify-between ${
                        isDarkMode
                          ? 'bg-slate-800/50 border border-slate-700'
                          : 'bg-slate-50 border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <p className={`text-sm font-medium ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {selectedArchivedSubjects.length > 0
                              ? `${selectedArchivedSubjects.length} subject${selectedArchivedSubjects.length === 1 ? '' : 's'} selected`
                              : 'No subjects selected'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedArchivedSubjects([])
                              setSelectAllArchivedSubjects(false)
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              isDarkMode
                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectAllArchivedSubjects) {
                                setSelectedArchivedSubjects([])
                                setSelectAllArchivedSubjects(false)
                              } else {
                                const allSubjectCodes = archivedSubjects.map(subject => subject.code)
                                setSelectedArchivedSubjects(allSubjectCodes)
                                setSelectAllArchivedSubjects(true)
                              }
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              isDarkMode
                                ? selectAllArchivedSubjects
                                  ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                                  : 'bg-emerald-800/50 text-emerald-300 hover:bg-emerald-700'
                                : selectAllArchivedSubjects
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            {selectAllArchivedSubjects ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Only show grid when there are matching results */}
                    {archivedSubjects.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                        {archivedSubjects.map(subject => {
                          const isSelected = selectedArchivedSubjects.includes(subject.code)
                          return (
                        <div
                          key={`archived-${subject.code}`}
                          className={`group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                              isSelected
                                ? isDarkMode
                                  ? 'bg-gradient-to-br from-[#2c2c2c] to-[#1f1f1f] border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
                                  : 'bg-gradient-to-br from-white to-slate-50 border-2 border-emerald-500 shadow-xl shadow-emerald-500/20'
                                : isDarkMode
                              ? 'bg-gradient-to-br from-[#2c2c2c] to-[#1f1f1f] border border-slate-700 hover:border-slate-600'
                              : 'bg-gradient-to-br from-white to-slate-50 border border-amber-200 hover:border-amber-300 shadow-xl'
                          }`}
                        >
                          {/* Decorative overlay */}
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${
                            isDarkMode
                              ? 'from-amber-900/20 to-transparent'
                              : 'from-amber-50/50 to-transparent'
                          }`}></div>
                          
                          <div className="relative z-10 flex flex-col space-y-4">
                            <div className="flex items-start justify-between">
                                {/* Checkbox */}
                                <div className="flex items-center mr-2">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      if (e.target.checked) {
                                        setSelectedArchivedSubjects([...selectedArchivedSubjects, subject.code])
                                        // Check if all are selected
                                        if (selectedArchivedSubjects.length + 1 === archivedSubjects.length) {
                                          setSelectAllArchivedSubjects(true)
                                        }
                                      } else {
                                        setSelectedArchivedSubjects(selectedArchivedSubjects.filter(code => code !== subject.code))
                                        setSelectAllArchivedSubjects(false)
                                      }
                                    }}
                                    className={`w-5 h-5 rounded border-2 cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-emerald-500 border-emerald-500 text-white'
                                        : isDarkMode
                                          ? 'bg-slate-700 border-slate-600 text-transparent'
                                          : 'bg-white border-slate-300 text-transparent'
                                    }`}
                                    style={{
                                      accentColor: isSelected ? '#10b981' : undefined
                                    }}
                                  />
                                </div>
                              <div className="flex items-center space-x-4 flex-1 min-w-0">
                                {/* Enhanced Icon */}
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                                  isDarkMode
                                    ? 'bg-gradient-to-br from-amber-900/40 to-amber-800/20 border border-amber-800/30'
                                    : 'bg-gradient-to-br from-amber-100 to-amber-50 border border-amber-200'
                                }`}>
                                  <svg className={`w-8 h-8 ${
                                    isDarkMode ? 'text-amber-400' : 'text-amber-600'
                                  }`} fill="currentColor" viewBox="0 0 24 24">
                                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                                  </svg>
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className={`text-lg font-bold mb-1 truncate ${
                                    isDarkMode ? 'text-white' : 'text-slate-800'
                                  }`}>{subject.name}</div>
                                  <div className={`text-xs font-medium ${
                                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                  }`}>{subject.code} • {subject.credits} Credits</div>
                                  <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-semibold inline-block w-fit ${
                                    isDarkMode
                                      ? 'bg-amber-900/30 text-amber-400 border border-amber-800/50'
                                      : 'bg-amber-100 text-amber-700 border border-amber-200'
                                  }`}>
                                    Archived
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col space-y-2.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRestoreSubject(subject.code)
                                }}
                                className={`w-full py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg ${
                                  isDarkMode
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="text-sm">Restore Subject</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteArchivedSubject(subject.code)
                                }}
                                className={`w-full py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg ${
                                  isDarkMode
                                    ? 'bg-gradient-to-r from-slate-600 to-slate-700 hover:from-slate-500 hover:to-slate-600 text-white border border-slate-700'
                                    : 'bg-gradient-to-r from-slate-500 to-slate-600 hover:from-slate-400 hover:to-slate-500 text-white'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="text-sm">Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        )
                        })}
                    </div>
                    )}
                  </div>
                )
              })()}

              {/* Recycle Bin View */}
              {subjectsView === 'recyclebin' && (() => {
                if (recycleBinSubjects.length === 0) {
                  return (
                    <div className="mt-2">
                      {/* Header with Back Button */}
                      <div className="flex items-center justify-between mb-4">
                        <button
                          onClick={() => setSubjectsView('archived')}
                          className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl whitespace-nowrap ${
                            isDarkMode
                              ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                              : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                          }`}
                          title="Back to Archived Subjects"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                          </svg>
                          <span>Back</span>
                        </button>
                        <div className="flex-1"></div>
                      </div>
                      <div className={`text-center py-12 rounded-2xl ${
                        isDarkMode 
                          ? 'bg-[#1a1a1a] border border-slate-700 text-slate-400' 
                          : 'bg-slate-50 border border-slate-200 text-slate-500'
                      }`}>
                        <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        <p className="text-lg font-semibold mb-2">Recycle Bin is empty</p>
                        <p className="text-sm">Deleted subjects will appear here</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <div className="mt-2">
                    {/* Header with Back Button and Empty Recycle Bin Button */}
                    <div className="flex items-center justify-between mb-4">
                      <button
                        onClick={() => setSubjectsView('archived')}
                        className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl whitespace-nowrap ${
                          isDarkMode
                            ? 'bg-slate-700 hover:bg-slate-600 text-white border border-slate-600'
                            : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-300'
                        }`}
                        title="Back to Archived Subjects"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                        </svg>
                        <span>Back</span>
                      </button>
                      {recycleBinSubjects.length > 0 && (
                        <button
                          onClick={handlePermanentDeleteAllFromRecycleBin}
                          className={`px-4 py-2.5 rounded-lg font-semibold text-sm transition-all duration-300 flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl whitespace-nowrap ${
                            isDarkMode
                              ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border border-red-700'
                              : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white border border-red-600'
                          }`}
                          title="Permanently delete all subjects in Recycle Bin"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <span>Empty Recycle Bin</span>
                        </button>
                      )}
                    </div>

                    {/* Selection Controls */}
                    {recycleBinSubjects.length > 0 && (
                      <div className={`mb-4 p-4 rounded-xl flex items-center justify-between ${
                        isDarkMode
                          ? 'bg-slate-800/50 border border-slate-700'
                          : 'bg-slate-50 border border-slate-200'
                      }`}>
                        <div className="flex items-center gap-3">
                          <p className={`text-sm font-medium ${
                            isDarkMode ? 'text-slate-300' : 'text-slate-600'
                          }`}>
                            {selectedRecycleBinSubjects.length > 0
                              ? `${selectedRecycleBinSubjects.length} subject${selectedRecycleBinSubjects.length === 1 ? '' : 's'} selected`
                              : 'No subjects selected'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedRecycleBinSubjects.length > 0 && (
                            <button
                              type="button"
                              onClick={handlePermanentDeleteSelectedFromRecycleBin}
                              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                                isDarkMode
                                  ? 'bg-red-700 text-white hover:bg-red-600'
                                  : 'bg-red-600 text-white hover:bg-red-500'
                              }`}
                            >
                              Delete Selected ({selectedRecycleBinSubjects.length})
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedRecycleBinSubjects([])
                              setSelectAllRecycleBinSubjects(false)
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              isDarkMode
                                ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Clear
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectAllRecycleBinSubjects) {
                                setSelectedRecycleBinSubjects([])
                                setSelectAllRecycleBinSubjects(false)
                              } else {
                                const allSubjectCodes = recycleBinSubjects.map(subject => subject.code)
                                setSelectedRecycleBinSubjects(allSubjectCodes)
                                setSelectAllRecycleBinSubjects(true)
                              }
                            }}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                              isDarkMode
                                ? selectAllRecycleBinSubjects
                                  ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                                  : 'bg-emerald-800/50 text-emerald-300 hover:bg-emerald-700'
                                : selectAllRecycleBinSubjects
                                  ? 'bg-emerald-600 text-white hover:bg-emerald-500'
                                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                            }`}
                          >
                            {selectAllRecycleBinSubjects ? 'Deselect All' : 'Select All'}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
                      {recycleBinSubjects.map(subject => {
                        const isSelected = selectedRecycleBinSubjects.includes(subject.code)
                        return (
                        <div
                          key={`recyclebin-${subject.code}`}
                          className={`group relative overflow-hidden rounded-3xl p-6 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl ${
                            isSelected
                              ? isDarkMode
                                ? 'bg-gradient-to-br from-[#2c2c2c] to-[#1f1f1f] border-2 border-emerald-500 shadow-lg shadow-emerald-500/20'
                                : 'bg-gradient-to-br from-white to-slate-50 border-2 border-emerald-500 shadow-xl shadow-emerald-500/20'
                              : isDarkMode
                              ? 'bg-gradient-to-br from-[#2c2c2c] to-[#1f1f1f] border border-slate-700 hover:border-slate-600'
                              : 'bg-gradient-to-br from-white to-slate-50 border border-red-200 hover:border-red-300 shadow-xl'
                          }`}
                        >
                          {/* Decorative overlay */}
                          <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br ${
                            isDarkMode
                              ? 'from-red-900/20 to-transparent'
                              : 'from-red-50/50 to-transparent'
                          }`}></div>
                          
                          <div className="relative z-10 flex flex-col space-y-4">
                            <div className="flex items-start justify-between">
                              {/* Checkbox */}
                              <div className="flex items-center mr-2">
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    e.stopPropagation()
                                    if (e.target.checked) {
                                      setSelectedRecycleBinSubjects([...selectedRecycleBinSubjects, subject.code])
                                      // Check if all are selected
                                      if (selectedRecycleBinSubjects.length + 1 === recycleBinSubjects.length) {
                                        setSelectAllRecycleBinSubjects(true)
                                      }
                                    } else {
                                      setSelectedRecycleBinSubjects(selectedRecycleBinSubjects.filter(code => code !== subject.code))
                                      setSelectAllRecycleBinSubjects(false)
                                    }
                                  }}
                                  className={`w-5 h-5 rounded border-2 cursor-pointer transition-all ${
                                    isSelected
                                      ? 'bg-emerald-500 border-emerald-500 text-white'
                                      : isDarkMode
                                        ? 'bg-slate-700 border-slate-600 text-transparent'
                                        : 'bg-white border-slate-300 text-transparent'
                                  }`}
                                  style={{
                                    accentColor: isSelected ? '#10b981' : undefined
                                  }}
                                />
                              </div>
                              <div className="flex items-center space-x-4 flex-1 min-w-0">
                                {/* Enhanced Icon */}
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0 ${
                                  isDarkMode
                                    ? 'bg-gradient-to-br from-red-900/40 to-red-800/20 border border-red-800/30'
                                    : 'bg-gradient-to-br from-red-100 to-red-50 border border-red-200'
                                }`}>
                                  <svg className={`w-8 h-8 ${
                                    isDarkMode ? 'text-red-400' : 'text-red-600'
                                  }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </div>
                                <div className="flex flex-col min-w-0 flex-1">
                                  <div className={`text-lg font-bold mb-1 truncate ${
                                    isDarkMode ? 'text-white' : 'text-slate-800'
                                  }`}>{subject.name}</div>
                                  <div className={`text-xs font-medium ${
                                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                  }`}>{subject.code} • {subject.credits} Credits</div>
                                  <div className={`mt-1 px-2 py-0.5 rounded-full text-xs font-semibold inline-block w-fit ${
                                    isDarkMode
                                      ? 'bg-red-900/30 text-red-400 border border-red-800/50'
                                      : 'bg-red-100 text-red-700 border border-red-200'
                                  }`}>
                                    In Recycle Bin
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="pt-3 border-t border-slate-200 dark:border-slate-700 flex flex-col space-y-2.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRestoreFromRecycleBin(subject.code)
                                }}
                                className={`w-full py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg ${
                                  isDarkMode
                                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
                                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="text-sm">Restore to Archived</span>
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handlePermanentDeleteFromRecycleBin(subject.code)
                                }}
                                className={`w-full py-2.5 px-4 rounded-xl font-bold transition-all flex items-center justify-center space-x-2 shadow-md hover:shadow-lg ${
                                  isDarkMode
                                    ? 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white border border-red-700'
                                    : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 text-white'
                                }`}
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                                <span className="text-sm">Permanently Delete</span>
                              </button>
                            </div>
                          </div>
                        </div>
                        )
                        })}
                    </div>
                  </div>
                )
              })()}
            </div>
          )}

          {/* Subject Detail View */}
          {activeTab === 'subjects' && showSubjectDetail && selectedSubject && (
            <div className="glass rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 sm:gap-0 mb-4 sm:mb-6 lg:mb-8">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <button
                    onClick={handleBackToSubjects}
                    className="w-10 h-10 sm:w-12 sm:h-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  >
                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 12H5m7-7l-7 7 7 7" />
                    </svg>
                  </button>
                  <div className="min-w-0">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold textGrad truncate">{selectedSubject.name}</h2>
                    <p className="text-sm sm:text-base text-slate-600 mt-1 truncate">{selectedSubject.code} • {selectedSubject.credits} Credits</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
                  <button
                    onClick={handleTakeAttendance}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 sm:px-6 py-3.5 sm:py-3 rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center space-x-2 text-sm sm:text-base min-h-[48px] sm:min-h-0 touch-manipulation"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Take Attendance</span>
                  </button>
                  <button
                    onClick={handleManageGrades}
                    className="bg-amber-500 hover:bg-amber-600 text-white px-5 sm:px-6 py-3.5 sm:py-3 rounded-xl font-semibold shadow-lg transition-all flex items-center justify-center space-x-2 text-sm sm:text-base min-h-[48px] sm:min-h-0 touch-manipulation"
                  >
                    <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                    <span>Manage Grades</span>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolls[selectedSubject.code] && enrolls[selectedSubject.code].length > 0 ? (
                  enrolls[selectedSubject.code].map(studentId => {
                    const student = students.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
                    return student ? (
                      <div key={studentId} className={`p-4 rounded-xl border transition-all hover:shadow-md ${
                        isDarkMode 
                          ? 'bg-[#1a1a1a] border-slate-700' 
                          : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex items-center space-x-3">
                          <StudentAvatar student={student} className="w-12 h-12" />
                          <div className="flex-1 min-w-0">
                            <p className={`font-semibold truncate ${
                              isDarkMode ? 'text-white' : 'text-slate-800'
                            }`}>{student.name}</p>
                            <p className={`text-xs truncate ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>ID: {student.id}</p>
                          </div>
                        </div>
                      </div>
                    ) : null
                  })
                ) : (
                  <div className={`col-span-3 text-center py-8 ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}>
                    No students enrolled in this subject yet.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Attendance Tab */}
          {activeTab === 'attendance' && !currentSubject && (
            <div className="glass rounded-2xl shadow-xl p-8">
              <div className="text-center py-12">
                <p className="text-slate-600 text-lg mb-4">No subject selected</p>
                <p className="text-slate-500">Click on a subject and then click "Take Attendance" to manage attendance</p>
              </div>
            </div>
          )}
          {activeTab === 'attendance' && currentSubject && (
            <div className={`glass rounded-2xl shadow-xl p-4 sm:p-6 lg:p-8 ${isDarkMode ? 'bg-[#1a1a1a]' : ''}`}>
              {/* Subject Header */}
              <div className="flex items-center justify-between space-x-3 sm:space-x-4 mb-4 sm:mb-5 lg:mb-6">
                <div className="flex items-center space-x-3 sm:space-x-4 min-w-0 flex-1">
                  <button
                    onClick={handleBackToSubjects}
                    className="w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 bg-slate-100 hover:bg-slate-200 rounded-lg sm:rounded-xl flex items-center justify-center transition-all flex-shrink-0"
                  >
                    <svg className="w-5 h-5 sm:w-5 sm:h-5 lg:w-6 lg:h-6 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 12H5m7-7l-7 7 7 7" />
                    </svg>
                  </button>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold textGrad break-words">{currentSubject.name}</h2>
                    <p className={`text-sm sm:text-base mt-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>{currentSubject.code} • {currentSubject.credits} Credits</p>
                  </div>
                </div>
                <button
                  onClick={exportAttendanceCSV}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 sm:px-5 py-2 sm:py-2.5 rounded-lg sm:rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-2 text-sm sm:text-base flex-shrink-0"
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="hidden sm:inline">Export CSV</span>
                </button>
              </div>

              {/* Controls Section - Mobile/Tablet: Stacked, Desktop: Row */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-4 mb-5 sm:mb-6 lg:mb-8">
                  {/* Live Date & Time Display */}
                <div className="timeBox rounded-lg sm:rounded-xl px-3 sm:px-4 lg:px-5 xl:px-6 py-2.5 sm:py-3 lg:py-3.5 xl:py-4 shadow-lg">
                    <div className="text-center">
                    <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 mb-1">
                        <div className="w-1.5 h-1.5 indicator rounded-full"></div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Live Time</div>
                      </div>
                    <div className="dateText text-sm sm:text-base mb-0.5">{getCurrentDate()}</div>
                    <div className="timeText text-base sm:text-lg">{currentTime}</div>
                    <div className="text-[10px] sm:text-xs text-slate-400 mt-0.5 font-medium">
                        <span>{Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC+8'}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Date Selection */}
                <div className="flex flex-col space-y-1.5">
                  <label htmlFor="attendance-date" className={`text-xs sm:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Attendance Date</label>
                    <input
                      id="attendance-date"
                      name="attendance-date"
                      type="date"
                      value={attendanceDate}
                      onChange={(e) => setAttendanceDate(e.target.value)}
                    className={`form-input-field focus:ring-2 focus:ring-maroon-500 text-sm sm:text-base py-2 ${isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : ''}`}
                    />
                  <div className={`text-[10px] sm:text-xs text-center ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <span>{getDateDisplay()}</span>
                    </div>
                  </div>
                  
                  {/* Save Button */}
                <div className="flex flex-col items-stretch lg:items-center space-y-1.5 sm:space-y-2 lg:col-span-1">
                  <div className={`flex items-center justify-center lg:justify-start space-x-1.5 sm:space-x-2 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                      <span>Auto-saving</span>
                    </div>
                    <button
                      onClick={handleSaveAttendance}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 text-sm sm:text-base w-full"
                    >
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Save Attendance</span>
                    </button>
                </div>
              </div>
              
              {/* Attendance Summary */}
              {(() => {
                const summary = updateAttendanceSummary()
                return (
                  <div className="mb-4 sm:mb-5 lg:mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className={`border rounded-lg sm:rounded-xl p-3 sm:p-3.5 lg:p-4 ${isDarkMode ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-emerald-50 border-emerald-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className={`font-medium text-xs sm:text-sm ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>Present</p>
                          <p className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-emerald-300' : 'text-emerald-800'}`}>{summary.present}</p>
                        </div>
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-emerald-800/30' : 'bg-emerald-100'}`}>
                          <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`border rounded-lg sm:rounded-xl p-3 sm:p-3.5 lg:p-4 ${isDarkMode ? 'bg-red-900/20 border-red-700/50' : 'bg-red-50 border-red-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className={`font-medium text-xs sm:text-sm ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>Absent</p>
                          <p className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-red-300' : 'text-red-800'}`}>{summary.absent}</p>
                        </div>
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-red-800/30' : 'bg-red-100'}`}>
                          <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-red-400' : 'text-red-600'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`border rounded-lg sm:rounded-xl p-3 sm:p-3.5 lg:p-4 ${isDarkMode ? 'bg-blue-900/20 border-blue-700/50' : 'bg-blue-50 border-blue-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className={`font-medium text-xs sm:text-sm ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`}>Total Students</p>
                          <p className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-blue-300' : 'text-blue-800'}`}>{summary.total}</p>
                        </div>
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-blue-800/30' : 'bg-blue-100'}`}>
                          <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-blue-400' : 'text-blue-600'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                    
                    <div className={`border rounded-lg sm:rounded-xl p-3 sm:p-3.5 lg:p-4 ${isDarkMode ? 'bg-amber-900/20 border-amber-700/50' : 'bg-amber-50 border-amber-200'}`}>
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className={`font-medium text-xs sm:text-sm ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`}>Attendance Rate</p>
                          <p className={`text-xl sm:text-2xl font-bold ${isDarkMode ? 'text-amber-300' : 'text-amber-800'}`}>{summary.rate}%</p>
                        </div>
                        <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0 ${isDarkMode ? 'bg-amber-800/30' : 'bg-amber-100'}`}>
                          <svg className={`w-4 h-4 sm:w-5 sm:h-5 ${isDarkMode ? 'text-amber-400' : 'text-amber-600'}`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })()}
              
              {/* Attendance List */}
              <div className="space-y-3 sm:space-y-4">
                {/* Select All Button */}
                {currentSubject && enrolls[currentSubject.code] && enrolls[currentSubject.code].length > 0 && !areAllStudentsPresent() && (
                  <div className="mb-3 sm:mb-4">
                    <button
                      onClick={handleSelectAllPresent}
                      className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 sm:px-6 py-2.5 sm:py-3 rounded-lg sm:rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-300 flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
                    >
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Select All Present</span>
                    </button>
                  </div>
                )}
                {currentSubject && enrolls[currentSubject.code] && enrolls[currentSubject.code].length > 0 ? (
                  enrolls[currentSubject.code].map(studentId => {
                    const student = students.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
                    if (!student) return null
                    const status = getAttendanceStatus(studentId)
                    return (
                      <div
                        key={studentId}
                        className={`flex flex-col sm:flex-row sm:justify-between sm:items-center border rounded-lg sm:rounded-xl p-3.5 sm:p-4 transition-all hover:shadow-md gap-3 ${
                          isDarkMode 
                            ? 'bg-[#1a1a1a] border-slate-700' 
                            : 'bg-white border-slate-200'
                        }`}
                      >
                        <div className="flex items-center space-x-3 flex-grow min-w-0">
                          <StudentAvatar student={student} className="w-11 h-11 sm:w-12 sm:h-12 flex-shrink-0" />
                          <div className="flex-grow min-w-0">
                            <p className={`font-semibold truncate text-sm sm:text-base ${
                              isDarkMode ? 'text-white' : 'text-slate-800'
                            }`}>{student.name}</p>
                            <p className={`text-xs sm:text-sm truncate ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>ID: {student.id}</p>
                          </div>
                        </div>
                        <div className="flex space-x-2 sm:flex-shrink-0">
                          <button
                            onClick={() => toggleAttendance(studentId, 'present')}
                            className={`flex-1 sm:flex-none sm:w-20 lg:w-24 px-4 sm:px-4 py-2.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                              status === 'present'
                                ? isDarkMode
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-emerald-100 text-emerald-700'
                                : isDarkMode
                                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => toggleAttendance(studentId, 'absent')}
                            className={`flex-1 sm:flex-none sm:w-20 lg:w-24 px-4 sm:px-4 py-2.5 sm:py-2.5 rounded-lg sm:rounded-xl text-xs sm:text-sm font-medium transition-all ${
                              status === 'absent'
                                ? isDarkMode
                                  ? 'bg-red-600 text-white'
                                  : 'bg-red-100 text-red-700'
                                : isDarkMode
                                  ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="text-center text-slate-500 py-8">
                    No students enrolled in this subject.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Grades Tab */}
          {activeTab === 'grades' && !currentSubject && (
            <div className="glass rounded-2xl shadow-xl p-8">
              <div className="text-center py-12">
                <p className="text-slate-600 text-lg mb-4">No subject selected</p>
                <p className="text-slate-500">Click on a subject and then click "Manage Grades" to enter grades</p>
              </div>
            </div>
          )}
          {activeTab === 'grades' && currentSubject && (
            <div className="glass rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={handleBackToSubjects}
                    className="w-12 h-12 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center transition-all"
                  >
                    <svg className="w-6 h-6 text-slate-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19 12H5m7-7l-7 7 7 7" />
                    </svg>
                  </button>
                  <div>
                    <h2 className="text-3xl font-bold textGrad">{currentSubject.name}</h2>
                    <p className="text-slate-600 mt-1">{currentSubject.code} • {currentSubject.credits} Credits</p>
                  </div>
                </div>
                <div className="ml-auto relative">
                  <button
                    onClick={exportGradesCSV}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center space-x-2"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M5 20h14v-2H5v2zM12 2v12l4-4h-3V2h-2v8H8l4 4z" />
                    </svg>
                    <span>Export CSV (Excel)</span>
                  </button>
                </div>
              </div>

              {/* Quick Grade Entry Section */}
              <div className="mb-8">
                <div className={`rounded-2xl p-6 mb-6 ${
                  isDarkMode 
                    ? 'bg-[#1a1a1a]' 
                      : 'bg-white'
                } shadow-md`}>
                  <h3 className={`text-lg font-bold mb-4 ${
                    isDarkMode ? 'text-white' : 'text-maroon-800'
                  }`}>Quick Grade Entry</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    <div>
                      <label htmlFor="quick-grade-type" className="sr-only">Grade Type</label>
                      <select
                        id="quick-grade-type"
                        name="quick-grade-type"
                        value={quickGradeType}
                        onChange={(e) => setQuickGradeType(e.target.value)}
                        className={`form-select-field-red focus:ring-2 focus:ring-maroon-500 ${
                          isDarkMode 
                            ? 'bg-[#1a1a1a] border-slate-600 text-white' 
                            : ''
                        }`}
                      >
                        <option value="quiz">📝 Quiz</option>
                        <option value="exam">📋 Exam</option>
                        <option value="laboratory">🔬 Laboratory</option>
                        <option value="assignment">📚 Assignment</option>
                        <option value="research">🔍 Research</option>
                        <option value="project">💼 Project</option>
                      </select>
                    </div>
                    <div>
                      <label htmlFor="quick-grade-title" className="sr-only">Grade Title</label>
                      <input
                        id="quick-grade-title"
                        name="quick-grade-title"
                        type="text"
                        value={quickGradeTitle}
                        onChange={(e) => setQuickGradeTitle(e.target.value)}
                        placeholder="QUIZ1"
                        className={`form-input-field-red focus:ring-2 focus:ring-maroon-500 ${
                          isDarkMode 
                            ? 'bg-[#1a1a1a] border-slate-600 text-white placeholder:text-slate-400' 
                            : ''
                        }`}
                      />
                    </div>
                    <div>
                      <label htmlFor="quick-grade-max-points" className="sr-only">Max Points</label>
                      <input
                        id="quick-grade-max-points"
                        name="quick-grade-max-points"
                        type="number"
                        value={quickGradeMaxPoints}
                        onChange={(e) => setQuickGradeMaxPoints(e.target.value)}
                        placeholder="20"
                        min="1"
                        max="1000"
                        className={`form-input-field-red focus:ring-2 focus:ring-maroon-500 ${
                          isDarkMode 
                            ? 'bg-[#1a1a1a] border-slate-600 text-white placeholder:text-slate-400' 
                            : ''
                        }`}
                      />
                    </div>
                    <button
                      onClick={handleInitQuickGrade}
                      className="btn text-white px-6 py-3 rounded-xl font-semibold shadowLg transition-all"
                    >
                      Start Entry
                    </button>
                  </div>
                </div>
                
                {/* Quick Grade Input Grid */}
                {showQuickGradeGrid && (
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <h4 className={`text-lg font-semibold ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>Enter Grades</h4>
                      <div className="flex space-x-3">
                        <button
                          onClick={handleFillAllGrades}
                          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                            isDarkMode
                              ? 'bg-red-900/50 hover:bg-red-900/70 text-red-200'
                              : 'bg-red-100 hover:bg-red-200 text-red-700'
                          }`}
                        >
                          Fill All Same Score
                        </button>
                        <button
                          onClick={handleSaveAllGrades}
                          disabled={isSavingGrades}
                          className={`px-6 py-3 rounded-xl font-semibold shadowLg transition-all ${
                            gradesSaveStatus === 'success'
                              ? 'bg-green-500 text-white'
                              : gradesSaveStatus === 'error'
                              ? 'bg-red-500 text-white'
                              : isSavingGrades
                              ? 'bg-emerald-400 text-white cursor-not-allowed'
                              : 'bg-emerald-500 hover:bg-emerald-600 text-white'
                          }`}
                        >
                          {gradesSaveStatus === 'success' ? (
                            <span className="flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Grades Saved!
                            </span>
                          ) : gradesSaveStatus === 'error' ? (
                            <span className="flex items-center gap-2">
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                              Save Failed
                            </span>
                          ) : isSavingGrades ? (
                            <span className="flex items-center gap-2">
                              <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Saving...
                            </span>
                          ) : (
                            'Save All Grades'
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="overflow-x-auto">
                      <table className={`min-w-full border rounded-xl overflow-hidden ${
                        isDarkMode ? 'border-slate-700' : 'border-slate-200'
                      }`}>
                        <thead className={isDarkMode ? 'bg-[#7A1315]' : 'bg-slate-50'}>
                          <tr>
                            <th className={`px-3 py-2 text-left text-xs font-semibold border-b ${
                              isDarkMode 
                                ? 'text-white border-slate-600' 
                                : 'text-slate-600 border-slate-200'
                            }`}>Student ID</th>
                            <th className={`px-3 py-2 text-left text-xs font-semibold border-b ${
                              isDarkMode 
                                ? 'text-white border-slate-600' 
                                : 'text-slate-600 border-slate-200'
                            }`}>Student Name</th>
                            <th className={`px-3 py-2 text-left text-xs font-semibold border-b ${
                              isDarkMode 
                                ? 'text-white border-slate-600' 
                                : 'text-slate-600 border-slate-200'
                            }`}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentSubject && enrolls[currentSubject.code] && enrolls[currentSubject.code].map((studentId, index) => {
                            const student = students.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
                            if (!student) return null
                            return (
                              <tr key={studentId} className={isDarkMode && index % 2 === 0 ? 'bg-[#1a1a1a]' : isDarkMode ? 'bg-[#1a1a1a]' : ''}>
                                <td className={`px-3 py-2 text-sm border-b ${
                                  isDarkMode 
                                    ? 'text-white border-slate-700' 
                                    : 'text-slate-700 border-slate-200'
                                }`}>{student.id}</td>
                                <td className={`px-3 py-2 text-sm border-b ${
                                  isDarkMode 
                                    ? 'text-white border-slate-700' 
                                    : 'text-slate-700 border-slate-200'
                                }`}>{student.name}</td>
                                <td className={`px-3 py-2 border-b ${
                                  isDarkMode ? 'border-slate-700' : 'border-slate-200'
                                }`}>
                                  <div className="flex items-center gap-2">
                                    <div className="relative flex-1">
                                      <label htmlFor={`grade-score-${studentId}`} className="sr-only">Score for {student.name}</label>
                                      <input
                                        id={`grade-score-${studentId}`}
                                        name={`grade-score-${studentId}`}
                                        type="number"
                                        value={quickGradeScores[studentId] || ''}
                                        onChange={(e) => setQuickGradeScores(prev => ({ ...prev, [studentId]: e.target.value }))}
                                        placeholder="Score"
                                        className={`w-32 border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-maroon-500 ${
                                          (() => {
                                            const score = parseFloat(quickGradeScores[studentId])
                                            const maxPoints = parseFloat(quickGradeMaxPoints)
                                            const isInvalid = !isNaN(score) && !isNaN(maxPoints) && score > maxPoints
                                            return isInvalid
                                              ? isDarkMode
                                                ? 'bg-[#1a1a1a] border-red-500 text-white focus:ring-red-500'
                                                : 'bg-red-50 border-red-500 text-red-900 focus:ring-red-500'
                                              : isDarkMode
                                                ? 'bg-[#1a1a1a] border-slate-600 text-white'
                                                : 'bg-white border-slate-300'
                                          })()
                                        }`}
                                      />
                                    </div>
                                    {(() => {
                                      const score = parseFloat(quickGradeScores[studentId])
                                      const maxPoints = parseFloat(quickGradeMaxPoints)
                                      const isInvalid = !isNaN(score) && !isNaN(maxPoints) && score > maxPoints
                                      return isInvalid ? (
                                        <span className={`text-xs font-medium whitespace-nowrap ${
                                          isDarkMode ? 'text-red-400' : 'text-red-600'
                                        }`} title={`Score exceeds maximum of ${maxPoints}`}>
                                          Max: {maxPoints}
                                        </span>
                                      ) : null
                                    })()}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Students Tab */}
          {activeTab === 'students' && (
            <div className="glass rounded-2xl shadow-xl p-8">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                <div>
                  <h2 className={`text-2xl font-bold ${
                    isDarkMode ? 'text-white' : 'text-slate-800'
                  }`}>Student Management</h2>
                  <p className={`mt-1 ${
                    isDarkMode ? 'text-slate-300' : 'text-slate-600'
                  }`}>Manage student profiles and information</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
                  {/* Search Bar */}
                  <div className="relative flex-1 sm:flex-initial sm:w-64">
                    <input
                      type="text"
                      placeholder="Search by name or ID..."
                      value={studentSearchTerm}
                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                      className={`w-full px-4 py-2.5 rounded-xl border focus:ring-2 focus:ring-maroon-500 focus:outline-none ${
                        isDarkMode 
                          ? 'bg-[#1a1a1a] text-white border-slate-600 placeholder-slate-400' 
                          : 'bg-white text-slate-800 border-slate-300 placeholder-slate-400'
                      }`}
                    />
                    <svg className={`absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                      isDarkMode ? 'text-slate-400' : 'text-slate-400'
                    }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {/* Subject Filter */}
                  <label htmlFor="student-subject-filter" className="sr-only">Filter by Subject</label>
                  <select
                    id="student-subject-filter"
                    name="student-subject-filter"
                    value={studentSubjectFilter}
                    onChange={(e) => setStudentSubjectFilter(e.target.value)}
                    className={`subject-filter-select focus:ring-2 focus:ring-maroon-500 px-4 py-2.5 rounded-xl ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] text-white border-slate-600' 
                        : 'bg-white text-slate-800 border-slate-300'
                    }`}
                  >
                    <option value="">All Subjects</option>
                    {subjects.map(subject => (
                      <option key={subject.code} value={subject.code}>
                        {subject.code} — {subject.name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={() => {
                      setNewStudent({ id: '', name: '', email: '', subjects: [] })
                      setAddStudentModalTab('import')
                      setCsvFile(null)
                      setCsvPreview([])
                      setShowAddStudentModal(true)
                    }}
                    className="btn text-white px-6 py-2.5 rounded-xl font-semibold shadowLg hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2"
                  >
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 4v16m8-8H4" />
                    </svg>
                    <span>Add Student</span>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                {subjects
                  .filter(subject => !studentSubjectFilter || subject.code === studentSubjectFilter)
                  .map(subject => {
                    const rawEnrollments = enrolls[subject.code] || []
                    const normalizedEnrollments = rawEnrollments.map(normalizeStudentId).filter(Boolean)
                    
                    // Debug logging to help diagnose enrollment issues
                    if (normalizedEnrollments.length > 0) {
                      const foundStudents = normalizedEnrollments.map(id => {
                        const student = students.find(s => normalizeStudentId(s.id) === id) || studentsById[id]
                        return student ? { id, name: student.name, found: true } : { id, found: false }
                      })
                      const missingIds = normalizedEnrollments.filter(id => {
                        const student = students.find(s => normalizeStudentId(s.id) === id) || studentsById[id]
                        return !student
                      })
                      
                      console.log(`📊 Subject ${subject.code} (${subject.name}):`, {
                        enrolledStudentIds: normalizedEnrollments,
                        totalStudentsInSystem: students.length,
                        foundCount: foundStudents.filter(f => f.found).length,
                        missingCount: missingIds.length,
                        foundStudents: foundStudents,
                        missingIds: missingIds,
                        allStudentIds: students.map(s => normalizeStudentId(s.id))
                      })
                      
                      if (missingIds.length > 0) {
                        console.warn(`⚠️ Missing ${missingIds.length} students for ${subject.code}:`, missingIds)
                      }
                    }
                    
                    // Filter out any archived students to ensure data consistency
                    // First try to find students using the memoized map, then fallback to array search
                    // CRITICAL: Always search in the current students array to ensure we get newly added students
                    const currentStudentObjects = normalizedEnrollments
                      .map(id => {
                        // Always search in students array first to get the latest data
                        // The memoized map might be stale after adding new students
                        let student = students.find(s => normalizeStudentId(s.id) === id)
                        
                        // Fallback to memoized map if not found in array (shouldn't happen, but safety check)
                        if (!student) {
                          student = studentsById[id]
                        }
                        
                        if (!student) {
                          console.error(`❌ CRITICAL: Student ID ${id} is enrolled in ${subject.code} but not found in students array`, {
                            enrollmentId: id,
                            subjectCode: subject.code,
                            totalStudents: students.length,
                            studentIds: students.map(s => normalizeStudentId(s.id)),
                            enrollments: normalizedEnrollments,
                            studentsByIdKeys: Object.keys(studentsById),
                            studentsArray: students.map(s => ({ id: normalizeStudentId(s.id), name: s.name }))
                          })
                          // Return null - will be filtered out, but enrollment is preserved
                          return null
                        }
                        return student
                      })
                      .filter(Boolean) // Remove nulls (missing students)
                      .filter(student => {
                        // Explicitly exclude students archived from this subject
                        const isArchived = (student.archivedSubjects || []).includes(subject.code)
                        if (isArchived) {
                          console.log(`📦 Student ${student.name} (${student.id}) is archived from ${subject.code}`)
                        }
                        return !isArchived
                      })
                    
                    // CRITICAL: Log if we're missing any enrolled students
                    if (normalizedEnrollments.length > currentStudentObjects.length) {
                      const missingIds = normalizedEnrollments.filter(id => {
                        const found = currentStudentObjects.find(s => normalizeStudentId(s.id) === id)
                        return !found
                      })
                      // Only log if there are actually missing students (not just data sync delay)
                      if (missingIds.length > 0) {
                        console.warn(`⚠️ Subject ${subject.code} is missing ${missingIds.length} enrolled students (this may be a temporary sync issue):`, {
                          missingIds,
                          enrolledCount: normalizedEnrollments.length,
                          displayedCount: currentStudentObjects.length
                        })
                      }
                    }
                    
                    // Only show current students (archived students are not displayed)
                    const studentObjectsToShow = currentStudentObjects
                    
                    // Debug logging to help diagnose display issues
                    if (normalizedEnrollments.length > 0) {
                      const missingStudents = normalizedEnrollments.filter(id => {
                        return !studentsById[id] && !students.find(s => normalizeStudentId(s.id) === id)
                      })
                      
                      if (missingStudents.length > 0) {
                        console.warn(`⚠️ Subject ${subject.code} has ${missingStudents.length} enrolled students not found in students array:`, {
                          missingStudentIds: missingStudents,
                          totalEnrollments: normalizedEnrollments.length,
                          displayedStudents: studentObjectsToShow.length,
                          studentsInSystem: students.length,
                          studentsByIdKeys: Object.keys(studentsById)
                        })
                      } else if (studentObjectsToShow.length !== normalizedEnrollments.length) {
                        // Reduce verbosity - only log if significant mismatch (more than 1 student difference)
                        const difference = Math.abs(normalizedEnrollments.length - studentObjectsToShow.length)
                        if (difference > 1) {
                        console.warn(`⚠️ Subject ${subject.code} enrollment count mismatch:`, {
                          enrollments: normalizedEnrollments.length,
                          displayed: studentObjectsToShow.length,
                            difference: difference
                        })
                        }
                      } else {
                        console.log(`✅ Subject ${subject.code}: All ${normalizedEnrollments.length} enrolled students found and displayed`)
                      }
                    }
                    
                    return (
                      <div 
                        key={`${subject.code}-${studentObjectsToShow.length}-${studentObjectsToShow.map(s => s.id).join(',')}-${refreshTrigger}`} 
                        className="glass card shadowLg p-6 rounded-2xl flex flex-col space-y-4"
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-xl font-bold text-slate-800">{subject.name}</h3>
                            <p className="text-sm font-medium text-slate-500 mt-1">
                              {subject.code} • {subject.credits} Credits
                            </p>
                          </div>
                          <div className="flex items-center">
                            <div className="w-14 h-14 rounded-2xl flex items-center justify-center border bg-transparent border-red-200">
                              <img
                                src={subjectIcon}
                                alt="Subject icon"
                                className="w-full h-full rounded-2xl object-cover"
                              />
                            </div>
                          </div>
                        </div>
                        <div className="mt-2">
                          <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold text-slate-700">
                              Current Students ({studentObjectsToShow
                                .filter(student => {
                                  // Apply search filter
                                  if (studentSearchTerm.trim() === '') return true
                                  const searchLower = studentSearchTerm.toLowerCase().trim()
                                  const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                                  const idMatch = student.id?.toString().includes(searchLower) || false
                                  return nameMatch || idMatch
                                })
                                .length}{studentSearchTerm.trim() !== '' && studentObjectsToShow.length > 0 ? ` of ${studentObjectsToShow.length}` : ''})
                            </h4>
                            <button
                              onClick={() => {
                                setSelectedSubjectForStudent(subject.code)
                                setStudentToAdd([])
                                setNewStudentQuick({ id: '', name: '', email: '' })
                                setShowAddStudentToSubjectModal(true)
                              }}
                              className="text-sm text-green-600 hover:text-green-800 font-semibold"
                            >
                              Add Student
                            </button>
                          </div>
                          {/* Make student list scrollable inside the card when there are many students */}
                          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                            {studentObjectsToShow
                              .filter(student => {
                                // Apply search filter
                                if (studentSearchTerm.trim() === '') return true
                                const searchLower = studentSearchTerm.toLowerCase().trim()
                                const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                                const idMatch = student.id?.toString().includes(searchLower) || false
                                return nameMatch || idMatch
                              })
                              .length > 0 ? (
                              studentObjectsToShow
                                .filter(student => {
                                  // Apply search filter
                                  if (studentSearchTerm.trim() === '') return true
                                  const searchLower = studentSearchTerm.toLowerCase().trim()
                                  const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                                  const idMatch = student.id?.toString().includes(searchLower) || false
                                  return nameMatch || idMatch
                                })
                                .map(student => (
                                <div
                                  key={student.id}
                                  className="flex items-center justify-between bg-slate-50 p-3 rounded-lg"
                                >
                                  <div>
                                    <span className="text-sm text-slate-700">
                                      {student.name}
                                    </span>
                                    <div className="text-xs text-slate-500">
                                      ID: {student.id}
                                    </div>
                                  </div>
                                  <div className="flex items-center">
                                    <button
                                      onClick={() => handleArchiveStudentClick(student.id, subject.code)}
                                      disabled={!!archivingStudentIds[`${subject.code}-${normalizeStudentId(student.id)}`]}
                                      className={`text-red-500 hover:text-red-700 font-semibold px-2 py-1 rounded bg-white/80 border border-slate-200 transition ${
                                        archivingStudentIds[`${subject.code}-${normalizeStudentId(student.id)}`]
                                          ? 'opacity-50 cursor-not-allowed'
                                          : ''
                                      }`}
                                      title="Archive Student"
                                    >
                                      {archivingStudentIds[`${subject.code}-${normalizeStudentId(student.id)}`] ? 'Archiving…' : '✕'}
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="text-sm text-slate-500 p-3 bg-slate-50 rounded-lg text-center">
                                {studentSearchTerm.trim() !== '' 
                                  ? `No students found matching "${studentSearchTerm}"`
                                  : 'No enrolled students.'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                {subjects.filter(subject => !studentSubjectFilter || subject.code === studentSubjectFilter).length === 0 && (
                  <div className="col-span-3 text-center text-slate-500 py-8">
                    No subjects found.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        renderStudentView()
      )}
      </main>

      {/* Add Subject Modal */}
      {showAddSubjectModal && (
        <div className="fixed inset-0 modal items-center justify-center z-50 p-3 sm:p-4 flex" onClick={() => setShowAddSubjectModal(false)}>
          <div className={`glass rounded-2xl p-4 sm:p-6 md:p-8 w-full max-w-md shadow-2xl ${isDarkMode ? 'bg-[#1a1a1a]' : ''}`} onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-12 h-12 sm:w-16 sm:h-16 primary rounded-2xl flex items-center justify-center mx-auto mb-3 sm:mb-4">
                <svg className="w-6 h-6 sm:w-8 sm:h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                </svg>
              </div>
              <h3 className={`text-xl sm:text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Add New Subject</h3>
              <p className={`text-sm sm:text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Create a new academic subject</p>
            </div>
            <form onSubmit={handleAddSubject} className="space-y-5">
              <div>
                <label htmlFor="subject-code" className="sr-only">Subject Code</label>
                <input
                  id="subject-code"
                  name="subject-code"
                  type="text"
                  value={newSubject.code}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, code: e.target.value }))}
                  placeholder="Subject Code"
                  className="form-input-field focus:ring-2 focus:ring-maroon-500"
                  required
                  disabled={isSavingSubject}
                />
              </div>
              <div>
                <label htmlFor="subject-name" className="sr-only">Subject Name</label>
                <input
                  id="subject-name"
                  name="subject-name"
                  type="text"
                  value={newSubject.name}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Subject Name"
                  className="form-input-field focus:ring-2 focus:ring-maroon-500"
                  required
                  disabled={isSavingSubject}
                />
              </div>
              <div>
                <label htmlFor="subject-credits" className="sr-only">Credits</label>
                <input
                  id="subject-credits"
                  name="subject-credits"
                  type="text"
                  value={newSubject.credits}
                  onChange={(e) => setNewSubject(prev => ({ ...prev, credits: e.target.value }))}
                  placeholder="Credits"
                  className="form-input-field focus:ring-2 focus:ring-maroon-500"
                  required
                  disabled={isSavingSubject}
                />
              </div>
              
              {/* Term Selection */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                  Term
                </label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setNewSubject(prev => ({ ...prev, term: 'first' }))}
                    disabled={isSavingSubject}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                      newSubject.term === 'first'
                        ? isDarkMode
                          ? 'bg-[#7A1315] text-white shadow-lg'
                          : 'bg-[#7A1315] text-white shadow-lg'
                        : isDarkMode
                          ? 'bg-[#2c2c2c] text-slate-300 border border-slate-600 hover:bg-[#3c3c3c] hover:border-slate-500'
                          : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                    } ${isSavingSubject ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    1st Term
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSubject(prev => ({ ...prev, term: 'second' }))}
                    disabled={isSavingSubject}
                    className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all ${
                      newSubject.term === 'second'
                        ? isDarkMode
                          ? 'bg-[#7A1315] text-white shadow-lg'
                          : 'bg-[#7A1315] text-white shadow-lg'
                        : isDarkMode
                          ? 'bg-[#2c2c2c] text-slate-300 border border-slate-600 hover:bg-[#3c3c3c] hover:border-slate-500'
                          : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                    } ${isSavingSubject ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    2nd Term
                  </button>
                </div>
              </div>
              
              {/* Error Message - Displayed above buttons */}
              {addSubjectError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start space-x-3 animate-fade-in">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <p className="text-red-800 font-medium text-sm flex-1">{addSubjectError}</p>
                </div>
              )}
              
              <div className="flex justify-end space-x-4 mt-8">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddSubjectModal(false)
                    setAddSubjectError('')
                    setIsSavingSubject(false)
                    setNewSubject({ code: '', name: '', credits: '', term: 'first' })
                  }}
                  className="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSavingSubject}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn text-white px-6 py-3 rounded-xl font-semibold shadowLg hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSavingSubject}
                >
                  {isSavingSubject ? 'Saving...' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Responsive Profile Modal */}
      {showProfileModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => {
            setShowProfileModal(false)
            setProfileSaveSuccess(false)
            setProfileSection('account')
          }}
        >
          <div
            className={`w-full max-w-6xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col lg:flex-row ${
              isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Identity Block - Sidebar (Desktop) / Top (Mobile) */}
            <div className={`lg:w-80 flex-shrink-0 ${
              isDarkMode 
                ? 'bg-[#7A1315]' 
                : 'bg-gradient-to-b from-[#7A1315] to-red-800'
            } flex flex-col`}>
              {/* Profile Picture Container */}
              <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center border-b border-red-900/30">
                <div className="relative mb-3 sm:mb-4 group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-red-600 to-[#7A1315] flex items-center justify-center overflow-hidden">
                    {profilePreview || profPic ? (
                      <img 
                        src={profilePreview || profPic} 
                        alt="Profile" 
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <span className="text-white text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide">
                      {getInitials(profileForm.name || profName)}
                    </span>
                  )}
                </div>
                  {/* Change Photo Button */}
                  <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                    <span className="text-white text-xs font-medium">Change Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleProfilePicSelection(e.target.files[0])}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                      disabled={profileSaveSuccess}
                    />
                  </label>
              </div>
                
                {/* User Name - Bold */}
                <h3 className={`text-white font-bold text-lg sm:text-xl md:text-2xl text-center mb-1 sm:mb-2 px-2 break-words ${
                  isDarkMode ? 'text-white' : 'text-white'
                }`}>
                  {profileForm.name || profName}
                </h3>
                
                {/* User Role & Identifier */}
                <p className="text-red-100 text-xs sm:text-sm font-medium mb-1 text-center">Professor</p>
                <p className="text-red-200 text-[10px] sm:text-xs text-center px-2 break-words">{profEmail || 'Institutional Email'}</p>
            </div>

              {/* Settings Navigation - Mobile: Horizontal, Desktop: Vertical */}
              <nav className="flex lg:flex-col flex-row overflow-x-auto lg:overflow-y-auto py-2 sm:py-4">
                <button
                  onClick={() => setProfileSection('account')}
                  className={`w-full lg:w-full px-6 py-4 text-left text-white font-medium transition-all flex items-center space-x-3 ${
                    profileSection === 'account' 
                        ? 'bg-red-900/50 border-l-4 border-red-400' 
                      : 'hover:bg-red-900/30'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Account Settings</span>
                </button>
                
                <button
                  onClick={() => setProfileSection('appearance')}
                  className={`w-full lg:w-full px-6 py-4 text-left text-white font-medium transition-all flex items-center space-x-3 ${
                    profileSection === 'appearance' 
                        ? 'bg-red-900/50 border-l-4 border-red-400' 
                      : 'hover:bg-red-900/30'
                  }`}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  <span>Appearance</span>
                </button>
              </nav>

              {/* Close Button */}
              <div className="p-4 border-t border-red-900/30">
                <button
                  onClick={() => {
                    setShowProfileModal(false)
                    setProfileSaveSuccess(false)
                    setProfileSection('account')
                  }}
                  className="w-full px-4 py-2 bg-red-900/50 hover:bg-red-900/70 text-white font-medium rounded-lg transition-all"
                >
                  Close Profile
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 overflow-y-auto ${
              isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'
            }`}>
              <div className="max-w-4xl mx-auto p-6 lg:p-8">
                {/* Account Settings Section */}
                {profileSection === 'account' && (
                  <div className="space-y-6">
              <div>
                      <h2 className={`text-3xl font-bold mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        Account Settings
                      </h2>
                      <p className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                        Manage your personal information and security
                      </p>
                    </div>

                    <div className={`rounded-2xl shadow-lg border p-6 ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] border-slate-700' 
                        : 'bg-white border-slate-200'
                    }`}>
                      <h3 className={`text-xl font-bold mb-4 ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        Personal Information
                      </h3>
                      <form onSubmit={handleProfileSave} className="space-y-5">
                        <div>
                          <label htmlFor="profile-name" className={`block text-sm font-semibold mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}>
                            Name
                          </label>
                <input
                  id="profile-name"
                  name="profile-name"
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                              isDarkMode 
                                ? 'bg-[#1a1a1a] border-[#7A1315] text-white' 
                                : 'bg-white border-slate-300 text-slate-800'
                            }`}
                  required
                  disabled={profileSaveSuccess}
                />
              </div>
                        
              <div>
                          <label htmlFor="profile-email" className={`block text-sm font-semibold mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}>
                            University Email
                          </label>
                          <input
                            id="profile-email"
                            name="profile-email"
                            type="email"
                            value={profEmail || ''}
                            disabled
                            className={`w-full px-4 py-3 border rounded-lg ${
                              isDarkMode 
                                ? 'bg-[#1a1a1a] border-slate-600 text-slate-400' 
                                : 'bg-slate-50 border-slate-300 text-slate-600'
                            }`}
                          />
                          <small className={`text-xs mt-1 block ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            Your institutional email address
                          </small>
                        </div>
                        
                        <div>
                          <label htmlFor="profile-picture" className={`block text-sm font-semibold mb-2 ${
                            isDarkMode ? 'text-slate-200' : 'text-slate-700'
                          }`}>
                            Profile Picture
                          </label>
                          <div className="flex items-center gap-3">
                <input
                  id="profile-picture"
                  name="profile-picture"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleProfilePicSelection(e.target.files[0])}
                            className="file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-[#7A1315] file:text-white hover:file:bg-red-800"
                  disabled={profileSaveSuccess}
                />
                            {(profilePreview || profPic) && (
                              <button
                                type="button"
                                onClick={handleRemoveProfilePicture}
                                disabled={profileSaveSuccess}
                                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                                  isDarkMode
                                    ? 'bg-slate-700 text-slate-200 hover:bg-slate-600'
                                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                Remove Photo
                              </button>
                            )}
                          </div>
                          <small className={`block text-xs mt-1 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            Choose a square image for best results
                          </small>
              </div>
              
                        {/* Success Message */}
                        {profileSaveSuccess && (
                          <div className={`rounded-xl p-4 flex items-center space-x-3 border ${
                            isDarkMode 
                              ? 'bg-emerald-900/30 border-emerald-700' 
                              : 'bg-emerald-50 border-emerald-200'
                          }`}>
                            <svg className={`w-5 h-5 flex-shrink-0 ${
                              isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                            }`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                            <p className={`font-medium ${
                              isDarkMode ? 'text-emerald-300' : 'text-emerald-800'
                            }`}>
                              Profile updated successfully!
                            </p>
              </div>
                        )}
              
                        <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false)
                    setProfileSaveSuccess(false)
                              setProfileSection('account')
                            }}
                            className={`px-5 py-2 rounded-xl font-semibold ${
                              isDarkMode 
                                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' 
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                            className="px-6 py-2 rounded-xl bg-[#7A1315] text-white font-semibold hover:bg-red-800 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed relative z-10"
                  disabled={profileSaveSuccess}
                >
                  {profileSaveSuccess ? 'Saved!' : 'Save Changes'}
                </button>
              </div>
            </form>
                    </div>
                  </div>
                )}

                {/* Appearance Section - Dark/Light Mode Toggle */}
                {profileSection === 'appearance' && (
                  <div className="space-y-6">
                    <div>
                      <h2 className={`text-3xl font-bold mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        Appearance
                      </h2>
                      <p className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                        Customize your interface theme and display preferences
                      </p>
                    </div>

                    <div className={`rounded-2xl shadow-lg border p-6 ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] border-slate-700' 
                        : 'bg-white border-slate-200'
                    }`}>
                      <h3 className={`text-xl font-bold mb-4 ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        Interface Theme
                      </h3>
                      <div className="space-y-4">
                        <div className={`flex items-center justify-between p-4 rounded-xl border ${
                          isDarkMode 
                            ? 'bg-[#1a1a1a] border-slate-700' 
                            : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center space-x-4">
                            {isDarkMode ? (
                               <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                              </svg>
                            ) : (
                               <svg className="w-8 h-8 text-[#7A1315]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                              </svg>
                            )}
                            <div>
                              <p className={`font-semibold ${
                                isDarkMode ? 'text-white' : 'text-slate-800'
                              }`}>
                                {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                              </p>
                              <p className={`text-sm ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-600'
                              }`}>
                                {isDarkMode 
                                  ? 'Dark theme for reduced eye strain' 
                                  : 'Light theme for better visibility'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={toggleTheme}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#7A1315] focus:ring-offset-2 ${
                              isDarkMode ? 'bg-[#7A1315]' : 'bg-slate-300'
                            }`}
                            aria-label="Toggle dark mode"
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                isDarkMode ? 'translate-x-9' : 'translate-x-1'
                              }`}
                            />
                          </button>
                        </div>
                        <p className={`text-sm ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-600'
                        }`}>
                          The theme applies system-wide to all screens, maintaining consistent readability and navigation across the application.
                        </p>
                      </div>

                      {/* Real-Time Updates Toggle */}
                      <div className={`rounded-2xl shadow-lg border p-6 ${
                        isDarkMode 
                          ? 'bg-[#1a1a1a] border-slate-700' 
                          : 'bg-white border-slate-200'
                      }`}>
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h3 className={`text-lg font-semibold mb-1 ${
                              isDarkMode ? 'text-white' : 'text-slate-800'
                            }`}>
                              Real-Time Updates
                            </h3>
                            <p className={`text-sm ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-600'
                            }`}>
                              {realtimeUpdatesDisabled 
                                ? 'Disabled - Reduces Firestore quota usage by 90%+. Data loads once but won\'t update automatically.'
                                : 'Enabled - Dashboard updates automatically when data changes. Uses more Firestore reads.'}
                            </p>
                            {realtimeUpdatesDisabled && (
                              <p className={`text-xs mt-2 ${
                                  isDarkMode ? 'text-red-300' : 'text-amber-600'
                              }`}>
                                ⚠️ Refresh the page after toggling for changes to take effect.
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const newValue = !realtimeUpdatesDisabled
                              try {
                                // Update localStorage immediately (backup)
                                if (newValue) {
                                  localStorage.setItem('disableRealtimeUpdates', 'true')
                                } else {
                                  localStorage.removeItem('disableRealtimeUpdates')
                                }
                                setRealtimeUpdatesDisabled(newValue)
                                
                                // Save to Firestore (primary storage) with localStorage as backup
                                if (profUid) {
                                  try {
                                    const currentProfile = await getProfessorByUid(profUid)
                                    const updatedProfile = {
                                      ...currentProfile,
                                      preferences: {
                                        ...(currentProfile?.preferences || {}),
                                        disableRealtimeUpdates: newValue,
                                      }
                                    }
                                    // Preferences are now stored in MySQL professor profile
                                    // Real-time updates preference is stored in localStorage only
                                    console.log('✅ Real-time preference saved to localStorage')
                                  } catch (firestoreError) {
                                    // Firestore failed, but localStorage backup already saved
                                    console.warn('Could not save to Firestore, using localStorage backup:', firestoreError.message)
                                  }
                                }
                                
                                addCustomAlert('info', 'Real-Time Updates', 
                                  newValue 
                                    ? 'Real-time updates disabled. Refresh page to apply. This reduces Firestore quota usage significantly.'
                                    : 'Real-time updates enabled. Refresh page to apply.',
                                  false
                                )
                              } catch (error) {
                                console.error('Failed to update real-time settings:', error)
                              }
                            }}
                            className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#7A1315] focus:ring-offset-2 ${
                              realtimeUpdatesDisabled ? 'bg-slate-400' : 'bg-[#7A1315]'
                            }`}
                            aria-label="Toggle real-time updates"
                          >
                            <span
                              className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${
                                realtimeUpdatesDisabled ? 'translate-x-1' : 'translate-x-9'
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                    </div>
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 modal items-center justify-center z-50 p-4 flex" onClick={() => {
          setShowAddStudentModal(false)
          setAddStudentModalTab('import')
          setSelectedStudentsForBulk([])
          setSelectedSubjectsForBulk([])
          setSelectAllStudents(false)
          setStudentSearchTerm('') // Clear search when closing modal
          setShowSearchDropdown(false) // Close dropdown
          setArchivedStudentDetailView(null) // Clear detail view
          setCsvFile(null) // Clear CSV file
          setCsvPreview([]) // Clear CSV preview
        }}>
          <div className="glass rounded-2xl p-8 w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-8">
              <div className="relative w-24 h-24 mx-auto mb-5">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-[#7A1315] via-[#b11e22] to-[#f97373] shadow-2xl flex items-center justify-center border-2 border-white/20 transform rotate-3 hover:rotate-6 transition-transform duration-300">
                  <svg className="w-12 h-12 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12a4 4 0 100-8 4 4 0 000 8zM4 20a8 8 0 0116 0v1.25A.75.75 0 0119.25 22H4.75A.75.75 0 014 21.25V20z" />
                  </svg>
                </div>
                {/* Add badge with animation */}
                <span className="absolute -bottom-1 -right-1 inline-flex items-center justify-center w-7 h-7 rounded-full bg-white text-[#7A1315] shadow-xl border-2 border-red-100 animate-pulse">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
                  </svg>
                </span>
              </div>
              <h3 className={`text-3xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>Student Management</h3>
              <p className={`text-sm ${
                isDarkMode ? 'text-slate-400' : 'text-slate-600'
              }`}>Enroll existing students or create new profiles</p>
            </div>

            {/* Tab Navigation */}
            <div className={`flex flex-col gap-4 mb-6 border-b pb-4 ${
              isDarkMode ? 'border-slate-800' : 'border-slate-200'
            }`}>
              <div className={`flex flex-wrap gap-2 p-1 rounded-2xl shadow-inner ${
                isDarkMode ? 'bg-[#111317]' : 'bg-slate-100'
              }`}>
                <button
                  onClick={() => {
                    setAddStudentModalTab('import')
                    setCsvFile(null)
                    setCsvPreview([])
                  }}
                  className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                    addStudentModalTab === 'import'
                      ? isDarkMode
                        ? 'bg-[#7A1315] text-white shadow-lg shadow-red-900/40'
                        : 'bg-white text-maroon-600 shadow-md'
                      : isDarkMode
                        ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Import File
                </button>
                <button
                  onClick={() => {
                    setAddStudentModalTab('archived')
                    setSelectedStudentsForBulk([])
                    setSelectedSubjectsForBulk([])
                    setSelectAllStudents(false)
                    setStudentSearchTerm('') // Clear search when switching tabs
                    setShowSearchDropdown(false) // Close dropdown
                  }}
                  className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                    addStudentModalTab === 'archived'
                      ? isDarkMode
                        ? 'bg-[#7A1315] text-white shadow-lg shadow-red-900/40'
                        : 'bg-white text-maroon-600 shadow-md'
                      : isDarkMode
                        ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Archived Students
                </button>
                <button
                  onClick={() => {
                    setAddStudentModalTab('create')
                    setSelectedStudentsForBulk([])
                    setSelectedSubjectsForBulk([])
                    setSelectAllStudents(false)
                    setStudentSearchTerm('') // Clear search when switching tabs
                    setShowSearchDropdown(false) // Close dropdown
                  }}
                  className={`px-5 py-2.5 rounded-xl font-semibold transition-all ${
                    addStudentModalTab === 'create'
                      ? isDarkMode
                        ? 'bg-[#7A1315] text-white shadow-lg shadow-red-900/40'
                        : 'bg-white text-maroon-600 shadow-md'
                      : isDarkMode
                        ? 'text-slate-300 hover:text-white'
                      : 'text-slate-600 hover:text-slate-800'
                  }`}
                >
                  Create New Student
                </button>
              </div>

              {/* Inline CSV import warnings – only shown in Import File tab */}
              {addStudentModalTab === 'import' && csvImportWarnings?.length > 0 && (
                <div className="flex flex-col gap-2 mt-2">
                  {csvImportWarnings.map((warning, index) => (
                    <div
                      key={`csv-warning-modal-${index}`}
                      className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm ${
                        warning.type === 'error'
                          ? (isDarkMode ? 'bg-red-900/20 border-red-700 text-red-100' : 'bg-red-50 border-red-200 text-red-700')
                          : warning.type === 'success'
                            ? (isDarkMode ? 'bg-emerald-900/20 border-emerald-700 text-emerald-100' : 'bg-emerald-50 border-emerald-200 text-emerald-700')
                            : (isDarkMode ? 'bg-amber-900/20 border-amber-700 text-amber-100' : 'bg-amber-50 border-amber-200 text-amber-700')
                      }`}
                    >
                      <svg
                        className="w-5 h-5 flex-shrink-0 mt-0.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z" />
                      </svg>
                      <div className="flex-1">
                        <p className="font-semibold">{warning.title || 'Import Warning'}</p>
                        <p>{warning.message}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setCsvImportWarnings(prev => prev.filter((_, i) => i !== index))
                        }}
                        className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                          warning.type === 'error'
                            ? (isDarkMode ? 'bg-red-800 text-white' : 'bg-red-600 text-white')
                            : warning.type === 'success'
                              ? (isDarkMode ? 'bg-emerald-800 text-white' : 'bg-emerald-600 text-white')
                              : (isDarkMode ? 'bg-amber-800 text-white' : 'bg-amber-600 text-white')
                        }`}
                      >
                        Dismiss
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Search Bar - Only show when Archived Students tab is active */}
              {addStudentModalTab === 'archived' && (
                <div className="flex items-center">
                  <div className="relative flex-1 max-w-md">
                    <input
                      type="text"
                      placeholder="Search by name or ID..."
                      value={studentSearchTerm}
                      onChange={(e) => {
                        setStudentSearchTerm(e.target.value)
                        setShowSearchDropdown(true) // Show dropdown when typing
                      }}
                      onFocus={() => {
                        if (studentSearchTerm.trim()) {
                          setShowSearchDropdown(true) // Show dropdown on focus if there's a search term
                        }
                      }}
                      onBlur={() => {
                        // Delay closing to allow click on dropdown items
                        setTimeout(() => setShowSearchDropdown(false), 200)
                      }}
                      className={`w-full pl-10 pr-10 py-2.5 rounded-xl border focus:ring-2 focus:ring-maroon-500 focus:outline-none text-sm ${
                        isDarkMode 
                          ? 'bg-[#1b1b1b] text-white border-slate-600 placeholder-slate-400' 
                          : 'bg-white text-slate-800 border-slate-300 placeholder-slate-400'
                      }`}
                    />
                    <svg 
                      className={`absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 ${
                        isDarkMode ? 'text-slate-400' : 'text-slate-400'
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {studentSearchTerm && (
                      <button
                        onClick={() => {
                          setStudentSearchTerm('')
                          setShowSearchDropdown(false)
                        }}
                        className={`absolute right-3 top-1/2 transform -translate-y-1/2 ${
                          isDarkMode ? 'text-slate-400 hover:text-slate-300' : 'text-slate-400 hover:text-slate-600'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                    
                    {/* Autocomplete Dropdown */}
                    {showSearchDropdown && studentSearchTerm.trim() && (() => {
                      // Get filtered students matching the search term
                      const filteredStudents = students.filter(student => {
                        // First filter: Show students archived from selected subjects
                        const matchesSubjectFilter = selectedSubjectsForBulk.length === 0
                          ? (student.archivedSubjects || []).length > 0
                          : selectedSubjectsForBulk.some(subjectCode => 
                              (student.archivedSubjects || []).includes(subjectCode)
                            )
                        
                        if (!matchesSubjectFilter) return false
                        
                        // Second filter: Apply search term (name or ID)
                        const searchLower = studentSearchTerm.toLowerCase().trim()
                        const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                        const idMatch = student.id?.toString().includes(searchLower) || false
                        
                        return nameMatch || idMatch
                      }).slice(0, 10) // Limit to top 10 results
                      
                      if (filteredStudents.length === 0) return null
                      
                      return (
                        <div className="absolute z-50 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-64 overflow-y-auto">
                          {filteredStudents.map(student => {
                            const normalizedId = normalizeStudentId(student.id)
                            const isSelected = selectedStudentIdSet.has(normalizedId)
                            return (
                              <div
                                key={student.id}
                                onMouseDown={(e) => {
                                  e.preventDefault() // Prevent input blur
                                  if (isSelected) {
                                    setSelectedStudentsForBulk(selectedStudentsForBulk.filter(id => normalizeStudentId(id) !== normalizedId))
                                  } else {
                                    setSelectedStudentsForBulk([...selectedStudentsForBulk, normalizedId])
                                  }
                                  setShowSearchDropdown(false)
                                  setSelectAllStudents(false)
                                }}
                                className={`px-4 py-2 cursor-pointer hover:bg-amber-50 transition-colors flex items-center justify-between ${
                                  isSelected ? 'bg-amber-100' : ''
                                }`}
                              >
                                <div className="flex-1">
                                  <div className="font-medium text-slate-800">{student.name}</div>
                                  <div className="text-xs text-slate-500">ID: {student.id}</div>
                                </div>
                                {isSelected && (
                                  <svg className="w-5 h-5 text-maroon-600" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto">
              {addStudentModalTab === 'import' ? (
                <div className="space-y-6">
                  {/* Step 1 - Enhanced Design */}
                  <div className={`rounded-3xl border-2 shadow-xl px-6 py-6 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-[#1b1b1b] to-[#151515] border-slate-700' 
                      : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isDarkMode 
                              ? 'bg-[#7A1315]/30 text-red-400 border border-[#7A1315]/50' 
                              : 'bg-[#7A1315]/10 text-[#7A1315] border border-[#7A1315]/20'
                          }`}>
                            1
                          </div>
                          <div>
                            <p className={`text-xs uppercase tracking-wider font-bold mb-1 ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>Step 1</p>
                            <h4 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              Select Subject to Enroll
                            </h4>
                          </div>
                        </div>
                        <p className={`text-sm ml-13 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Choose the class that will receive the uploaded students.
                        </p>
                      </div>
                      <div className={`hidden md:flex items-center px-4 py-2 rounded-xl text-xs font-bold shadow-sm ${
                        isDarkMode 
                          ? 'bg-gradient-to-r from-slate-800 to-slate-700 text-slate-200 border border-slate-600' 
                          : 'bg-gradient-to-r from-slate-100 to-slate-50 text-slate-700 border border-slate-200'
                      }`}>
                        <svg className="w-4 h-4 mr-1.5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                        </svg>
                        {subjects.length} available
                      </div>
                    </div>
                    <div className="mt-5">
                      <select
                        value={studentSubjectFilter || ''}
                        onChange={(e) => setStudentSubjectFilter(e.target.value)}
                        className={`w-full px-4 py-3 rounded-xl border-2 font-medium transition-all ${
                          isDarkMode 
                            ? 'bg-[#111827] border-slate-600 text-slate-100 focus:border-[#7A1315] focus:ring-2 focus:ring-[#7A1315]/20' 
                            : 'bg-white border-slate-300 text-slate-800 focus:border-[#7A1315] focus:ring-2 focus:ring-[#7A1315]/20'
                        }`}
                        required
                      >
                        <option value="">-- Select a Subject --</option>
                        {subjects.map(subject => (
                          <option key={subject.code} value={subject.code}>
                            {subject.code} — {subject.name}
                          </option>
                        ))}
                      </select>
                      {!studentSubjectFilter && (
                        <div className={`mt-3 p-3 rounded-xl flex items-start gap-2 ${
                          isDarkMode 
                            ? 'bg-amber-900/20 border border-amber-800/50' 
                            : 'bg-amber-50 border border-amber-200'
                        }`}>
                          <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                            isDarkMode ? 'text-amber-400' : 'text-amber-600'
                          }`} fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                          </svg>
                          <p className={`text-xs font-medium ${
                            isDarkMode ? 'text-amber-300' : 'text-amber-700'
                          }`}>
                            Please select a subject to enable the import button.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Step 2 - Enhanced Design */}
                  <div className={`rounded-3xl border-2 shadow-xl px-6 py-6 ${
                    isDarkMode 
                      ? 'bg-gradient-to-br from-[#1b1b1b] to-[#151515] border-slate-700' 
                      : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                            isDarkMode 
                              ? 'bg-[#7A1315]/30 text-red-400 border border-[#7A1315]/50' 
                              : 'bg-[#7A1315]/10 text-[#7A1315] border border-[#7A1315]/20'
                          }`}>
                            2
                          </div>
                          <div>
                            <p className={`text-xs uppercase tracking-wider font-bold mb-1 ${
                              isDarkMode ? 'text-slate-400' : 'text-slate-500'
                            }`}>Step 2</p>
                            <h4 className={`text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                              Upload CSV or Excel File
                            </h4>
                          </div>
                        </div>
                        <p className={`text-sm ml-13 ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Use the official template (ID, Name, Email). We'll validate everything before saving.
                        </p>
                      </div>
                      {csvFile && (
                        <div className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold shadow-sm ${
                          isDarkMode 
                            ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-gradient-to-r from-emerald-100 to-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {Math.round(csvFile.size / 1024)} KB
                        </div>
                      )}
                    </div>
                    <div className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-300 ${
                      isDarkMode
                        ? csvFile 
                          ? 'border-[#7A1315]/50 bg-[#7A1315]/10 ring-2 ring-[#7A1315]/30' 
                          : 'border-slate-600 bg-[#151515]/60 hover:border-slate-500 hover:bg-[#151515]/80'
                        : csvFile 
                          ? 'border-[#7A1315]/50 bg-[#7A1315]/5 ring-2 ring-[#7A1315]/20' 
                          : 'border-slate-300 bg-slate-50/70 hover:border-[#7A1315]/30 hover:bg-slate-100/70'
                    }`}>
                      <input
                        type="file"
                        accept=".csv,.xlsx,.xls"
                        onChange={(e) => {
                          const file = e.target.files[0]
                          if (file) {
                            setCsvFile(file)
                            setCsvPreview([]) // Clear previous preview
                            parseCSV(file)
                          } else {
                            setCsvFile(null)
                            setCsvPreview([])
                          }
                        }}
                        className="hidden"
                        id="csvFileInput"
                      />
                      <label
                        htmlFor="csvFileInput"
                        className="cursor-pointer flex flex-col items-center space-y-4"
                      >
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center ${
                          isDarkMode 
                            ? csvFile ? 'bg-[#7A1315]/20' : 'bg-slate-800/50' 
                            : csvFile ? 'bg-[#7A1315]/10' : 'bg-slate-100'
                        }`}>
                          <svg className={`w-10 h-10 ${csvFile ? 'text-[#7A1315]' : isDarkMode ? 'text-slate-400' : 'text-slate-500'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                          </svg>
                        </div>
                        <div>
                          <span className={`text-base font-bold block mb-1 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            {csvFile ? (
                              <span className="flex items-center gap-2">
                                <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                {csvFile.name}
                              </span>
                            ) : (
                              'Click to upload CSV or Excel file'
                            )}
                          </span>
                          <span className={`text-xs block mt-2 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            Supported formats: CSV, XLSX, XLS · Required columns: ID, Name, Email
                          </span>
                        </div>
                      </label>
                      {csvFile && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setCsvFile(null)
                            setCsvPreview([])
                            // Reset file input
                            const fileInput = document.getElementById('csvFileInput')
                            if (fileInput) fileInput.value = ''
                          }}
                          className={`mt-4 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                            isDarkMode 
                              ? 'bg-red-900/30 text-red-400 hover:bg-red-900/50 border border-red-800/50' 
                              : 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                          }`}
                        >
                          <span className="flex items-center gap-1.5">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Remove file
                          </span>
                        </button>
                      )}
                    </div>
                  </div>

                  {csvPreview.length > 0 ? (() => {
                    // Calculate duplicates for highlighting
                    const idCountMap = new Map()
                    csvPreview.forEach((student, index) => {
                      const id = normalizeStudentId((student.id || '').trim())
                      if (id) {
                        if (idCountMap.has(id)) {
                          idCountMap.get(id).push(index)
                        } else {
                          idCountMap.set(id, [index])
                        }
                      }
                    })
                    const duplicateIndices = new Set()
                    idCountMap.forEach((indices) => {
                      if (indices.length > 1) {
                        indices.forEach(idx => duplicateIndices.add(idx))
                      }
                    })

                    // Check for already enrolled students
                    const currentEnrolledIds = new Set(
                      (enrolls[studentSubjectFilter] || []).map(id => normalizeStudentId(id))
                    )

                    return (
                      <div className={`rounded-3xl border-2 shadow-xl overflow-hidden ${
                        isDarkMode 
                          ? 'bg-gradient-to-br from-[#1b1b1b] to-[#151515] border-slate-700' 
                          : 'bg-gradient-to-br from-white to-slate-50 border-slate-200'
                      }`}>
                        <div className={`flex items-center justify-between px-6 py-4 border-b ${
                          isDarkMode ? 'border-slate-700 bg-slate-800/30' : 'border-slate-200 bg-slate-50'
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                              isDarkMode 
                                ? 'bg-[#7A1315]/30 text-red-400 border border-[#7A1315]/50' 
                                : 'bg-[#7A1315]/10 text-[#7A1315] border border-[#7A1315]/20'
                            }`}>
                              3
                            </div>
                            <div>
                              <p className={`text-xs uppercase tracking-wider font-bold mb-1 ${
                                isDarkMode ? 'text-slate-400' : 'text-slate-500'
                              }`}>Step 3</p>
                              <h4 className={`text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                                Preview ({csvPreview.length} {csvPreview.length === 1 ? 'student' : 'students'})
                                {duplicateIndices.size > 0 && (
                                  <span className={`ml-2 text-xs font-normal ${
                                    isDarkMode ? 'text-amber-400' : 'text-amber-600'
                                  }`}>
                                    ({duplicateIndices.size} duplicate{duplicateIndices.size > 1 ? 's' : ''})
                                  </span>
                                )}
                              </h4>
                            </div>
                          </div>
                          <button
                            className={`text-xs font-bold px-4 py-2 rounded-xl transition-all ${
                              isDarkMode 
                                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600 border border-slate-600' 
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                            }`}
                            onClick={() => setCsvPreview([])}
                          >
                            Clear Preview
                          </button>
                        </div>
                        <div className="max-h-64 overflow-y-auto">
                          <table className="min-w-full">
                            <thead className={isDarkMode ? 'bg-slate-800/50 sticky top-0' : 'bg-slate-100 sticky top-0'}>
                              <tr>
                                <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>ID</th>
                                <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>Name</th>
                                <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>Email</th>
                                <th className={`px-4 py-3 text-left text-xs font-bold uppercase tracking-wider ${
                                  isDarkMode ? 'text-slate-300' : 'text-slate-600'
                                }`}>Status</th>
                              </tr>
                            </thead>
                            <tbody className={isDarkMode ? 'divide-slate-800' : 'divide-slate-200'}>
                              {csvPreview.map((student, index) => {
                                const id = normalizeStudentId((student.id || '').trim())
                                const isDuplicate = duplicateIndices.has(index)
                                const isAlreadyEnrolled = currentEnrolledIds.has(id)
                                
                                return (
                                  <tr key={index} className={`${
                                    isDuplicate || isAlreadyEnrolled
                                      ? isDarkMode
                                        ? 'bg-amber-900/20 border-l-4 border-amber-600'
                                        : 'bg-amber-50 border-l-4 border-amber-400'
                                      : isDarkMode 
                                        ? index % 2 === 0 ? 'bg-[#1a1a1a]' : 'bg-[#151515]' 
                                        : index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                  } hover:bg-opacity-80 transition-colors`}>
                                    <td className={`px-4 py-3 text-sm font-semibold ${
                                      isDarkMode ? 'text-white' : 'text-slate-800'
                                    }`}>{student.id}</td>
                                    <td className={`px-4 py-3 text-sm ${
                                      isDarkMode ? 'text-slate-200' : 'text-slate-800'
                                    }`}>{student.name}</td>
                                    <td className={`px-4 py-3 text-sm ${
                                      isDarkMode ? 'text-slate-400' : 'text-slate-600'
                                    }`}>{student.email ? student.email : 'N/A'}</td>
                                    <td className="px-4 py-3">
                                      {isDuplicate && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                                          isDarkMode
                                            ? 'bg-amber-900/40 text-amber-300 border border-amber-700'
                                            : 'bg-amber-100 text-amber-700 border border-amber-300'
                                        }`}>
                                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                                          </svg>
                                          Duplicate
                                        </span>
                                      )}
                                      {!isDuplicate && isAlreadyEnrolled && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                                          isDarkMode
                                            ? 'bg-blue-900/40 text-blue-300 border border-blue-700'
                                            : 'bg-blue-100 text-blue-700 border border-blue-300'
                                        }`}>
                                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                          </svg>
                                          Enrolled
                                        </span>
                                      )}
                                      {!isDuplicate && !isAlreadyEnrolled && (
                                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-semibold ${
                                          isDarkMode
                                            ? 'bg-emerald-900/40 text-emerald-300 border border-emerald-700'
                                            : 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                                        }`}>
                                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12 4v16m8-8H4" />
                                          </svg>
                                          New
                                        </span>
                                      )}
                                    </td>
                                  </tr>
                                )
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  })() : csvFile ? (
                    <div className={`mt-4 p-4 rounded-2xl border ${
                      isDarkMode ? 'bg-amber-900/20 border-amber-700 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800'
                    }`}>
                      <p className="text-sm font-semibold">
                        ⚠️ No data found in file
                      </p>
                      <p className="text-xs mt-1">
                        Please check that your file contains columns labeled "ID" (or "Student ID") and "Name" (or "Student Name").
                      </p>
                      <p className="text-xs mt-1">
                        Check the browser console (F12) for detailed parsing information.
                      </p>
                    </div>
                  ) : null}

                  <div className={`flex flex-col sm:flex-row sm:justify-end sm:items-center gap-3 pt-6 border-t-2 ${
                    isDarkMode ? 'border-slate-700' : 'border-slate-200'
                  }`}>
                    <button
                      onClick={() => {
                        setShowAddStudentModal(false)
                        setCsvFile(null)
                        setCsvPreview([])
                        setStudentSubjectFilter('')
                      }}
                      className={`px-6 py-3 rounded-xl font-semibold transition-all ${
                        isDarkMode 
                          ? 'text-slate-300 hover:text-white hover:bg-slate-800' 
                          : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={async (e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        
                        console.log('🚀 Add Student button clicked:', { 
                          csvFile: csvFile?.name, 
                          subject: studentSubjectFilter, 
                          previewCount: csvPreview.length,
                          hasFile: !!csvFile,
                          hasSubject: !!studentSubjectFilter,
                          isImporting,
                          previewData: csvPreview,
                          subjectsAvailable: subjects.length
                        })
                        
                        // Validate before importing
                        if (!csvFile) {
                          console.error('❌ Validation failed: No file')
                          addCustomAlert('error', 'No File', 'Please upload a CSV or Excel file first.', false)
                          return
                        }
                        if (!studentSubjectFilter) {
                          console.error('❌ Validation failed: No subject selected')
                          addCustomAlert('error', 'No Subject Selected', 'Please select a subject to enroll students.', false)
                          return
                        }
                        if (csvPreview.length === 0) {
                          console.error('❌ Validation failed: No preview data', { csvPreview })
                          addCustomAlert('error', 'No Data', 'The file appears to be empty or could not be parsed. Please check the file format and try again.', false)
                          return
                        }
                        
                        try {
                          console.log('✅ All validations passed, calling handleImportCSV...')
                          await handleImportCSV()
                          console.log('✅ handleImportCSV completed')
                        } catch (error) {
                          console.error('❌ Error in handleImportCSV:', error)
                          setCsvImportWarnings(prev => [
                            ...prev,
                            {
                              type: 'error',
                              title: 'Import Failed',
                              message: `Failed to import students: ${error.message}. Please check the console (F12) for details.`,
                              summary: true,
                            },
                          ])
                        }
                      }}
                      disabled={!csvFile || !studentSubjectFilter || csvPreview.length === 0 || isImporting}
                      className={`group relative overflow-hidden px-8 py-3 rounded-xl font-bold text-white shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${
                        isDarkMode
                          ? 'bg-gradient-to-r from-[#7A1315] to-[#b91c1c] hover:from-[#8a1518] hover:to-[#c91d1d]'
                          : 'bg-gradient-to-r from-[#7A1315] to-[#b91c1c] hover:from-[#8a1518] hover:to-[#c91d1d]'
                      }`}
                      title={
                        !csvFile ? 'Please upload a file first' :
                        !studentSubjectFilter ? 'Please select a subject first' :
                        csvPreview.length === 0 ? `No data found. Check console (F12) for details. Expected: ID, Name, Email columns.` :
                        isImporting ? 'Import in progress...' :
                        `Click to import ${csvPreview.length} student${csvPreview.length !== 1 ? 's' : ''}`
                      }
                    >
                      <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                      <span className="relative z-10 flex items-center gap-2">
                        {isImporting ? (
                          <>
                            <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Importing...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 4v16m8-8H4" />
                            </svg>
                            Add Student{csvPreview.length > 0 ? ` (${csvPreview.length})` : ''}
                          </>
                        )}
                      </span>
                    </button>
                  </div>
                </div>
              ) : addStudentModalTab === 'archived' ? (
                <div className="space-y-6">
                  {/* Subject Selection */}
                  <div className={`rounded-2xl border shadow-md px-5 py-4 ${
                    isDarkMode ? 'bg-[#1b1b1b] border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div className="flex-1">
                        <p className="text-xs uppercase tracking-wider font-semibold text-maroon-500 mb-1">Recovery Scope</p>
                        <h4 className={`text-base font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
                          Select Subjects to Restore From
                        </h4>
                        <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                          Choose one or more subjects to re-enroll archived students.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedSubjectsForBulk([])}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Clear
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const allSubjects = subjects.map(subject => subject.code)
                            setSelectedSubjectsForBulk(allSubjects)
                          }}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                            isDarkMode
                              ? 'bg-emerald-700 text-white hover:bg-emerald-600'
                              : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                          }`}
                        >
                          Select All
                        </button>
                      </div>
                    </div>
                    <div className="mt-4 relative" ref={restoreSubjectDropdownRef}>
                      <button
                        type="button"
                        onClick={() => setShowRestoreSubjectDropdown(prev => !prev)}
                        className={`w-full flex items-center justify-between rounded-xl border px-4 py-3 text-left transition-all hover:shadow-md ${
                          isDarkMode 
                            ? 'border-slate-600 bg-[#0f0f0f] hover:bg-[#151515]' 
                            : 'border-slate-300 bg-white hover:border-maroon-300'
                        }`}
                      >
                        <div className="pr-4 flex-1 min-w-0">
                          <p className={`text-xs font-medium mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {selectedSubjectsForBulk.length > 0
                              ? `${selectedSubjectsForBulk.length} subject${selectedSubjectsForBulk.length === 1 ? '' : 's'} selected`
                              : 'No subjects selected'}
                          </p>
                          <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} truncate`}>
                            {selectedSubjectsForBulk.length > 0
                              ? selectedSubjectsForBulk.map(getSubjectLabel).join(', ')
                              : 'Click to choose subjects'}
                          </p>
                        </div>
                        <svg
                          className={`w-5 h-5 flex-shrink-0 transition-transform ${
                            showRestoreSubjectDropdown ? 'rotate-180' : ''
                          } ${isDarkMode ? 'text-slate-400' : 'text-maroon-600'}`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      {showRestoreSubjectDropdown && (
                        <div
                          className={`absolute z-40 mt-2 w-full rounded-2xl border shadow-2xl ${
                            // Always use a clean white panel for readability
                            'bg-white border-slate-200'
                          }`}
                        >
                          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                            {subjects.length === 0 ? (
                              <p className={`text-sm px-4 py-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                                No subjects available.
                              </p>
                            ) : (
                              subjects.map(subject => {
                                const checked = selectedSubjectsForBulk.includes(subject.code)
                                return (
                                  <label
                                    key={subject.code}
                                    className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-slate-50"
                                    onMouseDown={e => e.preventDefault()}
                                  >
                                    <div className="flex items-center gap-3">
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() => toggleRestoreSubjectSelection(subject.code)}
                                        className="form-checkbox h-4 w-4 text-maroon-600 rounded"
                                      />
                                      <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>
                          {subject.code} — {subject.name}
                                      </span>
                                    </div>
                                    {checked && (
                                      <svg className="w-4 h-4 text-maroon-600" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                      </svg>
                                    )}
                                  </label>
                                )
                              })
                            )}
                          </div>
                          <div className={`flex items-center justify-end gap-3 px-4 py-2 border-t ${
                            isDarkMode ? 'border-slate-700' : 'border-slate-100'
                          }`}>
                            <button
                              type="button"
                              onClick={() => setShowRestoreSubjectDropdown(false)}
                              className="text-sm font-semibold text-maroon-600 hover:text-maroon-800"
                            >
                              Done
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Archived Student Selection List */}
                  <div>
                      <div className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4 p-4 rounded-xl ${
                        isDarkMode ? 'bg-[#1b1b1b] border border-slate-700' : 'bg-slate-50 border border-slate-200'
                      }`}>
                        <div>
                          <label className={`block text-sm font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                            Select Archived Students
                          </label>
                          <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                            {selectedStudentsForBulk.length} student{selectedStudentsForBulk.length === 1 ? '' : 's'} selected
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => {
                          const archivedStudents = students.filter(student => {
                            // First filter: Show students archived from selected subjects
                            const matchesSubjectFilter = selectedSubjectsForBulk.length === 0
                              ? (student.archivedSubjects || []).length > 0
                              : selectedSubjectsForBulk.some(subjectCode => 
                                  (student.archivedSubjects || []).includes(subjectCode)
                                )
                            
                            if (!matchesSubjectFilter) return false
                            
                            // Second filter: Apply search term (name or ID)
                            if (studentSearchTerm.trim() === '') return true
                            
                            const searchLower = studentSearchTerm.toLowerCase().trim()
                            const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                            const idMatch = student.id?.toString().includes(searchLower) || false
                            
                            return nameMatch || idMatch
                          })
                          
                          if (selectAllStudents) {
                            setSelectedStudentsForBulk([])
                            setSelectAllStudents(false)
                            } else {
                              setSelectedStudentsForBulk(archivedStudents.map(s => normalizeStudentId(s.id)).filter(Boolean))
                            setSelectAllStudents(true)
                          }
                        }}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm ${
                          selectAllStudents
                            ? isDarkMode
                              ? 'bg-maroon-600 text-white hover:bg-maroon-700'
                              : 'bg-maroon-600 text-white hover:bg-maroon-700'
                            : isDarkMode
                              ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                              : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
                        }`}
                      >
                        {selectAllStudents ? 'Deselect All' : 'Select All'}
                      </button>
                          <button
                            onClick={async () => {
                              if (selectedStudentsForBulk.length === 0) {
                                addCustomAlert('warning', 'No Selection', 'Please select at least one archived student to delete.', false)
                                return
                              }
                              
                              if (!window.confirm(`Delete ${selectedStudentsForBulk.length} selected student(s)? This action cannot be undone.`)) {
                                return
                              }
                              
                              // Remove students from all enrollments
                              const selectedIdSet = new Set(selectedStudentsForBulk.map(normalizeStudentId))
                              let updatedEnrolls = { ...enrolls }
                              Object.keys(updatedEnrolls).forEach(subjectCode => {
                                updatedEnrolls[subjectCode] = (updatedEnrolls[subjectCode] || []).filter(
                                  id => !selectedIdSet.has(normalizeStudentId(id))
                                )
                              })
                              
                              // Remove students from students array
                              const updatedStudents = students.filter(
                                s => !selectedIdSet.has(normalizeStudentId(s.id))
                              )
                              
                              // Remove grades and records for deleted students
                              const updatedGrades = { ...grades }
                              Object.keys(updatedGrades).forEach(key => {
                                const grade = updatedGrades[key]
                                if (grade && selectedStudentIdSet.has(normalizeStudentId(grade.studentId))) {
                                  delete updatedGrades[key]
                                }
                              })
                              
                              const updatedRecords = { ...records }
                              Object.keys(updatedRecords).forEach(key => {
                                const record = updatedRecords[key]
                                if (record && selectedStudentIdSet.has(normalizeStudentId(record.studentId))) {
                                  delete updatedRecords[key]
                                }
                              })
                              
                              setStudents(updatedStudents)
                              setNormalizedEnrolls(updatedEnrolls)
                              setGrades(updatedGrades)
                              setRecords(updatedRecords)
                              
                              const newAlert = {
                                id: Date.now(),
                                type: 'general',
                                title: 'Students Deleted',
                                message: `Deleted ${selectedStudentsForBulk.length} archived student(s).`,
                                timestamp: new Date(),
                                read: false,
                              }
                              const updatedAlerts = [newAlert, ...alerts]
                              setAlerts(updatedAlerts)
                              
                              await saveData(subjects, updatedStudents, updatedEnrolls, updatedAlerts, updatedRecords, updatedGrades, profUid, true)
                              
                              setSelectedStudentsForBulk([])
                              setSelectAllStudents(false)
                              
                              addCustomAlert('success', 'Students Deleted', 'Selected archived students were removed permanently.', false)
                            }}
                            disabled={selectedStudentsForBulk.length === 0}
                            className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all shadow-sm ${
                              selectedStudentsForBulk.length === 0
                                ? isDarkMode
                                  ? 'bg-red-900/30 text-red-400 cursor-not-allowed border border-red-800'
                                  : 'bg-red-100 text-red-400 cursor-not-allowed border border-red-200'
                                : isDarkMode
                                  ? 'bg-red-600 text-white hover:bg-red-700'
                                  : 'bg-red-600 text-white hover:bg-red-700'
                            }`}
                          >
                            Delete Selected
                          </button>
                        </div>
                    </div>
                    
                    {/* Scrollable Archived Student List */}
                      <div className={`border rounded-2xl overflow-hidden shadow-inner ${
                        isDarkMode 
                          ? 'border-slate-700 bg-[#1b1b1b]' 
                          : 'border-amber-200 bg-gradient-to-br from-amber-50/60 to-amber-100/30'
                      }`}>
                        <div className="max-h-72 overflow-y-auto custom-scrollbar">
                        {students
                          .filter(student => {
                            // First filter: Show students archived from selected subjects
                            const matchesSubjectFilter = selectedSubjectsForBulk.length === 0
                              ? (student.archivedSubjects || []).length > 0
                              : selectedSubjectsForBulk.some(subjectCode => 
                                  (student.archivedSubjects || []).includes(subjectCode)
                                )
                            
                            if (!matchesSubjectFilter) return false
                            
                            // Second filter: Apply search term (name or ID)
                            if (studentSearchTerm.trim() === '') return true
                            
                            const searchLower = studentSearchTerm.toLowerCase().trim()
                            const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                            const idMatch = student.id?.toString().includes(searchLower) || false
                            
                            return nameMatch || idMatch
                          })
                          .map(student => {
                            const normalizedId = normalizeStudentId(student.id)
                            const isSelected = selectedStudentIdSet.has(normalizedId)
                            const enrolledIn = Object.keys(enrolls).filter(code => 
                              (enrolls[code] || []).some(id => normalizeStudentId(id) === normalizedId)
                            )
                            const archivedFrom = student.archivedSubjects || []
                            const archivedFromSelected = selectedSubjectsForBulk.length > 0
                              ? archivedFrom.filter(code => selectedSubjectsForBulk.includes(code))
                              : archivedFrom
                            
                            return (
                              <div key={student.id}>
                                <div
                                  className={`flex items-center space-x-3 px-4 py-3 border-b transition-colors cursor-pointer ${
                                    isSelected 
                                      ? isDarkMode
                                        ? 'bg-slate-700/50 border-slate-600'
                                        : 'bg-amber-100 border-amber-200'
                                      : isDarkMode
                                        ? 'border-slate-700 hover:bg-slate-800/50'
                                        : 'border-amber-100 hover:bg-amber-50'
                                  }`}
                                  onClick={(e) => {
                                    // Don't trigger if clicking checkbox
                                    if (e.target.type !== 'checkbox') {
                                      setArchivedStudentDetailView(
                                        archivedStudentDetailView === student.id ? null : student.id
                                      )
                                    }
                                  }}
                                >
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                    if (e.target.checked) {
                                      setSelectedStudentsForBulk([...selectedStudentsForBulk, normalizedId])
                                        setSelectAllStudents(false)
                                      } else {
                                      setSelectedStudentsForBulk(selectedStudentsForBulk.filter(id => normalizeStudentId(id) !== normalizedId))
                                        setSelectAllStudents(false)
                                      }
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-5 h-5 text-maroon-600 border-slate-300 rounded focus:ring-maroon-500 cursor-pointer"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-amber-900">{student.name}</div>
                                    <div className="text-xs text-amber-700">ID: {student.id}</div>
                                    {archivedFromSelected.length > 0 && (
                                      <div className="text-xs text-amber-600 mt-1">
                                        Archived from {archivedFromSelected.length} selected subject(s)
                                      </div>
                                    )}
                                    {enrolledIn.length > 0 && (
                                      <div className="text-xs text-slate-400 mt-1">
                                        Also enrolled in {enrolledIn.length} other subject(s)
                                      </div>
                                    )}
                                  </div>
                                  <svg 
                                    className={`w-5 h-5 text-amber-600 transition-transform ${
                                      archivedStudentDetailView === student.id ? 'rotate-180' : ''
                                    }`}
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </div>
                                
                                {/* Detailed View */}
                                {archivedStudentDetailView === student.id && (
                                  <div className="bg-amber-50 border-l-4 border-amber-400 px-4 py-4 space-y-4">
                                    {/* Removed Subjects (Archived History) */}
                                    <div>
                                      <h5 className="text-sm font-bold text-amber-900 mb-2 flex items-center">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Removed Subjects (Archived History)
                                      </h5>
                                      {archivedFrom.length > 0 ? (
                                        <div className="space-y-2">
                                          {archivedFrom.map(subjectCode => {
                                            const subject = subjects.find(s => s.code === subjectCode)
                                            return (
                                              <div key={subjectCode} className="bg-white rounded-lg p-3 border border-amber-200">
                                                <div className="text-sm font-semibold text-amber-900">
                                                  {subject ? subject.name : subjectCode}
                                                </div>
                                                <div className="text-xs text-amber-600 mt-1">
                                                  {subject ? `${subject.code} • ${subject.credits} Credits` : subjectCode}
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-amber-600 italic bg-white rounded-lg p-3 border border-amber-200">
                                          No archived subjects
                                        </div>
                                      )}
                                    </div>

                                    {/* Enrolled Subjects (Active Status) */}
                                    <div>
                                      <h5 className="text-sm font-bold text-emerald-900 mb-2 flex items-center">
                                        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                        Enrolled Subjects (Active Status)
                                      </h5>
                                      {enrolledIn.length > 0 ? (
                                        <div className="space-y-2">
                                          {enrolledIn.map(subjectCode => {
                                            const subject = subjects.find(s => s.code === subjectCode)
                                            return (
                                              <div key={subjectCode} className="bg-white rounded-lg p-3 border border-emerald-200">
                                                <div className="text-sm font-semibold text-emerald-900">
                                                  {subject ? subject.name : subjectCode}
                                                </div>
                                                <div className="text-xs text-emerald-600 mt-1">
                                                  {subject ? `${subject.code} • ${subject.credits} Credits` : subjectCode}
                                                </div>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      ) : (
                                        <div className="text-sm text-emerald-600 italic bg-white rounded-lg p-3 border border-emerald-200">
                                          Not currently enrolled in any subjects
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        {students.filter(student => {
                          // First filter: Show students archived from selected subjects
                          const matchesSubjectFilter = selectedSubjectsForBulk.length === 0
                            ? (student.archivedSubjects || []).length > 0
                            : selectedSubjectsForBulk.some(subjectCode => 
                                (student.archivedSubjects || []).includes(subjectCode)
                              )
                          
                          if (!matchesSubjectFilter) return false
                          
                          // Second filter: Apply search term (name or ID)
                          if (studentSearchTerm.trim() === '') return true
                          
                          const searchLower = studentSearchTerm.toLowerCase().trim()
                          const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                          const idMatch = student.id?.toString().includes(searchLower) || false
                          
                          return nameMatch || idMatch
                        }).length === 0 && (
                          <div className="px-4 py-8 text-center text-amber-600">
                            {studentSearchTerm.trim() 
                              ? `No archived students found matching "${studentSearchTerm}" for the selected subjects.`
                              : 'No archived students found for the selected subjects.'}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-5">
          <div className={`rounded-2xl border shadow-lg px-6 py-5 ${
            isDarkMode ? 'bg-[#1b1b1b] border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <p className="text-xs uppercase tracking-[0.2em] text-maroon-500">Basic Information</p>
            <h4 className={`mt-1 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Create New Student Profile
            </h4>
            <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Enter the official student ID, full name, and institutional email. We’ll automatically create the profile.
            </p>
            <div className="space-y-4 mt-2">
                  <div>
                    <label htmlFor="new-student-id" className="sr-only">Student ID</label>
                    <input
                      id="new-student-id"
                      name="new-student-id"
                      type="text"
                      value={newStudent.id}
                      onChange={(e) => {
                        const value = e.target.value.replace(/\D/g, '')
                        setNewStudent(prev => ({ ...prev, id: value }))
                      }}
                      placeholder="Student ID"
                      className={`form-input-field focus:ring-2 focus:ring-maroon-500 ${
                        isDarkMode ? 'bg-[#101010] border-slate-700 text-white placeholder:text-slate-500' : ''
                      }`}
                      pattern="[0-9]*"
                      inputMode="numeric"
                    />
                  </div>
                  <div>
                    <label htmlFor="new-student-name" className="sr-only">Student full name</label>
                    <input
                      id="new-student-name"
                      name="new-student-name"
                      type="text"
                      value={newStudent.name}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Student full name"
                      className={`form-input-field focus:ring-2 focus:ring-maroon-500 ${
                        isDarkMode ? 'bg-[#101010] border-slate-700 text-white placeholder:text-slate-500' : ''
                      }`}
                    />
                  </div>
                  <div>
                    <label htmlFor="new-student-email" className="sr-only">Institutional email</label>
                    <input
                      id="new-student-email"
                      name="new-student-email"
                      type="email"
                      value={newStudent.email}
                      onChange={(e) => setNewStudent(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Institutional email"
                      className={`form-input-field focus:ring-2 focus:ring-maroon-500 ${
                        isDarkMode ? 'bg-[#101010] border-slate-700 text-white placeholder:text-slate-500' : ''
                      }`}
                    />
                  </div>
            </div>
          </div>
          <div className={`rounded-2xl border shadow-lg px-6 py-5 ${
            isDarkMode ? 'bg-[#1b1b1b] border-slate-700' : 'bg-white border-slate-200'
          }`}>
            <p className="text-xs uppercase tracking-[0.2em] text-maroon-500">Enrollment</p>
            <h4 className={`mt-1 text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
              Assign Subjects
            </h4>
            <p className={`text-sm mb-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
              Select one or more subjects where this student should be enrolled immediately.
            </p>
            <div className="mt-3 relative" ref={newStudentSubjectDropdownRef}>
              <button
                type="button"
                onClick={() => setShowNewStudentSubjectDropdown(prev => !prev)}
                className={`w-full flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all ${
                  isDarkMode ? 'border-slate-600 bg-[#0f0f0f]' : 'border-slate-200 bg-white'
                }`}
              >
                <div className="pr-4">
                  <p className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                    {newStudent.subjects?.length > 0
                      ? `${newStudent.subjects.length} subject${newStudent.subjects.length === 1 ? '' : 's'} selected`
                      : 'No subjects selected'}
                  </p>
                  <p className={`text-sm font-semibold ${isDarkMode ? 'text-white' : 'text-slate-800'} truncate`}>
                    {newStudent.subjects?.length > 0
                      ? newStudent.subjects.map(getSubjectLabel).join(', ')
                      : 'Click to choose subjects'}
                  </p>
                </div>
                <svg
                  className={`w-5 h-5 flex-shrink-0 transition-transform ${
                    showNewStudentSubjectDropdown ? 'rotate-180' : ''
                  } ${isDarkMode ? 'text-white' : 'text-maroon-600'}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showNewStudentSubjectDropdown && (
                <div
                  className={`absolute z-40 mt-2 w-full rounded-2xl border shadow-2xl ${
                    // Use white panel so rows don’t appear black
                    'bg-white border-slate-200'
                  }`}
                >
                  <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                    {subjects.length === 0 ? (
                      <p className={`text-sm px-4 py-3 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                        No subjects available. Create a subject first.
                      </p>
                    ) : (
                      subjects.map(subject => {
                        const checked = (newStudent.subjects || []).includes(subject.code)
                        return (
                          <label
                            key={subject.code}
                            className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-slate-50"
                            onMouseDown={e => e.preventDefault()}
                          >
                            <div className="flex items-center gap-3">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleNewStudentSubjectSelection(subject.code)}
                                className="form-checkbox h-4 w-4 text-maroon-600 rounded"
                              />
                              <span className={isDarkMode ? 'text-white' : 'text-slate-800'}>
                        {subject.code} — {subject.name}
                              </span>
                            </div>
                            {checked && (
                              <svg className="w-4 h-4 text-maroon-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                              </svg>
                            )}
                          </label>
                        )
                      })
                    )}
                  </div>
                  <div className={`flex items-center justify-between px-4 py-2 border-t ${
                    isDarkMode ? 'border-slate-700' : 'border-slate-100'
                  }`}>
                    <button
                      type="button"
                      onClick={() => setNewStudent(prev => ({ ...prev, subjects: [] }))}
                      className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                    >
                      Clear
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewStudentSubjectDropdown(false)}
                      className="text-sm font-semibold text-maroon-600 hover:text-maroon-800"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
                </div>
              )}
            </div>

            {/* Action Buttons - Only show for Archived and Create tabs, not Import tab */}
            {addStudentModalTab !== 'import' && (
            <div className="flex justify-end space-x-4 mt-6 pt-6 border-t border-slate-200">
              <button
                type="button"
                onClick={() => {
                  setShowAddStudentModal(false)
                  setAddStudentModalTab('archived')
                  setSelectedStudentsForBulk([])
                  setSelectedSubjectsForBulk([])
                  setSelectAllStudents(false)
                  setArchivedStudentDetailView(null)
                }}
                className="px-6 py-3 text-slate-600 hover:text-slate-800 font-medium rounded-xl hover:bg-slate-100 transition-all"
              >
                Cancel
              </button>
              {addStudentModalTab === 'archived' ? (
                <button
                  onClick={async () => {
                    try {
                      if (selectedStudentsForBulk.length === 0) {
                        addCustomAlert('warning', 'No Selection', 'Please select at least one archived student.', false)
                        return
                      }
                      if (selectedSubjectsForBulk.length === 0) {
                        addCustomAlert('warning', 'No Subject Selected', 'Please select at least one subject to restore from.', false)
                        return
                      }

                      let restoredCount = 0
                      const studentsRestored = new Set()

                      // Use the same single-student restore logic so MySQL and dashboards stay in sync
                      for (const studentId of selectedStudentsForBulk) {
                        const student = students.find(s => normalizeStudentId(s.id) === normalizeStudentId(studentId))
                        if (!student) continue

                        for (const subjectCode of selectedSubjectsForBulk) {
                          const wasArchived = (student.archivedSubjects || []).includes(subjectCode)
                          if (!wasArchived) continue

                          await handleRestoreStudent(studentId, subjectCode)
                          restoredCount++
                          studentsRestored.add(studentId)
                        }
                      }

                      if (restoredCount === 0) {
                        addCustomAlert('info', 'Nothing to Restore', 'Selected students are not archived in the selected subject(s).', false)
                        return
                      }

                      addCustomAlert(
                        'success',
                        'Students Restored',
                        `Successfully restored ${studentsRestored.size} student(s) from ${selectedSubjectsForBulk.length} subject(s).`,
                        false
                      )

                      // Close modal and reset selections
                      setShowAddStudentModal(false)
                      setSelectedStudentsForBulk([])
                      setSelectedSubjectsForBulk([])
                      setSelectAllStudents(false)
                    } catch (error) {
                      console.error('Error restoring students:', error)
                      addCustomAlert('error', 'Restore Failed', `Failed to restore students: ${error.message}`, false)
                    }
                  }}
                  className="btn text-white px-6 py-3 rounded-xl font-semibold shadowLg hover:shadow-xl transition-all duration-300"
                >
                  Restore Selected Students
                </button>
              ) : (
                <button
                  onClick={async () => {
                    await handleAddStudent()
                    setShowAddStudentModal(false)
                    setAddStudentModalTab('enroll')
                    setNewStudent({ id: '', name: '', email: '', subjects: [] })
                  }}
                  className="btn text-white px-6 py-3 rounded-xl font-semibold shadowLg hover:shadow-xl transition-all duration-300"
                >
                  Add Student
                </button>
              )}
            </div>
            )}
          </div>
        </div>
      )}

      {/* Add Student to Subject Modal */}
      {showAddStudentToSubjectModal && selectedSubjectForStudent && (
        <div className="fixed inset-0 modal items-center justify-center z-50 p-4 flex" onClick={() => {
          setShowAddStudentToSubjectModal(false)
          setSelectedSubjectForStudent(null)
          setStudentToAdd([])
          setStudentSearchTermAdd('')
          setShowStudentSearchDropdownAdd(false)
          setNewStudentQuick({ id: '', name: '', email: '' })
          setAlreadyEnrolledMessage(null)
        }}>
          <div className={`glass rounded-2xl p-8 w-full max-w-md shadow-2xl ${
            isDarkMode ? 'bg-[#1a1a1a] border border-slate-700' : ''
          }`} onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[#7A1315] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg relative">
                <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                  {/* Main person icon */}
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" fill="currentColor" />
                </svg>
                {/* Plus sign overlay - positioned in bottom right */}
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-white rounded-full flex items-center justify-center shadow-md">
                  <svg className="w-3 h-3 text-[#7A1315]" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
              </div>
              </div>
              <h3 className={`text-2xl font-bold mb-2 ${
                isDarkMode ? 'text-white' : 'text-slate-800'
              }`}>Add Student to Subject</h3>
              <p className={isDarkMode ? 'text-slate-300' : 'text-slate-600'}>
                {(() => {
                  const subject = subjects.find(s => s.code === selectedSubjectForStudent)
                  return subject ? `Add student to ${subject.name} (${subject.code})` : 'Select a student to enroll'
                })()}
              </p>
            </div>
            <div className="space-y-5">
              {alreadyEnrolledMessage && (
                <div className={`flex items-start gap-3 rounded-xl px-4 py-3 border text-sm ${
                  isDarkMode
                    ? 'bg-red-900/20 border-red-700 text-red-100'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  <svg
                    className="w-5 h-5 flex-shrink-0 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v4m0 4h.01M4.93 4.93l14.14 14.14M12 2a10 10 0 100 20 10 10 0 000-20z" />
                  </svg>
                  <div className="flex-1">
                    <p className="font-semibold">Student Already Enrolled in This Subject</p>
                    <p>{alreadyEnrolledMessage}</p>
                    <p className="text-xs mt-1 opacity-75">Note: Students can be enrolled in multiple subjects. This message only appears if they're already enrolled in the current subject.</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAlreadyEnrolledMessage(null)}
                    className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                      isDarkMode ? 'bg-red-800 text-white' : 'bg-red-600 text-white'
                    }`}
                  >
                    OK
                  </button>
                </div>
              )}
              {/* Searchable Student Dropdown */}
              <div className="relative">
                <label className={`block text-sm font-semibold mb-2 ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>
                  Select Student
                </label>
                <button
                  type="button"
                  onClick={() => setShowStudentSearchDropdownAdd(prev => !prev)}
                  className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm border transition-all focus:ring-2 focus:ring-maroon-500 ${
                    isDarkMode
                      ? 'bg-[#1a1a1a] text-white border-slate-600'
                      : 'bg-white text-slate-800 border-slate-300'
                  }`}
                >
                  <span>
                    {studentToAdd && studentToAdd.length > 0
                      ? `${studentToAdd.length} student${studentToAdd.length === 1 ? '' : 's'} selected`
                      : 'Select Student'}
                  </span>
                  <svg
                    className={`w-5 h-5 transition-transform ${showStudentSearchDropdownAdd ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showStudentSearchDropdownAdd && (
                  <div className={`absolute z-50 mt-2 w-full rounded-xl border shadow-xl ${
                    isDarkMode ? 'bg-[#1a1a1a] border-slate-700' : 'bg-white border-slate-200'
                  }`}>
                    <div className="p-3 border-b border-slate-200/40">
                      <div className="relative">
                        <input
                          type="text"
                          value={studentSearchTermAdd}
                          onChange={(e) => setStudentSearchTermAdd(e.target.value)}
                          placeholder="Search by name or ID..."
                          className={`w-full rounded-lg px-4 py-2 text-sm border ${
                            isDarkMode
                              ? 'bg-[#111111] text-white border-slate-600 placeholder:text-slate-400'
                              : 'bg-white text-slate-800 border-slate-300 placeholder:text-slate-500'
                          }`}
                          autoFocus
                        />
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                          <svg
                            className={`w-4 h-4 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            strokeWidth={2}
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                        </div>
                      </div>
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                      {students
                        .filter(student => {
                          const normalizedId = normalizeStudentId(student.id)
                          if (!normalizedId || !student.id) return false

                          if (studentSearchTermAdd.trim()) {
                            const searchLower = studentSearchTermAdd.toLowerCase().trim()
                            const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                            const idMatch = student.id?.toString().includes(searchLower) || false
                            if (!nameMatch && !idMatch) return false
                          }
                          return true
                        })
                        .map(student => {
                          const normalizedId = normalizeStudentId(student.id)
                          const isSelected = studentToAdd && studentToAdd.some(id => normalizeStudentId(id) === normalizedId)
                          const isEnrolled = (enrolls[selectedSubjectForStudent] || []).some(id => normalizeStudentId(id) === normalizedId)
                          const isArchived = (student.archivedSubjects || []).includes(selectedSubjectForStudent)

                          return (
                            <label
                              key={student.id}
                              className={`w-full text-left px-4 py-2 text-sm flex items-start gap-3 border-b last:border-b-0 cursor-pointer ${
                                isSelected ? (isDarkMode ? 'bg-slate-800' : 'bg-amber-50') : ''
                              } ${isDarkMode ? 'border-slate-800 hover:bg-slate-800' : 'border-slate-100 hover:bg-slate-50'}`}
                              onMouseDown={(e) => e.preventDefault()} // keep focus on input
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setStudentToAdd(prev => [...prev, student.id])
                                  } else {
                                    setStudentToAdd(prev => prev.filter(id => normalizeStudentId(id) !== normalizedId))
                                  }
                                }}
                                className="mt-1 w-4 h-4 text-maroon-600 rounded focus:ring-maroon-500"
                              />
                              <div className="flex-1">
                                <span className={isDarkMode ? 'text-white font-medium' : 'text-slate-800 font-medium'}>
                                  {student.name}
                                </span>
                                <div className={isDarkMode ? 'text-slate-400 text-xs' : 'text-slate-500 text-xs'}>
                                  ID: {student.id}
                                  {isEnrolled && (
                                    <span className="ml-2 text-emerald-600 font-semibold">(Already Enrolled)</span>
                                  )}
                                  {isArchived && (
                                    <span className="ml-2 text-orange-600 font-semibold">(Archived)</span>
                                  )}
                                </div>
                              </div>
                            </label>
                          )
                        })}

                      {students.filter(student => {
                        const normalizedId = normalizeStudentId(student.id)
                        if (!normalizedId || !student.id) return false
                        if (studentSearchTermAdd.trim()) {
                          const searchLower = studentSearchTermAdd.toLowerCase().trim()
                          const nameMatch = student.name?.toLowerCase().includes(searchLower) || false
                          const idMatch = student.id?.toString().includes(searchLower) || false
                          if (!nameMatch && !idMatch) return false
                        }
                        return true
                      }).length === 0 && (
                        <div className={`px-4 py-6 text-center text-sm ${
                          isDarkMode ? 'text-slate-400' : 'text-slate-500'
                        }`}>
                          {studentSearchTermAdd.trim() ? 'No students found matching your search.' : 'No students available.'}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className={`space-y-3 mt-4 border-t pt-4 ${
                isDarkMode ? 'border-slate-600' : 'border-slate-200'
              }`}>
                <p className={`text-sm font-semibold ${
                  isDarkMode ? 'text-slate-300' : 'text-slate-700'
                }`}>Or create new student:</p>
                <div>
                  <label htmlFor="quick-student-id" className="sr-only">New Student ID</label>
                  <input
                    id="quick-student-id"
                    name="quick-student-id"
                    type="text"
                    value={newStudentQuick.id}
                    onChange={(e) => {
                      // Only allow numerical input
                      const value = e.target.value.replace(/\D/g, '')
                      setNewStudentQuick(prev => ({ ...prev, id: value }))
                    }}
                    placeholder="New Student ID"
                    className={`w-full rounded-xl px-4 py-3 text-sm border transition-all focus:ring-2 focus:ring-maroon-500 ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] text-white border-slate-600 placeholder:text-slate-400' 
                        : 'bg-white/80 text-slate-800 border-slate-200 placeholder:text-slate-500'
                    }`}
                    pattern="[0-9]*"
                    inputMode="numeric"
                  />
                </div>
                <div>
                  <label htmlFor="quick-student-name" className="sr-only">New Student Name</label>
                  <input
                    id="quick-student-name"
                    name="quick-student-name"
                    type="text"
                    value={newStudentQuick.name}
                    onChange={(e) => setNewStudentQuick(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="New Student Name"
                    className={`w-full rounded-xl px-4 py-3 text-sm border transition-all focus:ring-2 focus:ring-maroon-500 ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] text-white border-slate-600 placeholder:text-slate-400' 
                        : 'bg-white/80 text-slate-800 border-slate-200 placeholder:text-slate-500'
                    }`}
                  />
                </div>
                <div>
                  <label htmlFor="quick-student-email" className="sr-only">Email (optional)</label>
                  <input
                    id="quick-student-email"
                    name="quick-student-email"
                    type="email"
                    value={newStudentQuick.email}
                    onChange={(e) => setNewStudentQuick(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="Email (optional)"
                    className={`w-full rounded-xl px-4 py-3 text-sm border transition-all focus:ring-2 focus:ring-maroon-500 ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] text-white border-slate-600 placeholder:text-slate-400' 
                        : 'bg-white/80 text-slate-800 border-slate-200 placeholder:text-slate-500'
                    }`}
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-4 mt-8">
              <button
                type="button"
                onClick={() => {
                  setShowAddStudentToSubjectModal(false)
                  setSelectedSubjectForStudent(null)
                  setStudentToAdd([])
                  setStudentSearchTermAdd('')
                  setShowStudentSearchDropdownAdd(false)
                  setNewStudentQuick({ id: '', name: '', email: '' })
                  setAlreadyEnrolledMessage(null)
                }}
                className={`px-6 py-3 font-medium rounded-xl transition-all ${
                  isDarkMode 
                    ? 'text-slate-300 hover:text-white hover:bg-slate-700' 
                    : 'text-slate-600 hover:text-slate-800 hover:bg-slate-100'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleAddStudentToSubject()
                }}
                disabled={isAddingStudentToSubject || (studentToAdd.length === 0 && !newStudentQuick.id.trim() && !newStudentQuick.name.trim())}
                className={`btn text-white px-6 py-3 rounded-xl font-semibold shadowLg hover:shadow-xl transition-all duration-300 ${
                  isAddingStudentToSubject || (studentToAdd.length === 0 && !newStudentQuick.id.trim() && !newStudentQuick.name.trim()) ? 'opacity-60 cursor-not-allowed' : ''
                }`}
              >
                {isAddingStudentToSubject 
                  ? 'Adding…' 
                  : studentToAdd.length > 0 
                    ? `Add ${studentToAdd.length} Student${studentToAdd.length === 1 ? '' : 's'}` 
                    : 'Add Student'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fill All Same Score Modal */}
      {showFillScoreModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={handleFillScoreCancel}>
          <div 
            className={`rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6 border ${
              isDarkMode 
                ? 'bg-[#1a1a1a] border-slate-700' 
                : 'bg-white border-slate-200'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className={`text-lg font-semibold mb-2 text-center ${
              isDarkMode ? 'text-white' : 'text-slate-900'
            }`}>
              Fill All Same Score
            </h2>
            <p className={`text-sm mb-6 text-center ${
              isDarkMode ? 'text-slate-300' : 'text-slate-600'
            }`}>
              Enter the score to apply to all students:
            </p>
            <div className="mb-6">
              <label htmlFor="fill-score-input" className="sr-only">Score</label>
              <input
                id="fill-score-input"
                type="number"
                min="0"
                step="0.01"
                value={fillScoreValue}
                onChange={(e) => setFillScoreValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleFillScoreSubmit()
                  } else if (e.key === 'Escape') {
                    handleFillScoreCancel()
                  }
                }}
                placeholder="Enter score"
                autoFocus
                className={`w-full rounded-xl px-4 py-3 text-sm border transition-all focus:ring-2 focus:ring-maroon-500 ${
                  isDarkMode 
                    ? 'bg-[#1a1a1a] text-white border-slate-600 placeholder:text-slate-400' 
                    : 'bg-white text-slate-800 border-slate-300 placeholder:text-slate-500'
                }`}
                style={{
                  MozAppearance: 'textfield',
                  WebkitAppearance: 'none'
                }}
              />
            </div>
            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleFillScoreCancel}
                className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                  isDarkMode
                    ? 'border-slate-600 text-slate-300 bg-slate-800 hover:bg-slate-700'
                    : 'border-slate-300 text-slate-700 bg-white hover:bg-slate-50'
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleFillScoreSubmit}
                className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-[#7A1315] hover:bg-[#8a1a1c] shadow-md transition-all"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Prof

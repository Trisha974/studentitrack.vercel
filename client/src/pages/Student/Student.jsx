import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import './Student.css'
import { getStudentByUid, setStudent, updateStudent, getStudentByEmail, getStudentByNumericalId } from '../../services/students'
import { getEnrollmentsByStudent, subscribeToStudentEnrollments } from '../../services/enrollments'
import { getGradesByStudent, subscribeToStudentGrades } from '../../services/grades'
import { getAttendanceByStudent, subscribeToStudentAttendance } from '../../services/attendance'
import { getNotifications, subscribeToNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification } from '../../services/notifications'
import { getCourseById } from '../../services/courses'
import { useTheme } from '../../hooks/useTheme'

const defaultData = {
  id: "default",
  name: "Student",
  abs: 0,
  examTaken: 0,
  examTotal: 0,
  attRate: 0,
  avgGrade: 0,
  firstTerm: [],
  secondTerm: [],
  notifs: []
}

function Student() {
  const navigate = useNavigate()
  const [data, setData] = useState(defaultData)
  const [currentFilter, setCurrentFilter] = useState('all')
  const [currentSort, setCurrentSort] = useState('none')
  const [showModal, setShowModal] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterTerm, setFilterTerm] = useState('all')
  const [sortBy, setSortBy] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [showArchived, setShowArchived] = useState(false)
  const [examViewMode, setExamViewMode] = useState('all')
  const [examSearchQuery, setExamSearchQuery] = useState('')
  const [examSortBy, setExamSortBy] = useState('date')
  const [examSortOrder, setExamSortOrder] = useState('desc')
  const [examPage, setExamPage] = useState(1)
  const [examItemsPerPage] = useState(5)
  const [expandedExamTypes, setExpandedExamTypes] = useState({})
  const [showNotifDropdown, setShowNotifDropdown] = useState(false)
  const [showProfileModal, setShowProfileModal] = useState(false)
  const [showProfileDropdown, setShowProfileDropdown] = useState(false)
  const [studentName, setStudentName] = useState('Student')
  const [studentPic, setStudentPic] = useState('/assets/images/trisha.jpg')
  const [studentUid, setStudentUid] = useState(null)
  const [studentEmail, setStudentEmail] = useState('')
  const [studentProfile, setStudentProfile] = useState(null)
  const [profileForm, setProfileForm] = useState({ name: '', pic: null, removePhoto: false })
  const [profilePreview, setProfilePreview] = useState(null)
  const [notifications, setNotifications] = useState([])
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false)
  const [profileSaveError, setProfileSaveError] = useState('')
  const [profileSection, setProfileSection] = useState('account')
  const realtimeUnsubscribeRef = useRef(null)
  const previousDataRef = useRef(null)
  const originalStudentPicRef = useRef(null)
  
  const [studentMySQLId, setStudentMySQLId] = useState(null)
  const [enrollments, setEnrollments] = useState([])
  const [courses, setCourses] = useState([])
  const [liveGrades, setLiveGrades] = useState([])
  const [liveAttendance, setLiveAttendance] = useState([])
  const gradesUnsubscribeRef = useRef(null)
  const attendanceUnsubscribeRef = useRef(null)
  const enrollmentsUnsubscribeRef = useRef(null)
  const notificationsUnsubscribeRef = useRef(null)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)

  const { isDarkMode, toggleTheme } = useTheme()
  const [showLogoutModal, setShowLogoutModal] = useState(false)

  useEffect(() => {
    const handlePopState = (event) => {
      const currentUser = sessionStorage.getItem('currentUser')
      if (currentUser && window.location.pathname === '/login') {
        event.preventDefault()
        window.history.pushState(null, '', '/student')
        navigate('/student', { replace: true })
      }
    }

    window.addEventListener('popstate', handlePopState)
    
    window.history.pushState(null, '', window.location.pathname)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [navigate])

  useEffect(() => {
    // Prevent infinite reloads - check if we're already processing
    const isProcessing = sessionStorage.getItem('studentProfileProcessing')
    if (isProcessing === 'true') {
      console.log('⏸️ Profile processing already in progress, skipping...')
      return
    }

    const loadStudentProfile = async () => {
      const currentUser = sessionStorage.getItem('currentUser')
      if (!currentUser) {
        navigate('/login', { replace: true })
        return
      }

      let userData = null
      try {
        userData = JSON.parse(currentUser)
      } catch (err) {
        console.warn('Failed to parse current user from session', err)
      }

      setStudentUid(userData?.uid || null)
      if (userData?.email) setStudentEmail(userData.email)

      // Use sessionStorage data immediately for instant UI display (optimistic)
      const fallbackName = userData?.name?.trim() || userData?.email?.split('@')[0] || 'Student'
      setStudentName(fallbackName)

      // Load profile and all academic data from MySQL API
      if (userData?.uid) {
        try {
          // Get student profile (contains MySQL ID)
          let profile = await getStudentByUid(userData.uid).catch(err => {
            console.warn('Failed to load student profile:', err)
            return null
          })

          if (profile) {
            setStudentProfile(profile)
            setStudentMySQLId(profile.id) // Store MySQL ID
            
            console.log('✅ Student profile found in MySQL:', {
              mysqlId: profile.id,
              firebaseUid: userData.uid,
              studentId: profile.student_id,
              name: profile.name,
              email: profile.email
            })
            
            // Use exact name from profile
            if (profile.name) {
              setStudentName(profile.name)
            }
            if (profile.photo_url || profile.photoURL) {
              const photoUrl = profile.photo_url || profile.photoURL
              setStudentPic(photoUrl)
              setProfilePreview(photoUrl)
            } else {
              // No photo - reset preview
              setProfilePreview(null)
            }
            if (profile.email) {
              setStudentEmail(profile.email)
            }
            
            // Update session storage with loaded profile data (ensures persistence after refresh)
            const currentUser = sessionStorage.getItem('currentUser')
            if (currentUser) {
              try {
                const userData = JSON.parse(currentUser)
                userData.name = profile.name || userData.name
                userData.email = profile.email || userData.email
                if (profile.photo_url || profile.photoURL) {
                  userData.photoURL = profile.photo_url || profile.photoURL
                }
                sessionStorage.setItem('currentUser', JSON.stringify(userData))
              } catch (err) {
                console.warn('Failed to update session storage', err)
              }
            }

            // Load all academic data in parallel
            console.log('📚 Loading student data for MySQL ID:', profile.id, '(type:', typeof profile.id, ')')
            const [enrollmentsData, gradesData, attendanceData, notificationsData, unreadCount] = await Promise.all([
              getEnrollmentsByStudent(profile.id).catch(err => { 
                console.error('❌ Enrollments error:', err)
                console.error('❌ Enrollment error details:', {
                  studentMySQLId: profile.id,
                  errorMessage: err.message,
                  errorStack: err.stack
                })
                return [] 
              }),
              getGradesByStudent(profile.id).catch(err => { console.error('❌ Grades error:', err); return [] }),
              getAttendanceByStudent(profile.id).catch(err => { console.error('❌ Attendance error:', err); return [] }),
              getNotifications({ limit: 50 }).catch(err => { 
                console.error('❌ Notifications error:', err)
                console.error('❌ Notifications error details:', {
                  message: err.message,
                  response: err.response,
                  status: err.response?.status,
                  data: err.response?.data,
                  studentMySQLId: profile.id
                })
                return [] 
              }),
              getUnreadCount().catch(err => { console.error('❌ Unread count error:', err); return 0 })
            ])
            
            // Ensure notifications is an array
            let notificationsArray = []
            if (Array.isArray(notificationsData)) {
              notificationsArray = notificationsData
            } else if (notificationsData && typeof notificationsData === 'object') {
              if (Array.isArray(notificationsData.data)) {
                notificationsArray = notificationsData.data
              } else if (Array.isArray(notificationsData.notifications)) {
                notificationsArray = notificationsData.notifications
              }
            }
            
            console.log('📊 Loaded data:', {
              enrollments: enrollmentsData.length,
              grades: gradesData.length,
              attendance: attendanceData.length,
              notifications: notificationsArray.length,
              notificationsIsArray: Array.isArray(notificationsData),
              unreadCount,
              notificationsRaw: notificationsData,
              notificationsArray: notificationsArray
            })
            console.log('📊 Enrollments details:', enrollmentsData)
            console.log('📊 Enrollment course IDs:', enrollmentsData.map(e => e.course_id))
            console.log('📊 Notifications sample:', notificationsArray.slice(0, 3))
            console.log('📊 Full notifications data type check:', {
              rawType: typeof notificationsData,
              rawIsArray: Array.isArray(notificationsData),
              arrayLength: notificationsArray.length,
              firstNotification: notificationsArray[0] || null
            })

            setEnrollments(enrollmentsData)
            setLiveGrades(gradesData)
            setLiveAttendance(attendanceData)
            // CRITICAL: Ensure notificationsArray is actually an array
            const finalNotificationsArray = Array.isArray(notificationsArray) ? notificationsArray : []
            console.log('✅ Setting notifications state with', finalNotificationsArray.length, 'notifications')
            setNotifications(finalNotificationsArray)
            setUnreadNotificationCount(unreadCount)

            // Load course details for enrollments
            console.log('📚 Loading course details for', enrollmentsData.length, 'enrollments...')
            console.log('📚 Enrollment course IDs:', enrollmentsData.map(e => ({ 
              enrollmentId: e.id, 
              courseId: e.course_id, 
              courseIdType: typeof e.course_id,
              courseCode: e.code,
              courseName: e.course_name
            })))
            
            // Check if enrollments already include course data (from JOIN query)
            const enrollmentsWithCourseData = enrollmentsData.filter(e => e.code && e.course_name)
            const enrollmentsNeedingCourseLoad = enrollmentsData.filter(e => !e.code || !e.course_name)
            
            console.log('📚 Enrollments with course data:', enrollmentsWithCourseData.length)
            console.log('📚 Enrollments needing course load:', enrollmentsNeedingCourseLoad.length)
            
            // Load courses for enrollments that don't have course data
            const coursePromises = enrollmentsNeedingCourseLoad.map(enrollment => {
              console.log('  → Loading course ID:', enrollment.course_id, '(type:', typeof enrollment.course_id, ')')
              return getCourseById(enrollment.course_id).catch((err) => {
                console.error('  ❌ Failed to load course ID:', enrollment.course_id, err)
                console.error('  ❌ Error details:', {
                  courseId: enrollment.course_id,
                  courseIdType: typeof enrollment.course_id,
                  errorMessage: err.message
                })
                return null
              })
            })
            const coursesData = await Promise.all(coursePromises)
            const loadedCourses = coursesData.filter(Boolean)
            
            // Combine courses from JOIN query and loaded courses
            const coursesFromEnrollments = enrollmentsWithCourseData.map(e => ({
              id: e.course_id,
              code: e.code,
              name: e.course_name,
              credits: e.credits || 0
            }))
            
            const allCourses = [...coursesFromEnrollments, ...loadedCourses]
            // Remove duplicates by course ID
            const uniqueCourses = Array.from(new Map(allCourses.map(c => [c.id, c])).values())
            
            console.log('📚 Total courses loaded:', uniqueCourses.length, ':', uniqueCourses.map(c => ({ id: c.id, code: c.code, name: c.name })))
            setCourses(uniqueCourses)

            // Transform data for UI
            const transformedData = transformDashboardDataFromMySQL(
              enrollmentsData,
              uniqueCourses,
              gradesData,
              attendanceData,
              profile.name || fallbackName
            )
            setData(transformedData)

            console.log('✅ Student dashboard data loaded from MySQL:', {
              enrollments: enrollmentsData.length,
              courses: uniqueCourses.length,
              grades: gradesData.length,
              attendance: attendanceData.length,
              notifications: notificationsData.length,
              unreadCount,
              firstTermSubjects: transformedData.firstTerm?.length || 0,
              secondTermSubjects: transformedData.secondTerm?.length || 0
            })
          } else {
            console.warn('⚠️ Student profile not found in MySQL. Firebase UID:', userData.uid)
            console.warn('💡 Attempting to find or create student profile...')
            
            // Try to find student by email as fallback
            if (userData?.email) {
              console.log('🔍 Trying to find student by email:', userData.email)
              try {
                let studentByEmail = await getStudentByEmail(userData.email)
                
                if (studentByEmail) {
                  console.log('✅ Found student by email:', {
                    mysqlId: studentByEmail.id,
                    firebaseUid: studentByEmail.firebase_uid,
                    studentId: studentByEmail.student_id,
                    name: studentByEmail.name
                  })
                  
                  // Update their Firebase UID if missing or if it's a temp UID
                  if ((!studentByEmail.firebase_uid || studentByEmail.firebase_uid.startsWith('temp_')) && userData.uid) {
                    console.log('🔗 Linking Firebase UID to student MySQL record...')
                    try {
                      // Mark as processing to prevent reload loop
                      sessionStorage.setItem('studentProfileProcessing', 'true')
                      
                      await updateStudent(studentByEmail.id, {
                        firebase_uid: userData.uid,
                        name: studentByEmail.name,
                        email: studentByEmail.email,
                        studentId: studentByEmail.student_id || studentByEmail.studentId,
                      })
                      // Reload profile
                      const updatedProfile = await getStudentByUid(userData.uid)
                      if (updatedProfile) {
                        console.log('✅ Successfully linked Firebase UID to MySQL record')
                        setStudentProfile(updatedProfile)
                        setStudentMySQLId(updatedProfile.id)
                        // Clear processing flag
                        sessionStorage.removeItem('studentProfileProcessing')
                        // Continue loading data instead of reloading
                        profile = updatedProfile
                        // Don't return - continue with data loading below
                      } else {
                        sessionStorage.removeItem('studentProfileProcessing')
                      }
                    } catch (linkError) {
                      console.error('❌ Error linking Firebase UID:', linkError)
                      sessionStorage.removeItem('studentProfileProcessing')
                      // Continue anyway with the student data we found
                      profile = studentByEmail
                    }
                  } else if (studentByEmail.firebase_uid === userData.uid) {
                    // Firebase UID matches, but getStudentByUid didn't find it - use the student we found
                    console.log('🔄 Firebase UID matches, using student found by email')
                    setStudentProfile(studentByEmail)
                    setStudentMySQLId(studentByEmail.id)
                    // Continue with data loading below
                    profile = studentByEmail
                  } else if (!studentByEmail.firebase_uid || studentByEmail.firebase_uid.startsWith('temp_')) {
                    // Student exists but Firebase UID not properly linked - use the student we found anyway
                    console.log('⚠️ Student found but Firebase UID not linked, using student data anyway')
                    setStudentProfile(studentByEmail)
                    setStudentMySQLId(studentByEmail.id)
                    profile = studentByEmail
                  }
                } else {
                  // Student doesn't exist in MySQL by email - try to find by extracted student ID from email
                  console.log('📝 Student not found in MySQL by email, trying to find by student ID from email...')
                  const emailParts = userData.email.split('@')
                  const emailPrefix = emailParts[0]
                  // Try to extract student ID from email (format: name.studentid.tc@umindanao.edu.ph)
                  const emailParts2 = emailPrefix.split('.')
                  let extractedStudentId = null
                  if (emailParts2.length >= 2) {
                    // Try to find a numeric part that looks like a student ID
                    for (let i = emailParts2.length - 1; i >= 0; i--) {
                      if (/^\d+$/.test(emailParts2[i])) {
                        extractedStudentId = emailParts2[i]
                        break
                      }
                    }
                  }
                  
                  if (extractedStudentId) {
                    console.log('🔍 Trying to find student by extracted ID:', extractedStudentId)
                    try {
                      // Try to find student by numerical ID - they might have been enrolled already
                      const studentByNumericalId = await getStudentByNumericalId(extractedStudentId)
                      if (studentByNumericalId) {
                        console.log('✅ Found student by numerical ID! Linking Firebase UID...', {
                          mysqlId: studentByNumericalId.id,
                          studentId: studentByNumericalId.student_id,
                          currentFirebaseUid: studentByNumericalId.firebase_uid
                        })
                        // Link Firebase UID to this existing MySQL record
                        // Use updateStudent directly with MySQL ID to update firebase_uid
                        // Mark as processing to prevent reload loop
                        sessionStorage.setItem('studentProfileProcessing', 'true')
                        
                        await updateStudent(studentByNumericalId.id, {
                          firebase_uid: userData.uid,
                          name: studentByNumericalId.name,
                          email: userData.email, // Use the email from login (might be more current)
                          studentId: studentByNumericalId.student_id,
                        })
                        // Reload profile
                        const updatedProfile = await getStudentByUid(userData.uid)
                        if (updatedProfile) {
                          console.log('✅ Successfully linked Firebase UID to existing MySQL record')
                          setStudentProfile(updatedProfile)
                          setStudentMySQLId(updatedProfile.id)
                          // Clear processing flag
                          sessionStorage.removeItem('studentProfileProcessing')
                          // Continue loading data instead of reloading
                          profile = updatedProfile
                          // Don't return - continue with data loading below
                        } else {
                          sessionStorage.removeItem('studentProfileProcessing')
                        }
                      } else {
                        // Student doesn't exist - create them
                        console.log('📝 Student not found by ID either, creating new profile...')
                        // Mark as processing to prevent reload loop
                        sessionStorage.setItem('studentProfileProcessing', 'true')
                        
                        await setStudent(userData.uid, {
                          name: userData.name || emailPrefix.split('.')[0] || 'Student',
                          email: userData.email,
                          studentId: extractedStudentId,
                        })
                        // Reload profile
                        const newProfile = await getStudentByUid(userData.uid)
                        if (newProfile) {
                          console.log('✅ Created new student profile in MySQL')
                          setStudentProfile(newProfile)
                          setStudentMySQLId(newProfile.id)
                          // Clear processing flag
                          sessionStorage.removeItem('studentProfileProcessing')
                          // Continue loading data instead of reloading
                          profile = newProfile
                          // Don't return - continue with data loading below
                        } else {
                          sessionStorage.removeItem('studentProfileProcessing')
                        }
                      }
                    } catch (err) {
                      console.error('❌ Error finding/creating student by ID:', err)
                    }
                  } else {
                    console.warn('⚠️ Could not extract student ID from email. Student may need to be enrolled by professor first.')
                  }
                }
              } catch (err) {
                console.error('❌ Error finding/creating student:', err)
              }
            }
            
            // If we have a profile (from fallback logic), load data for it
            if (profile && profile.id) {
              console.log('📚 Loading data for profile found via fallback logic...')
              
              // Load all academic data in parallel
              console.log('📚 Loading student data for MySQL ID:', profile.id, '(type:', typeof profile.id, ')')
              const [enrollmentsData, gradesData, attendanceData, notificationsData, unreadCount] = await Promise.all([
                getEnrollmentsByStudent(profile.id).catch(err => { 
                  console.error('❌ Enrollments error:', err)
                  console.error('❌ Enrollment error details:', {
                    studentMySQLId: profile.id,
                    errorMessage: err.message,
                    errorStack: err.stack
                  })
                  return [] 
                }),
                getGradesByStudent(profile.id).catch(err => { console.error('❌ Grades error:', err); return [] }),
                getAttendanceByStudent(profile.id).catch(err => { console.error('❌ Attendance error:', err); return [] }),
                // Load notification history (both read and unread)
                getNotifications({ limit: 50 }).catch(err => { 
                  console.error('❌ Notifications error:', err); 
                  console.error('❌ Notifications error details:', {
                    message: err.message,
                    response: err.response,
                    status: err.response?.status,
                    data: err.response?.data,
                    stack: err.stack
                  });
                  // Don't silently fail - show error to user
                  if (err.response?.status === 404) {
                    console.warn('⚠️ Student profile not found - notifications cannot be loaded')
                  } else if (err.response?.status === 403) {
                    console.warn('⚠️ Access denied - invalid user role')
                  } else {
                    console.error('❌ Unexpected error loading notifications')
                  }
                  return [] 
                }),
                getUnreadCount().catch(err => { console.error('❌ Unread count error:', err); return 0 })
              ])
              
              console.log('📊 Loaded data:', {
                enrollments: enrollmentsData.length,
                grades: gradesData.length,
                attendance: attendanceData.length,
                notifications: notificationsData?.length || 0
              })
              console.log('📊 Notifications data type:', typeof notificationsData, Array.isArray(notificationsData))
              console.log('📊 Notifications data:', notificationsData)
              console.log('📊 Enrollments details:', enrollmentsData)
              console.log('📊 Enrollment course IDs:', enrollmentsData.map(e => e.course_id))

              setEnrollments(enrollmentsData)
              setLiveGrades(gradesData)
              setLiveAttendance(attendanceData)
              
              // Ensure notifications is an array
              const normalizedNotifications = Array.isArray(notificationsData) ? notificationsData : []
              console.log('📬 Setting notifications state:', {
                count: normalizedNotifications.length,
                isArray: Array.isArray(notificationsData),
                originalData: notificationsData
              })
              // CRITICAL: Ensure normalizedNotifications is actually an array
              const finalNotificationsArray = Array.isArray(normalizedNotifications) ? normalizedNotifications : []
              setNotifications(finalNotificationsArray)
              setUnreadNotificationCount(unreadCount)

              // Load course details for enrollments
              console.log('📚 Loading course details for', enrollmentsData.length, 'enrollments...')
              console.log('📚 Enrollment course IDs:', enrollmentsData.map(e => ({ 
                enrollmentId: e.id, 
                courseId: e.course_id, 
                courseIdType: typeof e.course_id,
                courseCode: e.code,
                courseName: e.course_name
              })))
              
              // Check if enrollments already include course data (from JOIN query)
              const enrollmentsWithCourseData = enrollmentsData.filter(e => e.code && e.course_name)
              const enrollmentsNeedingCourseLoad = enrollmentsData.filter(e => !e.code || !e.course_name)
              
              console.log('📚 Enrollments with course data:', enrollmentsWithCourseData.length)
              console.log('📚 Enrollments needing course load:', enrollmentsNeedingCourseLoad.length)
              
              // Load courses for enrollments that don't have course data
              const coursePromises = enrollmentsNeedingCourseLoad.map(enrollment => {
                console.log('  → Loading course ID:', enrollment.course_id, '(type:', typeof enrollment.course_id, ')')
                return getCourseById(enrollment.course_id).catch((err) => {
                  console.error('  ❌ Failed to load course ID:', enrollment.course_id, err)
                  console.error('  ❌ Error details:', {
                    courseId: enrollment.course_id,
                    courseIdType: typeof enrollment.course_id,
                    errorMessage: err.message
                  })
                  return null
                })
              })
              const coursesData = await Promise.all(coursePromises)
              const loadedCourses = coursesData.filter(Boolean)
              
              // Combine courses from JOIN query and loaded courses
              const coursesFromEnrollments = enrollmentsWithCourseData.map(e => ({
                id: e.course_id,
                code: e.code,
                name: e.course_name,
                credits: e.credits || 0,
                term: e.term || 'first' // Include term from enrollment JOIN
              }))
              
              const allCourses = [...coursesFromEnrollments, ...loadedCourses]
              // Remove duplicates by course ID
              const uniqueCourses = Array.from(new Map(allCourses.map(c => [c.id, c])).values())
              
              console.log('📚 Total courses loaded:', uniqueCourses.length, ':', uniqueCourses.map(c => ({ id: c.id, code: c.code, name: c.name })))
              setCourses(uniqueCourses)

              // Transform data for UI
              const transformedData = transformDashboardDataFromMySQL(
                enrollmentsData,
                uniqueCourses,
                gradesData,
                attendanceData,
                profile.name || fallbackName
              )
              setData(transformedData)

              console.log('✅ Student dashboard data loaded from MySQL:', {
                enrollments: enrollmentsData.length,
                courses: uniqueCourses.length,
                grades: gradesData.length,
                attendance: attendanceData.length,
                notifications: notificationsData.length,
                unreadCount,
                firstTermSubjects: transformedData.firstTerm?.length || 0,
                secondTermSubjects: transformedData.secondTerm?.length || 0
              })
            } else if (!profile) {
              // If we still don't have a profile, show a message
              console.error('❌ Could not load or create student profile')
              console.warn('💡 Student may need to be enrolled by professor first, or their Firebase UID may not be linked to their MySQL record.')
            }
          }
        } catch (error) {
          console.error('Error loading student data:', error)
          // Clear processing flag on error
          sessionStorage.removeItem('studentProfileProcessing')
        }
      }
    }

    loadStudentProfile()
    
    // Cleanup function
    return () => {
      if (realtimeUnsubscribeRef.current) {
        realtimeUnsubscribeRef.current()
        realtimeUnsubscribeRef.current = null
      }
      if (gradesUnsubscribeRef.current) {
        gradesUnsubscribeRef.current()
        gradesUnsubscribeRef.current = null
      }
      if (attendanceUnsubscribeRef.current) {
        attendanceUnsubscribeRef.current()
        attendanceUnsubscribeRef.current = null
      }
    }
  }, [navigate])

  // Refs to store latest values for use in callbacks
  const enrollmentsRef = useRef(enrollments)
  const coursesRef = useRef(courses)
  const liveGradesRef = useRef(liveGrades)
  const liveAttendanceRef = useRef(liveAttendance)
  const studentNameRef = useRef(studentName)

  // Update refs when state changes
  useEffect(() => {
    enrollmentsRef.current = enrollments
  }, [enrollments])
  useEffect(() => {
    coursesRef.current = courses
  }, [courses])
  useEffect(() => {
    liveGradesRef.current = liveGrades
  }, [liveGrades])
  useEffect(() => {
    liveAttendanceRef.current = liveAttendance
  }, [liveAttendance])
  useEffect(() => {
    studentNameRef.current = studentName
  }, [studentName])

  // Function to manually refresh notifications
  const refreshNotifications = useCallback(async () => {
    if (!studentMySQLId) {
      console.warn('⚠️ Cannot refresh notifications: studentMySQLId not set')
      return
    }
    
    console.log('🔄 Manually refreshing notifications for student MySQL ID:', studentMySQLId)
    
    // Check if server is reachable first
    const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    try {
      // Test server connection first
      const healthCheck = await fetch(`${API_BASE_URL.replace('/api', '')}/api/health`)
      if (!healthCheck.ok) {
        throw new Error(`Server health check failed: ${healthCheck.status}`)
      }
      console.log('✅ Server is reachable')
    } catch (healthError) {
      console.error('❌ Server connection test failed:', healthError)
      console.error('💡 Please ensure the backend server is running:')
      console.error('   1. Open a terminal in the server directory')
      console.error('   2. Run: npm start (or npm run dev)')
      console.error('   3. Verify server is running on http://localhost:5000')
      console.error(`   4. Check API URL: ${API_BASE_URL}`)
      // Don't proceed if server is not reachable
      return
    }
    
    try {
      console.log('🔄 Fetching notifications and unread count for student MySQL ID:', studentMySQLId)
      
      // CRITICAL: Fetch notifications and unread count separately to debug
      console.log('🔄 Starting API calls for student MySQL ID:', studentMySQLId)
      
      let notificationsData = []
      let unreadCountResponse = 0
      
      try {
        console.log('📞 Calling getNotifications API for student MySQL ID:', studentMySQLId)
        console.log('📞 Note: Backend will resolve student ID from Firebase UID, which may differ from frontend studentMySQLId')
        notificationsData = await getNotifications({ limit: 50 })
        console.log('📞 getNotifications returned:', {
          type: typeof notificationsData,
          isArray: Array.isArray(notificationsData),
          length: Array.isArray(notificationsData) ? notificationsData.length : 'N/A',
          data: notificationsData,
          firstItem: Array.isArray(notificationsData) && notificationsData.length > 0 ? notificationsData[0] : null
        })
        
        // CRITICAL: If empty array but unread count > 0, log warning
        if (Array.isArray(notificationsData) && notificationsData.length === 0) {
          console.warn('⚠️ getNotifications returned empty array. Check server logs to see which student ID was resolved.')
        }
      } catch (notifError) {
        console.error('❌ Error calling getNotifications:', notifError)
        notificationsData = []
      }
      
      try {
        console.log('📞 Calling getUnreadCount API...')
        unreadCountResponse = await getUnreadCount()
        console.log('📞 getUnreadCount returned:', {
          type: typeof unreadCountResponse,
          value: unreadCountResponse
        })
      } catch (countError) {
        console.error('❌ Error calling getUnreadCount:', countError)
        unreadCountResponse = 0
      }
      
      // Handle unread count response (could be number or object)
      const unreadCount = typeof unreadCountResponse === 'number' 
        ? unreadCountResponse 
        : (unreadCountResponse?.count || 0)
      
      // CRITICAL: Log the FULL response structure to understand what we're receiving
      console.log('📬 Raw notifications API response:', {
        notificationsData: notificationsData,
        notificationsDataType: typeof notificationsData,
        notificationsIsArray: Array.isArray(notificationsData),
        notificationsLength: Array.isArray(notificationsData) ? notificationsData.length : 'N/A',
        notificationsDataKeys: notificationsData && typeof notificationsData === 'object' && !Array.isArray(notificationsData) ? Object.keys(notificationsData) : null,
        notificationsDataValues: notificationsData && typeof notificationsData === 'object' && !Array.isArray(notificationsData) 
          ? Object.entries(notificationsData).map(([k, v]) => ({ 
              key: k, 
              valueType: typeof v, 
              isArray: Array.isArray(v),
              sample: Array.isArray(v) ? `Array[${v.length}]` : (typeof v === 'object' && v !== null ? Object.keys(v).slice(0, 3) : String(v).substring(0, 50))
            }))
          : null,
        fullResponseString: JSON.stringify(notificationsData, null, 2).substring(0, 2000),
        unreadCountResponse: unreadCountResponse,
        unreadCount: unreadCount,
        studentMySQLId: studentMySQLId
      })
      
      // Ensure notifications is an array - handle all possible response formats
      let notificationsArray = []
      if (Array.isArray(notificationsData)) {
        // Direct array response
        notificationsArray = notificationsData
        console.log('✅ Notifications is direct array, length:', notificationsArray.length)
      } else if (notificationsData && typeof notificationsData === 'object') {
        // Try to extract array from object - check ALL possible properties
        const keys = Object.keys(notificationsData)
        console.log('🔍 Object response detected. Checking keys:', keys)
        
        // Try common array properties first
        const commonKeys = ['data', 'notifications', 'items', 'results', 'list', 'array', 'notificationsList']
        let found = false
        
        for (const key of commonKeys) {
          if (Array.isArray(notificationsData[key])) {
            notificationsArray = notificationsData[key]
            console.log(`✅ Found notifications in .${key} property, length:`, notificationsArray.length)
            found = true
            break
          }
        }
        
        // If not found in common keys, check ALL properties
        if (!found) {
          for (const key of keys) {
            if (Array.isArray(notificationsData[key])) {
              notificationsArray = notificationsData[key]
              console.log(`✅ Found array in .${key} property, length:`, notificationsArray.length)
              found = true
              break
            }
          }
        }
        
        // If still not found, check if object values are arrays (for objects like {0: {...}, 1: {...}})
        if (!found && keys.length > 0) {
          const firstValue = notificationsData[keys[0]]
          if (Array.isArray(firstValue)) {
            notificationsArray = firstValue
            console.log(`✅ Found array as first property value, length:`, notificationsArray.length)
            found = true
          } else if (typeof firstValue === 'object' && firstValue !== null) {
            // Check if it's an array-like object
            const values = Object.values(notificationsData)
            if (values.every(v => typeof v === 'object' && v !== null && !Array.isArray(v))) {
              // Convert object with numeric keys to array
              notificationsArray = values
              console.log(`✅ Converted object with ${values.length} items to array`)
              found = true
            }
          }
        }
        
        if (!found) {
          console.error('❌ Notifications response is object but no array found!')
          console.error('❌ Response keys:', keys)
          console.error('❌ Response structure:', JSON.stringify(notificationsData, null, 2).substring(0, 2000))
          console.error('❌ All property types:', keys.map(k => ({ key: k, type: typeof notificationsData[k], isArray: Array.isArray(notificationsData[k]) })))
        }
      } else if (notificationsData === null || notificationsData === undefined) {
        console.error('❌ Notifications response is null or undefined!')
      } else {
        console.error('❌ Unexpected notifications response type:', typeof notificationsData, notificationsData)
      }
      
      console.log('✅ Manually refreshed notifications:', {
        count: notificationsArray.length,
        unreadCount: unreadCount,
        unreadCountType: typeof unreadCount,
        firstNotification: notificationsArray[0] || null,
        allIds: notificationsArray.map(n => n.id).slice(0, 5),
        studentMySQLId: studentMySQLId,
        mismatch: unreadCount > 0 && notificationsArray.length === 0 ? '⚠️ MISMATCH DETECTED' : '✅ OK'
      })
      
      // If there's a mismatch, log detailed info and try to extract data
      if (unreadCount > 0 && notificationsArray.length === 0) {
        console.error('❌ CRITICAL MISMATCH: Badge shows', unreadCount, 'unread but notifications array is empty!')
        console.error('❌ Student MySQL ID used:', studentMySQLId)
        console.error('❌ Notifications data received:', {
          raw: notificationsData,
          type: typeof notificationsData,
          isArray: Array.isArray(notificationsData),
          keys: notificationsData && typeof notificationsData === 'object' && !Array.isArray(notificationsData) ? Object.keys(notificationsData) : null,
          stringified: JSON.stringify(notificationsData, null, 2).substring(0, 1000), // Full structure
          allValues: notificationsData && typeof notificationsData === 'object' && !Array.isArray(notificationsData) 
            ? Object.entries(notificationsData).map(([k, v]) => ({ key: k, type: typeof v, isArray: Array.isArray(v), sample: JSON.stringify(v).substring(0, 100) }))
            : null
        })
        
        // Try one more time to extract array from object
        if (notificationsData && typeof notificationsData === 'object' && !Array.isArray(notificationsData)) {
          const keys = Object.keys(notificationsData)
          console.log('🔄 Attempting to extract array from object keys:', keys)
          
          // Check every property
          for (const key of keys) {
            const value = notificationsData[key]
            console.log(`  - ${key}: type=${typeof value}, isArray=${Array.isArray(value)}`)
            if (Array.isArray(value)) {
              console.log(`✅ Found array in ${key} with ${value.length} items!`)
              notificationsArray = value
              // CRITICAL: Ensure notificationsArray is actually an array
              const finalNotificationsArray = Array.isArray(notificationsArray) ? notificationsArray : []
              setNotifications(finalNotificationsArray)
              const calculatedUnread = finalNotificationsArray.filter(n => !n.read || n.read === 0).length
              setUnreadNotificationCount(calculatedUnread)
              console.log('✅ Fixed mismatch by extracting array from', key)
              return // Exit early since we fixed it
            }
          }
        }
        
        console.error('💡 Check server logs for: "📬 Found X notifications for Student ID"')
        console.error('💡 This mismatch suggests the API returned empty array despite unread count > 0')
        console.error('💡 Check Network tab in browser DevTools to see actual API response')
      }
      
      // CRITICAL: Always ensure notificationsArray is actually an array before setting state
      const finalNotificationsArray = Array.isArray(notificationsArray) ? notificationsArray : []
      
      // Always set notifications, even if empty, to ensure UI updates
      setNotifications(finalNotificationsArray)
      
      // Calculate unread count from actual notifications if API count doesn't match
      const calculatedUnread = finalNotificationsArray.filter(n => {
        const readValue = n.read
        return readValue === false || readValue === 0 || readValue === '0' || readValue === null || readValue === undefined
      }).length
      
      // Use the calculated count if it differs significantly from API count
      const finalUnreadCount = notificationsArray.length > 0 ? calculatedUnread : unreadCount
      
      console.log('📊 Unread count comparison:', {
        apiCount: unreadCount,
        calculatedCount: calculatedUnread,
        using: finalUnreadCount
      })
      
      setUnreadNotificationCount(finalUnreadCount)
    } catch (error) {
      console.error('❌ Error manually refreshing notifications:', error)
      console.error('❌ Error details:', {
        message: error.message,
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        studentMySQLId,
        apiUrl: API_BASE_URL
      })
      
      // Show user-friendly error message
      if (error.message.includes('Cannot connect to server')) {
        console.error('💡 Server Connection Issue:')
        console.error('   1. Make sure backend server is running: cd server && npm start')
        console.error('   2. Check if server is listening on port 5000')
        console.error(`   3. Verify API URL in browser console: ${API_BASE_URL}`)
        console.error('   4. Check CORS settings in server/src/server.js')
      }
      
      // Don't clear notifications on error - keep existing ones
    }
  }, [studentMySQLId])

  // Set up polling for grades, attendance, enrollments, and notifications
  useEffect(() => {
    if (!studentMySQLId) {
      console.log('⏳ Waiting for studentMySQLId to be set before setting up polling...')
      return
    }

    console.log('Setting up polling for student MySQL ID:', studentMySQLId)
    
    // Immediately fetch notifications when studentMySQLId is available
    refreshNotifications()

    // Helper function to recalculate data using refs
    const recalculateData = () => {
      const currentEnrollments = enrollmentsRef.current
      const currentCourses = coursesRef.current
      const currentLiveGrades = liveGradesRef.current
      const currentLiveAttendance = liveAttendanceRef.current
      const currentStudentName = studentNameRef.current

      if (currentEnrollments.length > 0 && currentCourses.length > 0) {
        const transformedData = transformDashboardDataFromMySQL(
          currentEnrollments,
          currentCourses,
          currentLiveGrades,
          currentLiveAttendance,
          currentStudentName
        )
        setData(transformedData)
      }
    }

    // Poll for grades (updates when professor inputs grades)
    const gradesUnsubscribe = subscribeToStudentGrades(studentMySQLId, (grades) => {
      console.log('📊 Grades polled for student MySQL ID:', studentMySQLId)
      console.log('📊 Grades received:', grades.length, 'grades')
      setLiveGrades(grades)
      // Recalculate dashboard data after state update
      setTimeout(recalculateData, 0)
    })

    // Poll for attendance (updates when professor marks attendance)
    const attendanceUnsubscribe = subscribeToStudentAttendance(studentMySQLId, (attendance) => {
      console.log('📊 Attendance updated:', attendance.length, 'records')
      setLiveAttendance(attendance)
      // Recalculate dashboard data after state update
      setTimeout(recalculateData, 0)
    })

    // Poll for enrollments (updates when professor enrolls student)
    const enrollmentsUnsubscribe = subscribeToStudentEnrollments(studentMySQLId, async (enrollmentsData) => {
      console.log('📚 Enrollments updated:', enrollmentsData.length, 'enrollments')
      console.log('📚 Enrollment details:', enrollmentsData.map(e => ({
        id: e.id,
        course_id: e.course_id,
        hasCode: !!e.code,
        hasCourseName: !!e.course_name,
        code: e.code,
        course_name: e.course_name
      })))
      setEnrollments(enrollmentsData)
      
      // Load course details for new enrollments
      // Check if enrollments already include course data (from JOIN query)
      const enrollmentsWithCourseData = enrollmentsData.filter(e => e.code && e.course_name)
      const enrollmentsNeedingCourseLoad = enrollmentsData.filter(e => !e.code || !e.course_name)
      
      console.log('📚 Enrollments with course data from JOIN:', enrollmentsWithCourseData.length)
      console.log('📚 Enrollments needing course load:', enrollmentsNeedingCourseLoad.length)
      
      // Load courses for enrollments that don't have course data
      const coursePromises = enrollmentsNeedingCourseLoad.map(enrollment => 
        getCourseById(enrollment.course_id).catch(() => null)
      )
      const coursesData = await Promise.all(coursePromises)
      const loadedCourses = coursesData.filter(Boolean)
      
      // Combine courses from JOIN query and loaded courses
      const coursesFromEnrollments = enrollmentsWithCourseData.map(e => ({
        id: e.course_id,
        code: e.code,
        name: e.course_name,
        credits: e.credits || 0,
        term: e.term || 'first' // Include term from enrollment JOIN
      }))
      
      const allCourses = [...coursesFromEnrollments, ...loadedCourses]
      // Remove duplicates by course ID
      const uniqueCourses = Array.from(new Map(allCourses.map(c => [c.id, c])).values())
      
      console.log('📚 Total unique courses for transform:', uniqueCourses.length, uniqueCourses.map(c => ({ id: c.id, code: c.code, name: c.name })))
      setCourses(uniqueCourses)

      // Recalculate dashboard data - use current state values
        const transformedData = transformDashboardDataFromMySQL(
          enrollmentsData,
          uniqueCourses,
        liveGradesRef.current || [],
        liveAttendanceRef.current || [],
        studentNameRef.current || 'Student'
        )
      
      console.log('📊 Transformed data from subscription:', {
        firstTermCount: transformedData.firstTerm?.length || 0,
        enrollmentsCount: enrollmentsData.length,
        coursesCount: uniqueCourses.length
      })
      
        setData(transformedData)
    })

    // Poll for notifications
    const notificationsUnsubscribe = subscribeToNotifications((notificationsData) => {
      console.log('📬 Notifications subscription callback received:', {
        data: notificationsData,
        type: typeof notificationsData,
        isArray: Array.isArray(notificationsData),
        length: Array.isArray(notificationsData) ? notificationsData.length : 'N/A',
        keys: notificationsData && typeof notificationsData === 'object' && !Array.isArray(notificationsData) ? Object.keys(notificationsData) : null
      })
      
      // Ensure we have an array - handle both array and non-array responses
      let notificationsArray = []
      if (Array.isArray(notificationsData)) {
        notificationsArray = notificationsData
        console.log('✅ Subscription: Direct array, length:', notificationsArray.length)
      } else if (notificationsData && typeof notificationsData === 'object') {
        // If it's an object, try to extract an array from it
        const keys = Object.keys(notificationsData)
        console.log('🔍 Subscription: Object with keys:', keys)
        
        // Try common array properties
        for (const key of ['data', 'notifications', 'items', 'results', 'list', 'array']) {
          if (Array.isArray(notificationsData[key])) {
            notificationsArray = notificationsData[key]
            console.log(`✅ Subscription: Found array in .${key}, length:`, notificationsArray.length)
            break
          }
        }
        
        // If no common property found, check all properties
        if (notificationsArray.length === 0) {
          for (const key of keys) {
            if (Array.isArray(notificationsData[key])) {
              notificationsArray = notificationsData[key]
              console.log(`✅ Subscription: Found array in .${key}, length:`, notificationsArray.length)
              break
            }
          }
        }
        
        // If still empty, log error
        if (notificationsArray.length === 0) {
          console.error('❌ Subscription: Object but no array found!')
          console.error('❌ Object keys:', keys)
          console.error('❌ Object structure:', JSON.stringify(notificationsData).substring(0, 500))
          notificationsArray = []
        }
      } else {
        console.warn('⚠️ Subscription: Unexpected data type:', typeof notificationsData)
      }
      
      // CRITICAL: Always ensure notificationsArray is actually an array before setting state
      const finalNotificationsArraySub = Array.isArray(notificationsArray) ? notificationsArray : []
      
      // CRITICAL: Always set notifications state as an array, never as an object
      setNotifications(finalNotificationsArraySub)
      
      console.log('✅ Subscription: Final notifications state set:', {
        count: finalNotificationsArraySub.length,
        isArray: Array.isArray(finalNotificationsArraySub),
        type: typeof finalNotificationsArraySub
      })
      
      // Only log detailed info in development or when notifications exist
      if (process.env.NODE_ENV === 'development' && finalNotificationsArraySub.length > 0) {
        console.log('📬 Setting notifications from subscription:', finalNotificationsArraySub.length, 'notifications')
        console.log('📬 Notifications array details:', {
          length: finalNotificationsArraySub.length,
          firstNotification: finalNotificationsArraySub[0] || null,
          allIds: finalNotificationsArraySub.map(n => n.id).slice(0, 5)
        })
      }
      
      // Update unread count - handle MySQL boolean (0/1) and JavaScript boolean
      const unread = notificationsArray.filter(n => {
        const readValue = n.read
        const isUnread = readValue === false || readValue === 0 || readValue === '0' || readValue === null || readValue === undefined
        return isUnread
      }).length
      
      console.log('📬 Unread count calculation:', {
        total: finalNotificationsArraySub.length,
        unread,
        read: finalNotificationsArraySub.length - unread,
        sampleReadValues: finalNotificationsArraySub.slice(0, 3).map(n => ({ 
          id: n.id, 
          read: n.read, 
          readType: typeof n.read,
          isUnread: !n.read || n.read === 0
        }))
      })
      
      setUnreadNotificationCount(unread)
      
      // Log final state
      console.log('✅ Notifications state updated:', {
        notificationsCount: finalNotificationsArraySub.length,
        unreadCount: unread,
        willDisplay: finalNotificationsArraySub.length > 0 ? 'YES' : 'NO (empty state)'
      })
    }, { limit: 50 })

    // Poll for unread count
    const unreadCountInterval = setInterval(async () => {
      try {
        const count = await getUnreadCount()
        setUnreadNotificationCount(count)
      } catch (error) {
        console.error('Error fetching unread count:', error)
      }
    }, 5000)

    gradesUnsubscribeRef.current = gradesUnsubscribe
    attendanceUnsubscribeRef.current = attendanceUnsubscribe
    enrollmentsUnsubscribeRef.current = enrollmentsUnsubscribe
    notificationsUnsubscribeRef.current = notificationsUnsubscribe

    // Cleanup
    return () => {
      if (gradesUnsubscribeRef.current) {
        gradesUnsubscribeRef.current()
        gradesUnsubscribeRef.current = null
      }
      if (attendanceUnsubscribeRef.current) {
        attendanceUnsubscribeRef.current()
        attendanceUnsubscribeRef.current = null
      }
      if (enrollmentsUnsubscribeRef.current) {
        enrollmentsUnsubscribeRef.current()
        enrollmentsUnsubscribeRef.current = null
      }
      if (notificationsUnsubscribeRef.current) {
        notificationsUnsubscribeRef.current()
        notificationsUnsubscribeRef.current = null
      }
      if (unreadCountInterval) {
        clearInterval(unreadCountInterval)
      }
    }
  }, [studentMySQLId]) // Only depend on studentMySQLId to prevent infinite loops

  // Transform MySQL data to UI format
  const transformDashboardDataFromMySQL = (enrollmentsData, coursesData, gradesData, attendanceData, studentName) => {
    // Create a map of course_id to course for quick lookup
    // Store with both number and string keys to handle type mismatches
    const courseMap = new Map()
    coursesData.forEach(course => {
      const courseId = course.id
      // Ensure course has professor data structure and term
      const courseWithProfessor = {
        ...course,
        term: course.term || 'first', // Ensure term is included, default to 'first'
        professor_name: course.professor_name || null,
        professor_photo_url: course.professor_photo_url || null
      }
      courseMap.set(courseId, courseWithProfessor)
      // Also store with string/number variants for type matching
      if (typeof courseId === 'number') {
        courseMap.set(String(courseId), courseWithProfessor)
      } else if (typeof courseId === 'string') {
        const numId = Number(courseId)
        if (!isNaN(numId)) {
          courseMap.set(numId, courseWithProfessor)
        }
      }
    })
    
    // Also add courses from enrollments if they have course data
    enrollmentsData.forEach(enrollment => {
      if (enrollment.code && enrollment.course_name) {
        // Check if course already exists in map (with type conversion)
        const courseId = enrollment.course_id
        const existsAsNumber = typeof courseId === 'number' && courseMap.has(courseId)
        const existsAsString = typeof courseId === 'string' && courseMap.has(courseId)
        const numId = typeof courseId === 'string' ? Number(courseId) : courseId
        const existsAsConverted = !isNaN(numId) && courseMap.has(numId) && courseMap.has(String(numId))
        
        if (!existsAsNumber && !existsAsString && !existsAsConverted) {
        const courseFromEnrollment = {
          id: enrollment.course_id,
          code: enrollment.code,
          name: enrollment.course_name,
          credits: enrollment.credits || 0
        }
        courseMap.set(enrollment.course_id, courseFromEnrollment)
        // Also store with type variants
        if (typeof enrollment.course_id === 'number') {
          courseMap.set(String(enrollment.course_id), courseFromEnrollment)
        } else {
          const numId = Number(enrollment.course_id)
          if (!isNaN(numId)) {
            courseMap.set(numId, courseFromEnrollment)
            }
          }
        }
      }
    })

    // Create a map of course_id to enrollment
    const enrollmentMap = new Map()
    enrollmentsData.forEach(enrollment => {
      enrollmentMap.set(enrollment.course_id, enrollment)
    })

    // Group grades by course (handle both number and string course_id)
    const gradesByCourse = new Map()
    gradesData.forEach(grade => {
      const courseId = grade.course_id
      // Store with both number and string keys for type matching
      if (!gradesByCourse.has(courseId)) {
        gradesByCourse.set(courseId, [])
      }
      gradesByCourse.get(courseId).push(grade)
      
      // Also store with type variants for matching
      if (typeof courseId === 'number') {
        if (!gradesByCourse.has(String(courseId))) {
          gradesByCourse.set(String(courseId), [])
        }
        gradesByCourse.get(String(courseId)).push(grade)
      } else if (typeof courseId === 'string') {
        const numId = Number(courseId)
        if (!isNaN(numId)) {
          if (!gradesByCourse.has(numId)) {
            gradesByCourse.set(numId, [])
      }
          gradesByCourse.get(numId).push(grade)
        }
      }
    })
    
    console.log('📊 Grades grouped by course:', {
      totalGrades: gradesData.length,
      coursesWithGrades: gradesByCourse.size,
      gradesByCourseId: Array.from(gradesByCourse.entries()).map(([id, grades]) => ({
        courseId: id,
        courseIdType: typeof id,
        gradeCount: grades.length
      }))
    })

    // Group attendance by course (handle both number and string course_id)
    const attendanceByCourse = new Map()
    attendanceData.forEach(att => {
      const courseId = att.course_id
      // Store with both number and string keys for type matching
      if (!attendanceByCourse.has(courseId)) {
        attendanceByCourse.set(courseId, [])
      }
      attendanceByCourse.get(courseId).push(att)
      
      // Also store with type variants for matching
      if (typeof courseId === 'number') {
        if (!attendanceByCourse.has(String(courseId))) {
          attendanceByCourse.set(String(courseId), [])
      }
        attendanceByCourse.get(String(courseId)).push(att)
      } else if (typeof courseId === 'string') {
        const numId = Number(courseId)
        if (!isNaN(numId)) {
          if (!attendanceByCourse.has(numId)) {
            attendanceByCourse.set(numId, [])
          }
          attendanceByCourse.get(numId).push(att)
        }
      }
    })

    // Calculate overall statistics
    let totalAbsences = 0
    let totalExams = 0
    let examsTaken = 0
    let totalScore = 0
    let totalMax = 0
    let totalPresent = 0
    let totalSessions = 0

    // Transform enrollments to subjects
    console.log('🔄 Transforming enrollments to subjects:', {
      enrollmentsCount: enrollmentsData.length,
      coursesCount: coursesData.length,
      courseMapSize: courseMap.size,
      enrollmentCourseIds: enrollmentsData.map(e => e.course_id),
      availableCourseIds: Array.from(courseMap.keys()),
      enrollmentsWithCourseData: enrollmentsData.filter(e => e.code && e.course_name).length
    })
    
    // Helper function to process an enrollment into a subject
    const processEnrollment = (enrollment) => {
      // Try to get course from courseMap first
      let course = courseMap.get(enrollment.course_id)
      
      // If not found, try with string/number conversion
      if (!course) {
        course = courseMap.get(Number(enrollment.course_id)) || courseMap.get(String(enrollment.course_id))
      }
      
      // If still not found but enrollment has course data from JOIN query, use that
      // This is the PRIMARY way to get course data since Enrollment.findByStudent does a JOIN
      if (!course && enrollment.code && enrollment.course_name) {
        course = {
          id: enrollment.course_id,
          code: enrollment.code,
          name: enrollment.course_name,
          credits: enrollment.credits || 0,
          term: enrollment.term || 'first', // Include term from MySQL
          professor_id: enrollment.professor_id,
          professor_name: enrollment.professor_name,
          professor_photo_url: enrollment.professor_photo_url
        }
        console.log('✅ Using course data from enrollment JOIN:', {
          courseId: course.id,
          code: course.code,
          name: course.name,
          professorName: course.professor_name,
          professorPhoto: course.professor_photo_url ? 'Yes' : 'No'
        })
        // Add to courseMap for future lookups
        courseMap.set(enrollment.course_id, course)
        if (typeof enrollment.course_id === 'number') {
          courseMap.set(String(enrollment.course_id), course)
        } else {
          const numId = Number(enrollment.course_id)
          if (!isNaN(numId)) {
            courseMap.set(numId, course)
          }
        }
      }
      
      if (!course) {
        console.warn('⚠️ Course not found for enrollment:', {
          enrollmentId: enrollment.id,
          courseId: enrollment.course_id,
          courseIdType: typeof enrollment.course_id,
          availableCourseIds: Array.from(courseMap.keys()),
          enrollmentHasCourseData: !!(enrollment.code && enrollment.course_name),
          enrollmentData: enrollment
        })
        return null
      }
      
      console.log('✅ Processing enrollment:', {
        enrollmentId: enrollment.id,
        courseId: enrollment.course_id,
        courseCode: course.code,
        courseName: course.name,
        enrollmentTerm: enrollment.term,
        courseTerm: course.term,
        finalTerm: course.term || enrollment.term || 'first'
      })

      // Get grades for this course (try multiple ID formats for type matching)
      let courseGrades = gradesByCourse.get(course.id) || []
      if (courseGrades.length === 0) {
        // Try with type conversion
        if (typeof course.id === 'number') {
          courseGrades = gradesByCourse.get(String(course.id)) || []
        } else if (typeof course.id === 'string') {
          const numId = Number(course.id)
          if (!isNaN(numId)) {
            courseGrades = gradesByCourse.get(numId) || []
          }
        }
      }
      
      // Get attendance for this course (try multiple ID formats)
      let courseAttendance = attendanceByCourse.get(course.id) || []
      if (courseAttendance.length === 0) {
        if (typeof course.id === 'number') {
          courseAttendance = attendanceByCourse.get(String(course.id)) || []
        } else if (typeof course.id === 'string') {
          const numId = Number(course.id)
          if (!isNaN(numId)) {
            courseAttendance = attendanceByCourse.get(numId) || []
          }
        }
      }
      
      console.log(`📊 Course ${course.code} (ID: ${course.id}):`, {
        courseId: course.id,
        courseIdType: typeof course.id,
        gradesFound: courseGrades.length,
        attendanceFound: courseAttendance.length,
        gradeDetails: courseGrades.map(g => ({
          id: g.id,
          title: g.assessment_title,
          score: g.score,
          maxPoints: g.max_points,
          courseId: g.course_id,
          courseIdType: typeof g.course_id
        }))
      })

      // Process grades
      const subjectExams = []
      let subjectScore = 0
      let subjectMax = 0

      courseGrades.forEach(grade => {
        subjectExams.push({
          name: grade.assessment_title,
          type: (grade.assessment_type || 'Assessment').charAt(0).toUpperCase() + (grade.assessment_type || 'Assessment').slice(1),
          status: 'Taken',
          score: grade.score,
          maxPoints: grade.max_points,
          date: grade.date || grade.created_at || null,
        })
        subjectScore += grade.score
        subjectMax += grade.max_points
        totalExams++
        examsTaken++
        totalScore += grade.score
        totalMax += grade.max_points
      })

      // Process attendance
      let subjectPresent = 0
      let subjectAbsent = 0
      const subjectAttendanceRecords = []

      courseAttendance.forEach(att => {
        subjectAttendanceRecords.push({
          date: att.date,
          status: att.status,
          createdAt: att.created_at,
          updatedAt: att.updated_at,
        })
        if (att.status === 'present') {
          subjectPresent++
          totalPresent++
          totalSessions++
        } else if (att.status === 'absent') {
          subjectAbsent++
          totalAbsences++
          totalSessions++
        } else {
          totalSessions++
        }
      })

      const subjectGrade = subjectMax > 0 ? Math.round((subjectScore / subjectMax) * 100) : 0
      const subjectAttRate = (subjectPresent + subjectAbsent) > 0
        ? Math.round((subjectPresent / (subjectPresent + subjectAbsent)) * 100)
        : 0

      // Ensure term is included - normalize to lowercase string for comparison
      let courseTerm = course.term || enrollment.term || 'first'
      // Normalize term value (handle case variations)
      if (typeof courseTerm === 'string') {
        courseTerm = courseTerm.toLowerCase().trim()
      }
      // Ensure it's either 'first' or 'second'
      if (courseTerm !== 'first' && courseTerm !== 'second') {
        courseTerm = 'first' // Default to first if invalid
      }
      
      console.log(`🔍 Course ${course.code}: course.term="${course.term}", enrollment.term="${enrollment.term}", final term="${courseTerm}"`)

      return {
        id: course.code.split(' ')[0] || course.code,
        code: course.code,
        name: course.name || course.code,
        term: courseTerm,
        grade: subjectGrade,
        attRate: subjectAttRate,
        present: subjectPresent,
        abs: subjectAbsent,
        exams: subjectExams.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)),
        attendanceRecords: subjectAttendanceRecords.sort((a, b) => new Date(b.date) - new Date(a.date)),
        instructor: {
          name: course.professor_name || enrollment.professor_name || 'TBA',
          photo_url: course.professor_photo_url || enrollment.professor_photo_url || null,
          email: '',
          schedule: 'TBA',
        },
      }
    }
    
    // Process all enrollments and separate by term
    const processedSubjects = enrollmentsData.map(processEnrollment).filter(Boolean)
    
    // Debug: Log enrollment terms
    console.log('🔍 Debug: Enrollment terms from MySQL:', enrollmentsData.map(e => ({
      courseCode: e.code,
      term: e.term,
      termType: typeof e.term
    })))
    
    // Debug: Log processed subject terms
    console.log('🔍 Debug: Processed subject terms:', processedSubjects.map(s => ({
      code: s.code,
      term: s.term,
      termType: typeof s.term
    })))
    
    // Separate into firstTerm and secondTerm based on term field
    // Normalize term values for comparison
    const firstTerm = processedSubjects.filter(subject => {
      let term = subject.term || 'first'
      if (typeof term === 'string') {
        term = term.toLowerCase().trim()
      }
      const isFirstTerm = term === 'first' || !term || term === null || term === undefined
      console.log(`🔍 Subject ${subject.code}: term="${subject.term}" (normalized: "${term}"), isFirstTerm=${isFirstTerm}`)
      return isFirstTerm
    })
    
    const secondTerm = processedSubjects.filter(subject => {
      let term = subject.term || 'first'
      if (typeof term === 'string') {
        term = term.toLowerCase().trim()
      }
      const isSecondTerm = term === 'second'
      console.log(`🔍 Subject ${subject.code}: term="${subject.term}" (normalized: "${term}"), isSecondTerm=${isSecondTerm}`)
      return isSecondTerm
    })
    
    console.log('📊 Term separation results:', {
      totalProcessed: processedSubjects.length,
      firstTermCount: firstTerm.length,
      secondTermCount: secondTerm.length,
      firstTermCodes: firstTerm.map(s => s.code),
      secondTermCodes: secondTerm.map(s => s.code)
    })

    // Log warning if enrollments exist but no subjects were created
    if (enrollmentsData.length > 0 && firstTerm.length === 0) {
      console.warn('⚠️ WARNING: Enrollments exist but no subjects were created!', {
        enrollmentsCount: enrollmentsData.length,
        enrollments: enrollmentsData.map(e => ({
          id: e.id,
          course_id: e.course_id,
          hasCode: !!e.code,
          hasCourseName: !!e.course_name,
          code: e.code,
          course_name: e.course_name
        })),
        coursesDataCount: coursesData.length,
        courseMapSize: courseMap.size
      })
    }

    console.log('✅ Transform complete:', {
      firstTermSubjects: firstTerm.length,
      secondTermSubjects: secondTerm.length,
      enrollmentsProcessed: enrollmentsData.length,
      totalAbsences,
      examsTaken,
      totalExams,
      avgGrade: totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0,
      attRate: totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0,
      firstTermCodes: firstTerm.map(s => `${s.code} (term: ${s.term})`),
      secondTermCodes: secondTerm.map(s => `${s.code} (term: ${s.term})`)
    })

    const avgGrade = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
    const attRate = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0

    const result = {
      id: "student",
      name: studentName,
      abs: totalAbsences,
      examTaken: examsTaken,
      examTotal: totalExams,
      attRate: attRate,
      avgGrade: avgGrade,
      firstTerm: Array.isArray(firstTerm) ? firstTerm : [],
      secondTerm: Array.isArray(secondTerm) ? secondTerm : [],
      notifs: notifications,
    }
    
    console.log('📊 Final transformed data:', {
      firstTermCount: result.firstTerm.length,
      firstTermSubjects: result.firstTerm.map(s => ({ code: s.code, name: s.name }))
    })
    
    return result
  }

  const calculateDashboardStatisticsFallback = () => {
    let absences = 0
    let examsCompleted = 0
    let totalExams = 0
    let attendancePresent = 0
    let attendanceSessions = 0
    let totalScore = 0
    let totalMaxPoints = 0

    const allSubjects = [
      ...(Array.isArray(data.firstTerm) ? data.firstTerm : []),
      ...(Array.isArray(data.secondTerm) ? data.secondTerm : []),
    ]

    allSubjects.forEach(subject => {
      // Attendance records
      const attendanceRecords = subject.attendanceRecords || []
      attendanceRecords.forEach(record => {
        if (!record?.status) return
        attendanceSessions++
        if (record.status === 'present') {
          attendancePresent++
        } else if (record.status === 'absent') {
          absences++
        }
      })

      // Exams / grades
      const exams = subject.exams || []
      exams.forEach(exam => {
        totalExams++
        if (exam.status === 'Taken' && exam.score !== undefined && exam.maxPoints !== undefined) {
          examsCompleted++
          totalScore += exam.score || 0
          totalMaxPoints += exam.maxPoints || 0
        }
      })
    })

    const attendanceRate = attendanceSessions > 0
      ? Math.round((attendancePresent / attendanceSessions) * 100)
      : 0

    const averageGrade = totalMaxPoints > 0
      ? Math.round((totalScore / totalMaxPoints) * 100)
      : 0

    return {
      absences,
      examsCompleted,
      totalExams,
      attendanceRate,
      averageGrade,
    }
  }

  // Calculate real-time statistics from MySQL data
  const calculateRealTimeStatistics = () => {
    // Prefer using transformed data from `data` state if available (more accurate)
    if (data && data.firstTerm && data.firstTerm.length > 0) {
      // Calculate from transformed subject data (most accurate)
      let totalAbs = 0
      let totalExams = 0
      let examsTaken = 0
      let totalScore = 0
      let totalMax = 0
      let totalPresent = 0
      let totalSessions = 0

      data.firstTerm.forEach(subject => {
        // Count absences
        if (subject.abs !== undefined) {
          totalAbs += subject.abs || 0
        }
        
        // Count attendance
        if (subject.attendanceRecords && Array.isArray(subject.attendanceRecords)) {
          subject.attendanceRecords.forEach(record => {
            if (record.status === 'present') {
              totalPresent++
              totalSessions++
            } else if (record.status === 'absent') {
              totalAbs++
              totalSessions++
            }
          })
        }
        
        // Count exams/grades
        if (subject.exams && Array.isArray(subject.exams)) {
          subject.exams.forEach(exam => {
            totalExams++
            if (exam.status === 'Taken' && exam.score !== undefined && exam.maxPoints !== undefined) {
              examsTaken++
              totalScore += parseFloat(exam.score) || 0
              totalMax += parseFloat(exam.maxPoints) || 0
            }
          })
        }
      })

      const attendanceRate = totalSessions > 0 
        ? Math.round((totalPresent / totalSessions) * 100) 
        : 0
      
      const averageGrade = totalMax > 0 
        ? Math.round((totalScore / totalMax) * 100) 
        : 0

      return {
        absences: totalAbs,
        examsCompleted: examsTaken,
        totalExams: totalExams,
        attendanceRate: attendanceRate,
        averageGrade: averageGrade,
      }
    }

    // Fallback: Calculate from raw MySQL data (liveGrades and liveAttendance)
    const liveAbsences = liveAttendance.filter(record => record.status === 'absent').length
    
    const gradesWithScores = liveGrades.filter(grade => 
      grade.score !== undefined && grade.score !== null && 
      grade.max_points !== undefined && grade.max_points !== null
    )
    const liveExamsCompleted = gradesWithScores.length
    const liveTotalExams = liveGrades.length
    
    const livePresentCount = liveAttendance.filter(record => record.status === 'present').length
    const liveTotalSessions = liveAttendance.length
    const liveAttendanceRate = liveTotalSessions > 0 
      ? Math.round((livePresentCount / liveTotalSessions) * 100) 
      : 0
    
    let liveTotalScore = 0
    let liveTotalMaxPoints = 0
    gradesWithScores.forEach(grade => {
      liveTotalScore += parseFloat(grade.score) || 0
      liveTotalMaxPoints += parseFloat(grade.max_points) || 0
    })
    const liveAverageGrade = liveTotalMaxPoints > 0 
      ? Math.round((liveTotalScore / liveTotalMaxPoints) * 100) 
      : 0

    const fallbackStats = calculateDashboardStatisticsFallback()

    const hasLiveAttendance = liveAttendance.length > 0
    const hasLiveGrades = liveGrades.length > 0

    return {
      absences: hasLiveAttendance ? liveAbsences : fallbackStats.absences,
      examsCompleted: hasLiveGrades ? liveExamsCompleted : fallbackStats.examsCompleted,
      totalExams: hasLiveGrades ? liveTotalExams : fallbackStats.totalExams,
      attendanceRate: hasLiveAttendance ? liveAttendanceRate : fallbackStats.attendanceRate,
      averageGrade: hasLiveGrades ? liveAverageGrade : fallbackStats.averageGrade,
    }
  }

  const transformDashboardData = (dashboard, studentName) => {
    const subjects = dashboard.subjects || []
    const grades = dashboard.grades || {}
    const attendance = dashboard.attendance || {}
    
    // Calculate stats
    let totalAbsences = 0
    let totalExams = 0
    let examsTaken = 0
    let totalScore = 0
    let totalMax = 0
    let totalPresent = 0
    let totalSessions = 0
    
    // Transform subjects with grades and attendance
    const firstTerm = subjects.map(subject => {
      const subjectGrades = grades[subject.code] || {}
      const subjectExams = []
      let subjectScore = 0
      let subjectMax = 0
      
      // Process all assessment types
      Object.entries(subjectGrades).forEach(([type, assessments]) => {
        assessments.forEach(assessment => {
          if (assessment.score !== undefined) {
            subjectExams.push({
              name: assessment.title,
              type: type.charAt(0).toUpperCase() + type.slice(1),
              status: 'Taken',
              score: assessment.score,
              maxPoints: assessment.maxPoints,
              date: assessment.date || assessment.createdAt || null,
            })
            subjectScore += assessment.score
            subjectMax += assessment.maxPoints
            totalExams++
            examsTaken++
            totalScore += assessment.score
            totalMax += assessment.maxPoints
          } else {
            subjectExams.push({
              name: assessment.title,
              type: type.charAt(0).toUpperCase() + type.slice(1),
              status: 'Not Taken',
              date: assessment.date || assessment.dueDate || null,
            })
            totalExams++
          }
        })
      })
      
      // Add real-time grades from Firestore for this subject
      // Note: We'll match by courseId when available, but for now include all and let UI handle
      // In a full implementation, we'd need to fetch courses to map courseId to subject code
      const subjectLiveGrades = liveGrades.filter(grade => {
        // If grade has courseId, we'd match it to subject's courseId
        // For now, we'll include grades that might belong to this subject
        // This is a limitation that can be improved with proper courseId mapping
        return true
      })
      
      // Merge live grades into subject exams (prioritize dates from Firestore)
      subjectLiveGrades.forEach(grade => {
        const existingExam = subjectExams.find(exam => 
          exam.name === grade.assessmentTitle && 
          (exam.type.toLowerCase() === (grade.assessmentType || '').toLowerCase())
        )
        if (!existingExam && grade.score !== undefined) {
          // Format date properly
          let formattedDate = null
          if (grade.date) {
            formattedDate = grade.date
          } else if (grade.createdAt) {
            formattedDate = grade.createdAt
          } else if (grade.updatedAt) {
            formattedDate = grade.updatedAt
          }
          
          subjectExams.push({
            name: grade.assessmentTitle || 'Assessment',
            type: grade.assessmentType ? grade.assessmentType.charAt(0).toUpperCase() + grade.assessmentType.slice(1) : 'Exam',
            status: 'Taken',
            score: grade.score,
            maxPoints: grade.maxPoints || 100,
            date: formattedDate,
          })
        } else if (existingExam) {
          // Update date if not already set or if Firestore has a more recent date
          const firestoreDate = grade.date || grade.createdAt || grade.updatedAt
          if (firestoreDate && (!existingExam.date || new Date(firestoreDate) > new Date(existingExam.date || 0))) {
            existingExam.date = firestoreDate
          }
        }
      })
      
      // Calculate attendance for this subject
      let subjectPresent = 0
      let subjectAbsent = 0
      const subjectAttendanceRecords = []
      
      Object.entries(attendance).forEach(([date, dateAttendance]) => {
        const status = dateAttendance[subject.code]
        if (status) {
          subjectAttendanceRecords.push({
            date: date,
            status: status,
          })
        if (status === 'present') {
          subjectPresent++
          totalPresent++
          totalSessions++
        } else if (status === 'absent') {
          subjectAbsent++
          totalAbsences++
          totalSessions++
          }
        }
      })
      
      // Add real-time attendance from Firestore for this subject
      // Note: Similar to grades, we'd match by courseId in a full implementation
      const subjectLiveAttendance = liveAttendance.filter(att => {
        // For now, include all attendance records
        // In full implementation, match att.courseId to subject's courseId
        return true
      })
      
      subjectLiveAttendance.forEach(att => {
        const existingRecord = subjectAttendanceRecords.find(rec => rec.date === att.date)
        if (!existingRecord && att.date) {
          subjectAttendanceRecords.push({
            date: att.date,
            status: att.status,
            createdAt: att.createdAt,
            updatedAt: att.updatedAt,
          })
          if (att.status === 'present') {
            subjectPresent++
            totalPresent++
            totalSessions++
          } else if (att.status === 'absent') {
            subjectAbsent++
            totalAbsences++
            totalSessions++
          }
        } else if (existingRecord) {
          // Update with Firestore metadata if available
          if (att.createdAt) existingRecord.createdAt = att.createdAt
          if (att.updatedAt) existingRecord.updatedAt = att.updatedAt
        }
      })
      
      const subjectGrade = subjectMax > 0 ? Math.round((subjectScore / subjectMax) * 100) : 0
      const subjectAttRate = (subjectPresent + subjectAbsent) > 0 
        ? Math.round((subjectPresent / (subjectPresent + subjectAbsent)) * 100) 
        : 0
      
      return {
        id: subject.code.split(' ')[0] || subject.code,
        code: subject.code,
        name: subject.name || subject.code,
        grade: subjectGrade,
        attRate: subjectAttRate,
        present: subjectPresent,
        abs: subjectAbsent,
        exams: subjectExams,
        attendanceRecords: subjectAttendanceRecords.sort((a, b) => {
          // Sort by date, most recent first
          return new Date(b.date) - new Date(a.date)
        }),
        instructor: subject.instructor || {
          name: 'TBA',
          email: '',
          schedule: 'TBA',
        },
      }
    })
    
    const avgGrade = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0
    const attRate = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 0
    
    return {
      id: "student",
      name: studentName,
      abs: totalAbsences,
      examTaken: examsTaken,
      examTotal: totalExams,
      attRate: attRate,
      avgGrade: avgGrade,
      firstTerm: Array.isArray(firstTerm) ? firstTerm : [], // Ensure it's always an array
      secondTerm: [],
      notifs: dashboard.notifications || [],
    }
  }

  // Get exam breakdown by assessment type
  const getExamBreakdown = () => {
    if (!data || !data.firstTerm) return {}
    
    const breakdown = {}
    
    data.firstTerm.forEach(subject => {
      if (subject.exams && Array.isArray(subject.exams)) {
        subject.exams.forEach(exam => {
          const typeKey = exam.type + ' Exam'
          if (!breakdown[typeKey]) {
            breakdown[typeKey] = { taken: 0, available: 0 }
          }
          
          breakdown[typeKey].available++
          if (exam.status === 'Taken') {
            breakdown[typeKey].taken++
          }
        })
      }
    })
    
    return breakdown
  }

  // Get absences breakdown by subject
  const getAbsencesBreakdown = () => {
    if (!data || !data.firstTerm) return []
    
    const breakdown = []
    
    data.firstTerm.forEach(subject => {
      if (subject.abs > 0) {
        breakdown.push({
          subject: subject.name,
          code: subject.code,
          absences: subject.abs,
          total: subject.present + subject.abs,
        })
      }
    })
    
    return breakdown.sort((a, b) => b.absences - a.absences)
  }

  // Get attendance breakdown by subject
  const getAttendanceBreakdown = () => {
    if (!data || !data.firstTerm) return []
    
    const breakdown = []
    
    data.firstTerm.forEach(subject => {
      const total = subject.present + subject.abs
      if (total > 0) {
        breakdown.push({
          subject: subject.name,
          code: subject.code,
          present: subject.present,
          absent: subject.abs,
          total: total,
          rate: subject.attRate,
        })
      }
    })
    
    return breakdown.sort((a, b) => b.rate - a.rate)
  }

  // Get grade breakdown by subject
  const getGradeBreakdown = () => {
    if (!data || !data.firstTerm) return []
    
    const breakdown = []
    
    data.firstTerm.forEach(subject => {
      if (subject.exams && Array.isArray(subject.exams)) {
        const completed = subject.exams.filter(exam => exam.status === 'Taken').length
        const total = subject.exams.length
        if (total > 0) {
          breakdown.push({
            subject: subject.name,
            code: subject.code,
            completed: completed,
            total: total,
            average: subject.grade || 0,
          })
        }
      }
    })
    
    return breakdown.sort((a, b) => {
      const avgA = parseFloat(a.average) || 0
      const avgB = parseFloat(b.average) || 0
      return avgB - avgA
    })
  }

  // Helper function to get notification icon based on type/title
  const getNotificationIcon = (notification) => {
    const type = notification.type || ''
    const title = notification.title || ''
    
    // Attendance-related notifications
    if (type === 'attendance' || title.includes('Attendance')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    }
    
    // Grade-related notifications
    if (type === 'grade' || title.includes('Grade')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      )
    }
    
    // Subject-related notifications
    if (title.includes('Subject')) {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      )
    }
    
    // Default notification icon
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    )
  }

  // Helper function to get notification icon color class
  const getNotificationIconColor = (notification) => {
    const type = notification.type || ''
    const title = notification.title || ''
    
    if (type === 'attendance' || title.includes('Attendance')) {
      return 'text-emerald-500 bg-emerald-50'
    }
    if (type === 'grade' || title.includes('Grade')) {
      return 'text-blue-500 bg-blue-50'
    }
    if (title.includes('Subject')) {
      return 'text-amber-500 bg-amber-50'
    }
    return 'text-slate-500 bg-slate-50'
  }

  // Auto-load notifications when dropdown opens
  useEffect(() => {
    if (showNotifDropdown && studentMySQLId) {
      // If notifications array is empty, try to load them
      if (!Array.isArray(notifications) || notifications.length === 0) {
        console.log('🔄 Auto-loading notifications when dropdown opens (empty array)')
        // Use a small delay to avoid race conditions
        const timeoutId = setTimeout(() => {
          refreshNotifications()
        }, 200)
        return () => clearTimeout(timeoutId)
      }
    }
  }, [showNotifDropdown, studentMySQLId, refreshNotifications, notifications]) // Include all dependencies

  // Close dropdowns when clicking outside
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
    if (showProfileModal) {
      // Store original photo when modal opens
      const currentPhoto = studentProfile?.photo_url || studentProfile?.photoURL || studentPic
      originalStudentPicRef.current = currentPhoto
      
      // Load current saved profile data into form when modal opens
      if (studentProfile) {
        setProfileForm({
          name: studentProfile.name || studentName,
          pic: null,
          removePhoto: false
        })
        // Show current saved photo as preview
        setProfilePreview(currentPhoto)
      } else {
        setProfileForm({
          name: studentName,
          pic: null,
          removePhoto: false
        })
        setProfilePreview(studentPic)
      }
      setProfileSaveSuccess(false) // Reset success message when modal opens
    } else {
      // Restore original photo if modal is closed without saving
      if (originalStudentPicRef.current !== null) {
        setProfilePreview(originalStudentPicRef.current)
        setProfileForm(prev => ({ ...prev, pic: null, removePhoto: false }))
      }
    }
  }, [showProfileModal, studentProfile, studentName, studentPic])

  const executeLogout = () => {
    // Student dashboard data is read-only from Firestore (synced by professor)
    sessionStorage.removeItem('currentUser')
    navigate('/login', { replace: true })
  }

  const handleLogoutClick = () => {
    setShowLogoutModal(true)
  }

  const handleCancelLogout = () => {
    setShowLogoutModal(false)
  }

  const getGradeColor = (grade) => {
    if (grade >= 90) return "text-emerald-600"
    if (grade >= 85) return "text-blue-600"
    if (grade >= 75) return "text-amber-600"
    return "text-red-600"
  }

  const getGradeBg = (grade) => {
    if (grade >= 90) return "bg-emerald-600"
    if (grade >= 85) return "bg-blue-600"
    if (grade >= 75) return "bg-amber-600"
    return "bg-red-600"
  }

  const openSubjectModal = (subject, term) => {
    setSelectedSubject({ ...subject, term })
    setShowModal(true)
    // Reset exam filters and pagination when opening modal
    setExamViewMode('all')
    setExamSearchQuery('')
    setExamSortBy('date')
    setExamSortOrder('desc')
    setExamPage(1)
    setExpandedExamTypes({})
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedSubject(null)
    // Reset exam filters when closing modal
    setExamViewMode('all')
    setExamSearchQuery('')
    setExamSortBy('date')
    setExamSortOrder('desc')
    setExamPage(1)
    setExpandedExamTypes({})
  }

  // Helper function to check if subject is archived (older than 1 year)
  const isSubjectArchived = (subject) => {
    // Check if subject has last activity date (from exams or attendance)
    let lastActivityDate = null
    
    // Get most recent exam date
    if (subject.exams && Array.isArray(subject.exams) && subject.exams.length > 0) {
      const examDates = subject.exams
        .map(exam => {
          if (exam.date) {
            const date = new Date(exam.date)
            return !isNaN(date.getTime()) ? date : null
          }
          return null
        })
        .filter(date => date !== null)
      
      if (examDates.length > 0) {
        const mostRecentExam = new Date(Math.max(...examDates.map(d => d.getTime())))
        if (!lastActivityDate || mostRecentExam > lastActivityDate) {
          lastActivityDate = mostRecentExam
        }
      }
    }
    
    // Get most recent attendance date
    if (subject.attendanceRecords && Array.isArray(subject.attendanceRecords) && subject.attendanceRecords.length > 0) {
      const attendanceDates = subject.attendanceRecords
        .map(record => {
          if (record.date) {
            const date = new Date(record.date)
            return !isNaN(date.getTime()) ? date : null
          }
          return null
        })
        .filter(date => date !== null)
      
      if (attendanceDates.length > 0) {
        const mostRecentAttendance = new Date(Math.max(...attendanceDates.map(d => d.getTime())))
        if (!lastActivityDate || mostRecentAttendance > lastActivityDate) {
          lastActivityDate = mostRecentAttendance
        }
      }
    }
    
    // Check enrollment date if available (from subject metadata)
    if (subject.enrolledAt) {
      const enrolledDate = new Date(subject.enrolledAt)
      if (!isNaN(enrolledDate.getTime())) {
        if (!lastActivityDate || enrolledDate > lastActivityDate) {
          lastActivityDate = enrolledDate
        }
      }
    }
    
    // Check if last activity is more than 1 year ago
    if (lastActivityDate) {
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
      return lastActivityDate < oneYearAgo
    }
    
    // If no activity dates found and no enrollment date, consider it current
    // This is a conservative approach - only archive if we have evidence it's old
    return false
  }

  // Helper function to filter and sort subjects
  const getFilteredAndSortedSubjects = (subjects) => {
    if (!subjects || !Array.isArray(subjects)) return []
    
    // Separate archived and current subjects
    const archivedSubjects = subjects.filter(subject => isSubjectArchived(subject))
    const currentSubjects = subjects.filter(subject => !isSubjectArchived(subject))
    
    // Choose which list to use based on filter
    let subjectsToFilter = filterTerm === 'archived' ? archivedSubjects : currentSubjects
    
    // Filter by search query
    let filtered = subjectsToFilter.filter(subject => {
      const searchLower = searchQuery.toLowerCase()
      const name = (subject.name || '').toLowerCase()
      const code = (subject.code || '').toLowerCase()
      const id = (subject.id || '').toLowerCase()
      return name.includes(searchLower) || code.includes(searchLower) || id.includes(searchLower)
    })
    
    // Filter by term (only if not showing archived)
    if (filterTerm !== 'all' && filterTerm !== 'archived') {
      filtered = filtered.filter(subject => {
        if (filterTerm === 'first') return !subject.term || subject.term === 'first'
        if (filterTerm === 'second') return subject.term === 'second'
        return true
      })
    }
    
    // Sort subjects
    filtered.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase()
          bValue = (b.name || '').toLowerCase()
          break
        case 'code':
          aValue = (a.code || '').toLowerCase()
          bValue = (b.code || '').toLowerCase()
          break
        case 'grade':
          aValue = a.grade || 0
          bValue = b.grade || 0
          break
        case 'attendance':
          aValue = a.attRate || 0
          bValue = b.attRate || 0
          break
        default:
          aValue = (a.name || '').toLowerCase()
          bValue = (b.name || '').toLowerCase()
      }
      
      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
      } else {
        return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
      }
    })
    
    return filtered
  }

  // Get paginated subjects
  const getPaginatedSubjects = (subjects) => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return subjects.slice(startIndex, endIndex)
  }

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, filterTerm, sortBy, sortOrder])

  const getInitials = (name) => {
    if (!name || name === 'Student') return 'SU'
    return name.split(/\s+/).filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase()
  }

  const handleProfilePicSelection = (file) => {
    if (file) {
      setProfileForm(prev => ({ ...prev, pic: file, removePhoto: false }))
      const reader = new FileReader()
      reader.onload = (evt) => {
        setProfilePreview(evt.target.result)
      }
      reader.readAsDataURL(file)
    } else {
      setProfileForm(prev => ({ ...prev, pic: null, removePhoto: false }))
      setProfilePreview(studentPic)
    }
  }

  const handleRemoveProfilePicture = () => {
    console.log('Removing profile picture')
    // Clear the file input
    const fileInput = document.getElementById('student-profile-picture')
    if (fileInput) {
      fileInput.value = ''
    }
    // Clear form state and mark photo for removal
    setProfileForm(prev => ({ ...prev, pic: null, removePhoto: true }))
    // Set preview to null to show default/initials
    setProfilePreview(null)
    // Update studentPic immediately so sidebar avatar changes right away
    setStudentPic(null)
    console.log('Profile picture removed - avatar updated immediately')
  }

  // Compress and convert image to data URL
  const fileToDataUrl = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (evt) => {
        const img = new Image()
        img.onload = () => {
          // Create canvas to resize/compress image
          const canvas = document.createElement('canvas')
          const MAX_WIDTH = 800
          const MAX_HEIGHT = 800
          let width = img.width
          let height = img.height

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > MAX_WIDTH) {
              height = (height * MAX_WIDTH) / width
              width = MAX_WIDTH
            }
          } else {
            if (height > MAX_HEIGHT) {
              width = (width * MAX_HEIGHT) / height
              height = MAX_HEIGHT
            }
          }

          canvas.width = width
          canvas.height = height

          // Draw and compress image
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, width, height)

          // Convert to data URL with compression (0.8 quality for good balance)
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8)
          resolve(compressedDataUrl)
        }
        img.onerror = reject
        img.src = evt.target.result
      }
      reader.onerror = reject
      reader.readAsDataURL(file)
    })
  }

  const handleProfileSave = async (e) => {
    e.preventDefault()
    
    // Clear any previous errors
    setProfileSaveError('')
    
    // Validation: Check if user is authenticated
    if (!studentUid) {
      setProfileSaveError('Unable to determine your account. Please sign in again.')
      return
    }

    // Validation: Name field
    const updatedName = profileForm.name?.trim() || ''
    if (!updatedName) {
      setProfileSaveError('Please enter your name.')
      return
    }
    if (updatedName.length < 2) {
      setProfileSaveError('Name must be at least 2 characters long.')
      return
    }
    if (updatedName.length > 100) {
      setProfileSaveError('Name must be less than 100 characters.')
      return
    }

    // Handle profile picture: new file, removal, or keep existing
    let photoData = studentPic
    if (profileForm.removePhoto || (profilePreview === null && studentPic && !profileForm.pic)) {
      // User clicked "Remove Photo" - set to null
      photoData = null
    } else if (profileForm.pic) {
      const file = profileForm.pic
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setProfileSaveError('Please select a valid image file.')
        return
      }
      
      // Validate file size (max 10MB before compression)
      const maxSize = 10 * 1024 * 1024 // 10MB in bytes
      if (file.size > maxSize) {
        setProfileSaveError('Image file size must be less than 10MB. Please choose a smaller image.')
        return
      }
      
      try {
        photoData = await fileToDataUrl(file)
      } catch (error) {
        console.error('Failed to process image file', error)
        setProfileSaveError('Unable to process the selected image. Please try a different file.')
        return
      }
    }

    try {
      // Save to Firestore
      const updatedProfile = {
        ...(studentProfile || {}),
        name: updatedName,
        email: studentEmail || studentProfile?.email || '',
        studentId: studentProfile?.studentId || studentProfile?.student_id || '',
        department: studentProfile?.department || '',
        photoURL: photoData || null,
      }

      // Save to MySQL database (await to ensure data persists)
      const savedProfile = await setStudent(studentUid, updatedProfile)
      
      if (!savedProfile) {
        throw new Error('Failed to save profile to database')
      }

      // Update local state with saved data from database (ensures persistence)
      setStudentName(savedProfile.name || updatedName)
      const savedPhoto = savedProfile.photoURL || savedProfile.photo_url || photoData
      setStudentPic(savedPhoto || null)
      setStudentProfile(savedProfile)
      setProfilePreview(savedPhoto || null)

      // Update session storage with saved data from database
      const currentUser = sessionStorage.getItem('currentUser')
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser)
          userData.name = savedProfile.name || updatedName
          if (savedPhoto) {
            userData.photoURL = savedPhoto
          }
          sessionStorage.setItem('currentUser', JSON.stringify(userData))
        } catch (err) {
          console.warn('Failed to update session storage', err)
        }
      }

      // Show success message briefly, then close modal (under 3 seconds)
      setProfileSaveSuccess(true)

      // Close modal automatically after 1.5 seconds (well under 3 seconds)
      setTimeout(() => {
        setShowProfileModal(false)
        setProfileSaveSuccess(false)
        // Reset form for next time, but keep saved photo as preview
        setProfileForm({ name: savedProfile.name || studentName, pic: null, removePhoto: false })
        setProfilePreview(savedPhoto || null)
        originalStudentPicRef.current = savedPhoto || null
      }, 1500) // 1.5 seconds - fast close, well under 3 seconds
    } catch (error) {
      console.error('Failed to save student profile', error)
      // Show error message in UI instead of browser alert
      let errorMessage = 'Unable to save profile changes right now. Please try again.'
      
      // Check for specific error types
      if (error.message) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to server. Please ensure the backend server is running on http://localhost:5000'
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
          errorMessage = 'Session expired. Please sign in again.'
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
          errorMessage = 'You do not have permission to perform this action.'
        } else if (error.message.includes('404')) {
          errorMessage = 'Profile not found. Please try refreshing the page.'
        } else if (error.message.includes('500')) {
          errorMessage = 'Server error. Please try again later.'
        } else {
          errorMessage = error.message
        }
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error
      }
      
      setProfileSaveError(errorMessage)
      setProfileSaveSuccess(false)
    }
  }

  // Use state variable for unread count
  // Calculate unread count from actual notifications array to ensure consistency
  const displayUnreadCount = (() => {
    if (!Array.isArray(notifications) || notifications.length === 0) {
      // If no notifications array, use the state count
      return unreadNotificationCount
    }
    // Calculate from actual notifications to ensure badge matches list
    const calculatedUnread = notifications.filter(n => {
      const readValue = n.read
      return readValue === false || readValue === 0 || readValue === '0' || readValue === null || readValue === undefined
    }).length
    return calculatedUnread
  })()

  return (
    <div className={`min-h-screen ${isDarkMode ? 'bg-[#000000]' : 'bg-white'}`}>
      {/* Header */}
      <header className={`glass shadow-xl border-b sticky top-0 z-40 ${
        isDarkMode ? 'bg-[#1a1a1a] border-slate-700' : 'border-white/20'
      }`}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8">
          <div className="flex justify-between items-start sm:items-center py-3 sm:py-4 md:py-6 gap-2 sm:gap-4">
            <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 min-w-0 flex-shrink">
              <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadowLg overflow-hidden flex-shrink-0">
                <img src="/assets/logos/um logo.png" alt="UM Logo" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-xl lg:text-2xl xl:text-3xl font-bold textGrad">Student iTrack</h1>
                <p className={`text-[10px] sm:text-xs md:text-sm font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Smart Academic Monitoring System</p>
              </div>
            </div>
            
            <div className="flex items-start sm:items-center space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-6 flex-shrink-0 ml-auto pt-0.5 sm:pt-0">
              {/* Notifications */}
              <div className="relative">
                <button
                  onClick={() => {
                    const willOpen = !showNotifDropdown
                    setShowNotifDropdown(willOpen)
                    setShowProfileDropdown(false)
                    
                    // If opening dropdown and there's a mismatch (badge shows count but array is empty), refresh
                    if (willOpen && displayUnreadCount > 0 && (!Array.isArray(notifications) || notifications.length === 0)) {
                      console.log('🔄 Auto-refreshing notifications on dropdown open (mismatch detected)')
                      setTimeout(() => refreshNotifications(), 100)
                    }
                  }}
                  className={`icon-button relative p-2 sm:p-2.5 rounded-lg ${isDarkMode ? 'hover:bg-slate-800/50' : 'hover:bg-slate-100'}`}
                >
                  <svg className={`w-4 h-4 sm:w-5 sm:h-5 transition-colors ${isDarkMode ? 'text-white hover:text-slate-200' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z" />
                  </svg>
                  {displayUnreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 sm:-top-1 sm:-right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-500 text-white text-[10px] sm:text-xs rounded-full flex items-center justify-center badge shadow-lg">
                      {displayUnreadCount > 9 ? '9+' : displayUnreadCount}
                    </span>
                  )}
                </button>
                
                {showNotifDropdown && (() => {
                  // Format timestamp helper
                  const formatTimestamp = (timestamp) => {
                    const now = new Date()
                    const time = new Date(timestamp)
                    const diffMs = now - time
                    const diffMins = Math.floor(diffMs / 60000)
                    const diffHours = Math.floor(diffMs / 3600000)
                    const diffDays = Math.floor(diffMs / 86400000)
                    
                    if (diffMins < 1) return 'Just now'
                    if (diffMins < 60) return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`
                    if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`
                    if (diffDays < 7) return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`
                    return time.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  }

                  // Compute unread notifications for UI messaging
                  // Ensure notifications is an array before filtering
                  const notificationsArray = Array.isArray(notifications) ? notifications : []
                  const unreadNotifications = notificationsArray.filter(n => {
                    // Handle MySQL boolean (0/1) and JavaScript boolean
                    const readValue = n.read
                    return readValue === false || readValue === 0 || readValue === '0' || readValue === null || readValue === undefined
                  })
                  
                  // Check if notification is urgent (for yellow border)
                  const isUrgent = (notification) => {
                    const title = notification.title || ''
                    const message = notification.message || ''
                    return title.includes('Due Soon') || message.includes('due soon') || message.includes('overdue')
                  }
                  
                  // Get action button for student notifications
                  const getStudentAction = (notification) => {
                    const title = notification.title || ''
                    const message = notification.message || ''
                    
                    if (title.includes('Grade Posted') || message.includes('grade')) {
                      return { text: 'View Grade', action: () => {
                        // Navigate to grade detail view
                        setShowNotifDropdown(false)
                        // Could navigate to specific grade view here
                      }}
                    }
                    if (title.includes('Due Soon') || title.includes('Assignment')) {
                      return { text: 'View Assignment', action: () => {
                        // Navigate to assignment page
                        setShowNotifDropdown(false)
                      }}
                    }
                    if (title.includes('Announcement')) {
                      return { text: 'Read More', action: () => {
                        setShowNotifDropdown(false)
                      }}
                    }
                    if (title.includes('Material')) {
                      return { text: 'View Materials', action: () => {
                        setShowNotifDropdown(false)
                      }}
                    }
                    return null
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
                            <p className="text-[10px] sm:text-xs text-red-100 mt-0.5 sm:mt-1 font-medium hidden sm:block">Academic Updates & Reminders</p>
                    </div>
                          <div className="flex items-center gap-2">
                            {/* Refresh button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                refreshNotifications()
                              }}
                              className={`p-1.5 rounded-lg transition-all ${
                                isDarkMode
                                  ? 'hover:bg-red-700/50 text-white'
                                  : 'hover:bg-white/20 text-white'
                              }`}
                              title="Refresh notifications"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                              </svg>
                            </button>
                            {(() => {
                              const totalCount = Array.isArray(notifications) ? notifications.length : 0
                              return totalCount > 0 && (
                                <div className={`backdrop-blur-sm px-2 sm:px-3 py-0.5 sm:py-1 rounded-full border ${
                              isDarkMode 
                                ? 'bg-yellow-500/90 border-yellow-400' 
                                : 'bg-white/20 border-white/30'
                            }`}>
                                  <span className={`font-bold text-xs sm:text-sm ${
                                isDarkMode ? 'text-black' : 'text-white'
                                  }`}>{totalCount}</span>
                            </div>
                              )
                            })()}
                          </div>
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
                      {(() => {
                        // CRITICAL: Ensure notifications is an array - handle all edge cases
                        let notificationsArray = []
                        if (Array.isArray(notifications)) {
                          notificationsArray = notifications
                        } else if (notifications && typeof notifications === 'object') {
                          // Try to extract array from object - check ALL properties
                          const keys = Object.keys(notifications)
                          console.log('🔍 Rendering: notifications is object with keys:', keys)
                          
                          // Try common properties first
                          if (Array.isArray(notifications.data)) {
                            notificationsArray = notifications.data
                            console.log('✅ Rendering: Found array in .data')
                          } else if (Array.isArray(notifications.notifications)) {
                            notificationsArray = notifications.notifications
                            console.log('✅ Rendering: Found array in .notifications')
                          } else if (Array.isArray(notifications.items)) {
                            notificationsArray = notifications.items
                            console.log('✅ Rendering: Found array in .items')
                          } else {
                            // Check ALL properties
                            for (const key of keys) {
                              if (Array.isArray(notifications[key])) {
                                notificationsArray = notifications[key]
                                console.log(`✅ Rendering: Found array in .${key}`)
                                break
                              }
                            }
                          }
                        }
                        
                        const hasNotifications = notificationsArray.length > 0
                        
                        // CRITICAL: Log the state for debugging
                        console.log('🔍 Rendering check:', {
                          notificationsState: notifications,
                          notificationsStateType: typeof notifications,
                          isArray: Array.isArray(notifications),
                          notificationsArrayLength: notificationsArray.length,
                          hasNotifications,
                          displayUnreadCount
                        })
                        
                        // Only log in development to reduce console noise
                        if (process.env.NODE_ENV === 'development') {
                        console.log('🔍 Rendering notifications check:', {
                            notificationsState: notifications,
                            notificationsCount: notificationsArray.length,
                            isArray: Array.isArray(notifications),
                            hasNotifications,
                            notificationsType: typeof notifications,
                            unreadCount: displayUnreadCount,
                            notificationsSample: notificationsArray.slice(0, 3).map(n => ({
                              id: n.id,
                              title: n.title,
                              read: n.read
                            }))
                          })
                        }
                        
                        // If badge shows unread but array is empty, log warning but don't auto-refresh
                        // (auto-refresh is handled by useEffect when dropdown opens)
                        if (!hasNotifications && displayUnreadCount > 0 && studentMySQLId) {
                          console.warn('⚠️ MISMATCH: Badge shows', displayUnreadCount, 'unread but notifications array is empty!')
                          console.warn('💡 Click the refresh button (↻) to reload notifications')
                        }
                        
                        if (!hasNotifications && process.env.NODE_ENV === 'development') {
                          console.warn('⚠️ No notifications to display. State:', {
                            notifications,
                            isArray: Array.isArray(notifications),
                            length: notifications?.length,
                            unreadCount: displayUnreadCount,
                            studentMySQLId
                          })
                        }
                        
                        return !hasNotifications
                      })() ? (
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
                        <>
                          {unreadNotifications.length === 0 && (
                            <div className="px-4 pt-4 pb-2 text-xs font-medium text-slate-500 flex items-center gap-2">
                              <span className="inline-flex w-2 h-2 rounded-full bg-emerald-500"></span>
                              <span>No unread notifications. Showing your history.</span>
                            </div>
                          )}
                          {(() => {
                            // CRITICAL: Use the notificationsArray computed above (line ~2770), not the raw notifications state
                            // This ensures we're using the properly parsed array
                            let notificationsToRender = notificationsArray.length > 0 ? notificationsArray : []
                            
                            // Fallback: if notificationsArray is empty, try to parse notifications state again
                            if (notificationsToRender.length === 0) {
                              console.log('⚠️ Rendering: notificationsArray is empty, trying to parse notifications state')
                              if (Array.isArray(notifications)) {
                                notificationsToRender = notifications
                                console.log('✅ Rendering: notifications state is array, length:', notifications.length)
                              } else if (notifications && typeof notifications === 'object') {
                                // Try to extract array from object - check ALL properties
                                const keys = Object.keys(notifications)
                                console.log('🔍 Rendering: notifications is object with keys:', keys)
                                
                                // Try common properties first
                                if (Array.isArray(notifications.data)) {
                                  notificationsToRender = notifications.data
                                  console.log('✅ Rendering: Found array in .data')
                                } else if (Array.isArray(notifications.notifications)) {
                                  notificationsToRender = notifications.notifications
                                  console.log('✅ Rendering: Found array in .notifications')
                                } else if (Array.isArray(notifications.items)) {
                                  notificationsToRender = notifications.items
                                  console.log('✅ Rendering: Found array in .items')
                                } else {
                                  // Check ALL properties
                                  for (const key of keys) {
                                    if (Array.isArray(notifications[key])) {
                                      notificationsToRender = notifications[key]
                                      console.log(`✅ Rendering: Found array in .${key}`)
                                      break
                                    }
                                  }
                                }
                              }
                            }
                            
                            console.log('🎨 Rendering notifications:', {
                              notificationsArrayLength: notificationsArray.length,
                              notificationsToRenderLength: notificationsToRender.length,
                              notificationsStateType: typeof notifications,
                              isArray: Array.isArray(notifications),
                              sample: notificationsToRender.slice(0, 2).map(n => ({ id: n.id, title: n.title }))
                            })
                            
                            // Only log in development
                            if (process.env.NODE_ENV === 'development') {
                              console.log('🎨 Rendering notifications:', {
                                stateType: typeof notifications,
                                isArray: Array.isArray(notifications),
                                notificationsToRenderLength: notificationsToRender.length,
                                sample: notificationsToRender.slice(0, 2).map(n => ({ id: n.id, title: n.title }))
                              })
                            }
                            
                            // Sort notifications: unread first, then by date (newest first)
                            const sortedNotifications = [...notificationsToRender].sort((a, b) => {
                              // Unread notifications first
                              const aRead = a.read === true || a.read === 1 || a.read === '1'
                              const bRead = b.read === true || b.read === 1 || b.read === '1'
                              if (aRead !== bRead) {
                                return aRead ? 1 : -1
                              }
                              // Then sort by date (newest first)
                              const aDate = new Date(a.created_at || a.createdAt || a.timestamp || 0)
                              const bDate = new Date(b.created_at || b.createdAt || b.timestamp || 0)
                              return bDate - aDate
                            })
                            
                            return sortedNotifications.map(notification => {
                            const urgent = isUrgent(notification)
                            const action = getStudentAction(notification)
                            const timestamp = formatTimestamp(
                              notification.created_at || notification.createdAt || notification.timestamp
                            )
                            
                            return (
                          <div
                            key={notification.id}
                                className={`relative m-2 sm:m-3 rounded-xl shadow-md border-2 transition-all duration-200 cursor-pointer group ${
                                  isDarkMode
                                    ? 'bg-[#1a1a1a]'
                                    : 'bg-white'
                                } ${
                                  urgent ? 'border-[#7A1315]' : isDarkMode ? 'border-slate-700' : 'border-slate-200'
                                } ${!notification.read ? 'shadow-lg' : 'hover:shadow-lg'}`}
                            onClick={() => {
                              // Mark as read via API
                              markAsRead(notification.id).catch(err => {
                                console.error('Error marking notification as read:', err)
                              })
                              // Optimistically update UI
                              const updatedNotifications = notifications.map(n =>
                                n.id === notification.id ? { ...n, read: true } : n
                              )
                              setNotifications(updatedNotifications)
                              setUnreadNotificationCount(Math.max(0, unreadNotificationCount - 1))
                            }}
                          >
                                {/* Card Content - Compact, Self-Contained */}
                                <div className="p-2.5 sm:p-4">
                                  {/* Header - Bold title with delete button */}
                                  <div className="flex items-start justify-between mb-1.5 sm:mb-2">
                                    <div className="flex items-center gap-1.5 sm:gap-2">
                                      <h4 className={`text-xs sm:text-sm font-bold leading-tight ${
                                      isDarkMode
                                          ? urgent ? 'text-red-400' : 'text-white'
                                        : 'text-[#7A1315]'
                                    }`}>
                                      {notification.title}
                                    </h4>
                                    {!notification.read && (
                                        <div className={`flex-shrink-0 w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                                          isDarkMode ? 'bg-red-400' : 'bg-[#7A1315]'
                                      }`}></div>
                                    )}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation()
                                        // Delete notification via API
                                        deleteNotification(notification.id).catch(err => {
                                          console.error('Error deleting notification:', err)
                                        })
                                        // Optimistically update UI
                                        const updatedNotifications = notifications.filter(n => n.id !== notification.id)
                                        setNotifications(updatedNotifications)
                                        // Update unread count if this was unread
                                        if (!notification.read) {
                                          setUnreadNotificationCount(Math.max(0, unreadNotificationCount - 1))
                                        }
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
                                    {notification.message}
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
                                          const updatedNotifications = notifications.map(n =>
                                            n.id === notification.id ? { ...n, read: true } : n
                                          )
                                          setNotifications(updatedNotifications)
                                          setUnreadNotificationCount(Math.max(0, unreadNotificationCount - 1))
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
                          })()}
                        </>
                      )}
                    </div>
                      
                      {/* Footer */}
                      {notifications.length > 0 && (
                        <div className={`p-4 border-t-2 ${
                          isDarkMode 
                            ? 'border-slate-700 bg-[#1a1a1a]' 
                            : 'border-slate-200 bg-gradient-to-r from-slate-50 to-red-50'
                        }`}>
                      <button
                        onClick={() => {
                          // Mark all as read via API
                          markAllAsRead().catch(err => {
                            console.error('Error marking all notifications as read:', err)
                          })
                          // Optimistically update UI - keep history but mark all as read
                          const updatedNotifications = notifications.map(n => ({ ...n, read: true }))
                          setNotifications(updatedNotifications)
                          setUnreadNotificationCount(0)
                        }}
                            className="w-full text-center text-sm font-bold text-white hover:text-white bg-[#7A1315] hover:bg-red-800 px-4 py-2.5 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                            Clear All Notifications
                      </button>
                  </div>
                )}
                    </div>
                  )
                })()}
              </div>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileDropdown(!showProfileDropdown)
                    setShowNotifDropdown(false)
                  }}
                  className="flex items-center space-x-1 sm:space-x-2 md:space-x-3 rounded-xl sm:rounded-2xl border border-slate-200 px-2 sm:px-3 py-1.5 sm:py-2 hover:bg-white transition-all focus:outline-none focus:ring-2 focus:ring-maroon-500"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 bg-gradient-to-r from-red-800 to-red-600 rounded-full flex items-center justify-center text-white font-semibold text-xs sm:text-sm flex-shrink-0">
                    {studentPic && studentPic !== '/assets/images/trisha.jpg' ? (
                      <img src={studentPic} alt="Profile" className="w-full h-full rounded-full object-cover" />
                    ) : (
                      getInitials(studentName)
                    )}
                  </div>
                  <div className="text-left min-w-0 hidden sm:block">
                    <p className={`text-[10px] md:text-xs uppercase tracking-wide ${isDarkMode ? 'text-slate-300' : 'text-slate-400'}`}>Profile</p>
                    <p className={`text-xs md:text-sm font-semibold truncate max-w-[80px] md:max-w-none ${isDarkMode ? 'text-white' : 'text-slate-700'}`}>{studentName}</p>
                  </div>
                  <svg className="w-3 h-3 sm:w-4 sm:h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path d="M6 9l6 6 6-6" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>

                {/* Profile Dropdown Menu */}
                {showProfileDropdown && (
                  <div className={`fixed sm:absolute left-4 right-4 sm:left-auto sm:right-0 top-16 sm:top-auto mt-0 sm:mt-2 w-auto sm:w-56 max-w-[280px] sm:max-w-none rounded-xl shadow-2xl border-2 z-50 overflow-hidden ${
                    isDarkMode 
                      ? 'bg-[#1a1a1a] border-slate-700' 
                      : 'bg-white border-slate-200'
                  }`}>
                    {/* Profile Header */}
                    <div className={`p-4 border-b ${
                      isDarkMode ? 'border-slate-700' : 'border-slate-200'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-red-800 to-red-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {studentPic && studentPic !== '/assets/images/trisha.jpg' ? (
                            <img src={studentPic} alt="Profile" className="w-full h-full rounded-full object-cover" />
                          ) : (
                            getInitials(studentName)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`text-sm font-semibold truncate ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>{studentName}</p>
                          <p className={`text-xs truncate ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>{studentEmail || 'Student'}</p>
                        </div>
                      </div>
                    </div>

                    {/* Menu Items */}
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowProfileModal(true)
                          setShowProfileDropdown(false)
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-slate-800/50 text-white' 
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        <span className="text-sm font-medium">Profile Settings</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowProfileDropdown(false)
                          handleLogoutClick()
                        }}
                        className={`w-full px-4 py-3 text-left flex items-center space-x-3 transition-colors ${
                          isDarkMode 
                            ? 'hover:bg-red-900/30 text-red-400' 
                            : 'hover:bg-red-50 text-red-600'
                        }`}
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 17v-3H9v-4h7V7l5 5-5 5M14 2a2 2 0 012 2v2h-2V4H4v16h10v-2h2v2a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2h10z" />
                        </svg>
                        <span className="text-sm font-medium">Logout</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full mx-4 p-6 border border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900 mb-2 text-center">
              Confirm Logout
            </h2>
            <p className="text-sm text-slate-600 mb-6 text-center">
              Are you sure you want to logout?
            </p>
            <div className="flex items-center justify-center gap-3">
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

      <main className="max-w-7xl mx-auto p-3 sm:p-4 md:p-6 space-y-6 sm:space-y-8 fade">
        {/* Student Academic Summary Section with Welcome */}
        <div className={`rounded-2xl sm:rounded-3xl shadow-xl p-4 sm:p-6 md:p-8 slide-up ${
          isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'
        }`}>
          <div className="mb-2 sm:mb-3">
            <h2 className={`text-sm sm:text-base md:text-lg font-medium ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
              Welcome, <span className="text-[#7A1315] font-semibold">{studentName}</span>
            </h2>
          </div>
          <div className="mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-[#7A1315]">Student Academic Summary</h2>
            <p className={`mt-1 sm:mt-2 text-sm sm:text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>Track assessments, attendance, and grades across all enrolled subjects.</p>
          </div>

          {/* Stats Cards - Using Real-Time Firestore Data */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {(() => {
            // Calculate statistics from real-time MySQL data (user-specific)
            const stats = calculateRealTimeStatistics()
            
            // Debug logging to verify user-specific data
            console.log('📊 Dashboard statistics for user:', {
              studentName: studentName,
              studentMySQLId: studentMySQLId,
              enrollmentsCount: enrollments.length,
              coursesCount: courses.length,
              gradesCount: liveGrades.length,
              attendanceCount: liveAttendance.length,
              stats: stats
            })
            
            return [
            {
              key: 'absences',
              label: 'Absences',
                value: stats.absences,
              description: 'This semester',
                iconClass: 'bg-rose-100 text-rose-500',
                iconPath: 'M12 14l4-4m0 0l-4-4m4 4H8m8 0a6 6 0 11-12 0 6 6 0 0112 0z',
                color: 'text-slate-900',
            },
            {
              key: 'exams',
                label: 'Total Assessments',
                value: stats.totalExams > 0 ? `${stats.examsCompleted}/${stats.totalExams}` : 'N/A',
                description: stats.totalExams > 0 
                  ? `${Math.round((stats.examsCompleted / stats.totalExams) * 100)}% completed` 
                  : 'No assessments recorded',
                iconClass: 'bg-yellow-100 text-yellow-500',
                iconPath: 'M7 7h10M7 11h6m-2 4h6M5 3h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2z',
                color: 'text-slate-900',
            },
            {
              key: 'attendance',
              label: 'Attendance Rate',
                value: `${stats.attendanceRate}%`,
                description: stats.attendanceRate >= 90 ? 'Excellent attendance' 
                  : stats.attendanceRate >= 75 ? 'Good attendance' 
                  : stats.attendanceRate >= 50 ? 'Fair attendance' 
                  : 'Needs improvement',
                iconClass: 'bg-sky-100 text-sky-500',
                iconPath: 'M5 13l4 4L19 7',
                color: 'text-slate-900',
            },
            {
              key: 'grade',
              label: 'Average Grade',
                value: `${stats.averageGrade}%`,
                description: stats.averageGrade >= 90 ? 'Overall performance' 
                  : stats.averageGrade >= 85 ? 'Overall performance' 
                  : stats.averageGrade >= 80 ? 'Overall performance' 
                  : stats.averageGrade >= 75 ? 'Overall performance' 
                  : 'Overall performance',
                iconClass: 'bg-sky-100 text-sky-500',
                iconPath: 'M12 17l-5 3 1.9-5.4L4 10h6l2-6 2 6h6l-4.9 4.6L17 20z',
                color: 'text-slate-900',
            },
          ].map((card) => {
            return (
              <div
                key={card.key}
                  className={`metric-card rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-sm relative overflow-hidden border ${
                    isDarkMode 
                      ? 'bg-[#1a1a1a] border-slate-700' 
                      : 'bg-white/80 border-white/60'
                  }`}
                style={{ minHeight: '120px' }}
              >
                <div className="w-full h-full p-2 sm:p-3 md:p-5 box-border flex flex-col">
                    <div className={`metric-icon ${card.iconClass} mb-2 p-1.5 sm:p-2 rounded-lg w-fit`}>
                      <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path d={card.iconPath} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      </div>
                    <p className={`text-xs sm:text-sm font-semibold mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>{card.label}</p>
                    <p className={`text-2xl sm:text-3xl md:text-4xl font-bold mb-1 break-words ${isDarkMode ? 'text-white' : card.color}`}>{card.value}</p>
                    <p className={`text-[10px] sm:text-xs mb-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-400'}`}>{card.description}</p>
                </div>
              </div>
            )
            })
          })()}
          </div>
        </div>

        {/* Subjects Section */}
        <div className={`rounded-xl shadow-sm p-4 sm:p-5 md:p-6 slide-up ${
          isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'
        }`}>
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
              <h2 className={`text-lg sm:text-xl md:text-2xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                {filterTerm === 'all' ? 'All Subjects' : 
                 filterTerm === 'first' ? '1st Term Subjects' : 
                 filterTerm === 'second' ? '2nd Term Subjects' : 
                 'Archived Subjects'}
              </h2>
              
              {/* Search and Filter Controls */}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                {/* Search Input */}
                <div className="relative flex-1 sm:min-w-[200px]">
                  <input
                    type="text"
                    placeholder="Search subjects..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={`w-full px-3 py-2 pl-9 rounded-lg border text-sm ${
                      isDarkMode 
                        ? 'bg-[#2c2c2c] border-slate-600 text-white placeholder-slate-400' 
                        : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                    } focus:outline-none focus:ring-2 focus:ring-[#7A1315] focus:border-transparent`}
                  />
                  <i className={`fa-solid fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-sm ${
                    isDarkMode ? 'text-slate-400' : 'text-slate-500'
                  }`}></i>
          </div>
          
                {/* Sort Dropdown */}
                <select
                  value={`${sortBy}-${sortOrder}`}
                  onChange={(e) => {
                    const [newSortBy, newSortOrder] = e.target.value.split('-')
                    setSortBy(newSortBy)
                    setSortOrder(newSortOrder)
                  }}
                  className={`px-3 py-2 rounded-lg border text-sm ${
                    isDarkMode 
                      ? 'bg-[#2c2c2c] border-slate-600 text-white' 
                      : 'bg-white border-slate-300 text-slate-800'
                  } focus:outline-none focus:ring-2 focus:ring-[#7A1315] focus:border-transparent`}
                >
                  <option value="name-asc">Name (A-Z)</option>
                  <option value="name-desc">Name (Z-A)</option>
                  <option value="code-asc">Code (A-Z)</option>
                  <option value="code-desc">Code (Z-A)</option>
                  <option value="grade-desc">Grade (High to Low)</option>
                  <option value="grade-asc">Grade (Low to High)</option>
                  <option value="attendance-desc">Attendance (High to Low)</option>
                  <option value="attendance-asc">Attendance (Low to High)</option>
                </select>
              </div>
            </div>
            
            {/* Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setFilterTerm('all')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filterTerm === 'all'
                      ? isDarkMode
                        ? 'bg-[#7A1315] text-white shadow-lg'
                        : 'bg-[#7A1315] text-white shadow-lg'
                      : isDarkMode
                        ? 'bg-[#2c2c2c] text-slate-300 border border-slate-600 hover:bg-[#3c3c3c] hover:border-slate-500'
                        : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 hover:border-slate-400'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFilterTerm('first')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filterTerm === 'first'
                      ? isDarkMode
                        ? 'bg-[#7A1315] text-white shadow-lg'
                        : 'bg-[#7A1315] text-white shadow-lg'
                      : isDarkMode
                        ? 'bg-[#2c2c2c] text-slate-300 border border-slate-600 hover:bg-[#3c3c3c] hover:border-slate-500'
                        : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 hover:border-slate-400'
                  }`}
                >
                  1st Term
                </button>
                <button
                  onClick={() => setFilterTerm('second')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    filterTerm === 'second'
                      ? isDarkMode
                        ? 'bg-[#7A1315] text-white shadow-lg'
                        : 'bg-[#7A1315] text-white shadow-lg'
                      : isDarkMode
                        ? 'bg-[#2c2c2c] text-slate-300 border border-slate-600 hover:bg-[#3c3c3c] hover:border-slate-500'
                        : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200 hover:border-slate-400'
                  }`}
                >
                  2nd Term
                </button>
              </div>
              
              {/* Separator */}
              <div className={`h-6 w-px ${isDarkMode ? 'bg-slate-600' : 'bg-slate-300'}`}></div>
              
              {/* Archived Button - More Prominent */}
              {(() => {
                // Count archived subjects
                const allSubjects = [
                  ...(data.firstTerm || []).map(s => ({ ...s, term: 'first' })),
                  ...(data.secondTerm || []).map(s => ({ ...s, term: 'second' }))
                ]
                const archivedCount = allSubjects.filter(s => isSubjectArchived(s)).length
                
                return (
                  <button
                    onClick={() => setFilterTerm('archived')}
                    disabled={archivedCount === 0}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
                      filterTerm === 'archived'
                        ? isDarkMode
                          ? 'bg-amber-700 text-white shadow-lg border-2 border-amber-600'
                          : 'bg-amber-600 text-white shadow-lg border-2 border-amber-500'
                        : archivedCount === 0
                          ? isDarkMode
                            ? 'bg-[#2c2c2c] text-slate-600 border border-slate-600 cursor-not-allowed opacity-50'
                            : 'bg-slate-100 text-slate-400 border border-slate-300 cursor-not-allowed opacity-50'
                          : isDarkMode
                            ? 'bg-amber-900/30 text-amber-300 border border-amber-700 hover:bg-amber-900/50 hover:border-amber-600'
                            : 'bg-amber-50 text-amber-700 border border-amber-300 hover:bg-amber-100 hover:border-amber-400'
                    }`}
                    title={archivedCount === 0 ? 'No archived subjects yet' : `View ${archivedCount} archived subject${archivedCount !== 1 ? 's' : ''}`}
                  >
                    <i className={`fa-solid fa-archive ${filterTerm === 'archived' ? 'text-white' : ''}`}></i>
                    <span>Archived</span>
                    {archivedCount > 0 && (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                        filterTerm === 'archived'
                          ? 'bg-white/20 text-white'
                          : isDarkMode
                            ? 'bg-amber-700 text-amber-200'
                            : 'bg-amber-600 text-white'
                      }`}>
                        {archivedCount}
                      </span>
                    )}
                  </button>
                )
              })()}
            </div>
            
            {/* Archive Notice Banner */}
            {filterTerm === 'archived' && (() => {
              const allSubjects = [
                ...(data.firstTerm || []).map(s => ({ ...s, term: 'first' })),
                ...(data.secondTerm || []).map(s => ({ ...s, term: 'second' }))
              ]
              const archivedCount = allSubjects.filter(s => isSubjectArchived(s)).length
              
              if (archivedCount > 0) {
                return (
                  <div className={`mb-4 p-3 sm:p-4 rounded-lg border ${
                    isDarkMode
                      ? 'bg-amber-900/20 border-amber-700/50'
                      : 'bg-amber-50 border-amber-200'
                  }`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-amber-800/50' : 'bg-amber-100'
                      }`}>
                        <i className={`fa-solid fa-info-circle text-sm ${
                          isDarkMode ? 'text-amber-400' : 'text-amber-600'
                        }`}></i>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className={`font-semibold text-sm mb-1 ${
                          isDarkMode ? 'text-amber-300' : 'text-amber-800'
                        }`}>
                          Viewing Archived Subjects
                        </h4>
                        <p className={`text-xs sm:text-sm ${
                          isDarkMode ? 'text-amber-200/80' : 'text-amber-700'
                        }`}>
                          These subjects have no activity for over 1 year. They are kept for historical records but are hidden from your main view by default.
                        </p>
                      </div>
                      <button
                        onClick={() => setFilterTerm('all')}
                        className={`flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          isDarkMode
                            ? 'bg-amber-800/50 text-amber-300 hover:bg-amber-800/70 border border-amber-700'
                            : 'bg-amber-100 text-amber-700 hover:bg-amber-200 border border-amber-300'
                        }`}
                      >
                        View Current
                      </button>
                    </div>
                  </div>
                )
              }
              return null
            })()}
          </div>
          
          {(() => {
            // Combine first and second term subjects
            const allSubjects = [
              ...(data.firstTerm || []).map(s => ({ ...s, term: 'first' })),
              ...(data.secondTerm || []).map(s => ({ ...s, term: 'second' }))
            ]
            
            const filteredSorted = getFilteredAndSortedSubjects(allSubjects)
            const paginated = getPaginatedSubjects(filteredSorted)
            const totalPages = Math.ceil(filteredSorted.length / itemsPerPage)
            
            return (
              <>
                {filteredSorted.length > 0 ? (
                  <>
                    <div className="mb-3 text-sm text-slate-500">
                      Showing {paginated.length} of {filteredSorted.length} subject{filteredSorted.length !== 1 ? 's' : ''}
                    </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
                      {paginated.map((subject, index) => {
                        const isArchived = isSubjectArchived(subject)
                        return (
              <div
                  key={subject.id || subject.code || index}
                onClick={() => openSubjectModal(subject, subject.term || 'first')}
                className={`subject-card p-4 sm:p-5 rounded-xl border cursor-pointer transition-all slide-up relative ${
                  isDarkMode 
                    ? isArchived
                      ? 'bg-[#2c2c2c] border-slate-600 hover:border-slate-500 opacity-75'
                      : 'bg-[#1a1a1a] border-slate-700 hover:border-slate-600'
                    : isArchived
                      ? 'bg-slate-50 border-slate-300 hover:border-slate-400 opacity-75'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
                style={{ animationDelay: `${0.1 * index}s` }}
              >
                {isArchived && (
                  <div className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                    isDarkMode 
                      ? 'bg-amber-900/50 text-amber-300 border border-amber-700'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    <i className="fa-solid fa-archive mr-1"></i> Archived
                  </div>
                )}
                <div className="flex justify-between items-start mb-3 sm:mb-4 gap-2">
                  <div className="flex-1 min-w-0">
                      <h3 className={`font-bold text-base sm:text-lg ${isDarkMode ? 'text-white' : 'text-slate-800'} break-words`}>{subject.id || subject.code} - {subject.name}</h3>
                    <p className={`text-xs mt-1 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Code: {subject.code} | {subject.term === 'second' ? '2nd' : '1st'} Term</p>
                    {/* Professor Info */}
                    {subject.instructor && subject.instructor.name && subject.instructor.name !== 'TBA' && (
                      <div className="flex items-center mt-2 gap-2">
                        {subject.instructor.photo_url ? (
                          <img 
                            src={subject.instructor.photo_url} 
                            alt={subject.instructor.name}
                            className="w-6 h-6 rounded-full object-cover border border-slate-200"
                            onError={(e) => {
                              // Fallback to initials if image fails
                              const img = e.target
                              img.style.display = 'none'
                              const parent = img.parentElement
                              if (parent && !parent.querySelector('.prof-initials')) {
                                const initialsSpan = document.createElement('span')
                                initialsSpan.className = 'prof-initials w-6 h-6 rounded-full bg-gradient-to-br from-red-600 to-[#7A1315] flex items-center justify-center text-white text-xs font-semibold'
                                initialsSpan.textContent = getInitials(subject.instructor.name)
                                parent.appendChild(initialsSpan)
                              }
                            }}
                          />
                        ) : (
                          <span className="w-6 h-6 rounded-full bg-gradient-to-br from-red-600 to-[#7A1315] flex items-center justify-center text-white text-xs font-semibold">
                            {getInitials(subject.instructor.name)}
                          </span>
                        )}
                        <span className="text-xs text-slate-600 font-medium truncate">
                          Prof. {subject.instructor.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0 ml-2">
                    <div className={`text-lg sm:text-xl font-bold ${getGradeColor(subject.grade)}`}>
                      {subject.grade || "N/A"}%
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500">Current</p>
                  </div>
                </div>
                
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mb-3 sm:mb-4">
                  <div className={`h-full ${getGradeBg(subject.grade)} progress`} style={{ width: `${subject.grade || 0}%` }}></div>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center min-w-0">
                    <span className="text-[10px] sm:text-xs text-slate-500 mr-1 sm:mr-2">Attendance:</span>
                    <span className={`text-[10px] sm:text-xs font-medium ${
                      subject.attRate >= 90 ? "text-emerald-600" :
                      subject.attRate >= 80 ? "text-amber-600" : "text-red-600"
                    }`}>
                      {subject.attRate || "N/A"}%
                    </span>
                  </div>
                  <button className="text-xs text-slate-500 hover:text-slate-700 flex-shrink-0">
                    <i className="fa-solid fa-chevron-right"></i>
                  </button>
                </div>
              </div>
                        )
                      })}
          </div>
                    
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className={`flex flex-col sm:flex-row justify-between items-center gap-3 mt-6 pt-4 border-t ${
                        isDarkMode ? 'border-slate-700' : 'border-slate-200'
                      }`}>
                        <div className={`text-sm ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Page {currentPage} of {totalPages}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                            disabled={currentPage === 1}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === 1
                                ? isDarkMode
                                  ? 'bg-[#2c2c2c] text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                : isDarkMode
                                  ? 'bg-[#2c2c2c] text-white border border-slate-600 hover:bg-[#3c3c3c]'
                                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
                            }`}
                          >
                            <i className="fa-solid fa-chevron-left mr-1"></i> Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                            disabled={currentPage === totalPages}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                              currentPage === totalPages
                                ? isDarkMode
                                  ? 'bg-[#2c2c2c] text-slate-600 cursor-not-allowed'
                                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
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
          ) : (
            <div className="text-center py-12">
                    <div className={`w-20 h-20 mx-auto mb-4 rounded-full flex items-center justify-center ${
                      isDarkMode ? 'bg-slate-800' : 'bg-slate-100'
                    }`}>
                <svg className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
                    <h3 className={`text-lg font-semibold mb-2 ${isDarkMode ? 'text-slate-300' : 'text-slate-700'}`}>
                      {searchQuery ? 'No subjects found' : 'Not Enrolled in Any Subjects'}
                    </h3>
                    <p className={`text-sm max-w-md mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
                      {searchQuery 
                        ? `No subjects match "${searchQuery}". Try adjusting your search or filters.`
                        : 'You are not currently enrolled in any subjects. Please contact your professor to be enrolled in subjects.'}
                    </p>
                    {searchQuery && (
                      <button
                        onClick={() => {
                          setSearchQuery('')
                          setFilterTerm('all')
                        }}
                        className={`mt-4 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          isDarkMode
                            ? 'bg-[#7A1315] text-white hover:bg-[#8a2325]'
                            : 'bg-[#7A1315] text-white hover:bg-[#8a2325]'
                        }`}
                      >
                        Clear Filters
                      </button>
                    )}
            </div>
          )}
              </>
            )
          })()}
        </div>
      </main>

      {/* Subject Detail Modal */}
      {showModal && selectedSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-3 sm:p-4 z-50" onClick={closeModal}>
          <div className={`rounded-xl p-4 sm:p-6 w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto custom-scroll shadow-2xl modal-appear ${
            isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
            <div className={`modal-sticky-header mb-4 sm:mb-6 pb-3 sm:pb-4 pt-3 sm:pt-4 border-b shadow-sm ${
              isDarkMode ? 'bg-[#1a1a1a] border-slate-700' : 'border-slate-200'
            }`}>
              <div className="flex justify-between items-start sm:items-center gap-2">
                <div className="min-w-0 flex-1 pr-2">
                  <h3 className={`text-base sm:text-lg md:text-xl font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'} break-words`}>{selectedSubject.id} - {selectedSubject.name}</h3>
                  <p className={`text-xs sm:text-sm mt-1 ${isDarkMode ? 'text-slate-200' : 'text-slate-600'} break-words`}>Subject Code: {selectedSubject.code} | {selectedSubject.term === 'first' ? '1st' : '2nd'} Term Subject</p>
                </div>
                <button onClick={closeModal} className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center transition-colors rounded-full border shadow-md flex-shrink-0 ${
                  isDarkMode 
                    ? 'text-white hover:text-slate-200 bg-[#1a1a1a] border-slate-600 hover:bg-[#2c2c2c] hover:border-slate-500' 
                    : 'text-slate-600 hover:text-slate-800 bg-white border-slate-200 hover:bg-slate-100'
                }`}>
                  <i className="fa-solid fa-xmark text-base sm:text-lg"></i>
                </button>
              </div>
            </div>
            
            {/* Modal content */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5">
              <div className="md:col-span-2 space-y-4 sm:space-y-5">
                <div className={`p-5 rounded-xl border ${
                  isDarkMode ? 'bg-[#1a1a1a] border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className={`text-lg font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Grade Performance</h4>
                  <p className={`text-sm mb-4 ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>Your current grade for this subject</p>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isDarkMode ? 'bg-red-900/30' : 'bg-red-100'
                      }`}>
                        <i className={`fa-solid fa-graduation-cap ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}></i>
                      </div>
                      <div className="flex flex-col">
                        <span className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Current Grade</span>
                        <span className={`text-2xl font-bold ${getGradeColor(selectedSubject.grade)}`}>
                          {selectedSubject.grade || "N/A"}%
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-full rounded-full h-2 overflow-hidden ${
                    isDarkMode ? 'bg-slate-700' : 'bg-slate-200'
                  }`}>
                    <div className={`h-full ${getGradeBg(selectedSubject.grade)} progress grade-progress`} style={{ width: `${selectedSubject.grade || 0}%` }}></div>
                  </div>
                </div>

                {/* Exams/Grades Table with Dates - Improved Layout */}
                {selectedSubject.exams && selectedSubject.exams.length > 0 && (() => {
                  // Filter exams by type
                  let filteredExams = selectedSubject.exams.filter(exam => {
                    if (examViewMode === 'all') return true
                    const examType = (exam.type || '').toLowerCase()
                    return examType === examViewMode.toLowerCase()
                  })
                  
                  // Filter by search query
                  if (examSearchQuery) {
                    const searchLower = examSearchQuery.toLowerCase()
                    filteredExams = filteredExams.filter(exam => {
                      const name = (exam.name || '').toLowerCase()
                      const type = (exam.type || '').toLowerCase()
                      return name.includes(searchLower) || type.includes(searchLower)
                    })
                  }
                  
                  // Sort exams
                  filteredExams.sort((a, b) => {
                    let aValue, bValue
                    switch (examSortBy) {
                      case 'date':
                        aValue = a.date ? new Date(a.date).getTime() : 0
                        bValue = b.date ? new Date(b.date).getTime() : 0
                        break
                      case 'name':
                        aValue = (a.name || '').toLowerCase()
                        bValue = (b.name || '').toLowerCase()
                        break
                      case 'score':
                        aValue = a.score !== undefined ? (a.score / (a.maxPoints || 100)) : 0
                        bValue = b.score !== undefined ? (b.score / (b.maxPoints || 100)) : 0
                        break
                      case 'type':
                        aValue = (a.type || '').toLowerCase()
                        bValue = (b.type || '').toLowerCase()
                        break
                      default:
                        aValue = a.date ? new Date(a.date).getTime() : 0
                        bValue = b.date ? new Date(b.date).getTime() : 0
                    }
                    
                    if (examSortOrder === 'asc') {
                      return aValue > bValue ? 1 : aValue < bValue ? -1 : 0
                    } else {
                      return aValue < bValue ? 1 : aValue > bValue ? -1 : 0
                    }
                  })
                  
                  // Group exams by type
                  const examsByType = {}
                  filteredExams.forEach(exam => {
                    const type = exam.type || 'Other'
                    if (!examsByType[type]) {
                      examsByType[type] = []
                    }
                    examsByType[type].push(exam)
                  })
                  
                  // Paginate exams
                  const startIndex = (examPage - 1) * examItemsPerPage
                  const endIndex = startIndex + examItemsPerPage
                  const paginatedExams = filteredExams.slice(startIndex, endIndex)
                  const totalExamPages = Math.ceil(filteredExams.length / examItemsPerPage)
                  
                  // Get exam type counts
                  const examTypeCounts = {}
                  selectedSubject.exams.forEach(exam => {
                    const type = exam.type || 'Other'
                    examTypeCounts[type] = (examTypeCounts[type] || 0) + 1
                  })
                  
                  return (
                  <div className={`p-4 sm:p-5 rounded-xl border ${
                    isDarkMode ? 'bg-[#1a1a1a] border-slate-700' : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <h4 className={`text-base sm:text-lg font-bold ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                        Exams & Grades ({filteredExams.length})
                      </h4>
                      
                      {/* Exam Controls */}
                      <div className="flex flex-wrap gap-2">
                        {/* Search */}
                        <div className="relative flex-1 sm:min-w-[150px]">
                          <input
                            type="text"
                            placeholder="Search exams..."
                            value={examSearchQuery}
                            onChange={(e) => {
                              setExamSearchQuery(e.target.value)
                              setExamPage(1)
                            }}
                            className={`w-full px-2 py-1.5 pl-7 rounded-lg border text-xs ${
                              isDarkMode 
                                ? 'bg-[#2c2c2c] border-slate-600 text-white placeholder-slate-400' 
                                : 'bg-white border-slate-300 text-slate-800 placeholder-slate-400'
                            } focus:outline-none focus:ring-2 focus:ring-[#7A1315] focus:border-transparent`}
                          />
                          <i className={`fa-solid fa-search absolute left-2 top-1/2 transform -translate-y-1/2 text-xs ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}></i>
                        </div>
                        
                        {/* Sort */}
                        <select
                          value={`${examSortBy}-${examSortOrder}`}
                          onChange={(e) => {
                            const [newSortBy, newSortOrder] = e.target.value.split('-')
                            setExamSortBy(newSortBy)
                            setExamSortOrder(newSortOrder)
                            setExamPage(1)
                          }}
                          className={`px-2 py-1.5 rounded-lg border text-xs ${
                            isDarkMode 
                              ? 'bg-[#2c2c2c] border-slate-600 text-white' 
                              : 'bg-white border-slate-300 text-slate-800'
                          } focus:outline-none focus:ring-2 focus:ring-[#7A1315] focus:border-transparent`}
                        >
                          <option value="date-desc">Date (Newest)</option>
                          <option value="date-asc">Date (Oldest)</option>
                          <option value="name-asc">Name (A-Z)</option>
                          <option value="name-desc">Name (Z-A)</option>
                          <option value="score-desc">Score (High-Low)</option>
                          <option value="score-asc">Score (Low-High)</option>
                          <option value="type-asc">Type (A-Z)</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Exam Type Filter Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      <button
                        onClick={() => {
                          setExamViewMode('all')
                          setExamPage(1)
                        }}
                        className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                          examViewMode === 'all'
                            ? isDarkMode
                              ? 'bg-[#7A1315] text-white'
                              : 'bg-[#7A1315] text-white'
                            : isDarkMode
                              ? 'bg-[#2c2c2c] text-slate-300 border border-slate-600 hover:bg-[#3c3c3c]'
                              : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        All ({selectedSubject.exams.length})
                      </button>
                      {Object.keys(examTypeCounts).map(type => (
                        <button
                          key={type}
                          onClick={() => {
                            setExamViewMode(type.toLowerCase())
                            setExamPage(1)
                          }}
                          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                            examViewMode === type.toLowerCase()
                              ? isDarkMode
                                ? 'bg-[#7A1315] text-white'
                                : 'bg-[#7A1315] text-white'
                              : isDarkMode
                                ? 'bg-[#2c2c2c] text-slate-300 border border-slate-600 hover:bg-[#3c3c3c]'
                                : 'bg-slate-100 text-slate-700 border border-slate-300 hover:bg-slate-200'
                          }`}
                        >
                          {type} ({examTypeCounts[type]})
                        </button>
                      ))}
                    </div>
                    
                    {/* Grouped Exams by Type */}
                    <div className="space-y-3">
                      {Object.keys(examsByType).map(type => {
                        const typeExams = examsByType[type]
                        const isExpanded = expandedExamTypes[type] !== false // Default to expanded
                        const displayExams = isExpanded ? typeExams : typeExams.slice(0, 3) // Show first 3 if collapsed
                        const hasMore = typeExams.length > 3
                        
                        return (
                          <div key={type} className={`rounded-lg border overflow-hidden ${
                            isDarkMode ? 'bg-[#1a1a1a] border-slate-700' : 'bg-white border-slate-200'
                          }`}>
                            {/* Type Header - Collapsible */}
                            <button
                              onClick={() => setExpandedExamTypes(prev => ({
                                ...prev,
                                [type]: !isExpanded
                              }))}
                              className={`w-full flex items-center justify-between p-3 ${
                                isDarkMode 
                                  ? 'bg-slate-800/50 hover:bg-slate-800/70' 
                                  : 'bg-slate-100 hover:bg-slate-200'
                              } transition-colors`}
                            >
                              <div className="flex items-center gap-2">
                                <i className={`fa-solid fa-chevron-${isExpanded ? 'down' : 'right'} text-xs ${
                                  isDarkMode ? 'text-slate-400' : 'text-slate-600'
                                }`}></i>
                                <span className={`font-semibold text-sm ${
                                  isDarkMode ? 'text-white' : 'text-slate-800'
                                }`}>
                                  {type} ({typeExams.length})
                                </span>
                              </div>
                              {hasMore && !isExpanded && (
                                <span className={`text-xs ${
                                  isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                }`}>
                                  +{typeExams.length - 3} more
                                </span>
                              )}
                            </button>
                            
                            {/* Exams List */}
                            {isExpanded && (
                              <div className="p-3 space-y-2">
                                {displayExams.map((exam, index) => {
                        const examDate = exam.date ? (() => {
                          try {
                            const date = new Date(exam.date)
                            return date.toLocaleDateString('en-US', { 
                              year: 'numeric', 
                              month: 'short', 
                              day: 'numeric' 
                            })
                          } catch {
                            return exam.date
                          }
                        })() : 'N/A'
                        
                        return (
                          <div
                            key={index}
                                      className={`p-3 rounded-lg border ${
                              isDarkMode 
                                ? 'bg-[#1a1a1a] border-slate-700' 
                                          : 'bg-slate-50 border-slate-200'
                            }`}
                          >
                                      <div className="mb-2">
                                        <h5 className={`font-bold text-sm mb-0.5 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                {exam.name}
                              </h5>
                            </div>
                                      <div className="grid grid-cols-3 gap-2">
                                        <div className={`flex flex-col items-center p-2 rounded-lg border ${
                                isDarkMode 
                                  ? 'bg-slate-800/30 border-slate-700' 
                                            : 'bg-white border-slate-200'
                                        }`}>
                                          <i className={`fa-solid fa-file-lines text-xs mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}></i>
                                          <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Score</span>
                                          <span className={`font-bold text-sm ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>
                                  {exam.score !== undefined ? `${exam.score}/${exam.maxPoints || 100}` : 'N/A'}
                                </span>
                              </div>
                                        <div className={`flex flex-col items-center p-2 rounded-lg border ${
                                exam.status === 'Taken'
                                  ? isDarkMode 
                                    ? 'bg-emerald-900/30 border-emerald-700' 
                                    : 'bg-emerald-50 border-emerald-100'
                                  : isDarkMode
                                    ? 'bg-red-900/30 border-red-700'
                                    : 'bg-red-50 border-red-100'
                              }`}>
                                          <i className={`fa-solid ${exam.status === 'Taken' ? 'fa-check-circle' : 'fa-times-circle'} text-xs mb-1 ${
                                    exam.status === 'Taken'
                                      ? isDarkMode ? 'text-emerald-400' : 'text-emerald-600'
                                      : isDarkMode ? 'text-red-400' : 'text-red-600'
                                  }`}></i>
                                          <span className={`text-xs font-medium mb-0.5 ${
                                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                                  }`}>Status</span>
                                          <span className={`text-xs font-semibold ${
                                  exam.status === 'Taken' 
                                              ? isDarkMode ? 'text-emerald-300' : 'text-emerald-700'
                                              : isDarkMode ? 'text-red-300' : 'text-red-700'
                                }`}>
                                  {exam.status}
                                </span>
                              </div>
                                        <div className={`flex flex-col items-center p-2 rounded-lg border ${
                                isDarkMode 
                                  ? 'bg-slate-800/30 border-slate-700' 
                                            : 'bg-white border-slate-200'
                                        }`}>
                                          <i className={`fa-solid fa-calendar text-xs mb-1 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}></i>
                                          <span className={`text-xs font-medium ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>Date</span>
                                          <span className={`text-xs font-semibold ${isDarkMode ? 'text-slate-300' : 'text-slate-500'}`}>
                                  {examDate}
                                </span>
                              </div>
                            </div>
                          </div>
                        )
                      })}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    
                    {/* Pagination for Exams */}
                    {totalExamPages > 1 && (
                      <div className={`flex flex-col sm:flex-row justify-between items-center gap-2 mt-4 pt-4 border-t ${
                        isDarkMode ? 'border-slate-700' : 'border-slate-200'
                      }`}>
                        <div className={`text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                          Showing {paginatedExams.length} of {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''}
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setExamPage(prev => Math.max(1, prev - 1))}
                            disabled={examPage === 1}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                              examPage === 1
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
                          <span className={`px-2 py-1 text-xs ${isDarkMode ? 'text-slate-400' : 'text-slate-600'}`}>
                            Page {examPage} of {totalExamPages}
                          </span>
                          <button
                            onClick={() => setExamPage(prev => Math.min(totalExamPages, prev + 1))}
                            disabled={examPage === totalExamPages}
                            className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
                              examPage === totalExamPages
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
                  </div>
                  )
                })()}
              </div>
              
              <div className="md:col-span-1 space-y-4 sm:space-y-5">
                <div className={`p-4 sm:p-5 rounded-xl border ${
                  isDarkMode ? 'bg-[#1a1a1a] border-slate-700' : 'bg-slate-50 border-slate-200'
                }`}>
                  <h4 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Attendance Summary</h4>
                  <div className="space-y-2 sm:space-y-3 mb-3 sm:mb-4">
                    <div className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-emerald-900/30 border-emerald-700' 
                        : 'bg-emerald-50 border-emerald-100'
                    }`}>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <i className={`fa-solid fa-check-circle text-sm sm:text-base ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}></i>
                        <span className={`font-medium text-xs sm:text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Attendance Rate</span>
                      </div>
                      <span className={`font-bold text-sm sm:text-base ${isDarkMode ? 'text-emerald-400' : 'text-emerald-600'}`}>{selectedSubject.attRate || "N/A"}%</span>
                    </div>
                    <div className={`flex items-center justify-between p-2.5 sm:p-3 rounded-lg border ${
                      isDarkMode 
                        ? 'bg-red-900/30 border-red-700' 
                        : 'bg-red-50 border-red-100'
                    }`}>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <i className={`fa-solid fa-user-slash text-sm sm:text-base ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}></i>
                        <span className={`font-medium text-xs sm:text-sm ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Absences</span>
                      </div>
                      <span className={`font-bold text-sm sm:text-base ${isDarkMode ? 'text-red-400' : 'text-red-600'}`}>{selectedSubject.abs || "N/A"}</span>
                    </div>
                  </div>

                  {/* Attendance Records with Dates */}
                  {selectedSubject.attendanceRecords && selectedSubject.attendanceRecords.length > 0 && (
                    <div className="mt-4">
                      <h5 className={`text-sm font-semibold mb-2 ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>Attendance Records</h5>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {selectedSubject.attendanceRecords.map((record, index) => (
                          <div 
                            key={index}
                            className={`flex items-center justify-between p-2 rounded-lg text-xs border ${
                              record.status === 'present' 
                                ? isDarkMode
                                  ? 'bg-emerald-900/30 border-emerald-700'
                                  : 'bg-emerald-50 border-emerald-100'
                                : isDarkMode
                                  ? 'bg-red-900/30 border-red-700'
                                  : 'bg-red-50 border-red-100'
                            }`}
                          >
                            <div className="flex items-center space-x-2">
                              <i className={`fa-solid ${record.status === 'present' 
                                ? isDarkMode 
                                  ? 'fa-check-circle text-emerald-400' 
                                  : 'fa-check-circle text-emerald-600'
                                : isDarkMode
                                  ? 'fa-user-slash text-red-400'
                                  : 'fa-user-slash text-red-600'
                              }`}></i>
                              <span className={`font-medium capitalize ${isDarkMode ? 'text-slate-200' : 'text-slate-700'}`}>{record.status}</span>
                </div>
                            <span className={isDarkMode ? 'text-slate-400' : 'text-slate-500'}>
                              {(() => {
                                try {
                                  const date = new Date(record.date)
                                  return date.toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                } catch {
                                  return record.date
                                }
                              })()}
                            </span>
              </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Responsive Profile Modal */}
      {showProfileModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4"
          onClick={() => {
            // Restore original photo if modal is closed without saving
            if (originalStudentPicRef.current !== null) {
              setProfilePreview(originalStudentPicRef.current)
              setStudentPic(originalStudentPicRef.current)
              setProfileForm(prev => ({ ...prev, pic: null, removePhoto: false }))
            }
            setShowProfileModal(false)
            setProfileSaveSuccess(false)
            setProfileSection('account')
          }}
        >
          <div
            className={`w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden rounded-xl sm:rounded-2xl shadow-2xl flex flex-col lg:flex-row ${
              isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Identity Block - Sidebar (Desktop) / Top (Mobile) */}
            <div className={`lg:w-80 w-full lg:max-w-none flex-shrink-0 ${
              isDarkMode 
                ? 'bg-[#7A1315]' 
                : 'bg-gradient-to-b from-[#7A1315] to-red-800'
            } flex flex-col`}>
              {/* Profile Picture Container */}
              <div className="p-4 sm:p-6 md:p-8 flex flex-col items-center border-b border-red-900/30">
                <div className="relative mb-3 sm:mb-4 group">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 md:w-28 md:h-28 rounded-full border-2 sm:border-4 border-white shadow-xl bg-gradient-to-br from-red-600 to-[#7A1315] flex items-center justify-center overflow-hidden">
                    {profilePreview || studentPic ? (
                      <img 
                        src={profilePreview || studentPic} 
                        alt="Profile" 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          // If image fails to load, show initials instead
                          const imgElement = e.target
                          const parent = imgElement.parentElement
                          if (parent) {
                            imgElement.style.display = 'none'
                            const initialsSpan = document.createElement('span')
                            initialsSpan.className = 'text-white text-3xl font-semibold tracking-wide'
                            initialsSpan.textContent = getInitials(profileForm.name || studentName)
                            parent.appendChild(initialsSpan)
                          }
                        }}
                      />
                    ) : (
                      <span className="text-white text-xl sm:text-2xl md:text-3xl font-semibold tracking-wide">
                      {getInitials(profileForm.name || studentName)}
                    </span>
                  )}
                </div>
                  {/* Change Photo Button */}
                  <label className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer flex items-center justify-center">
                    <span className="text-white text-[10px] sm:text-xs font-medium">Change Photo</span>
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
                <h3 className="text-white font-bold text-lg sm:text-xl md:text-2xl text-center mb-1 sm:mb-2 truncate w-full px-2">
                  {profileForm.name || studentName}
                </h3>
                
                {/* User Role & Identifier */}
                <p className="text-red-100 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1 text-center">Student</p>
                <p className="text-red-200 text-[10px] sm:text-xs mb-0.5 sm:mb-1 text-center w-full px-2 break-words">{studentProfile?.studentId || studentProfile?.student_id || 'Student ID'}</p>
                <p className="text-red-200 text-[10px] sm:text-xs text-center w-full px-2 break-words">{studentEmail || studentProfile?.email || 'Email'}</p>
            </div>

              {/* Settings Navigation - Mobile: Horizontal, Desktop: Vertical */}
              <nav className="flex lg:flex-col flex-row lg:flex-1 py-2 sm:py-4 overflow-x-auto lg:overflow-y-auto">
                <button
                  onClick={() => setProfileSection('account')}
                  className={`w-full lg:w-full px-4 sm:px-6 py-2 sm:py-3 lg:py-4 text-left text-white font-medium transition-all flex items-center space-x-2 sm:space-x-3 whitespace-nowrap ${
                    profileSection === 'account' 
                      ? 'bg-red-900/50 lg:border-l-4 border-b-2 lg:border-b-0 border-yellow-400' 
                      : 'hover:bg-red-900/30'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="text-xs sm:text-sm">Account Settings</span>
                </button>
                
                <button
                  onClick={() => setProfileSection('appearance')}
                  className={`w-full lg:w-full px-4 sm:px-6 py-2 sm:py-3 lg:py-4 text-left text-white font-medium transition-all flex items-center space-x-2 sm:space-x-3 whitespace-nowrap ${
                    profileSection === 'appearance' 
                      ? 'bg-red-900/50 lg:border-l-4 border-b-2 lg:border-b-0 border-yellow-400' 
                      : 'hover:bg-red-900/30'
                  }`}
                >
                  <svg className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                  <span className="text-xs sm:text-sm">Appearance</span>
                </button>
              </nav>

              {/* Close Button */}
              <div className="p-2 sm:p-4 border-t border-red-900/30">
                <button
                  onClick={() => {
                      // Restore original photo if modal is closed without saving
                      if (originalStudentPicRef.current !== null) {
                        setProfilePreview(originalStudentPicRef.current)
                        setStudentPic(originalStudentPicRef.current)
                        setProfileForm(prev => ({ ...prev, pic: null, removePhoto: false }))
                      }
                    setShowProfileModal(false)
                    setProfileSaveSuccess(false)
                    setProfileSection('account')
                  }}
                  className="w-full px-3 sm:px-4 py-1.5 sm:py-2 bg-red-900/50 hover:bg-red-900/70 text-white text-xs sm:text-sm font-medium rounded-lg transition-all"
                >
                  Close Profile
                </button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className={`flex-1 overflow-y-auto ${
              isDarkMode ? 'bg-[#1a1a1a]' : 'bg-white'
            }`}>
              <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
                {/* Account Settings Section */}
                {profileSection === 'account' && (
                  <div className="space-y-4 sm:space-y-6">
              <div>
                      <h2 className={`text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2 ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        Account Settings
                      </h2>
                      <p className={`text-sm sm:text-base ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                        Manage your personal information
                      </p>
                    </div>

                    <div className={`rounded-xl sm:rounded-2xl shadow-lg border p-4 sm:p-6 ${
                      isDarkMode 
                        ? 'bg-[#1a1a1a] border-slate-700' 
                        : 'bg-white border-slate-200'
                    }`}>
                      <h3 className={`text-lg sm:text-xl font-bold mb-3 sm:mb-4 ${
                        isDarkMode ? 'text-white' : 'text-slate-800'
                      }`}>
                        Personal Information
                      </h3>
                      <form onSubmit={handleProfileSave} className="space-y-4 sm:space-y-5">
                        <div>
                          <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}>
                            Name
                          </label>
                <input
                  type="text"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                            className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg text-sm sm:text-base focus:ring-2 focus:ring-[#7A1315] ${
                              isDarkMode 
                                ? 'bg-[#2c2c2c] border-[#7A1315] text-white' 
                                : 'bg-white border-slate-300 text-slate-800'
                            }`}
                  required
                  disabled={profileSaveSuccess}
                />
              </div>
                        
              <div>
                          <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                            isDarkMode ? 'text-white' : 'text-slate-700'
                          }`}>
                            Student ID
                          </label>
                          <input
                            type="text"
                            value={studentProfile?.studentId || studentProfile?.student_id || ''}
                            disabled
                            className={`w-full px-3 sm:px-4 py-2 sm:py-3 border rounded-lg text-sm sm:text-base ${
                              isDarkMode 
                                ? 'bg-[#1a1a1a] border-slate-600 text-slate-400' 
                                : 'bg-slate-50 border-slate-300 text-slate-600'
                            }`}
                          />
                          <small className={`text-[10px] sm:text-xs mt-1 block ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            Your student identification number
                          </small>
                        </div>
                        
                        <div>
                          <label className={`block text-xs sm:text-sm font-semibold mb-1.5 sm:mb-2 ${
                            isDarkMode ? 'text-slate-200' : 'text-slate-700'
                          }`}>
                            Profile Picture
                          </label>
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
                <input
                              id="student-profile-picture"
                              name="student-profile-picture"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleProfilePicSelection(e.target.files[0])}
                            className="file:mr-2 sm:file:mr-4 file:py-1.5 sm:file:py-2 file:px-3 sm:file:px-4 file:rounded-lg file:border-0 file:text-xs sm:file:text-sm file:font-semibold file:bg-[#7A1315] file:text-white hover:file:bg-red-800 text-xs sm:text-sm"
                  disabled={profileSaveSuccess}
                />
                            {(originalStudentPicRef.current || profilePreview || studentPic) && (
                              <button
                                type="button"
                                onClick={handleRemoveProfilePicture}
                                disabled={profileSaveSuccess}
                                className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-semibold transition-colors whitespace-nowrap ${
                                  isDarkMode
                                    ? 'bg-red-900/50 text-red-200 hover:bg-red-900/70 border border-red-700'
                                    : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
                                } disabled:opacity-50 disabled:cursor-not-allowed`}
                              >
                                {profilePreview || studentPic ? 'Remove Photo' : 'Photo Removed'}
                              </button>
                            )}
                          </div>
                          <small className={`block text-[10px] sm:text-xs mt-1 ${
                            isDarkMode ? 'text-slate-400' : 'text-slate-500'
                          }`}>
                            Choose a square image for best results
                          </small>
              </div>
              
                        {/* Error Message */}
                        {profileSaveError && (
                          <div className={`rounded-xl p-4 flex items-center space-x-3 border ${
                            isDarkMode 
                              ? 'bg-red-900/30 border-red-700' 
                              : 'bg-red-50 border-red-200'
                          }`}>
                            <svg className={`w-5 h-5 flex-shrink-0 ${
                              isDarkMode ? 'text-red-400' : 'text-red-600'
                            }`} fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                            <p className={`font-medium ${
                              isDarkMode ? 'text-red-300' : 'text-red-800'
                            }`}>
                              {profileSaveError}
                            </p>
                          </div>
                        )}
              
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
                              Profile updated successfully! Your changes have been saved.
                            </p>
              </div>
                        )}
              
                        <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 sm:space-x-3 pt-3 sm:pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileModal(false)
                    setProfileSaveSuccess(false)
                    setProfileSection('account')
                    // Reset preview to original if cancelled
                    if (studentProfile?.photo_url || studentProfile?.photoURL) {
                      setProfilePreview(studentProfile.photo_url || studentProfile.photoURL)
                    } else {
                      setProfilePreview(null)
                    }
                    setProfileForm({ name: studentProfile?.name || studentName, pic: null })
                  }}
                            className={`px-4 sm:px-5 py-2 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold w-full sm:w-auto ${
                              isDarkMode 
                                ? 'bg-slate-700 text-slate-200 hover:bg-slate-600' 
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                >
                  {profileSaveSuccess ? 'Close' : 'Cancel'}
                </button>
                <button
                  type="submit"
                            className="px-5 sm:px-6 py-2 rounded-lg sm:rounded-xl bg-[#7A1315] text-white text-sm sm:text-base font-semibold hover:bg-red-800 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
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
                            ? 'bg-[#2c2c2c] border-slate-700' 
                            : 'bg-slate-50 border-slate-200'
                        }`}>
                          <div className="flex items-center space-x-4">
                            {isDarkMode ? (
                              <svg className="w-8 h-8 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                              </svg>
                            ) : (
                              <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    </div>
                  </div>
                )}

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Student


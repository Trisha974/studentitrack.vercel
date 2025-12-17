import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../../components/ThemeToggle/ThemeToggle'
import { useTheme } from '../../hooks/useTheme'
import './Login.css'
import { login as apiLogin, register as apiRegister, requestPasswordReset as apiRequestPasswordReset } from '../../services/api/authApi'
import { getCurrentProfessor } from '../../services/professors'
import { getCurrentStudent } from '../../services/students'
import { getDefaultAvatar } from '../../utils/avatarGenerator'

const CONFIG = {
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_STRENGTH_MIN_LENGTH: 8,
  STUDENT_EMAIL_REGEX: /^[a-z]+(\.[a-z]+)+\.\d+\.tc@umindanao\.edu\.ph$/i,
  PROFESSOR_EMAIL_REGEX: /^[a-z0-9]+@umindanao\.edu\.ph$/i,
  USER_TYPES: {
    PROFESSOR: 'Professor',
    STUDENT: 'Student'
  },
  DEPARTMENTS: [
    'Department of Computing Education',
    'Department of Engineering Education'
  ]
}

function Login() {
  const navigate = useNavigate()
  const { isDarkMode } = useTheme()
  const [userType, setUserType] = useState('professor')
  const [isSignUp, setIsSignUp] = useState(false)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPassword, setShowPassword] = useState({})
  const [passwordStrength, setPasswordStrength] = useState({ professor: '', student: '' })
  const [passwordError, setPasswordError] = useState({ professor: '', student: '' })

const [professorLogin, setProfessorLogin] = useState({ email: '', password: '' })
  const [studentLogin, setStudentLogin] = useState({ email: '', password: '' })
  const [professorSignUp, setProfessorSignUp] = useState({
    name: '', email: '', department: '', password: '', confirmPassword: ''
  })
  const [studentSignUp, setStudentSignUp] = useState({
    name: '', studentId: '', email: '', department: '', password: '', confirmPassword: ''
  })
  const [rememberMe, setRememberMe] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [termsError, setTermsError] = useState('')
  const [authError, setAuthError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showPasswordReset, setShowPasswordReset] = useState(false)
  const [passwordResetEmail, setPasswordResetEmail] = useState('')

  useEffect(() => {

    const saved = localStorage.getItem('react_rememberMe')
    if (saved === 'true') setRememberMe(true)
  }, [])

  useEffect(() => {
    // Check if user is already logged in (has token)
    const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
    if (token) {
      const currentUser = sessionStorage.getItem('currentUser')
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser)
          if (userData.type === 'Professor') {
            navigate('/prof', { replace: true })
          } else if (userData.type === 'Student') {
            navigate('/student', { replace: true })
          }
        } catch (err) {
          console.warn('Failed to parse current user', err)
        }
      }
    }

const handlePopState = (event) => {
      const currentUser = sessionStorage.getItem('currentUser')
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser)

          if (window.location.pathname === '/login') {
            event.preventDefault()

            window.history.pushState(null, '', window.location.pathname)

            if (userData.type === 'Professor') {
              navigate('/prof', { replace: true })
            } else if (userData.type === 'Student') {
              navigate('/student', { replace: true })
            }
          }
        } catch (err) {
          console.warn('Failed to parse current user in popstate', err)
        }
      }
    }

window.addEventListener('popstate', handlePopState)

window.history.pushState(null, '', window.location.pathname)

    return () => {
      window.removeEventListener('popstate', handlePopState)
    }
  }, [navigate])

  const isValidEmail = (email, isStudent = false) => {
    if (!email) return false
    const trimmed = email.trim()
    return isStudent
      ? CONFIG.STUDENT_EMAIL_REGEX.test(trimmed)
      : CONFIG.PROFESSOR_EMAIL_REGEX.test(trimmed)
  }

  const isValidPassword = (password) => {
    if (password.length < CONFIG.PASSWORD_STRENGTH_MIN_LENGTH) return false
    return /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password) && /[^A-Za-z0-9]/.test(password)
  }

  const checkPasswordStrength = (password) => {
    let strength = 0
    if (password.length >= CONFIG.PASSWORD_STRENGTH_MIN_LENGTH) strength++
    if (/[a-z]/.test(password)) strength++
    if (/[A-Z]/.test(password)) strength++
    if (/[0-9]/.test(password)) strength++
    if (/[^A-Za-z0-9]/.test(password)) strength++
    return ['weak', 'weak', 'fair', 'good', 'strong'][strength - 1] || 'weak'
  }

  const handlePasswordChange = (password, type) => {

    let error = ''
    if (password.length > 0 && password.length < CONFIG.PASSWORD_STRENGTH_MIN_LENGTH) {
      error = `Password must be at least ${CONFIG.PASSWORD_STRENGTH_MIN_LENGTH} characters long`
    }

    if (type === 'professor') {
      setProfessorSignUp(prev => ({ ...prev, password }))
      setPasswordStrength(prev => ({ ...prev, professor: checkPasswordStrength(password) }))
      setPasswordError(prev => ({ ...prev, professor: error }))
    } else {
      setStudentSignUp(prev => ({ ...prev, password }))
      setPasswordStrength(prev => ({ ...prev, student: checkPasswordStrength(password) }))
      setPasswordError(prev => ({ ...prev, student: error }))
    }
  }

  const togglePasswordVisibility = (field) => {
    setShowPassword(prev => ({ ...prev, [field]: !prev[field] }))
  }

  const persistSessionUser = (payload) => {
    sessionStorage.setItem('currentUser', JSON.stringify(payload))
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setAuthError('')
    setSuccessMessage('')
    const isProfessor = userType === 'professor'
    const loginData = isProfessor ? professorLogin : studentLogin

    if (!loginData.email || !loginData.password) {
      setAuthError('Please fill in all fields')
      return
    }

const trimmedEmail = loginData.email.trim()

if (!trimmedEmail || !trimmedEmail.includes('@') || trimmedEmail.length < 5) {
      setAuthError('Please enter a valid email address')
      return
    }

if (!isValidEmail(trimmedEmail, !isProfessor)) {
      console.warn(`⚠️ Email format doesn't match expected ${isProfessor ? 'professor' : 'student'} pattern, but attempting login anyway:`, trimmedEmail)
    }

    try {
      setIsSubmitting(true)
      setAuthError('')
      setSuccessMessage('')

const trimmedPassword = loginData.password.trim()
      console.log('🔐 Attempting login:', {
        email: trimmedEmail,
        emailLength: trimmedEmail.length,
        passwordLength: trimmedPassword.length,
        userType: isProfessor ? 'professor' : 'student'
      })
      // Login via backend API
      const result = await apiLogin(trimmedEmail, trimmedPassword)
      const { token, user: userFromAPI } = result

      // Use profile from login response (already includes profile if available)
      let profile = userFromAPI?.profile || null
      const fallbackName = userFromAPI?.email?.split('@')[0] || loginData.email.split('@')[0]

      // If profile is missing, try to fetch it (but don't block login if it fails)
      if (!profile && userFromAPI?.user_id) {
        try {
          const profilePromise = isProfessor
            ? getCurrentProfessor()
            : getCurrentStudent()
          profile = await profilePromise
        } catch (profileError) {
          console.warn('Unable to load profile from backend (non-critical):', profileError)
          // Continue with default profile
        }
      }

      // Create default profile if still missing
      if (!profile) {
        // Ensure we pass a string to getDefaultAvatar (id might be a number)
        const avatarId = String(userFromAPI?.id || trimmedEmail)
        const defaultPhotoURL = getDefaultAvatar(fallbackName, avatarId)
        profile = {
          name: fallbackName,
          email: userFromAPI?.email || trimmedEmail,
          role: CONFIG.USER_TYPES[isProfessor ? 'PROFESSOR' : 'STUDENT'],
          ...(isProfessor
            ? { department: '', photoURL: defaultPhotoURL }
            : { studentId: '', department: '', photoURL: defaultPhotoURL })
        }
      } else if (!profile.photoURL) {
        // Ensure we pass a string to getDefaultAvatar (id might be a number)
        const avatarId = String(userFromAPI?.id || trimmedEmail)
        const defaultPhotoURL = getDefaultAvatar(profile.name || fallbackName, avatarId)
        profile.photoURL = defaultPhotoURL
      }

      const displayName = profile?.name || fallbackName
      const userData = {
        id: userFromAPI?.id || profile?.id,
        type: CONFIG.USER_TYPES[isProfessor ? 'PROFESSOR' : 'STUDENT'],
        email: userFromAPI?.email || trimmedEmail,
        name: displayName,
        ...(isProfessor
          ? { department: profile?.department || '' }
          : { studentId: profile?.studentId || profile?.student_id || '', department: profile?.department || '' })
      }

      persistSessionUser(userData)

      navigate(isProfessor ? '/prof' : '/student', { replace: true })
    } catch (error) {
      console.error('Login error:', error)
      console.error('Error code:', error.code)
      console.error('Error message:', error.message)
      console.error('Login attempt with email:', trimmedEmail, 'userType:', isProfessor ? 'professor' : 'student')
      let message = 'Unable to sign in. Please try again.'
      let showPasswordReset = false

      // Handle backend API errors
      if (error.message) {
        if (error.message.includes('Invalid email or password') || error.message.includes('Invalid')) {
          message = 'Invalid email or password. Please check your credentials and try again.'
          showPasswordReset = true
        } else if (error.message.includes('not found') || error.message.includes('Account')) {
          message = 'Account not found. Please create an account first using the "Sign Up" button.'
          setIsSignUp(true)
        } else if (error.message.includes('deactivated')) {
          message = 'Your account has been deactivated. Please contact support.'
        } else if (error.message.includes('Failed to fetch')) {
          message = 'Cannot connect to server. Please ensure the backend server is running on http://localhost:5000'
        } else {
          message = error.message
        }
      }

      console.warn('⚠️ Login failed:', {
        email: trimmedEmail,
        errorMessage: error.message
      })

      setAuthError(message)

      if (showPasswordReset) {
        setTimeout(() => {
          const currentUserType = userType === 'professor'
          setShowPasswordReset(true)
          setPasswordResetEmail(currentUserType ? professorLogin.email : studentLogin.email)
        }, 500)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handlePasswordReset = async (e) => {
    e.preventDefault()
    setAuthError('')
    setSuccessMessage('')

    if (!passwordResetEmail) {
      setAuthError('Please enter your email address')
      return
    }

    const isProfessor = userType === 'professor'
    if (!isValidEmail(passwordResetEmail, !isProfessor)) {
      setAuthError(`Please enter a valid ${CONFIG.USER_TYPES[isProfessor ? 'PROFESSOR' : 'STUDENT']} email address`)
      return
    }

    try {
      setIsSubmitting(true)
      const result = await apiRequestPasswordReset(passwordResetEmail.trim())
      
      // Show success message
      setSuccessMessage(result.message || `Password reset instructions sent to ${passwordResetEmail}. Please contact support for password reset assistance.`)
      setAuthError('')
      setShowPasswordReset(false)
      setPasswordResetEmail('')
    } catch (error) {
      console.error('Password reset error', error)
      let message = 'Failed to process password reset request. Please try again.'
      if (error.message) {
        message = error.message
      }
      setAuthError(message)
      setSuccessMessage('')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setAuthError('')
    setSuccessMessage('')

    setPasswordError({ professor: '', student: '' })

    if (!termsAccepted) {
      setTermsError('⚠️ You must accept the Terms and Conditions to create your account.')
      return
    }

    setTermsError('')
    const isProfessor = userType === 'professor'
    const signUpData = isProfessor ? professorSignUp : studentSignUp

    if (!signUpData.name || !signUpData.email || !signUpData.password || !signUpData.confirmPassword) {
      setAuthError('Please fill in all required fields')
      return
    }

    if (isProfessor && !signUpData.department) {
      setAuthError('Please select a department')
      return
    }

    if (!isProfessor && !signUpData.studentId) {
      setAuthError('Please enter your Student ID')
      return
    }

if (!isProfessor && !/^\d+$/.test(signUpData.studentId)) {
      setAuthError('Student ID must be numerical only')
      return
    }

    if (!isValidEmail(signUpData.email, !isProfessor)) {
      setAuthError(`Invalid ${isProfessor ? 'professor' : 'student'} email format`)
      return
    }

if (signUpData.password.length < CONFIG.PASSWORD_STRENGTH_MIN_LENGTH) {
      setAuthError(`Password must be at least ${CONFIG.PASSWORD_STRENGTH_MIN_LENGTH} characters long`)

      if (isProfessor) {
        setPasswordError(prev => ({ ...prev, professor: `Password must be at least ${CONFIG.PASSWORD_STRENGTH_MIN_LENGTH} characters long` }))
      } else {
        setPasswordError(prev => ({ ...prev, student: `Password must be at least ${CONFIG.PASSWORD_STRENGTH_MIN_LENGTH} characters long` }))
      }
      return
    }

    if (!isValidPassword(signUpData.password)) {
      setAuthError('Password must contain uppercase, lowercase, numbers, and symbols')
      return
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      setAuthError('Passwords do not match')
      return
    }

    try {
      setIsSubmitting(true)
      setAuthError('')
      setSuccessMessage('')

      // Generate default avatar using email as unique ID
      const defaultPhotoURL = getDefaultAvatar(signUpData.name, signUpData.email.trim())

      // Register via backend API (creates user account and profile)
      const result = await apiRegister({
        email: signUpData.email.trim(),
        password: signUpData.password,
        role: CONFIG.USER_TYPES[isProfessor ? 'PROFESSOR' : 'STUDENT'],
        name: signUpData.name,
        student_id: isProfessor ? undefined : signUpData.studentId,
        department: signUpData.department,
        photo_url: defaultPhotoURL
      })

      const { token, user: userFromAPI } = result
      
      console.log(`✅ ${isProfessor ? 'Professor' : 'Student'} account created:`, { 
        name: signUpData.name, 
        email: signUpData.email.trim() 
      })

if (isProfessor) {
        setProfessorSignUp({
          name: '',
          email: '',
          department: '',
          password: '',
          confirmPassword: '',
        })
      } else {
        setStudentSignUp({
          name: '',
          studentId: '',
          email: '',
          department: '',
          password: '',
          confirmPassword: '',
        })
      }

setProfessorLogin({ email: '', password: '' })
      setStudentLogin({ email: '', password: '' })

setIsSubmitting(false)
      setIsSignUp(false)
      setTermsAccepted(false)
      setAuthError('')
      setTermsError('')
      setSuccessMessage('✅ Account created successfully. Please sign in with your email and password to access your dashboard.')
    } catch (error) {
      console.error('Sign up error', error)
      let message = 'Unable to create account. Please try again.'

      // Handle backend API errors
      if (error.message) {
        if (error.message.includes('already exists') || error.message.includes('User with this email')) {
          message = 'An account with this email already exists. Please sign in instead.'
        } else if (error.message.includes('Invalid email')) {
          message = 'Invalid email address.'
        } else if (error.message.includes('Password') || error.message.includes('password')) {
          message = error.message
        } else if (error.message.includes('Network') || error.message.includes('Failed to fetch')) {
          message = 'Cannot connect to server. Please ensure the backend server is running on http://localhost:5000'
        } else if (error.message.includes('500')) {
          message = 'Server error. Please try again later or contact support.'
        } else if (error.message.includes('400')) {
          message = error.message || 'Invalid data provided. Please check your information.'
        } else {
          message = error.message
        }
      }

      setAuthError(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })

  return (
    <div className="application-background min-h-screen relative">
      <img src="/assets/logos/um logo.png" alt="UM Logo" className="background-logo-decoration w-96 h-auto" />

      {}
      <nav className="application-header fixed top-0 w-full bg-white/90 backdrop-blur-md shadow-md z-20">
        <div className="header-content-container max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="header-navigation-content flex justify-between items-center h-16">
            <div className="university-branding-section flex items-center space-x-3">
              <img src="/assets/logos/um logo.png" alt="UM Logo" className="university-logo-image h-12 w-auto" />
              <div>
                <h1 className="application-title text-xl font-bold leading-tight navigation-text text-[#7A1315]">Student iTrack</h1>
                <p className="university-info-text text-sm navigation-text">University of Mindanao Tagum College - Visayan Campus</p>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="authentication-container relative z-10">
        <div className="authentication-card max-w-md w-full space-y-8 p-8">
          <div className="authentication-header text-center">
            <div className="authentication-logo mx-auto w-24 h-24 flex items-center justify-center mb-6">
              <img src="/assets/logos/um logo.png" alt="UM Logo" className="authentication-logo-image w-24 h-auto" />
            </div>
            <h2 className="welcome-title text-[1.75rem] sm:text-[1.75rem] font-bold text-[#7A1315] mb-3 text-center whitespace-nowrap">
              Welcome to Student iTrack
            </h2>
            <p className="system-subtitle text-gray-800 text-sm mb-6 text-center">Smart Academic Monitoring System</p>
          </div>

          {}
          <div className="user-type-selection mb-6">
            <label className={`selection-label block text-sm font-medium mb-3 ${
              isDarkMode ? 'text-white' : 'text-gray-800'
            }`}>Login As</label>
            <div className="selection-buttons-container flex space-x-4 w-full">
              <button
                onClick={() => setUserType('professor')}
                className={`user-type-button flex-1 primary-action-button ${
                  userType === 'professor' ? 'primary-filled-button' : 'primary-outline-button'
                }`}
              >
                Professor
              </button>
              <button
                onClick={() => setUserType('student')}
                className={`user-type-button flex-1 primary-action-button ${
                  userType === 'student' ? 'primary-filled-button' : 'primary-outline-button'
                }`}
              >
                Student
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="auth-success-message">
              {successMessage}
            </div>
          )}

          {authError && (
            <div className="auth-error-message">
              {authError}
            </div>
          )}

          {}
          {!isSignUp && (
            <div className="auth-form-section">
              <form onSubmit={handleLogin} className="authentication-form space-y-6 w-full">
                {userType === 'professor' ? (
                  <>
                    <div className="form-field-group">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Email</label>
                      <input
                        type="email"
                        autoComplete="off"
                        name="professor-login-email"
                        value={professorLogin.email}
                        onChange={(e) => setProfessorLogin(prev => ({ ...prev, email: e.target.value }))}
                        className={`form-input-field professor-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                          isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                        }`}
                        placeholder="Enter your institutional email"
                      />
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Password</label>
                      <div className="password-input-container">
                        <input
                          type={showPassword.professorLogin ? 'text' : 'password'}
                          autoComplete="new-password"
                          name="professor-login-password"
                          value={professorLogin.password}
                          onChange={(e) => setProfessorLogin(prev => ({ ...prev, password: e.target.value }))}
                          className={`form-input-field professor-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] pr-10 ${
                            isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                          }`}
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('professorLogin')}
                          className="password-toggle"
                          aria-label="Toggle password visibility"
                        >
                          <svg className={`eye-icon w-5 h-5 ${showPassword.professorLogin ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <svg className={`eye-off-icon w-5 h-5 ${showPassword.professorLogin ? '' : 'hidden'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-field-group">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Student Email</label>
                      <input
                        type="email"
                        autoComplete="off"
                        name="student-login-email"
                        value={studentLogin.email}
                        onChange={(e) => setStudentLogin(prev => ({ ...prev, email: e.target.value }))}
                        className={`form-input-field student-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                          isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                        }`}
                        placeholder="Enter your institutional email"
                      />
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Password</label>
                      <div className="password-input-container">
                        <input
                          type={showPassword.studentLogin ? 'text' : 'password'}
                          autoComplete="new-password"
                          name="student-login-password"
                          value={studentLogin.password}
                          onChange={(e) => setStudentLogin(prev => ({ ...prev, password: e.target.value }))}
                          className={`form-input-field student-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] pr-10 ${
                            isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                          }`}
                          placeholder="Enter password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('studentLogin')}
                          className="password-toggle"
                          aria-label="Toggle password visibility"
                        >
                          <svg className={`eye-icon w-5 h-5 ${showPassword.studentLogin ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <svg className={`eye-off-icon w-5 h-5 ${showPassword.studentLogin ? '' : 'hidden'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                <div className="form-options-container">
                  <label className="remember-me-option">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => {
                        setRememberMe(e.target.checked)

                        localStorage.setItem('react_rememberMe', e.target.checked ? 'true' : 'false')
                      }}
                      className="remember-me-checkbox h-4 w-4 text-[#7A1315] border-gray-300 rounded"
                    />
                    <span className="remember-me-text text-sm">Remember Me</span>
                  </label>
                  <a
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowPasswordReset(true)
                      setPasswordResetEmail(isProfessor ? professorLogin.email : studentLogin.email)
                    }}
                    className="password-recovery-link text-sm font-medium"
                  >
                    Forgot Password?
                  </a>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="authentication-submit-button w-full primary-action-button primary-filled-button"
                >
                  {isSubmitting ? 'Please wait...' : 'Sign In'}
                </button>

                <div className="auth-switch-link">
                  Don't have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsSignUp(true) }}>Sign Up</a>
                </div>
              </form>
            </div>
          )}

          {}
          {isSignUp && (
            <div className="auth-form-section">
              <form onSubmit={handleSignUp} className="registration-form space-y-6">
                {userType === 'professor' ? (
                  <>
                    <div className="form-field-group">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Full Name</label>
                      <input
                        type="text"
                        autoComplete="off"
                        name="professor-signup-name"
                        value={professorSignUp.name}
                        onChange={(e) => setProfessorSignUp(prev => ({ ...prev, name: e.target.value }))}
                        className={`form-input-field professor-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                          isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                        }`}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Email</label>
                      <input
                        type="email"
                        autoComplete="off"
                        name="professor-signup-email"
                        value={professorSignUp.email}
                        onChange={(e) => setProfessorSignUp(prev => ({ ...prev, email: e.target.value }))}
                        className={`form-input-field professor-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                          isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                        }`}
                        placeholder="initials@umindanao.edu.ph"
                      />
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Department</label>
                      <select
                        value={professorSignUp.department}
                        onChange={(e) => setProfessorSignUp(prev => ({ ...prev, department: e.target.value }))}
                        className={`form-input-field form-select-field professor-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                          isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                        }`}
                        required
                      >
                        <option value="">Select your department</option>
                        {CONFIG.DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Password</label>
                      <div className="password-input-container">
                        <input
                          type={showPassword.professorSignUpPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          name="professor-signup-password"
                          value={professorSignUp.password}
                          onChange={(e) => handlePasswordChange(e.target.value, 'professor')}
                          className={`form-input-field professor-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] pr-10 ${
                            isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                          }`}
                          placeholder="Create a secure password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('professorSignUpPassword')}
                          className="password-toggle"
                          aria-label="Toggle password visibility"
                        >
                          <svg className={`eye-icon w-5 h-5 ${showPassword.professorSignUpPassword ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <svg className={`eye-off-icon w-5 h-5 ${showPassword.professorSignUpPassword ? '' : 'hidden'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
                      </div>
                      {passwordError.professor && (
                        <div className={`mt-2 p-2 rounded-lg text-sm ${
                          isDarkMode
                            ? 'bg-red-900/30 border border-red-700 text-red-200'
                            : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                          {passwordError.professor}
                        </div>
                      )}
                      <div className={`password-strength ${passwordStrength.professor}`}></div>
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>Must be at least 8 characters with uppercase, lowercase, numbers, and symbols</p>
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Confirm Password</label>
                      <div className="password-input-container">
                        <input
                          type={showPassword.professorSignUpConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          name="professor-signup-password-confirm"
                          value={professorSignUp.confirmPassword}
                          onChange={(e) => setProfessorSignUp(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className={`form-input-field professor-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] pr-10 ${
                            isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                          }`}
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('professorSignUpConfirmPassword')}
                          className="password-toggle"
                          aria-label="Toggle password visibility"
                        >
                          <svg className={`eye-icon w-5 h-5 ${showPassword.professorSignUpConfirmPassword ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <svg className={`eye-off-icon w-5 h-5 ${showPassword.professorSignUpConfirmPassword ? '' : 'hidden'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="form-field-group">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Full Name</label>
                      <input
                        type="text"
                        autoComplete="off"
                        name="student-signup-name"
                        value={studentSignUp.name}
                        onChange={(e) => setStudentSignUp(prev => ({ ...prev, name: e.target.value }))}
                        className={`form-input-field student-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                          isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                        }`}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Student ID</label>
                      <input
                        type="text"
                        autoComplete="off"
                        name="student-signup-id"
                        value={studentSignUp.studentId}
                        onChange={(e) => {

                          const value = e.target.value.replace(/\D/g, '')
                          setStudentSignUp(prev => ({ ...prev, studentId: value }))
                        }}
                        className={`form-input-field student-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                          isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                        }`}
                        placeholder="Enter your student ID"
                        pattern="[0-9]*"
                        inputMode="numeric"
                      />
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Email</label>
                      <input
                        type="email"
                        autoComplete="off"
                        name="student-signup-email"
                        value={studentSignUp.email}
                        onChange={(e) => setStudentSignUp(prev => ({ ...prev, email: e.target.value }))}
                        className={`form-input-field student-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                          isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                        }`}
                        placeholder="initials@umindanao.edu.ph"
                      />
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Department</label>
                      <select
                        value={studentSignUp.department}
                        onChange={(e) => setStudentSignUp(prev => ({ ...prev, department: e.target.value }))}
                        className={`form-input-field form-select-field student-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                          isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                        }`}
                        required
                      >
                        <option value="">Select your department</option>
                        {CONFIG.DEPARTMENTS.map(dept => (
                          <option key={dept} value={dept}>{dept}</option>
                        ))}
                      </select>
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Password</label>
                      <div className="password-input-container">
                        <input
                          type={showPassword.studentSignUpPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          name="student-signup-password"
                          value={studentSignUp.password}
                          onChange={(e) => handlePasswordChange(e.target.value, 'student')}
                          className={`form-input-field student-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] pr-10 ${
                            isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                          }`}
                          placeholder="Create a secure password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('studentSignUpPassword')}
                          className="password-toggle"
                          aria-label="Toggle password visibility"
                        >
                          <svg className={`eye-icon w-5 h-5 ${showPassword.studentSignUpPassword ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <svg className={`eye-off-icon w-5 h-5 ${showPassword.studentSignUpPassword ? '' : 'hidden'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
                      </div>
                      {passwordError.student && (
                        <div className={`mt-2 p-2 rounded-lg text-sm ${
                          isDarkMode
                            ? 'bg-red-900/30 border border-red-700 text-red-200'
                            : 'bg-red-50 border border-red-200 text-red-700'
                        }`}>
                          {passwordError.student}
                        </div>
                      )}
                      <div className={`password-strength ${passwordStrength.student}`}></div>
                      <p className={`text-xs mt-1 ${
                        isDarkMode ? 'text-gray-400' : 'text-gray-500'
                      }`}>Must be at least 8 characters with uppercase, lowercase, numbers, and symbols</p>
                    </div>
                    <div className="form-field-group mt-4">
                      <label className={`form-label block text-sm font-medium ${
                        isDarkMode ? 'text-white' : 'text-gray-800'
                      }`}>Confirm Password</label>
                      <div className="password-input-container">
                        <input
                          type={showPassword.studentSignUpConfirmPassword ? 'text' : 'password'}
                          autoComplete="new-password"
                          name="student-signup-password-confirm"
                          value={studentSignUp.confirmPassword}
                          onChange={(e) => setStudentSignUp(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className={`form-input-field student-field w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] pr-10 ${
                            isDarkMode ? 'bg-[#2c2c2c] text-white border-slate-600' : 'bg-white text-gray-800 border-slate-300'
                          }`}
                          placeholder="Confirm your password"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility('studentSignUpConfirmPassword')}
                          className="password-toggle"
                          aria-label="Toggle password visibility"
                        >
                          <svg className={`eye-icon w-5 h-5 ${showPassword.studentSignUpConfirmPassword ? 'hidden' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          <svg className={`eye-off-icon w-5 h-5 ${showPassword.studentSignUpConfirmPassword ? '' : 'hidden'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {}
                <div className="form-options-container flex items-center mt-6">
                  <label className="remember-me-option flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => {
                        setTermsAccepted(e.target.checked)
                        setTermsError('')
                      }}
                      className={`terms-checkbox h-4 w-4 text-[#7A1315] border-gray-300 rounded ${termsError ? 'terms-error-highlight' : ''}`}
                    />
                    <span className={`remember-me-text text-sm ${termsError ? 'terms-label-error' : ''}`}>
                      I agree to the <a href="#" onClick={(e) => { e.preventDefault(); setShowTermsModal(true) }} className="terms-link text-[#7A1315] hover:underline">Terms and Conditions</a>
                    </span>
                  </label>
                </div>
                {termsError && (
                  <div className="terms-error-message">
                    {termsError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="registration-submit-button w-full primary-action-button primary-filled-button"
                >
                  {isSubmitting ? 'Please wait...' : 'Create Account'}
                </button>

                <div className="auth-switch-link">
                  Already have an account? <a href="#" onClick={(e) => { e.preventDefault(); setIsSignUp(false) }}>Sign In</a>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      <ThemeToggle />

      {}
      {showTermsModal && (
        <div className="terms-modal">
          <div className="terms-modal-overlay" onClick={() => setShowTermsModal(false)}></div>
          <div className="terms-modal-container">
            <div className="terms-modal-header">
              <h2 className="terms-modal-title">Terms and Conditions</h2>
              <button onClick={() => setShowTermsModal(false)} className="terms-modal-close" aria-label="Close Terms and Conditions">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>
            <div className="terms-modal-content">
              <div className="terms-content">
                <div className="terms-header">
                  <h3>University of Mindanao Tagum College - Visayan Campus</h3>
                  <h4>Student iTrack - Terms and Conditions of Use</h4>
                </div>
                {}
                <section className="terms-section">
                  <h5>1. Acceptance of Terms</h5>
                  <p>By accessing and using the Student iTrack Smart Academic Monitoring System ("the System"), you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions. If you do not agree to these terms, you must not use the System.</p>
                </section>

                <section className="terms-section">
                  <h5>2. Eligibility</h5>
                  <p>This System is exclusively available to:</p>
                  <ul>
                    <li>Registered students of University of Mindanao Tagum College - Visayan Campus</li>
                    <li>Faculty members and professors of the institution</li>
                    <li>Authorized administrative personnel</li>
                  </ul>
                  <p>You must use your official institutional email address (@umindanao.edu.ph) to access the System.</p>
                </section>

                <section className="terms-section">
                  <h5>3. Account Registration and Security</h5>
                  <p>3.1. You are responsible for maintaining the confidentiality of your account credentials.</p>
                  <p>3.2. You agree to provide accurate, current, and complete information during registration.</p>
                  <p>3.3. You are responsible for all activities that occur under your account.</p>
                  <p>3.4. You must immediately notify the institution of any unauthorized use of your account.</p>
                  <p>3.5. The institution reserves the right to suspend or terminate accounts that violate these terms.</p>
                </section>

                <section className="terms-section">
                  <h5>4. Acceptable Use</h5>
                  <p>You agree to use the System only for lawful purposes and in accordance with these Terms. You agree NOT to:</p>
                  <ul>
                    <li>Use the System for any illegal or unauthorized purpose</li>
                    <li>Attempt to gain unauthorized access to any part of the System</li>
                    <li>Interfere with or disrupt the System or servers connected to the System</li>
                    <li>Share your account credentials with others</li>
                    <li>Use automated systems to access the System without permission</li>
                    <li>Upload or transmit any malicious code, viruses, or harmful data</li>
                    <li>Impersonate any person or entity or misrepresent your affiliation</li>
                  </ul>
                </section>

                <section className="terms-section">
                  <h5>5. Academic Integrity</h5>
                  <p>5.1. All academic information displayed in the System is official and binding.</p>
                  <p>5.2. You are responsible for verifying the accuracy of your academic records.</p>
                  <p>5.3. Any discrepancies must be reported to the Registrar's Office immediately.</p>
                  <p>5.4. The institution maintains the right to correct any errors in academic records.</p>
                </section>

                <section className="terms-section">
                  <h5>6. Privacy and Data Protection</h5>
                  <p>6.1. Your personal and academic information will be handled in accordance with the Data Privacy Act of 2012 (Republic Act No. 10173).</p>
                  <p>6.2. The institution collects and processes your data for academic and administrative purposes.</p>
                  <p>6.3. Your information will not be shared with third parties without your consent, except as required by law.</p>
                  <p>6.4. You have the right to access, correct, and request deletion of your personal data.</p>
                </section>

                <section className="terms-section">
                  <h5>7. Intellectual Property</h5>
                  <p>7.1. All content, features, and functionality of the System are owned by the University of Mindanao.</p>
                  <p>7.2. You may not reproduce, distribute, or create derivative works from the System without written permission.</p>
                  <p>7.3. The System's design, logos, and trademarks are proprietary to the institution.</p>
                </section>

                <section className="terms-section">
                  <h5>8. System Availability</h5>
                  <p>8.1. The institution strives to ensure the System is available 24/7 but does not guarantee uninterrupted access.</p>
                  <p>8.2. The institution reserves the right to perform maintenance, updates, or modifications that may temporarily affect System availability.</p>
                  <p>8.3. The institution is not liable for any loss or inconvenience resulting from System unavailability.</p>
                </section>

                <section className="terms-section">
                  <h5>9. Limitation of Liability</h5>
                  <p>9.1. The System is provided "as is" without warranties of any kind.</p>
                  <p>9.2. The institution shall not be liable for any indirect, incidental, or consequential damages arising from the use of the System.</p>
                  <p>9.3. The institution's total liability shall not exceed the amount you paid (if any) for using the System.</p>
                </section>

                <section className="terms-section">
                  <h5>10. Changes to Terms</h5>
                  <p>The institution reserves the right to modify these Terms and Conditions at any time. Changes will be effective immediately upon posting. Your continued use of the System after changes are posted constitutes acceptance of the modified terms.</p>
                </section>

                <section className="terms-section">
                  <h5>11. Termination</h5>
                  <p>The institution may terminate or suspend your access to the System immediately, without prior notice, for any violation of these Terms and Conditions or for any other reason deemed necessary by the institution.</p>
                </section>

                <section className="terms-section">
                  <h5>12. Governing Law</h5>
                  <p>These Terms and Conditions shall be governed by and construed in accordance with the laws of the Republic of the Philippines. Any disputes arising from these terms shall be subject to the exclusive jurisdiction of the courts of Davao del Norte, Philippines.</p>
                </section>

                <section className="terms-section">
                  <h5>13. Contact Information</h5>
                  <p>If you have questions about these Terms and Conditions of Use, you may contact:</p>
                  <div className="terms-contact">
                    <p><strong>The Data Protection Officer</strong></p>
                    <p><strong>Internal Audit Office</strong></p>
                    <p><strong>University of Mindanao</strong></p>
                    <p>Phone: (+6382) 2275456</p>
                  </div>
                </section>

                <section className="terms-section">
                  <h5>14. Acknowledgment</h5>
                  <p>By checking the "I agree to the Terms and Conditions" checkbox and creating an account, you acknowledge that you have read, understood, and agree to be bound by all the terms and conditions stated above.</p>
                </section>

                {}
                <section className="terms-section" style={{ marginTop: '2rem', paddingTop: '2rem', borderTop: '2px solid #7A1315' }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#7A1315', marginBottom: '1rem' }}>UM WEBSITE TERMS AND CONDITIONS OF USE</h3>

                  <p>These Terms and Conditions of Use, as may be updated from time to time, apply to this website which is published by the University of Mindanao. You should carefully read these terms and conditions of use before using the website. This is a legally binding agreement. If you do not agree with any of these terms and conditions, do not use our website. By using our website, you accept these terms and conditions in full and without any qualification.</p>

                  <p>Access to certain portions of this website ("Password-Protected Areas") may require login and password information. You must have this information in order to access these areas.</p>

                  <p>The use of your personally identifying and non-personal information will be governed by the Privacy Statement found at <a href="https://umindanao.edu.ph" target="_blank" rel="noopener noreferrer" className="terms-link">https://umindanao.edu.ph</a>.</p>

                  <p>Your use of this website indicates that you have read and agree to the Privacy Statement.</p>

                  <p>You are responsible for your behavior in your use of this website and for respecting The University of Mindanao's and third parties' (person or entity) rights in connection with the website and its content.</p>

                  <p>You are not allowed to use this website for any purpose or in any manner that violates any local, or national law or regulations or the laws or regulations of any foreign government.</p>

                  <p>You are not allowed to copy, screenshot, or download any material from the website, unless expressly permitted, as the case may be.</p>

                  <p>You are not allowed to modify the website or its content, nor redistribute any of the content thereof.</p>

                  <p>You are not allowed to use the website for emailing, transmitting messages, unless you are expressly permitted as the case may be;</p>

                  <p>You are not allowed to use this website to post or send any infringing, threatening, defamatory, libelous, obscene, or pornographic material.</p>

                  <p>You are not allowed to use or exploit any portion of this website to distribute commercial messages, "spam," or other unsolicited communications.</p>

                  <p>You are not allowed to directly or indirectly, intentionally reverse-engineer, disrupt or interfere with this website, or that of any third party, in any manner, as it may disrupt its infrastructure and operation.</p>

                  <p>You may not sidestep or circumvent any measure The University of Mindanao may use to prevent or restrict access to this website.</p>

                  <p>These negative obligations are not exclusive. The University of Mindanao reserves its right to prohibit any act or block you or any user as it may deem proper based on its sole judgment.</p>

                  <p>The University of Mindanao does not warrant the currency and accuracy of the content of the website. The use of this website shall be the sole responsibility of the user. The University of Mindanao disclaims all warranties, as may be permitted by laws, whether express or implied, including, implied warranties of merchantability, fitness for a particular purpose and non-infringement. The University of Mindanao expressly disclaims any liability arising out of the use of the website, and that of any third party associated with the website, such as, but not limited to payments using third party credit cards and other payment options, as the case may be.</p>

                  <p>The University of Mindanao makes no warranty that this website will meet the user's requirements, or will be uninterrupted, timely, secure, complete or error-free.</p>

                  <p>You acknowledge that your remedy with respect to any defect in or dissatisfaction with the website is to cease to use the same.</p>

                  <p>You expressly understand and Agree that The University of Mindanao shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages, including without limitation, damages for loss of profits, goodwill, use, data loss, that may result from any matter related to your use of this website.</p>

                  <p>This website and its contents are owned by The University of Mindanao or third parties associated with it, and are protected by laws, including but not limited to copyright and trademark law. Certain content, such as copyrighted materials and trademarks, are used by permission of third parties. Except as allowed by law (such as fair use) or as expressly permitted in connection with specific content, this website and its contents may not be reproduced, modified, distributed, displayed, performed, or used in any way without the prior written permission of the University of Mindanao or the third-party owner.</p>

                  <p>This website may include links to other websites. You acknowledge and agree that such links are provided for your convenience and do not reflect any endorsement by the University of Mindanao with respect to the linked site or its provider. The University of Mindanao makes no representations or warranties with respect to any linked website: Your use of any linked website is solely at your own risk.</p>

                  <p>This Agreement and the relationship between you and the University of Mindanao will be governed by the laws of the Republic of the Philippines, without respect to its conflict of law provisions. You agree that venue with respect to any dispute between you and The University of Mindanao will rest exclusively in the City of Davao, Philippines.</p>

                  <p>From time to time, The University of Mindanao may change this website and/or these Terms and Conditions of Use. If a change to these Website Terms and Conditions of Use is made, The University of Mindanao will post the revised Terms and Conditions of Use on this website. The University of Mindanao reserves the right to add to or change this website or cease offering this website at any time and without liability. The University of Mindanao reserves the right to refuse to offer access to this website and/or its content to anyone at any time without notice.</p>

                  <p>If any provision of the provisions of these Terms and Conditions of Use is found to be invalid by any court having competent jurisdiction, the invalidity of such provision shall not affect the validity of the remaining provisions of these Terms and Conditions of Use, which shall remain in full force. The failure of The University of Mindanao to exercise or enforce any right or provision of these Terms and Conditions of Use shall not constitute a waiver of such right or condition. Any claim or cause of action arising out of or related to the website or these Terms and Conditions of Use must be filed within one year after such claim or cause of action arose. The section titles of these Terms and Conditions of Use are merely for convenience and will not have any effect on the substantive meaning of this agreement.</p>

                  <p>The Internet is a valuable tool for The University of Mindanao's education, research, and services. The University of Mindanao encourages you to be mindful of the intent and purpose of its websites and be responsible for safeguarding your personally identifiable information.</p>

                  <p>If you are a minor (below 18 years old), you may be required to secure your parents' consent or permission, before you provide any information. In such case, it shall be your responsibility to secure your parents' consent or permission.</p>

                  <p>Parents and or legal guardians are encourage to take an active role in their children's use of the internet and this website by talking with their children about safe and responsible computing before sending any information about themselves over the internet. The University of Mindanao requests that parents review this website and guide their minor children in submitting personally identifiable information, in accordance with the Data Privacy Act. It is understood that parents' have assisted their children of their privacy rights under the law.</p>

                  <p>The University of Mindanao may block, suspend, or terminate your use of the website at any time for any reason, without notice. The reasons that The University of Mindanao might do so include, but are not limited to, the following: (a) your breach of this agreement; (b) The University of Mindanao is unable to verify or authenticate any information you provide to us; or (c) The University of Mindanao believes that your actions could cause financial loss or legal liability to The University of Mindanao or other users of this website; (d) routine network maintenance affecting all users; or (e) your use of this website or service violates the law or policies of The University of Mindanao.</p>

                  <p>If you have questions about these Terms and Conditions of Use, you may contact:</p>
                  <div className="terms-contact">
                    <p><strong>The Data Protection Officer, Internal Audit Office, University of Mindanao</strong></p>
                    <p>Phone: (+6382) 2275456</p>
                  </div>
                </section>
              </div>
            </div>
            <div className="terms-modal-footer">
              <button onClick={() => { setTermsAccepted(true); setShowTermsModal(false); setTermsError('') }} className="terms-accept-button primary-action-button primary-filled-button">
                I Understand and Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {}
      {showPasswordReset && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 backdrop-blur-sm"
          onClick={(e) => {

            if (e.target === e.currentTarget) {
              setShowPasswordReset(false)
              setPasswordResetEmail('')
              setAuthError('')
              setSuccessMessage('')
            }
          }}
          style={{ pointerEvents: 'auto' }}
        >
          <div
            className={`rounded-lg p-6 max-w-md w-full mx-4 shadow-2xl ${
              isDarkMode ? 'bg-[#2c2c2c]' : 'bg-white'
            }`}
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <h3 className={`text-xl font-bold mb-4 ${
              isDarkMode ? 'text-white' : 'text-[#7A1315]'
            }`}>Reset Password</h3>
            <form onSubmit={handlePasswordReset}>
              <div className="mb-4">
                <label className={`block text-sm font-medium mb-2 ${
                  isDarkMode ? 'text-white' : 'text-gray-800'
                }`}>
                  {userType === 'professor' ? 'Professor Email' : 'Student Email'}
                </label>
                <input
                  type="email"
                  value={passwordResetEmail}
                  onChange={(e) => setPasswordResetEmail(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-[#7A1315] ${
                    isDarkMode
                      ? 'bg-[#1a1a1a] text-white border-slate-600'
                      : 'bg-white text-gray-800 border-slate-300'
                  }`}
                  placeholder={userType === 'professor' ? 'initials@umindanao.edu.ph' : 'firstname.lastname.studentid.tc@umindanao.edu.ph'}
                  required
                  autoFocus
                />
              </div>
              {authError && (
                <div className={`mb-4 p-3 border rounded text-sm ${
                  isDarkMode
                    ? 'bg-red-900/30 border-red-700 text-red-200'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {authError}
                </div>
              )}
              {successMessage && (
                <div className={`mb-4 p-3 border rounded text-sm ${
                  isDarkMode
                    ? 'bg-green-900/30 border-green-700 text-green-200'
                    : 'bg-green-50 border-green-200 text-green-700'
                }`}>
                  {successMessage}
                </div>
              )}
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPasswordReset(false)
                    setPasswordResetEmail('')
                    setAuthError('')
                    setSuccessMessage('')
                  }}
                  className={`flex-1 px-4 py-2 border rounded-lg transition-colors ${
                    isDarkMode
                      ? 'border-slate-600 text-white hover:bg-slate-700 bg-slate-800'
                      : 'border-gray-300 text-gray-700 hover:bg-gray-50 bg-white'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={`flex-1 px-4 py-2 rounded-lg transition-colors disabled:opacity-50 ${
                    isDarkMode
                      ? 'bg-[#7A1315] text-white hover:bg-[#5a0e10] disabled:bg-[#7A1315]/50'
                      : 'bg-[#7A1315] text-white hover:bg-[#5a0e10] disabled:bg-[#7A1315]/50'
                  }`}
                >
                  {isSubmitting ? 'Sending...' : 'Send Reset Email'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Login


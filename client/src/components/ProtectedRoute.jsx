import React, { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { getCurrentProfessor } from '../services/professors'
import { getCurrentStudent } from '../services/students'

export default function ProtectedRoute({ children, requiredRole = 'Professor' }) {
  const [loading, setLoading] = useState(true)
  const [authorized, setAuthorized] = useState(false)

  useEffect(() => {
    const checkAuth = async () => {
      // Check for JWT token
      const token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token')
      if (!token) {
        setAuthorized(false)
        setLoading(false)
        return
      }

      try {
        // Get user from session storage first (fast)
        const raw = sessionStorage.getItem('currentUser')
        if (raw) {
          try {
            const userData = JSON.parse(raw)
            if (userData.type === requiredRole) {
              setAuthorized(true)
              setLoading(false)
              return
            }
          } catch (e) {
            console.warn('ProtectedRoute sessionStorage parse error', e)
          }
        }

        // Fallback: fetch profile from backend
        const profile = requiredRole === 'Professor'
          ? await getCurrentProfessor()
          : requiredRole === 'Student'
            ? await getCurrentStudent()
            : null

        // CRITICAL: Verify role matches exactly - prevent cross-role access
        if (profile && profile.role === requiredRole) {
          setAuthorized(true)
        } else {
          // Role mismatch - clear session and redirect to login
          console.warn(`Role mismatch: Expected ${requiredRole}, got ${profile?.role || 'none'}`)
          localStorage.removeItem('auth_token')
          sessionStorage.removeItem('auth_token')
          sessionStorage.removeItem('currentUser')
          setAuthorized(false)
        }
      } catch (e) {
        console.error('ProtectedRoute error fetching profile', e)
        setAuthorized(false)
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [requiredRole])

  if (loading) return null
  if (!authorized) return <Navigate to="/login" replace />
  return children
}


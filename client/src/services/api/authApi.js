import apiClient, { setAuthToken, clearAuthToken } from './apiClient'

export async function login(email, password) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Login failed' }))
      throw new Error(error.error || error.message || 'Login failed')
    }

    const data = await response.json()
    
    // Store token
    if (data.token) {
      setAuthToken(data.token)
    }

    return data
  } catch (error) {
    throw error
  }
}

export async function register(data) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Registration failed' }))
      // Include more details from the error response
      const errorMessage = error.error || error.message || 'Registration failed'
      const errorDetails = error.details ? ` Details: ${error.details}` : ''
      throw new Error(`${errorMessage}${errorDetails}`)
    }

    const result = await response.json()
    
    // Store token
    if (result.token) {
      setAuthToken(result.token)
    }

    return result
  } catch (error) {
    throw error
  }
}

export function logout() {
  clearAuthToken()
}

export async function requestPasswordReset(email) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/forgot-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Password reset request failed' }))
      throw new Error(error.error || error.message || 'Password reset request failed')
    }

    return await response.json()
  } catch (error) {
    throw error
  }
}

export async function resetPassword(email, newPassword) {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000/api'}/auth/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email, password: newPassword })
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Password reset failed' }))
      throw new Error(error.error || error.message || 'Password reset failed')
    }

    return await response.json()
  } catch (error) {
    throw error
  }
}


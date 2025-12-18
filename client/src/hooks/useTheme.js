import { useState, useEffect } from 'react'

export function useTheme() {
  const [isDarkMode, setIsDarkMode] = useState(() => {

    return localStorage.getItem('react_darkMode') === 'true'
  })

  useEffect(() => {
    const root = document.documentElement

    if (isDarkMode) {

      document.body.classList.add('dark-mode')
      root.style.setProperty('--theme-bg-primary', '#1a1a1a')
      root.style.setProperty('--theme-bg-secondary', '#2c2c2c')
      root.style.setProperty('--theme-bg-card', '#2c2c2c')
      root.style.setProperty('--theme-text-primary', '#ffffff')
      root.style.setProperty('--theme-text-secondary', '#e5e5e5')
      root.style.setProperty('--theme-border', '#404040')
      root.style.setProperty('--theme-accent', '#8B1A1D')
      root.style.setProperty('--theme-accent-hover', '#9B2A2D')
      root.style.setProperty('--theme-alert', '#FDB813')
    } else {

      document.body.classList.remove('dark-mode')
      root.style.setProperty('--theme-bg-primary', '#ffffff')
      root.style.setProperty('--theme-bg-secondary', '#f8f9fa')
      root.style.setProperty('--theme-bg-card', '#ffffff')
      root.style.setProperty('--theme-text-primary', '#000000')
      root.style.setProperty('--theme-text-secondary', '#374151')
      root.style.setProperty('--theme-border', '#e5e7eb')
      root.style.setProperty('--theme-accent', '#7A1315')
      root.style.setProperty('--theme-accent-hover', '#8B1A1D')
      root.style.setProperty('--theme-alert', '#FDB813')
    }

localStorage.setItem('react_darkMode', isDarkMode)
  }, [isDarkMode])

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev)
    document.body.classList.add('dark-mode-transition')
    setTimeout(() => {
      document.body.classList.remove('dark-mode-transition')
    }, 300)
  }

  return { isDarkMode, toggleTheme }
}


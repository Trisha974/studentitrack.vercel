import { useTheme } from '../../hooks/useTheme'
import './ThemeToggle.css'

function ThemeToggle() {
  const { isDarkMode, toggleTheme } = useTheme()

  return (
    <button
      id="themeToggleButton"
      className="theme-toggle-button"
      onClick={toggleTheme}
      aria-label="Toggle dark mode"
    >
      <img src="/assets/icons/moon.png" alt="Moon icon" className={`moon-icon w-6 h-6 ${isDarkMode ? 'hidden' : ''}`} />
      <img src="/assets/icons/sun.png" alt="Sun icon" className={`sun-icon w-6 h-6 ${isDarkMode ? '' : 'hidden'}`} />
    </button>
  )
}

export default ThemeToggle


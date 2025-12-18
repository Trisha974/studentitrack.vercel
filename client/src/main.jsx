import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './App.css'

try {
  const rootElement = document.getElementById('root')
  if (!rootElement) {
    throw new Error('Root element not found! Check index.html for <div id="root"></div>')
  }

  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
} catch (error) {
  console.error('❌ Fatal error initializing React app:', error)
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: Arial; text-align: center;">
      <h1 style="color: #7b1113;">Application Error</h1>
      <p>Failed to initialize the application.</p>
      <pre style="background: #f5f5f5; padding: 10px; border-radius: 5px; text-align: left; max-width: 600px; margin: 20px auto;">
${error.message}
${error.stack || ''}
      </pre>
      <p>Please check the browser console (F12) for more details.</p>
    </div>
  `
}


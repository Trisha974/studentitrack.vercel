import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login/Login'
import Student from './pages/Student/Student'
import Prof from './pages/Prof/Prof'
import ProtectedRoute from './components/ProtectedRoute'
import './App.css'

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/student"
          element={
            <ProtectedRoute requiredRole="Student">
              <Student />
            </ProtectedRoute>
          }
        />
        <Route
          path="/prof"
          element={
            <ProtectedRoute requiredRole="Professor">
              <Prof />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  )
}

export default App


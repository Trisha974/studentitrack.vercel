require('dotenv').config()

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  DB_HOST: process.env.DB_HOST || 'localhost',
  DB_USER: process.env.DB_USER || 'root',
  DB_PASSWORD: process.env.DB_PASSWORD || '',
  DB_NAME: process.env.DB_NAME || 'student_itrack',
  DB_SSL: process.env.DB_SSL === 'true',
  FRONTEND_URL: process.env.FRONTEND_URL || 'https://studentitrack.vercel.app',
  CSRF_SECRET: process.env.CSRF_SECRET,
  JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d'
}


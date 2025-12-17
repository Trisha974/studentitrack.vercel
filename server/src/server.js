const app = require('./app')
const { PORT } = require('./config/env')

const start = async () => {
  try {
    await app.listen({ 
      port: PORT, 
      host: '0.0.0.0' 
    })
    console.log('Server started')
    console.log(`🚀 Server running on port ${PORT}`)
    console.log(`📡 API available at http://0.0.0.0:${PORT}/api`)
    console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`)
    console.log(`📊 Database: ${process.env.DB_HOST || 'not configured'}`)
    console.log(`✅ Health check available at http://0.0.0.0:${PORT}/health`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

start()

process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason)
  process.exit(1)
})

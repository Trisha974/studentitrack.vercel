const fp = require('fastify-plugin')
const { FRONTEND_URL } = require('../config/env')

async function corsPlugin(fastify, options) {
  await fastify.register(require('@fastify/cors'), {
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true)
      
      const allowedOrigins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000',
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5177',
        'http://127.0.0.1:5177',
        'https://studentitrack.vercel.app',
        'https://studentitrack1.vercel.app',
        'https://studentitrack-vercel.vercel.app',
        FRONTEND_URL
      ].filter(Boolean)
      
      // Allow all Vercel deployments (any subdomain.vercel.app)
      const isVercelDomain = /^https:\/\/.*\.vercel\.app$/.test(origin)
      
      if (allowedOrigins.includes(origin) || isVercelDomain) {
        callback(null, true)
      } else {
        callback(new Error('Not allowed by CORS'))
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    credentials: true
  })
}

module.exports = fp(corsPlugin)


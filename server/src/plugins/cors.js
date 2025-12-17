const fp = require('fastify-plugin')
const { FRONTEND_URL } = require('../config/env')

async function corsPlugin(fastify, options) {
  await fastify.register(require('@fastify/cors'), {
    origin: [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:5177',
      'http://127.0.0.1:5177',
      'https://studentitrack1.vercel.app',
      'https://*.vercel.app', // Allow all Vercel preview deployments
      FRONTEND_URL
    ].filter(Boolean), // Remove undefined values if FRONTEND_URL is not set
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token'],
    credentials: true
  })
}

module.exports = fp(corsPlugin)


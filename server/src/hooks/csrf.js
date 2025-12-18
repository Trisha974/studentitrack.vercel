const { CSRF_SECRET } = require('../config/env')

const PUBLIC_ENDPOINTS = [
  '/api/students',
  '/api/professors',
]

async function csrfHook(request, reply) {
  const unsafeMethods = ['POST', 'PUT', 'PATCH', 'DELETE']
  if (!unsafeMethods.includes(request.method)) {
    return
  }

  const isRegistrationEndpoint = PUBLIC_ENDPOINTS.some(endpoint => 
    request.url === endpoint || request.url.startsWith(endpoint + '/')
  )
  if (isRegistrationEndpoint && request.method === 'POST') {
    console.log(`✅ Skipping CSRF check for registration endpoint: ${request.url}`)
    return
  }

  if (!CSRF_SECRET) {
    return
  }

  const token = request.headers['x-csrf-token']

  if (!token || token !== CSRF_SECRET) {
    return reply.code(403).send({ error: 'Invalid or missing CSRF token' })
  }
}

module.exports = csrfHook


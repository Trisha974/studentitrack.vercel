function errorHandler(error, request, reply) {
  console.error('❌ Error Handler:', {
    message: error.message,
    code: error.code,
    errno: error.errno,
    sqlMessage: error.sqlMessage,
    sqlState: error.sqlState,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    path: request.url,
    method: request.method,
    body: request.body ? { ...request.body, photoUrl: request.body.photoUrl ? `[${request.body.photoUrl.length} chars]` : undefined } : undefined
  })

  if (error.code === 'ER_DUP_ENTRY') {
    return reply.code(409).send({
      error: 'Duplicate entry',
      message: 'A record with this information already exists'
    })
  }

  if (error.code === 'ER_NO_REFERENCED_ROW_2' || error.code === 'ER_ROW_IS_REFERENCED_2') {
    return reply.code(400).send({
      error: 'Invalid reference',
      message: 'The referenced record does not exist or cannot be deleted'
    })
  }

  if (error.code === 'ER_DATA_TOO_LONG') {
    return reply.code(400).send({
      error: 'Data too long',
      message: error.sqlMessage || 'The data provided is too large for the database field. Please use a smaller image file.'
    })
  }

  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation failed',
      details: error.validation
    })
  }

  if (error.statusCode) {
    return reply.code(error.statusCode).send({
      error: error.message || 'An error occurred'
    })
  }

  const errorMessage = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production'
    ? error.message
    : 'An unexpected error occurred'

  const sqlDetails = error.sqlMessage ? {
    sqlMessage: error.sqlMessage,
    sqlState: error.sqlState,
    sqlCode: error.code
  } : {}

  return reply.code(500).send({
    error: 'Internal server error',
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      code: error.code,
      ...sqlDetails
    })
  })
}

module.exports = errorHandler


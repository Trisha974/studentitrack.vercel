

function errorHandler(err, req, res, next) {

  console.error('❌ Error Handler:', {
    message: err.message,
    code: err.code,
    errno: err.errno,
    sqlMessage: err.sqlMessage,
    sqlState: err.sqlState,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    body: req.body ? { ...req.body, photoUrl: req.body.photoUrl ? `[${req.body.photoUrl.length} chars]` : undefined } : undefined
  })

if (err.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({
      error: 'Duplicate entry',
      message: 'A record with this information already exists'
    })
  }

if (err.code === 'ER_NO_REFERENCED_ROW_2' || err.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(400).json({
      error: 'Invalid reference',
      message: 'The referenced record does not exist or cannot be deleted'
    })
  }

if (err.code === 'ER_DATA_TOO_LONG') {
    return res.status(400).json({
      error: 'Data too long',
      message: err.sqlMessage || 'The data provided is too large for the database field. Please use a smaller image file.'
    })
  }

if (err.array && typeof err.array === 'function') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.array()
    })
  }

if (err.status) {
    return res.status(err.status).json({
      error: err.message || 'An error occurred'
    })
  }

const errorMessage = process.env.NODE_ENV === 'development' || process.env.NODE_ENV !== 'production'
    ? err.message
    : 'An unexpected error occurred'

const sqlDetails = err.sqlMessage ? {
    sqlMessage: err.sqlMessage,
    sqlState: err.sqlState,
    sqlCode: err.code
  } : {}

  res.status(500).json({
    error: 'Internal server error',
    message: errorMessage,
    ...(process.env.NODE_ENV === 'development' && {
      stack: err.stack,
      code: err.code,
      ...sqlDetails
    })
  })
}

module.exports = errorHandler


'use strict'

const logger = require('../utils/logger')

// Global Express error handler — must be registered last with app.use()
function errorHandler(err, req, res, next) {
  logger.error(err.message, { stack: err.stack, path: req.path, method: req.method })

  if (err.name === 'PrismaClientKnownRequestError') {
    if (err.code === 'P2002') {
      return res.status(409).json({ success: false, message: 'A record with this value already exists', field: err.meta?.target })
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Record not found' })
    }
  }

  const status = err.status || err.statusCode || 500
  const message = status < 500 ? err.message : 'Internal server error'
  return res.status(status).json({ success: false, message })
}

module.exports = { errorHandler }

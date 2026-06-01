'use strict'

const jwt = require('jsonwebtoken')
const { JWT_SECRET } = require('../config/env')
const { unauthorized } = require('../utils/apiResponse')

// Verifies JWT and attaches decoded user to req.user
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return unauthorized(res, 'No token provided')
  }
  const token = authHeader.split(' ')[1]
  try {
    req.user = jwt.verify(token, JWT_SECRET)
    next()
  } catch {
    return unauthorized(res, 'Invalid or expired token')
  }
}

module.exports = { authenticate }

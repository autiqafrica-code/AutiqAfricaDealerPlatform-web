'use strict'

const rateLimit = require('express-rate-limit')
const { RATE_LIMIT_WINDOW_MS, RATE_LIMIT_MAX } = require('../config/env')

const rateLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  max: RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many requests — please try again later.' },
})

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: { success: false, message: 'Too many authentication attempts — try again in 15 minutes.' },
})

module.exports = { rateLimiter, authLimiter }

'use strict'

const { body, validationResult } = require('express-validator')

const loginRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),
]

const unifiedLoginRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),

  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters'),

  body('role')
    .isString()
    .trim()
    .notEmpty()
    .withMessage('Role is required'),
]

const refreshRules = [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token required'),
]

const forgotPasswordRules = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid email required'),
]

const resetPasswordRules = [
  body('token')
    .notEmpty()
    .withMessage('Reset token required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/)
    .withMessage('Password must contain at least one uppercase letter')
    .matches(/[0-9]/)
    .withMessage('Password must contain at least one number'),
]

function validate(req, res, next) {
  const errors = validationResult(req)

  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array(),
    })
  }

  next()
}

module.exports = {
  loginRules,
  unifiedLoginRules,
  refreshRules,
  forgotPasswordRules,
  resetPasswordRules,
  validate,
}

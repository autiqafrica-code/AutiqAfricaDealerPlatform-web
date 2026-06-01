'use strict'

const { body, validationResult } = require('express-validator')

const createCustomerRules = [
  body('name').trim().notEmpty().withMessage('Customer name is required'),
  body('phone').optional().isMobilePhone('any').withMessage('Invalid phone number'),
  body('email').optional().isEmail().normalizeEmail().withMessage('Invalid email address'),
  body('whatsapp').optional().isMobilePhone('any').withMessage('Invalid WhatsApp number'),
  body('communicationPreference').optional().isIn(['WhatsApp', 'Email', 'PhoneCall']),
]

function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() })
  }
  next()
}

module.exports = { createCustomerRules, validate }

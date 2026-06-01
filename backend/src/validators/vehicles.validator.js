'use strict'

const { body, validationResult } = require('express-validator')

const createVehicleRules = [
  body('customerId').notEmpty().withMessage('customerId is required'),
  body('registrationNo').trim().notEmpty().withMessage('Registration number is required'),
  body('makeModel').trim().notEmpty().withMessage('Make & model is required'),
  body('vehicleType').optional().isIn(['Private', 'Fleet', 'Insurance', 'Warranty']),
  body('mileage').optional().isInt({ min: 0 }),
]

function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() })
  }
  next()
}

module.exports = { createVehicleRules, validate }

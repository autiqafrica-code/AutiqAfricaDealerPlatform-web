'use strict'

const { body, validationResult } = require('express-validator')

const createQuotationRules = [
  body('customerId').notEmpty().withMessage('customerId is required'),
  body('vehicleId').notEmpty().withMessage('vehicleId is required'),
  body('repairType').notEmpty().withMessage('repairType is required'),
  body('priority').optional().isIn(['Red', 'Amber', 'Green']),
  body('customerComplaint').optional().isString(),
]

function validate(req, res, next) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() })
  }
  next()
}

module.exports = { createQuotationRules, validate }

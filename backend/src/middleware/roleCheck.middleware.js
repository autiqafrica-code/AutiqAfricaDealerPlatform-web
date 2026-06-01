'use strict'

const { forbidden } = require('../utils/apiResponse')

// Legacy: pass allowed UserRole enum values, e.g. requireRole(['Manager', 'CEO'])
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return forbidden(res, 'You do not have permission to perform this action')
    }
    next()
  }
}

// Preferred: pass stable role codes, e.g. requireRoles('MANAGER', 'CEO')
function requireRoles(...allowedCodes) {
  return (req, res, next) => {
    if (!req.user || !allowedCodes.includes(req.user.roleCode)) {
      return forbidden(res, 'You do not have permission to perform this action')
    }
    next()
  }
}

// Enterprise admin check (type-based, works with both old and new JWT payload)
function requireEnterpriseAdmin(req, res, next) {
  if (!req.user || req.user.type !== 'enterprise_admin') {
    return forbidden(res, 'Enterprise Admin access required')
  }
  next()
}

module.exports = { requireRole, requireRoles, requireEnterpriseAdmin }

'use strict'

// Role constants — must match JWT payload `role` field
const ROLES = {
  SUPPORT_ADMIN: 'Support Admin',
  ENTERPRISE_ADMIN: 'Enterprise Admin',
}

/**
 * requireRole(...roles) — middleware factory
 * Verifies that the authenticated user's role is in the allowed list.
 * Must be placed after authenticate middleware (which sets req.user).
 */
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    const role = req.user?.role
    if (!role || !allowedRoles.includes(role)) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden — insufficient role for this resource',
      })
    }
    next()
  }
}

const requireSupportAdmin = requireRole(ROLES.SUPPORT_ADMIN)
const requireEnterpriseAdmin = requireRole(ROLES.SUPPORT_ADMIN, ROLES.ENTERPRISE_ADMIN)

module.exports = { requireRole, requireSupportAdmin, requireEnterpriseAdmin, ROLES }

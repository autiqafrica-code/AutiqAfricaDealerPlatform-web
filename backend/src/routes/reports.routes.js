'use strict'

const router = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { forbidden }    = require('../utils/apiResponse')
const reports          = require('../controllers/reports.controller')

// Accessible to: Enterprise Admin (all workshops), CEO, Accounts, Manager (their workshop)
function requireReportAccess(req, res, next) {
  if (!req.user) return forbidden(res, 'Authentication required')
  if (req.user.type === 'enterprise_admin') return next()
  if (['CEO', 'Accounts', 'Manager'].includes(req.user.role)) return next()
  return forbidden(res, 'You do not have permission to perform this action')
}

router.use(authenticate)
router.use(requireReportAccess)

router.get('/jobs',                       reports.jobsReport)
router.get('/revenue',                    reports.revenueReport)
router.get('/technician-performance',     reports.technicianPerformanceReport)
router.get('/pending-approvals-payments', reports.pendingReport)

module.exports = router

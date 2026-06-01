'use strict'

const router  = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const manager           = require('../controllers/manager.controller')

router.use(authenticate)
router.use(requireRoles('MANAGER'))

router.get('/dashboard',          manager.getDashboard)
router.get('/calendar',           manager.getCalendar)
router.get('/jobs',               manager.listJobs)
router.get('/jobs/:id',           manager.getJob)
router.get('/quotations',         manager.listQuotations)
router.get('/quotations/:id',     manager.getQuotation)
router.get('/staff',              manager.getStaffWorkload)
router.get('/workshop-settings',  manager.getWorkshopSettings)
router.get('/daily-limit-status', manager.getDailyLimitStatus)

module.exports = router

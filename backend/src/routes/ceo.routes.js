'use strict'

const router = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const ceo               = require('../controllers/ceo.controller')

router.use(authenticate)
router.use(requireRoles('CEO'))

router.get('/dashboard',     ceo.getDashboard)
router.get('/calendar',      ceo.getCalendarData)
router.patch('/daily-limit', ceo.updateDailyLimit)

module.exports = router

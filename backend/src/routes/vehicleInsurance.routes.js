'use strict'

const router = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const ins               = require('../controllers/vehicleInsurance.controller')

const FD = ['FRONT_DESK', 'MANAGER', 'CEO', 'ACCOUNTS', 'WORKSHOP_CONTROLLER']

router.use(authenticate)

router.get('/jobs/:jobId/insurance',                          requireRoles(...FD), ins.getJobInsurance)
router.get('/vehicles/:vehicleId/insurance',                  requireRoles(...FD), ins.listInsurance)
router.post('/vehicles/:vehicleId/insurance',                 requireRoles('FRONT_DESK', 'MANAGER'), ins.createInsurance)
router.put('/vehicles/:vehicleId/insurance/:insuranceId',     requireRoles('FRONT_DESK', 'MANAGER'), ins.updateInsurance)

module.exports = router

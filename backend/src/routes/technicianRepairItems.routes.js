'use strict'

const router = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const tech              = require('../controllers/technicianRepairItems.controller')

router.use(authenticate)
router.use(requireRoles('TECHNICIAN'))

router.get('/',                          tech.listRepairItems)
router.get('/:id',                       tech.getRepairItem)
router.post('/:id/input',                tech.submitInput)
router.post('/:id/finalize',             tech.finalizeInput)

module.exports = router

'use strict'

const router = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const wc                = require('../controllers/workshopControllerRepairItems.controller')

const WC = ['WORKSHOP_CONTROLLER', 'MANAGER']

router.use(authenticate)
router.use(requireRoles(...WC))

router.get('/',              wc.listRepairItems)
router.get('/:id',           wc.getRepairItem)
router.post('/:id/planning', wc.submitPlanningInput)

module.exports = router

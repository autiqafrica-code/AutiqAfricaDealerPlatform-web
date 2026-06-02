'use strict'

const router = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const wc                = require('../controllers/workshopController.controller')

const WC = ['WORKSHOP_CONTROLLER', 'MANAGER']

router.use(authenticate)
router.use(requireRoles(...WC))

router.get('/',                              wc.listJobs)
router.get('/:id',                           wc.getJob)
router.post('/:id/review',                   wc.reviewJob)
router.post('/:id/assign-technician',            wc.assignTechnician)
router.post('/:id/assign-parts-interpreter',     wc.assignPartsInterpreter)
router.post('/:id/send-to-technician',       wc.sendToTechnician)
router.get('/:id/technician-updates',        wc.getTechnicianUpdates)
router.post('/:id/send-update-front-desk',   wc.sendUpdateToFrontDesk)

module.exports = router

'use strict'

const router = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const tech              = require('../controllers/technicianJob.controller')

router.use(authenticate)
router.use(requireRoles('TECHNICIAN'))

router.get('/',                              tech.listJobs)
router.get('/:id',                           tech.getJob)
router.post('/:id/start',                    tech.startJob)
router.post('/:id/progress-notes',           tech.addProgressNotes)
router.post('/:id/additional-work',          tech.requestAdditionalWork)
router.get('/:id/additional-work-status',    tech.getAdditionalWorkStatus)
router.post('/:id/complete',                 tech.completeJob)

module.exports = router

'use strict'

const router = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const ri                = require('../controllers/repairItems.controller')

const FD = ['FRONT_DESK', 'MANAGER', 'CEO']

router.use(authenticate)
router.use(requireRoles(...FD))

// Per-job repair items
router.get('/jobs/:jobId',                          ri.listRepairItems)
router.post('/jobs/:jobId',                         ri.createRepairItem)
router.get('/jobs/:jobId/time-summary',             ri.getTimeSummary)
router.post('/jobs/:jobId/build-quotation',         ri.buildQuotationFromRepairItems)

// Single repair item operations
router.get('/:id',                                  ri.getRepairItem)
router.put('/:id',                                  ri.updateRepairItem)
router.delete('/:id',                               ri.deleteRepairItem)
router.post('/:id/send-to-technician',              ri.sendToTechnician)
router.post('/:id/send-to-parts',                   ri.sendToParts)
router.post('/:id/send-to-controller',              ri.sendToController)
router.post('/:id/mark-inputs-complete',            ri.markInputsComplete)

module.exports = router

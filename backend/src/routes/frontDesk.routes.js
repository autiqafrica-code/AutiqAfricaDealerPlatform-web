'use strict'

const router  = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const fd                = require('../controllers/frontDesk.controller')

const FD = ['FRONT_DESK', 'MANAGER']

router.use(authenticate)
router.use(requireRoles(...FD))

router.get('/',                                                fd.listJobs)
router.get('/ready-for-delivery',                             fd.listReadyForDelivery)
router.get('/:id',                                            fd.getJob)
router.get('/:id/timeline',                                   fd.getTimeline)
router.post('/:id/send-to-workshop-controller',               fd.sendToWorkshopController)
router.get('/:id/additional-work',                            fd.listAdditionalWork)
router.post('/:id/additional-work/:reqId/approve',            fd.approveAdditionalWork)
router.post('/:id/additional-work/:reqId/reject',             fd.rejectAdditionalWork)
router.post('/:id/share-invoice',                             fd.shareInvoiceWithCustomer)
router.post('/:id/contact-customer-delivery',                 fd.contactCustomerForDelivery)
router.post('/:id/complete-delivery',                         fd.completeDelivery)
router.post('/:id/close',                                     fd.closeJob)

module.exports = router

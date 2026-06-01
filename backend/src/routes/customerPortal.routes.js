'use strict'

// Public routes — no JWT auth
const router = require('express').Router()
const portal = require('../controllers/customerPortal.controller')

// Job-number lookup and OTP must come before /:token wildcard
router.get('/lookup/:jobNumber',                 portal.lookupByJobNumber)
router.post('/otp/request',                      portal.requestOtp)
router.post('/otp/verify',                       portal.verifyOtp)
router.post('/otp/respond',                      portal.respondWithOtp)

router.get('/:token',                            portal.getOverview)
router.get('/:token/progress',                   portal.getProgress)
router.get('/:token/media',                      portal.getMedia)
router.get('/:token/approvals',                  portal.getApprovals)
router.post('/:token/approvals/:approvalId/respond', portal.respondToApproval)
router.get('/:token/payment',                    portal.getPaymentSummary)
router.get('/:token/delivery',                   portal.getDeliveryPreference)
router.post('/:token/delivery',                  portal.setDeliveryPreference)

module.exports = router

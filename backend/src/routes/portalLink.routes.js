'use strict'

const router  = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const portalLink        = require('../controllers/portalLink.controller')

const deskRoles = ['FRONT_DESK', 'MANAGER', 'CEO']

router.use(authenticate)
router.use(requireRoles(...deskRoles))

router.post('/:jobId/link',             portalLink.generateLink)
router.get('/:jobId/link',              portalLink.getLink)
router.patch('/:jobId/link/revoke',     portalLink.revokeLink)
router.post('/:jobId/link/regenerate',  portalLink.regenerateLink)
router.patch('/:jobId/media/:mediaId/customer-visible', portalLink.setMediaVisible)

module.exports = router

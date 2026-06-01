'use strict'

const router    = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { requireRoles } = require('../middleware/roleCheck.middleware')
const { upload }       = require('../middleware/multer.middleware')
const quotations       = require('../controllers/quotations.controller')

const frontDesk     = ['FRONT_DESK']
const frontAndMgr   = ['FRONT_DESK', 'MANAGER']
const lineItemRoles = ['FRONT_DESK', 'TECHNICIAN', 'WORKSHOP_CONTROLLER', 'PARTS_INTERPRETER']
const updateRoles   = ['TECHNICIAN', 'WORKSHOP_CONTROLLER', 'PARTS_INTERPRETER']

router.use(authenticate)

router.get('/',                               quotations.listQuotations)
router.post('/',             requireRoles(...frontDesk),     quotations.createQuotation)
router.get('/:id',                            quotations.getQuotation)
router.put('/:id',           requireRoles(...frontDesk),     quotations.updateQuotation)
router.delete('/:id',        requireRoles(...frontAndMgr),   quotations.deleteQuotation)
router.post('/:id/send-internal',    requireRoles(...frontDesk),  quotations.sendInternalRequests)
router.post('/:id/send-to-customer', requireRoles(...frontDesk),  quotations.sendToCustomer)
router.post('/:id/line-items',       requireRoles(...lineItemRoles), quotations.addLineItem)
router.put('/:id/line-items/:liId',  requireRoles(...lineItemRoles), quotations.updateLineItem)
router.delete('/:id/line-items/:liId', requireRoles(...frontDesk), quotations.deleteLineItem)
router.post('/:id/updates',                       requireRoles(...updateRoles),   quotations.submitRoleUpdate)
router.patch('/:id/line-items/:liId/role-notes',  requireRoles(...updateRoles),   quotations.updateLineItemRoleNotes)
router.patch('/:id/line-items/:liId/select-cost', requireRoles(...frontDesk),     quotations.selectLineItemCost)
router.post('/:id/send-back',                     requireRoles(...updateRoles),   quotations.sendBackToFrontDesk)
router.post('/:id/media',    upload.array('files', 10),      quotations.uploadMedia)

module.exports = router

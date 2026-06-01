'use strict'

const router = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const { upload }        = require('../middleware/multer.middleware')
const parts             = require('../controllers/parts.controller')

const partsRoles = ['PARTS_INTERPRETER']
const techRoles  = ['TECHNICIAN', 'WORKSHOP_CONTROLLER', ...partsRoles]

router.use(authenticate)

// Dashboard
router.get('/dashboard', requireRoles(...partsRoles), parts.getDashboard)

// Quotation requests (sendToPartsInterpreter=true)
router.get('/quotation-requests', requireRoles(...partsRoles), parts.listQuotationRequests)

// Jobs waiting for parts
router.get('/waiting-jobs', requireRoles(...partsRoles), parts.listWaitingJobs)

// Failed components
router.get('/failed-components',           requireRoles(...partsRoles, 'TECHNICIAN', 'WORKSHOP_CONTROLLER', 'MANAGER'), parts.listFailedComponents)
router.post('/failed-components',          requireRoles(...techRoles), parts.createFailedComponent)
router.get('/failed-components/:id',       requireRoles(...partsRoles, 'TECHNICIAN', 'WORKSHOP_CONTROLLER', 'MANAGER'), parts.getFailedComponent)
router.post('/failed-components/:id/review',requireRoles(...partsRoles), parts.reviewFailedComponent)
router.post('/failed-components/:id/media', upload.single('file'), requireRoles(...techRoles), parts.uploadComponentMedia)

module.exports = router

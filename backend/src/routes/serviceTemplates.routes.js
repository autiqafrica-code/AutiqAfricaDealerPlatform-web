'use strict'

const router = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { requireEnterpriseAdmin } = require('../middleware/roleCheck.middleware')
const svc = require('../controllers/serviceTemplates.controller')

router.use(authenticate, requireEnterpriseAdmin)

router.get('/',                              svc.listServiceTemplates)
router.post('/',                             svc.createServiceTemplate)
router.put('/:id',                           svc.updateServiceTemplate)
router.post('/:id/pricing',                  svc.upsertServicePricing)
router.post('/:id/checklist',                svc.addChecklistItem)
router.put('/:id/checklist/:itemId',         svc.updateChecklistItem)
router.delete('/:id/checklist/:itemId',      svc.deleteChecklistItem)

module.exports = router

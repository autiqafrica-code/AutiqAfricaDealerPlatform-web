'use strict'

const router = require('express').Router()
const { authenticate }          = require('../middleware/auth.middleware')
const { requireEnterpriseAdmin } = require('../middleware/roleCheck.middleware')
const draftsController           = require('../controllers/clientDrafts.controller')

router.use(authenticate, requireEnterpriseAdmin)

router.get('/',       draftsController.listDrafts)
router.post('/',      draftsController.createDraft)
router.get('/:id',    draftsController.getDraft)
router.patch('/:id',  draftsController.updateDraft)
router.delete('/:id', draftsController.deleteDraft)

module.exports = router

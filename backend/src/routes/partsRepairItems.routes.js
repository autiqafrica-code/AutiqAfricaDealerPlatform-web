'use strict'

const router = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const parts             = require('../controllers/partsRepairItems.controller')

const PARTS = ['PARTS_INTERPRETER', 'MANAGER', 'CEO']

router.use(authenticate)
router.use(requireRoles(...PARTS))

router.get('/',                                  parts.listRepairItems)
router.get('/:id',                               parts.getRepairItem)
router.post('/:id/options',                      parts.addPartsOption)
router.put('/:id/options/:optionId',             parts.updatePartsOption)
router.patch('/:id/options/:optionId/select',    parts.selectOption)
router.post('/:id/submit',                       parts.submitPartsInput)

module.exports = router

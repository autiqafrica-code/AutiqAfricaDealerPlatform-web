'use strict'

const router = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { requireEnterpriseAdmin } = require('../middleware/roleCheck.middleware')
const workshopsController = require('../controllers/workshops.controller')

router.use(authenticate)

router.get('/',                     workshopsController.listWorkshops)
router.post('/',    requireEnterpriseAdmin, workshopsController.createWorkshop)
router.get('/:id',                  workshopsController.getWorkshop)
router.put('/:id',  requireEnterpriseAdmin, workshopsController.updateWorkshop)
router.patch('/:id/status', requireEnterpriseAdmin, workshopsController.updateWorkshopStatus)
router.get('/:id/users',            workshopsController.getWorkshopUsers)
router.get('/:id/schedule',         workshopsController.getWorkshopSchedule)
router.put('/:id/schedule',         workshopsController.updateWorkshopSchedule)

module.exports = router

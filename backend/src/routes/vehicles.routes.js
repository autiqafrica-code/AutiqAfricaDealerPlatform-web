'use strict'

const router    = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { requireRoles } = require('../middleware/roleCheck.middleware')
const vehicles         = require('../controllers/vehicles.controller')

const frontDesk = ['FRONT_DESK', 'MANAGER', 'WORKSHOP_CONTROLLER']
const managers  = ['MANAGER', 'CEO']

router.use(authenticate)

router.get('/',           vehicles.listVehicles)
router.post('/',          requireRoles(...frontDesk), vehicles.createVehicle)
router.get('/:id',        vehicles.getVehicle)
router.put('/:id',        requireRoles(...frontDesk), vehicles.updateVehicle)
router.delete('/:id',     requireRoles(...managers),  vehicles.deleteVehicle)

module.exports = router

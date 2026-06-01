'use strict'

const router    = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { requireRoles } = require('../middleware/roleCheck.middleware')
const appointments     = require('../controllers/appointments.controller')

const frontDesk = ['FRONT_DESK', 'MANAGER']
const statusRoles = ['FRONT_DESK', 'MANAGER', 'WORKSHOP_CONTROLLER']

router.use(authenticate)

router.get('/',              appointments.listAppointments)
router.post('/',             requireRoles(...frontDesk),     appointments.createAppointment)
router.get('/:id',           appointments.getAppointment)
router.put('/:id',           requireRoles(...frontDesk),     appointments.updateAppointment)
router.patch('/:id/status',  requireRoles(...statusRoles),   appointments.updateAppointmentStatus)
router.delete('/:id',        requireRoles(...frontDesk),     appointments.deleteAppointment)

module.exports = router

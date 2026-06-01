'use strict'

const router     = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const customers         = require('../controllers/customers.controller')

const frontDesk = ['FRONT_DESK', 'MANAGER', 'WORKSHOP_CONTROLLER', 'ACCOUNTS', 'CEO']
const managers  = ['MANAGER', 'CEO']

router.use(authenticate)

router.get('/',                           customers.listCustomers)
router.post('/',          requireRoles(...frontDesk), customers.createCustomer)
router.get('/:id',                        customers.getCustomer)
router.put('/:id',        requireRoles(...frontDesk), customers.updateCustomer)
router.delete('/:id',     requireRoles(...managers),  customers.deleteCustomer)
router.get('/:id/vehicles',               customers.getCustomerVehicles)
router.get('/:id/quotations',             customers.getCustomerQuotations)
router.get('/:id/jobs',                   customers.getCustomerJobs)
router.post('/:id/verify-email',    requireRoles(...frontDesk), customers.verifyEmail)
router.post('/:id/verify-whatsapp', requireRoles(...frontDesk), customers.verifyWhatsapp)

module.exports = router

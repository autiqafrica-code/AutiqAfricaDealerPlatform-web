'use strict'

const router   = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const accounts          = require('../controllers/accounts.controller')

const roles = ['ACCOUNTS', 'MANAGER', 'CEO']

router.use(authenticate)
router.use(requireRoles(...roles))

router.get('/',  accounts.listPayments)
router.post('/', accounts.recordPayment)

module.exports = router

'use strict'

const router   = require('express').Router()
const { authenticate }  = require('../middleware/auth.middleware')
const { requireRoles }  = require('../middleware/roleCheck.middleware')
const accounts          = require('../controllers/accounts.controller')

const accountsRoles = ['ACCOUNTS', 'MANAGER', 'CEO']

router.use(authenticate)
router.use(requireRoles(...accountsRoles))

router.get('/dashboard',        accounts.getDashboard)
router.get('/invoice-sources',  accounts.listInvoiceSources)
router.get('/invoices',         accounts.listInvoices)
router.post('/invoices',        accounts.generateInvoice)
router.get('/invoices/:id',                     accounts.getInvoice)
router.get('/invoices/:id/payment-summary',     accounts.getPaymentSummary)
router.get('/payments',                         accounts.listPayments)
router.post('/payments',                        accounts.recordPayment)
router.post('/invoices/:id/send-to-front-desk', accounts.sendInvoiceToFrontDesk)
router.post('/invoices/:id/clear-payment',      accounts.clearPayment)

module.exports = router

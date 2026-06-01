'use strict'

const router = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { requireEnterpriseAdmin } = require('../middleware/roleCheck.middleware')
const clientsController = require('../controllers/clients.controller')

router.use(authenticate, requireEnterpriseAdmin)

router.get('/',              clientsController.listClients)
router.post('/',             clientsController.createClient)
router.get('/:id',           clientsController.getClient)
router.put('/:id',           clientsController.updateClient)
router.patch('/:id/status',  clientsController.updateClientStatus)
router.delete('/:id',        clientsController.deleteClient)
router.get('/:id/modules',   clientsController.getClientModules)
router.post('/:id/modules',  clientsController.updateClientModules)

module.exports = router

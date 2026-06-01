'use strict'

const router = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { requireEnterpriseAdmin } = require('../middleware/roleCheck.middleware')
const usersController = require('../controllers/users.controller')

router.use(authenticate)

router.get('/',                            usersController.listUsers)
router.post('/',          requireEnterpriseAdmin, usersController.createUser)
router.post('/bulk',      requireEnterpriseAdmin, usersController.bulkCreateUsers)
router.get('/:id',                         usersController.getUser)
router.put('/:id',        requireEnterpriseAdmin, usersController.updateUser)
router.patch('/:id/status', requireEnterpriseAdmin, usersController.updateUserStatus)
router.patch('/:id/password', requireEnterpriseAdmin, usersController.resetUserPassword)
router.delete('/:id',     requireEnterpriseAdmin, usersController.deleteUser)
router.post('/:id/send-credentials', requireEnterpriseAdmin, usersController.sendCredentials)

module.exports = router

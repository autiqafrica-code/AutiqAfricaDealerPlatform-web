'use strict'

const router    = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const notifications    = require('../controllers/notifications.controller')

router.use(authenticate)

router.get('/',                             notifications.listNotifications)
router.post('/send',                        notifications.sendNotification)
router.get('/reminders',                    notifications.listReminderRules)
router.post('/reminders',                   notifications.createReminderRule)
router.post('/reminders/test',              notifications.sendTestReminder)
router.put('/reminders/:id',               notifications.updateReminderRule)
router.patch('/reminders/:id/status',      notifications.updateReminderStatus)
router.delete('/reminders/:id',            notifications.deleteReminderRule)

module.exports = router

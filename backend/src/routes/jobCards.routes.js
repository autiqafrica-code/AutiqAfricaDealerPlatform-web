'use strict'

const router    = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { requireRoles } = require('../middleware/roleCheck.middleware')
const { upload }       = require('../middleware/multer.middleware')
const jobs             = require('../controllers/jobCards.controller')

const frontDesk     = ['FRONT_DESK']
const frontAndMgr   = ['FRONT_DESK', 'MANAGER', 'WORKSHOP_CONTROLLER']
const statusRoles   = ['TECHNICIAN', 'WORKSHOP_CONTROLLER', 'FRONT_DESK', 'MANAGER']
const techAndWC     = ['TECHNICIAN', 'WORKSHOP_CONTROLLER']
const wcAndMgr      = ['WORKSHOP_CONTROLLER', 'MANAGER']
const notifyRoles   = ['FRONT_DESK', 'MANAGER']

router.use(authenticate)

router.get('/',                          jobs.listJobs)
router.post('/',           requireRoles(...frontDesk),    jobs.createJob)
router.get('/:id',                       jobs.getJob)
router.put('/:id',         requireRoles(...frontAndMgr),  jobs.updateJob)
router.patch('/:id/status',requireRoles(...statusRoles),  jobs.updateJobStatus)
router.patch('/:id/progress',requireRoles(...techAndWC),  jobs.updateJobProgress)
router.patch('/:id/assign-technician', requireRoles(...wcAndMgr), jobs.assignTechnician)
router.patch('/:id/assign-controller', requireRoles('MANAGER','FRONT_DESK'), jobs.assignController)
router.patch('/:id/qc-approve',        requireRoles('MANAGER'), jobs.qcApprove)
router.get('/:id/checklist',           jobs.getChecklist)
router.post('/:id/checklist',          requireRoles(...techAndWC), jobs.updateChecklist)
router.get('/:id/issues',              jobs.listIssues)
router.post('/:id/issues',             requireRoles(...techAndWC), jobs.raiseIssue)
router.patch('/:id/issues/:issueId/resolve', requireRoles(...wcAndMgr), jobs.resolveIssue)
router.post('/:id/media',              upload.array('files', 10), jobs.uploadMedia)
router.post('/:id/notify-customer',    requireRoles(...notifyRoles), jobs.notifyCustomer)

module.exports = router

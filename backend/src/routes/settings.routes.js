'use strict'

const router = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { requireEnterpriseAdmin } = require('../middleware/roleCheck.middleware')
const { upload } = require('../middleware/multer.middleware')

// GET    /api/settings/modules                 — list all available modules
// GET    /api/settings/service-templates       — list service templates
// POST   /api/settings/service-templates       — create service template
// PUT    /api/settings/service-templates/:id   — update service template
// DELETE /api/settings/service-templates/:id   — delete service template
// GET    /api/settings/service-pricing         — list service pricing
// POST   /api/settings/service-pricing         — create/update service price
// GET    /api/settings/service-checklists      — list checklist templates
// POST   /api/settings/service-checklists      — add checklist item to template
// PUT    /api/settings/service-checklists/:id  — update checklist item
// DELETE /api/settings/service-checklists/:id  — delete checklist item
// GET    /api/settings/enterprise-admins       — list enterprise admin users
// POST   /api/settings/enterprise-admins       — create enterprise admin user
// PUT    /api/settings/enterprise-admins/:id   — update enterprise admin
// PATCH  /api/settings/enterprise-admins/:id/status — activate / block admin
// GET    /api/settings/login-activity          — login activity for all workshop users
// GET    /api/settings/data-export             — enterprise data export (CSV)

router.use(authenticate, requireEnterpriseAdmin)

router.get('/modules', (req, res) => res.json({ placeholder: 'GET /api/settings/modules' }))
router.get('/service-templates', (req, res) => res.json({ placeholder: 'GET /api/settings/service-templates' }))
router.post('/service-templates', (req, res) => res.json({ placeholder: 'POST /api/settings/service-templates' }))
router.put('/service-templates/:id', (req, res) => res.json({ placeholder: 'PUT /api/settings/service-templates/:id' }))
router.delete('/service-templates/:id', (req, res) => res.json({ placeholder: 'DELETE /api/settings/service-templates/:id' }))
router.get('/service-pricing', (req, res) => res.json({ placeholder: 'GET /api/settings/service-pricing' }))
router.post('/service-pricing', (req, res) => res.json({ placeholder: 'POST /api/settings/service-pricing' }))
router.get('/service-checklists', (req, res) => res.json({ placeholder: 'GET /api/settings/service-checklists' }))
router.post('/service-checklists', (req, res) => res.json({ placeholder: 'POST /api/settings/service-checklists' }))
router.put('/service-checklists/:id', (req, res) => res.json({ placeholder: 'PUT /api/settings/service-checklists/:id' }))
router.delete('/service-checklists/:id', (req, res) => res.json({ placeholder: 'DELETE /api/settings/service-checklists/:id' }))
router.get('/enterprise-admins', (req, res) => res.json({ placeholder: 'GET /api/settings/enterprise-admins' }))
router.post('/enterprise-admins', (req, res) => res.json({ placeholder: 'POST /api/settings/enterprise-admins' }))
router.put('/enterprise-admins/:id', (req, res) => res.json({ placeholder: 'PUT /api/settings/enterprise-admins/:id' }))
router.patch('/enterprise-admins/:id/status', (req, res) => res.json({ placeholder: 'PATCH /api/settings/enterprise-admins/:id/status' }))
router.get('/login-activity', (req, res) => res.json({ placeholder: 'GET /api/settings/login-activity' }))
router.get('/data-export', (req, res) => res.json({ placeholder: 'GET /api/settings/data-export' }))

module.exports = router

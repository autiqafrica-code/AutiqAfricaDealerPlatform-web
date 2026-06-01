'use strict'

const router = require('express').Router()
const { authenticate } = require('../middleware/auth.middleware')
const { requireEnterpriseAdmin } = require('../middleware/roleCheck.middleware')
const enterprise       = require('../controllers/enterprise.controller')
const credentialSlots  = require('../controllers/credentialSlots.controller')

router.use(authenticate, requireEnterpriseAdmin)

// Dashboard & overview
router.get('/dashboard',      enterprise.getDashboardStats)

// Login activity (all users across all workshops)
router.get('/login-activity', enterprise.listLoginActivity)

// All workshop users (enterprise view with client/workshop context)
router.get('/users',          enterprise.listAllUsers)

// Platform modules
router.get('/modules',        enterprise.listModules)

// Revenue analytics
router.get('/revenue',        enterprise.getRevenue)

// Data export
router.get('/export',         enterprise.getExportData)

// ── Credential slot system ────────────────────────────────────────────────────

// Full transactional onboard: client + workshops + role counts in one request
router.post('/clients/onboard',                        credentialSlots.onboardClient)

// Summary: all clients with required/created/pending user counts
router.get('/clients/credential-summary',              credentialSlots.getCredentialSummary)

// Slots for a specific client (optionally filtered by workshopId query param)
router.get('/clients/:clientId/credential-slots',      credentialSlots.getCredentialSlots)

// Create one user occupying a specific role slot
router.post('/users/create-from-slot',                 credentialSlots.createUserFromSlot)

// Add a user of any role directly (no slot-limit check, auto-increments count)
router.post('/users/add',                              credentialSlots.addUserDirect)

// Update/add role counts for an existing workshop
router.put('/workshops/:workshopId/role-counts',       credentialSlots.upsertWorkshopRoleCounts)

// Onboarding notification email
router.post('/send-onboarding-email',        enterprise.sendOnboardingEmail)

// ── Enterprise Admin user management ─────────────────────────────────────────
router.get('/admins',                        enterprise.listAdmins)
router.post('/admins',                       enterprise.createAdmin)
router.get('/admins/:id',                    enterprise.getAdmin)
router.put('/admins/:id',                    enterprise.updateAdmin)
router.patch('/admins/:id/status',           enterprise.updateAdminStatus)
router.patch('/admins/:id/password',         enterprise.resetAdminPassword)
router.delete('/admins/:id',                 enterprise.deleteAdmin)

module.exports = router

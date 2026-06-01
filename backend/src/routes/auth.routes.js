'use strict'

const router = require('express').Router()
const { authLimiter } = require('../middleware/rateLimiter.middleware')
const authController = require('../controllers/auth.controller')
const { loginRules, unifiedLoginRules, refreshRules, forgotPasswordRules, resetPasswordRules, validate } = require('../validators/auth.validator')

// POST /api/auth/login  (unified — all roles)
router.post('/login', authLimiter, unifiedLoginRules, validate, authController.login)

// POST /api/auth/admin/login  (legacy alias — kept for backward compat)
router.post('/admin/login', authLimiter, loginRules, validate, authController.loginEnterpriseAdmin)

// POST /api/auth/refresh
router.post('/refresh', refreshRules, validate, authController.refreshToken)

// POST /api/auth/logout
router.post('/logout', authController.logout)

// POST /api/auth/forgot-password
router.post('/forgot-password', authLimiter, forgotPasswordRules, validate, authController.forgotPassword)

// POST /api/auth/reset-password
router.post('/reset-password', resetPasswordRules, validate, authController.resetPassword)

module.exports = router

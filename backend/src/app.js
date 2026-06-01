'use strict'

require('dotenv').config()

const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const path = require('path')
const fs = require('fs')

const { ALLOWED_ORIGINS, UPLOAD_DIR } = require('./config/env')
const { requestLogger } = require('./middleware/requestLogger.middleware')
const { rateLimiter } = require('./middleware/rateLimiter.middleware')
const { errorHandler } = require('./middleware/errorHandler.middleware')

// ── Routes ───────────────────────────────────────────────────────────────────
const authRoutes           = require('./routes/auth.routes')
const clientsRoutes        = require('./routes/clients.routes')
const workshopsRoutes      = require('./routes/workshops.routes')
const usersRoutes          = require('./routes/users.routes')
const customersRoutes      = require('./routes/customers.routes')
const vehiclesRoutes       = require('./routes/vehicles.routes')
const appointmentsRoutes   = require('./routes/appointments.routes')
const quotationsRoutes     = require('./routes/quotations.routes')
const customerPortalRoutes = require('./routes/customerPortal.routes')
const jobCardsRoutes       = require('./routes/jobCards.routes')
const partsRoutes          = require('./routes/parts.routes')
const invoicesRoutes       = require('./routes/invoices.routes')
const paymentsRoutes       = require('./routes/payments.routes')
const reportsRoutes        = require('./routes/reports.routes')
const notificationsRoutes  = require('./routes/notifications.routes')
const settingsRoutes       = require('./routes/settings.routes')
const clientDraftsRoutes   = require('./routes/clientDrafts.routes')
const enterpriseRoutes        = require('./routes/enterprise.routes')
const serviceTemplatesRoutes  = require('./routes/serviceTemplates.routes')
const managerRoutes           = require('./routes/manager.routes')
const ceoRoutes               = require('./routes/ceo.routes')
const accountsRoutes          = require('./routes/accounts.routes')
const portalLinkRoutes        = require('./routes/portalLink.routes')
const frontDeskRoutes         = require('./routes/frontDesk.routes')
const workshopControllerRoutes = require('./routes/workshopController.routes')
const technicianJobRoutes     = require('./routes/technicianJob.routes')
const countriesRoutes         = require('./routes/countries.routes')
const repairItemsRoutes              = require('./routes/repairItems.routes')
const technicianRepairItemsRoutes    = require('./routes/technicianRepairItems.routes')
const partsRepairItemsRoutes         = require('./routes/partsRepairItems.routes')
const workshopControllerRIRoutes     = require('./routes/workshopControllerRepairItems.routes')
const vehicleInsuranceRoutes         = require('./routes/vehicleInsurance.routes')

const app = express()

// ── Ensure uploads directory exists ──────────────────────────────────────────
const uploadsPath = path.resolve(UPLOAD_DIR)
if (!fs.existsSync(uploadsPath)) fs.mkdirSync(uploadsPath, { recursive: true })

// ── Core middleware ───────────────────────────────────────────────────────────
app.use(helmet())

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (server-to-server, curl, Postman)
    if (!origin) return callback(null, true)
    if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true)
    callback(new Error(`CORS: origin ${origin} not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}
app.options('*', cors(corsOptions))   // pre-flight for all routes
app.use(cors(corsOptions))
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(requestLogger)
app.use(rateLimiter)

// ── Static file serving (uploads) ────────────────────────────────────────────
app.use('/uploads', express.static(uploadsPath))

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',          authRoutes)
app.use('/api/clients',       clientsRoutes)
app.use('/api/workshops',     workshopsRoutes)
app.use('/api/users',         usersRoutes)
app.use('/api/customers',     customersRoutes)
app.use('/api/vehicles',      vehiclesRoutes)
app.use('/api/appointments',  appointmentsRoutes)
app.use('/api/quotations',    quotationsRoutes)
app.use('/api/portal',        customerPortalRoutes)   // Public — token-based
app.use('/api/jobs',          jobCardsRoutes)
app.use('/api/parts',         partsRoutes)
app.use('/api/invoices',      invoicesRoutes)
app.use('/api/payments',      paymentsRoutes)
app.use('/api/reports',       reportsRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/settings',      settingsRoutes)
app.use('/api/client-drafts', clientDraftsRoutes)
app.use('/api/enterprise',         enterpriseRoutes)
app.use('/api/service-templates',  serviceTemplatesRoutes)
app.use('/api/manager',            managerRoutes)
app.use('/api/ceo',                ceoRoutes)
app.use('/api/accounts',              accountsRoutes)
app.use('/api/front-desk/portal',        portalLinkRoutes)
app.use('/api/front-desk/jobs',          frontDeskRoutes)
app.use('/api/front-desk/repair-items',  repairItemsRoutes)
app.use('/api/front-desk',               vehicleInsuranceRoutes)
app.use('/api/workshop-controller/jobs', workshopControllerRoutes)
app.use('/api/workshop-controller/repair-items', workshopControllerRIRoutes)
app.use('/api/technician/jobs',          technicianJobRoutes)
app.use('/api/technician/repair-items',  technicianRepairItemsRoutes)
app.use('/api/parts/repair-items',       partsRepairItemsRoutes)

app.use('/api/countries', countriesRoutes)

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'autiq-africa-backend' }))

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.path}` }))

// ── Global error handler (must be last) ──────────────────────────────────────
app.use(errorHandler)

module.exports = app

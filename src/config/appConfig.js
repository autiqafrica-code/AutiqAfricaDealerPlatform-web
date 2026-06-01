// Role codes — must match backend constants/roles.js
export const ROLE_CODES = {
  ENTERPRISE_ADMIN:    'ENTERPRISE_ADMIN',
  SUPPORT_ADMIN:       'SUPPORT_ADMIN',
  FRONT_DESK:          'FRONT_DESK',
  MANAGER:             'MANAGER',
  TECHNICIAN:          'TECHNICIAN',
  WORKSHOP_CONTROLLER: 'WORKSHOP_CONTROLLER',
  PARTS_INTERPRETER:   'PARTS_INTERPRETER',
  ACCOUNTS:            'ACCOUNTS',
  CEO:                 'CEO',
}

// Human-readable display names keyed by role code
export const ROLE_DISPLAY = {
  ENTERPRISE_ADMIN:    'Enterprise Admin',
  SUPPORT_ADMIN:       'Support Admin',
  FRONT_DESK:          'Front Desk',
  MANAGER:             'Manager',
  TECHNICIAN:          'Technician',
  WORKSHOP_CONTROLLER: 'Workshop Controller',
  PARTS_INTERPRETER:   'Parts Interpreter',
  ACCOUNTS:            'Accounts',
  CEO:                 'CEO',
}

// Login page dropdown: display label → allowedRoles sent to API
export const LOGIN_ROLES = [
  { display: 'Enterprise Admin',    allowedCodes: ['ENTERPRISE_ADMIN'] },
  { display: 'Support Admin',       allowedCodes: ['SUPPORT_ADMIN'] },
  { display: 'Front Desk',          allowedCodes: ['FRONT_DESK'] },
  { display: 'Manager',             allowedCodes: ['MANAGER'] },
  { display: 'Technician',          allowedCodes: ['TECHNICIAN'] },
  { display: 'Workshop Controller', allowedCodes: ['WORKSHOP_CONTROLLER'] },
  { display: 'Parts Interpreter',   allowedCodes: ['PARTS_INTERPRETER'] },
  { display: 'Accounts',            allowedCodes: ['ACCOUNTS'] },
  { display: 'CEO',                 allowedCodes: ['CEO'] },
]

// Default demo credentials per login-role display name (dev convenience only)
export const LOGIN_ROLE_DEFAULTS = {
  'Enterprise Admin':    { email: 'hiraljivan@autiqafrica.com',          password: 'Autiq@2026' },
  'Support Admin':       { email: 'support.admin@autiqafrica.com',        password: 'Autiq@2026' },
  'Front Desk':          { email: 'frontdesk@autiqafrica.com',            password: 'Autiq@2026' },
  'Manager':             { email: 'manager@autiqafrica.com',              password: 'Autiq@2026' },
  'Technician':          { email: 'technician@autiqafrica.com',           password: 'Autiq@2026' },
  'Workshop Controller': { email: 'workshop.controller@autiqafrica.com',  password: 'Autiq@2026' },
  'Parts Interpreter':   { email: 'parts.interpreter@autiqafrica.com',    password: 'Autiq@2026' },
  'Accounts':            { email: 'accounts@autiqafrica.com',             password: 'Autiq@2026' },
  'CEO':                 { email: 'ceo@autiqafrica.com',                  password: 'Autiq@2026' },
}

// Post-login home route per role code
export const ROLE_HOME = {
  ENTERPRISE_ADMIN:    '/enterprise/onboard-client',
  SUPPORT_ADMIN:       '/enterprise/clients',
  FRONT_DESK:          '/front-desk',
  MANAGER:             '/manager',
  TECHNICIAN:          '/technician',
  WORKSHOP_CONTROLLER: '/workshop',
  PARTS_INTERPRETER:   '/parts',
  ACCOUNTS:            '/accounts',
  CEO:                 '/ceo',
}

const enterpriseRoutes = [
  '/enterprise/onboard-client',
  '/enterprise/modules',
  '/enterprise/module-functions',
  '/enterprise/user-credentials',
  '/enterprise/onboarding-email',
  '/enterprise/clients',
  '/enterprise/login-activity',
  '/enterprise/revenue',
  '/enterprise/admin-users',
  '/enterprise/data-export',
  '/enterprise/service-checklists',
  '/enterprise/service-pricing',
  '/reports',
  '/reports/jobs',
  '/reports/revenue',
  '/reports/technician-performance',
  '/reports/pending-approvals-payments',
]

// Allowed routes per role code — used by ProtectedRoute
export const ROLE_ACCESS = {
  ENTERPRISE_ADMIN:    enterpriseRoutes,
  SUPPORT_ADMIN:       ['/enterprise/clients', '/enterprise/login-activity', '/enterprise/admin-users'],
  FRONT_DESK:          ['/front-desk', '/front-desk/add-customer', '/front-desk/add-vehicle', '/front-desk/create-quotation', '/front-desk/post-approval-job', '/front-desk/reminder-settings', '/jobs', '/calendar', '/customer-link', '/tracking'],
  MANAGER:             ['/manager', '/jobs', '/calendar'],
  TECHNICIAN:          ['/technician', '/technician/quotation-update', '/calendar'],
  WORKSHOP_CONTROLLER: ['/workshop', '/workshop/quotation-update', '/jobs', '/calendar'],
  PARTS_INTERPRETER:   ['/parts', '/parts/quotation-update', '/jobs'],
  ACCOUNTS:            ['/accounts', '/accounts/record-payment', '/accounts/invoices', '/reports', '/reports/jobs', '/reports/revenue', '/reports/technician-performance', '/reports/pending-approvals-payments'],
  CEO:                 ['/ceo', '/reports', '/reports/jobs', '/reports/revenue', '/reports/technician-performance', '/reports/pending-approvals-payments', '/calendar'],
}

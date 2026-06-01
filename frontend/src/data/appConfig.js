export const roles = [
  'Enterprise Admin',
  'Front Desk',
  'Technician',
  'Manager',
  'Workshop Controller',
  'Accounts',
  'Parts Interpreter',
  'CEO'
]

export const roleHome = {
  'Enterprise Admin': '/enterprise/dashboard',
  'Front Desk': '/front-desk',
  Technician: '/technician',
  Manager: '/manager',
  'Workshop Controller': '/workshop',
  Accounts: '/accounts',
  'Parts Interpreter': '/parts',
  CEO: '/ceo'
}

export const enterpriseRoutes = [
  '/enterprise/dashboard',
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
  '/reports/pending-approvals-payments'
]

export const roleAccess = {
  'Enterprise Admin': enterpriseRoutes,
  'Front Desk': ['/front-desk', '/front-desk/add-customer', '/front-desk/add-vehicle', '/front-desk/create-quotation', '/front-desk/post-approval-job', '/front-desk/reminder-settings', '/front-desk/repair-items', '/front-desk/vehicle-insurance', '/jobs', '/calendar', '/customer-link', '/tracking'],
  Technician: ['/technician', '/technician/quotation-update', '/technician/repair-items', '/calendar'],
  Manager: ['/manager', '/front-desk/repair-items', '/parts/repair-items', '/workshop/repair-items', '/jobs', '/calendar'],
  'Workshop Controller': ['/workshop', '/workshop/quotation-update', '/workshop/repair-items', '/jobs', '/calendar'],
  Accounts: ['/accounts', '/accounts/record-payment', '/accounts/invoices', '/reports', '/reports/jobs', '/reports/revenue', '/reports/technician-performance', '/reports/pending-approvals-payments'],
  'Parts Interpreter': ['/parts', '/parts/quotation-update', '/parts/repair-items', '/jobs'],
  CEO: ['/ceo', '/front-desk/repair-items', '/parts/repair-items', '/reports', '/reports/jobs', '/reports/revenue', '/reports/technician-performance', '/reports/pending-approvals-payments', '/calendar']
}

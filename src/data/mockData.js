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
  'Enterprise Admin': '/enterprise/onboard-client',
  'Front Desk': '/front-desk',
  Technician: '/technician',
  Manager: '/manager',
  'Workshop Controller': '/workshop',
  Accounts: '/accounts',
  'Parts Interpreter': '/parts',
  CEO: '/ceo'
}

export const enterpriseRoutes = [
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
  'Front Desk': ['/front-desk', '/front-desk/add-customer', '/front-desk/add-vehicle', '/front-desk/create-quotation', '/front-desk/post-approval-job', '/front-desk/reminder-settings', '/jobs', '/calendar', '/customer-link', '/tracking'],
  Technician: ['/technician', '/technician/quotation-update', '/calendar'],
  Manager: ['/manager', '/jobs', '/calendar'],
  'Workshop Controller': ['/workshop', '/workshop/quotation-update', '/jobs', '/calendar'],
  Accounts: ['/accounts', '/accounts/record-payment', '/accounts/invoices', '/reports', '/reports/jobs', '/reports/revenue', '/reports/technician-performance', '/reports/pending-approvals-payments'],
  'Parts Interpreter': ['/parts', '/parts/quotation-update', '/jobs'],
  'Parts Controller': ['/parts', '/parts/quotation-update', '/jobs'],
  CEO: ['/ceo', '/reports', '/reports/jobs', '/reports/revenue', '/reports/technician-performance', '/reports/pending-approvals-payments', '/calendar']
}


export const enterpriseAdminUsers = [
  { id: 'ADM-001', name: 'Enterprise Owner', role: 'Super Admin', email: 'owner@autiqafrica.com', loginEmail: 'owner@autiqafrica.com', status: 'Active', lastLogin: '11 May 2026, 18:20' },
  { id: 'ADM-002', name: 'Platform Operations', role: 'Super Admin', email: 'ops@autiqafrica.com', loginEmail: 'ops@autiqafrica.com', status: 'Active', lastLogin: '10 May 2026, 12:42' },
  { id: 'ADM-003', name: 'Client Setup Lead', role: 'Super Admin', email: 'setup@autiqafrica.com', loginEmail: 'setup@autiqafrica.com', status: 'Active', lastLogin: '09 May 2026, 09:11' },
  { id: 'ADM-004', name: 'Finance Admin', role: 'Super Admin', email: 'billing@autiqafrica.com', loginEmail: 'billing@autiqafrica.com', status: 'Inactive', lastLogin: '28 Apr 2026, 16:05' }
]

export const clients = [
  { name: 'Lagos Premium Motors', country: 'Nigeria', currency: 'NGN', modules: 'Service + Paint & Panel', users: 34, status: 'Active', lastLogin: '10 May 2026, 09:42', accountAge: '8 months', revenue: 18400000, revenueText: 'NGN 18.4M' },
  { name: 'Cape Town Autohaus', country: 'South Africa', currency: 'ZAR', modules: 'Service', users: 21, status: 'Active', lastLogin: '09 May 2026, 16:20', accountAge: '1 year', revenue: 2700000, revenueText: 'ZAR 2.7M' },
  { name: 'Gaborone Fleet Centre', country: 'Botswana', currency: 'BWP', modules: 'Service + Parts', users: 18, status: 'Inactive', lastLogin: '12 Apr 2026, 11:08', accountAge: '5 months', revenue: 840000, revenueText: 'BWP 840K' },
  { name: 'Nairobi Elite Motors', country: 'Kenya', currency: 'KES', modules: 'Service + Customer Portal', users: 26, status: 'Active', lastLogin: '08 May 2026, 13:05', accountAge: '3 months', revenue: 5100000, revenueText: 'KES 5.1M' }
]

export const workshops = [
  { client: 'Lagos Premium Motors', workshop: 'Ikeja Workshop', ceo: 'Ada Okeke', currency: 'NGN', users: 18, revenue: 11200000, revenueText: 'NGN 11.2M', phone: '+234 801 555 0101', openingTime: '10:00', closingTime: '20:00' },
  { client: 'Lagos Premium Motors', workshop: 'Lekki Paint & Panel', ceo: 'Ada Okeke', currency: 'NGN', users: 16, revenue: 7200000, revenueText: 'NGN 7.2M', phone: '+234 801 555 0102', openingTime: '10:00', closingTime: '20:00' },
  { client: 'Cape Town Autohaus', workshop: 'Claremont Service Bay', ceo: 'Johan Meyer', currency: 'ZAR', users: 21, revenue: 2700000, revenueText: 'ZAR 2.7M', phone: '+27 21 555 0198', openingTime: '10:00', closingTime: '20:00' },
  { client: 'Gaborone Fleet Centre', workshop: 'Main Fleet Workshop', ceo: 'Kabo Molefe', currency: 'BWP', users: 18, revenue: 840000, revenueText: 'BWP 840K', phone: '+267 71 555 900', openingTime: '10:00', closingTime: '20:00' },
  { client: 'Nairobi Elite Motors', workshop: 'Westlands Workshop', ceo: 'Mary Wanjiku', currency: 'KES', users: 26, revenue: 5100000, revenueText: 'KES 5.1M', phone: '+254 711 555 300', openingTime: '10:00', closingTime: '20:00' }
]

export const userTypes = [
  'Technician',
  'Workshop Controller',
  'Accounts',
  'Front Desk / Service Consultant',
  'Manager',
  'Parts Interpreter',
  'Parts Controller'
]

export const currencies = ['ZAR', 'NGN', 'BWP', 'NAD', 'USD', 'KES', 'GHS', 'MZN', 'ZMW', 'AUD']

export const moduleFunctions = [
  {
    module: 'Service Module',
    functions: ['Customer intake', 'Vehicle intake', 'Checklist templates', 'Job status board', 'Technician assignment', 'QC handoff']
  },
  {
    module: 'Paint & Panel Module',
    functions: ['Damage photos', 'Paint stage checklist', 'Panel repair tracking', 'Insurance quote support', 'Before/after media']
  },
  {
    module: 'Parts Interpreter',
    functions: ['Parts line items', 'Part availability status', 'Parts pricing', 'Waiting parts queue', 'Quote update to service consultant']
  },
  {
    module: 'Customer Approval Portal',
    functions: ['Secure web approval link', 'Approve/reject quote', 'Digital signature', 'Photo/video gallery', 'Approval history']
  },
  {
    module: 'Accounts & Payments',
    functions: ['Invoice generation', 'Cash/bank/mobile money/card tracking', 'Overdue/Due today/Paid colors', 'Payment summary', 'Export']
  },
  {
    module: 'Calendar & Capacity',
    functions: ['Appointment calendar', 'Daily job limit', 'Red over-capacity warning', 'Front desk scheduling']
  },
  {
    module: 'Reports & Analytics',
    functions: ['Jobs created/completed', 'Revenue', 'Technician performance', 'Pending approvals/payments', 'PDF/Excel export']
  },
  {
    module: 'Notifications',
    functions: ['WhatsApp updates', 'Email updates', 'Quote sent', 'Approval pending', 'Work started', 'Payment reminder']
  }
]


export const workshopUsers = [
  { client: 'Lagos Premium Motors', workshop: 'Ikeja Workshop', role: 'Technician', name: 'Technician 01', login: 'tech01@lagospremium.com', status: 'Active', lastLogin: '10 May 2026, 09:42', accountAge: '8 months' },
  { client: 'Lagos Premium Motors', workshop: 'Ikeja Workshop', role: 'Technician', name: 'Technician 02', login: 'tech02@lagospremium.com', status: 'Active', lastLogin: '10 May 2026, 08:10', accountAge: '8 months' },
  { client: 'Lagos Premium Motors', workshop: 'Ikeja Workshop', role: 'Workshop Controller', name: 'Controller 01', login: 'controller01@lagospremium.com', status: 'Active', lastLogin: '09 May 2026, 17:45', accountAge: '8 months' },
  { client: 'Lagos Premium Motors', workshop: 'Ikeja Workshop', role: 'Accounts', name: 'Accounts 01', login: 'accounts01@lagospremium.com', status: 'Inactive', lastLogin: '02 May 2026, 12:05', accountAge: '7 months' },
  { client: 'Lagos Premium Motors', workshop: 'Ikeja Workshop', role: 'Front Desk / Service Consultant', name: 'Service Consultant 01', login: 'frontdesk01@lagospremium.com', status: 'Active', lastLogin: '10 May 2026, 09:15', accountAge: '8 months' },
  { client: 'Lagos Premium Motors', workshop: 'Lekki Paint & Panel', role: 'Technician', name: 'Technician 03', login: 'tech03@lagospremium.com', status: 'Active', lastLogin: '09 May 2026, 15:22', accountAge: '6 months' },
  { client: 'Lagos Premium Motors', workshop: 'Lekki Paint & Panel', role: 'Manager', name: 'Manager 01', login: 'manager01@lagospremium.com', status: 'Blocked', lastLogin: '25 Apr 2026, 10:31', accountAge: '8 months' },
  { client: 'Lagos Premium Motors', workshop: 'Lekki Paint & Panel', role: 'Parts Interpreter', name: 'Parts Interpreter 01', login: 'parts01@lagospremium.com', status: 'Active', lastLogin: '10 May 2026, 07:52', accountAge: '8 months' },
  { client: 'Cape Town Autohaus', workshop: 'Claremont Service Bay', role: 'Technician', name: 'Sipho Ndlovu', login: 'sipho@ctautohaus.co.za', status: 'Active', lastLogin: '09 May 2026, 16:20', accountAge: '1 year' },
  { client: 'Cape Town Autohaus', workshop: 'Claremont Service Bay', role: 'Front Desk / Service Consultant', name: 'Amelia Jacobs', login: 'amelia@ctautohaus.co.za', status: 'Active', lastLogin: '09 May 2026, 15:55', accountAge: '1 year' },
  { client: 'Gaborone Fleet Centre', workshop: 'Main Fleet Workshop', role: 'Workshop Controller', name: 'Kabo Molefe', login: 'kabo@gaboronefleet.bw', status: 'Inactive', lastLogin: '12 Apr 2026, 11:08', accountAge: '5 months' },
  { client: 'Nairobi Elite Motors', workshop: 'Westlands Workshop', role: 'Accounts', name: 'Mary Wanjiku', login: 'mary@nairobiemotors.ke', status: 'Active', lastLogin: '08 May 2026, 13:05', accountAge: '3 months' }
]

export const accessRows = [
  { role: 'Front Desk', access: 'Customers, vehicles, jobs, calendar, customer link, payments handoff' },
  { role: 'Technician', access: 'Mobile job checklist, notes, media upload, issue raise, component replacement' },
  { role: 'Manager', access: 'QC, approvals, job board, technician performance, reports' },
  { role: 'Workshop Controller', access: 'Assign jobs, manage workshop board, monitor work progress' },
  { role: 'Accounts', access: 'Invoices, payments, overdue tracking, revenue reports' },
  { role: 'Parts Controller', access: 'Quote line items, parts pricing, waiting parts board, quotation update handoff' },
  { role: 'CEO', access: 'Executive dashboard, reports, revenue, performance, exports' }
]

export const jobs = [
  { id: 'AA-1024', customer: 'Amina Okafor', vehicle: 'Toyota Hilux', status: 'New', priority: 'Green', tech: 'Unassigned', amount: 'ZAR 0', progress: 5 },
  { id: 'AA-1025', customer: 'Musa Dlamini', vehicle: 'VW Polo', status: 'Accepted', priority: 'Amber', tech: 'S. Ndlovu', amount: 'ZAR 1,200', progress: 20 },
  { id: 'AA-1026', customer: 'Kwame Mensah', vehicle: 'Ford Ranger', status: 'In Progress', priority: 'Red', tech: 'T. Banda', amount: 'ZAR 4,800', progress: 62 },
  { id: 'AA-1027', customer: 'Zola Naidoo', vehicle: 'BMW X3', status: 'Waiting Approval', priority: 'Amber', tech: 'L. Moyo', amount: 'ZAR 2,800', progress: 45 },
  { id: 'AA-1028', customer: 'Chipo Phiri', vehicle: 'Isuzu D-Max', status: 'Waiting Parts', priority: 'Red', tech: 'R. Kone', amount: 'ZAR 7,400', progress: 40 },
  { id: 'AA-1029', customer: 'Nia Kamara', vehicle: 'Mercedes C200', status: 'Payment', priority: 'Green', tech: 'A. Diallo', amount: 'ZAR 5,600', progress: 90 },
  { id: 'AA-1030', customer: 'Peter Botha', vehicle: 'Nissan Navara', status: 'Completed', priority: 'Green', tech: 'S. Ndlovu', amount: 'ZAR 3,250', progress: 100 }
]

export const technicianChecklist = [
  { label: 'Vehicle intake photos', state: 'Completed', color: 'Green' },
  { label: 'Brake inspection', state: 'Failed component found', color: 'Red' },
  { label: 'Tyre pressure check', state: 'Good to go', color: 'Green' },
  { label: 'Suspension check', state: 'Should be done within 5000 km', color: 'Amber' }
]


export const workshopSchedule = {
  openingTime: '10:00',
  closingTime: '20:00',
  openingLabel: '10:00 AM',
  closingLabel: '8:00 PM',
  dailyJobLimit: 30
}

export const appointmentBookings = [
  { id: 'APT-1001', date: 11, time: '10:00', customer: 'Amina Okafor', vehicle: 'Toyota Hilux', service: 'Service intake', status: 'Confirmed' },
  { id: 'APT-1002', date: 11, time: '13:00', customer: 'Kwame Mensah', vehicle: 'Ford Ranger', service: 'Brake inspection', status: 'Waiting Approval' },
  { id: 'APT-1003', date: 12, time: '10:00', customer: 'Musa Dlamini', vehicle: 'VW Polo', service: 'Customer drop-off', status: 'Confirmed' },
  { id: 'APT-1004', date: 12, time: '11:00', customer: 'Zola Naidoo', vehicle: 'BMW X3', service: 'Diagnostic scan', status: 'Confirmed' },
  { id: 'APT-1005', date: 12, time: '14:00', customer: 'Chipo Phiri', vehicle: 'Isuzu D-Max', service: 'Parts quote review', status: 'Waiting Approval' },
  { id: 'APT-1006', date: 12, time: '17:00', customer: 'Nia Kamara', vehicle: 'Mercedes C200', service: 'Delivery handover', status: 'Confirmed' },
  { id: 'APT-1007', date: 13, time: '10:00', customer: 'Peter Botha', vehicle: 'Nissan Navara', service: 'Paint assessment', status: 'Confirmed' },
  { id: 'APT-1008', date: 13, time: '15:00', customer: 'Thandi Ncube', vehicle: 'Mazda CX-5', service: 'Insurance quotation', status: 'Waiting Approval' },
  { id: 'APT-1009', date: 14, time: '12:00', customer: 'Joseph Kone', vehicle: 'Kia Sportage', service: 'Vehicle collection', status: 'Confirmed' },
  { id: 'APT-1010', date: 15, time: '16:00', customer: 'Fatima Bello', vehicle: 'Hyundai Tucson', service: 'Customer approval call', status: 'Waiting Approval' },
  { id: 'APT-1011', date: 16, time: '10:00', customer: 'Samuel Abebe', vehicle: 'Toyota Prado', service: 'New job intake', status: 'Confirmed' }
]


export const quotationWorkItems = [
  {
    id: 'AA-Q-2048',
    createdAt: '12 May 2026, 10:20',
    customer: 'Amina Okafor',
    vehicle: 'Toyota Hilux',
    repairType: 'Brake Repair',
    request: 'Brake noise and vibration while stopping',
    frontDeskStatus: 'Awaiting internal updates',
    estimate: 'ZAR 3,080',
    roleStatus: {
      'Workshop Controller': 'Completed',
      Technician: 'In progress',
      'Parts Controller': 'Completed',
      'Parts Interpreter': 'Completed'
    }
  },
  {
    id: 'AA-Q-2049',
    createdAt: '12 May 2026, 11:05',
    customer: 'Musa Dlamini',
    vehicle: 'VW Polo',
    repairType: 'Major Service',
    request: 'Service due, oil leak check requested',
    frontDeskStatus: 'Awaiting internal updates',
    estimate: 'ZAR 2,450',
    roleStatus: {
      'Workshop Controller': 'Pending update',
      Technician: 'Pending update',
      'Parts Controller': 'In progress',
      'Parts Interpreter': 'In progress'
    }
  },
  {
    id: 'AA-Q-2050',
    createdAt: '12 May 2026, 12:30',
    customer: 'Zola Naidoo',
    vehicle: 'BMW X3',
    repairType: 'Paint & Panel',
    request: 'Front bumper repair and paint match',
    frontDeskStatus: 'Awaiting internal updates',
    estimate: 'ZAR 6,800',
    roleStatus: {
      'Workshop Controller': 'In progress',
      Technician: 'Completed',
      'Parts Controller': 'Pending update',
      'Parts Interpreter': 'Pending update'
    }
  }
]


export const approvedQuotations = [
  { id: 'AA-Q-2048', jobId: 'AA-1024', customer: 'Amina Okafor', vehicle: 'Toyota Hilux', amount: 'ZAR 3,080', paymentStatus: 'Due Today', paymentColor: 'amber', method: 'Mobile Money' },
  { id: 'AA-Q-2049', jobId: 'AA-1025', customer: 'Musa Dlamini', vehicle: 'VW Polo', amount: 'ZAR 2,450', paymentStatus: 'Overdue', paymentColor: 'red', method: 'Bank' },
  { id: 'AA-Q-2050', jobId: 'AA-1027', customer: 'Zola Naidoo', vehicle: 'BMW X3', amount: 'ZAR 6,800', paymentStatus: 'Part Paid', paymentColor: 'amber', method: 'Card' },
  { id: 'AA-Q-2051', jobId: 'AA-1029', customer: 'Nia Kamara', vehicle: 'Mercedes C200', amount: 'ZAR 5,600', paymentStatus: 'Paid', paymentColor: 'green', method: 'Cash' }
]

export const paymentRecords = [
  { id: 'PAY-3001', quoteId: 'AA-Q-2048', method: 'Mobile Money', status: 'Due Today', color: 'amber', reference: 'MM-120526-01' },
  { id: 'PAY-3002', quoteId: 'AA-Q-2049', method: 'Bank', status: 'Overdue', color: 'red', reference: 'BNK-PENDING' },
  { id: 'PAY-3003', quoteId: 'AA-Q-2050', method: 'Card', status: 'Part Paid', color: 'amber', reference: 'CARD-DEP-009' },
  { id: 'PAY-3004', quoteId: 'AA-Q-2051', method: 'Cash', status: 'Paid', color: 'green', reference: 'CASH-7781' }
]

export const partLineItems = [
  { oldPart: 'Front brake pad set', replacementPart: 'OEM brake pad kit', price: 'ZAR 980', eta: 'Available today', replacementTime: '1.5 hours' },
  { oldPart: 'Brake disc left', replacementPart: 'Ventilated disc', price: 'ZAR 1,250', eta: 'Supplier ETA 1 day', replacementTime: '1 hour' },
  { oldPart: 'Brake disc right', replacementPart: 'Ventilated disc', price: 'ZAR 1,250', eta: 'Supplier ETA 1 day', replacementTime: '1 hour' }
]

export const completedJobNotifications = [
  { jobId: 'AA-1030', customer: 'Peter Botha', vehicle: 'Nissan Navara', preference: 'Collection', channel: 'WhatsApp', message: 'Your Nissan Navara is complete and ready for collection at the service desk.' },
  { jobId: 'AA-1029', customer: 'Nia Kamara', vehicle: 'Mercedes C200', preference: 'Delivery', channel: 'Email', message: 'Your Mercedes C200 work is complete. Our team will arrange delivery as requested.' }
]


export const serviceModules = [
  {
    id: 'service-major',
    name: 'Major Service',
    module: 'Service Module',
    defaultPricingMode: 'Standard price',
    standardPrice: 'ZAR 2,450',
    customPrice: 'ZAR 2,650',
    duration: '4 hours',
    checklist: [
      { item: 'Engine oil and filter replacement', required: true, priceMode: 'Standard price', price: 'ZAR 680' },
      { item: 'Brake inspection and road test', required: true, priceMode: 'Standard price', price: 'ZAR 420' },
      { item: 'Suspension and steering check', required: true, priceMode: 'Custom price', price: 'ZAR 550' },
      { item: 'Diagnostic scan report', required: false, priceMode: 'Standard price', price: 'ZAR 300' }
    ]
  },
  {
    id: 'brake-repair',
    name: 'Brake Repair',
    module: 'Service Module',
    defaultPricingMode: 'Custom price',
    standardPrice: 'ZAR 3,080',
    customPrice: 'ZAR 3,450',
    duration: '3 hours',
    checklist: [
      { item: 'Capture failed component photos', required: true, priceMode: 'Standard price', price: 'ZAR 0' },
      { item: 'Measure brake pad and disc wear', required: true, priceMode: 'Standard price', price: 'ZAR 350' },
      { item: 'Replace brake pads', required: true, priceMode: 'Custom price', price: 'ZAR 980' },
      { item: 'Final road test and sign-off', required: true, priceMode: 'Standard price', price: 'ZAR 280' }
    ]
  },
  {
    id: 'paint-panel',
    name: 'Paint & Panel Repair',
    module: 'Paint & Panel Module',
    defaultPricingMode: 'Standard price',
    standardPrice: 'ZAR 6,800',
    customPrice: 'ZAR 7,250',
    duration: '2 days',
    checklist: [
      { item: 'Damage intake photos and videos', required: true, priceMode: 'Standard price', price: 'ZAR 0' },
      { item: 'Panel preparation', required: true, priceMode: 'Standard price', price: 'ZAR 1,800' },
      { item: 'Paint matching approval', required: true, priceMode: 'Custom price', price: 'ZAR 2,200' },
      { item: 'Before and after media gallery', required: false, priceMode: 'Standard price', price: 'ZAR 250' }
    ]
  }
]

export const approvalReminderRules = [
  { id: 'REM-001', workshop: 'Ikeja Workshop', quoteId: 'AA-Q-2049', customer: 'Musa Dlamini', channel: 'WhatsApp', firstReminder: '2 hours after quote sent', repeat: 'Every 24 hours', maxAttempts: 3, status: 'Active' },
  { id: 'REM-002', workshop: 'Claremont Service Bay', quoteId: 'AA-Q-2050', customer: 'Zola Naidoo', channel: 'Email', firstReminder: 'Next morning 09:00', repeat: 'Every 48 hours', maxAttempts: 2, status: 'Paused' },
  { id: 'REM-003', workshop: 'Westlands Workshop', quoteId: 'AA-Q-2052', customer: 'Fatima Bello', channel: 'WhatsApp + Email', firstReminder: '4 hours after quote sent', repeat: 'Daily at 10:00', maxAttempts: 4, status: 'Active' }
]

'use strict'

/**
 * Autiq Africa — Database Seed
 *
 * Creates:
 *  - Platform roles
 *  - Platform modules
 *  - Service templates
 *  - Enterprise admin users (Hiral + Support Admin)
 *  - Demo client + demo workshop
 *  - One workshop user per role (production emails, all password: Autiq@2026)
 *
 * Idempotent: safe to run multiple times.
 * Run: npm run db:seed  (from backend/)
 */

require('dotenv').config()

const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function hash(plain) {
  return bcrypt.hash(plain, 12)
}

async function main() {
  console.log('\n🌱  Seeding Autiq Africa database...\n')

  // ── 1. Roles ──────────────────────────────────────────────────────────────────
  const roleDefs = [
    { name: 'Enterprise Admin',    code: 'ENTERPRISE_ADMIN',    description: 'Platform-level super admin. Access to all SaaS controls.' },
    { name: 'Support Admin',       code: 'SUPPORT_ADMIN',       description: 'Platform support access for client help desk.' },
    { name: 'Front Desk',          code: 'FRONT_DESK',          description: 'Service consultant, customer intake, quotations, approvals.' },
    { name: 'Manager',             code: 'MANAGER',             description: 'Workshop manager, job board overview, scheduling.' },
    { name: 'Technician',          code: 'TECHNICIAN',          description: 'Technician, quotation updates, job progress.' },
    { name: 'Workshop Controller', code: 'WORKSHOP_CONTROLLER', description: 'Workshop controller, job assignment, quality checks.' },
    { name: 'Parts Interpreter',   code: 'PARTS_INTERPRETER',   description: 'Parts sourcing, pricing, availability tracking.' },
    { name: 'Accounts',            code: 'ACCOUNTS',            description: 'Accounts, invoicing, payments, financial reports.' },
    { name: 'CEO',                 code: 'CEO',                 description: 'Executive overview, reports, business analytics.' },
  ]

  const roleMap = {}
  for (const r of roleDefs) {
    const role = await prisma.role.upsert({
      where:  { code: r.code },
      update: { name: r.name, description: r.description },
      create: r,
    })
    roleMap[r.code] = role.id
  }
  console.log(`  ✓ ${roleDefs.length} roles`)

  // ── 2. Modules ────────────────────────────────────────────────────────────────
  const modules = [
    { name: 'Service Module',           description: 'Customer intake, vehicle intake, checklist, job status, technician assignment, QC handoff',                                      isOptional: false },
    { name: 'Paint & Panel Module',     description: 'Damage photos, paint stage checklist, panel repair tracking, insurance quote support, before/after media',                       isOptional: true  },
    { name: 'Parts Interpreter',        description: 'Parts line items, availability status, pricing, waiting queue, quote update to service consultant',                              isOptional: true  },
    { name: 'Customer Approval Portal', description: 'Secure web approval link, approve/reject quote, digital signature, photo/video gallery, approval history',                       isOptional: false },
    { name: 'Accounts & Payments',      description: 'Invoice generation, cash/bank/mobile money/card tracking, overdue/due/paid colours, payment summary, export',                   isOptional: false },
    { name: 'Calendar & Job Capacity',  description: 'Appointment calendar, daily job limit, red over-capacity warning, front desk scheduling',                                        isOptional: false },
    { name: 'Reports & Analytics',      description: 'Jobs created/completed, revenue, technician performance, pending approvals/payments, PDF/Excel export',                          isOptional: false },
    { name: 'WhatsApp Notifications',   description: 'WhatsApp updates: quote sent, approval pending, work started, payment reminder',                                                 isOptional: true  },
    { name: 'Email Notifications',      description: 'Email updates: quote sent, approval pending, work started, payment reminder',                                                    isOptional: true  },
  ]

  for (const m of modules) {
    await prisma.module.upsert({ where: { name: m.name }, update: { description: m.description }, create: m })
  }
  console.log(`  ✓ ${modules.length} modules`)

  // ── 3. Service Templates ──────────────────────────────────────────────────────
  const serviceTemplates = [
    {
      name: 'Major Service',
      module: 'Service Module',
      defaultPricingMode: 'StandardPrice',
      duration: '4 hours',
      checklistTemplates: {
        create: [
          { item: 'Engine oil and filter replacement', isRequired: true,  priceMode: 'StandardPrice', standardPrice: 680,  currency: 'ZAR', sortOrder: 1 },
          { item: 'Brake inspection and road test',    isRequired: true,  priceMode: 'StandardPrice', standardPrice: 420,  currency: 'ZAR', sortOrder: 2 },
          { item: 'Suspension and steering check',     isRequired: true,  priceMode: 'CustomPrice',   standardPrice: 550,  currency: 'ZAR', sortOrder: 3 },
          { item: 'Diagnostic scan report',            isRequired: false, priceMode: 'StandardPrice', standardPrice: 300,  currency: 'ZAR', sortOrder: 4 },
        ],
      },
      servicePricing: {
        create: [{ currency: 'ZAR', standardPrice: 2450, customPrice: 2650, allowCustomOverride: true, taxIncluded: true }],
      },
    },
    {
      name: 'Brake Repair',
      module: 'Service Module',
      defaultPricingMode: 'CustomPrice',
      duration: '3 hours',
      checklistTemplates: {
        create: [
          { item: 'Capture failed component photos',   isRequired: true, priceMode: 'StandardPrice', standardPrice: 0,   currency: 'ZAR', sortOrder: 1 },
          { item: 'Measure brake pad and disc wear',   isRequired: true, priceMode: 'StandardPrice', standardPrice: 350, currency: 'ZAR', sortOrder: 2 },
          { item: 'Replace brake pads',                isRequired: true, priceMode: 'CustomPrice',   standardPrice: 980, currency: 'ZAR', sortOrder: 3 },
          { item: 'Final road test and sign-off',      isRequired: true, priceMode: 'StandardPrice', standardPrice: 280, currency: 'ZAR', sortOrder: 4 },
        ],
      },
      servicePricing: {
        create: [{ currency: 'ZAR', standardPrice: 3080, customPrice: 3450, allowCustomOverride: true, taxIncluded: true }],
      },
    },
    {
      name: 'Paint & Panel Repair',
      module: 'Paint & Panel Module',
      defaultPricingMode: 'StandardPrice',
      duration: '2 days',
      checklistTemplates: {
        create: [
          { item: 'Damage intake photos and videos', isRequired: true,  priceMode: 'StandardPrice', standardPrice: 0,    currency: 'ZAR', sortOrder: 1 },
          { item: 'Panel preparation',               isRequired: true,  priceMode: 'StandardPrice', standardPrice: 1800, currency: 'ZAR', sortOrder: 2 },
          { item: 'Paint matching approval',         isRequired: true,  priceMode: 'CustomPrice',   standardPrice: 2200, currency: 'ZAR', sortOrder: 3 },
          { item: 'Before and after media gallery',  isRequired: false, priceMode: 'StandardPrice', standardPrice: 250,  currency: 'ZAR', sortOrder: 4 },
        ],
      },
      servicePricing: {
        create: [{ currency: 'ZAR', standardPrice: 6800, customPrice: 7250, allowCustomOverride: true, taxIncluded: true }],
      },
    },
  ]

  for (const t of serviceTemplates) {
    const existing = await prisma.serviceTemplate.findFirst({ where: { name: t.name } })
    if (!existing) await prisma.serviceTemplate.create({ data: t })
  }
  console.log(`  ✓ ${serviceTemplates.length} service templates`)

  // ── 4. Enterprise Admin Users ─────────────────────────────────────────────────
  const enterpriseAdmins = [
    { name: 'Hiral Jivan',   role: 'Enterprise Admin', loginEmail: 'hiraljivan@autiqafrica.com',    email: 'hiraljivan@autiqafrica.com' },
    { name: 'Support Admin', role: 'Support Admin',    loginEmail: 'support.admin@autiqafrica.com', email: 'support.admin@autiqafrica.com' },
  ]

  for (const a of enterpriseAdmins) {
    const pwd = await hash('Autiq@2026')
    const count = await prisma.enterpriseAdmin.count()
    await prisma.enterpriseAdmin.upsert({
      where:  { loginEmail: a.loginEmail },
      update: { passwordHash: pwd, status: 'Active', role: a.role },
      create: {
        adminCode:    `ADM-${String(count + 1).padStart(3, '0')}`,
        name:         a.name,
        role:         a.role,
        email:        a.email,
        loginEmail:   a.loginEmail,
        passwordHash: pwd,
        status:       'Active',
        clientId:     null,
      },
    })
    console.log(`  ✓ ${a.role.padEnd(20)}  →  ${a.loginEmail} / Autiq@2026`)
  }

  // ── 5. Demo Client ────────────────────────────────────────────────────────────
  let client = await prisma.client.findFirst({ where: { name: 'Demo Dealer Group' } })
  if (!client) {
    client = await prisma.client.create({
      data: {
        name:            'Demo Dealer Group',
        country:         'South Africa',
        defaultCurrency: 'ZAR',
        status:          'Active',
      },
    })
  }
  console.log(`  ✓ Client  →  "${client.name}" (${client.id})`)

  // ── 6. Demo Workshop ──────────────────────────────────────────────────────────
  let workshop = await prisma.workshop.findFirst({ where: { name: 'Demo Workshop' } })
  if (!workshop) {
    const wsCount = await prisma.workshop.count()
    workshop = await prisma.workshop.create({
      data: {
        clientId:        client.id,
        name:            'Demo Workshop',
        type:            'Service',
        workshopCode:    `WS-${String(wsCount + 1).padStart(4, '0')}`,
        address:         '1 Demo Street, Cape Town, 8001',
        phone:           '+27 21 000 0001',
        currency:        'ZAR',
        openingTime:     '08:00',
        closingTime:     '17:00',
        dailyJobLimit:   20,
        ceoName:         'Demo CEO',
        ceoEmail:        'ceo@autiqafrica.com',
        city:            'Cape Town',
        workshopCountry: 'South Africa',
        status:          'Active',
      },
    })
  }
  console.log(`  ✓ Workshop  →  "${workshop.name}" (${workshop.id})`)

  // ── 7. Workshop Users — one per role (production emails) ──────────────────────
  const workshopUsers = [
    { name: 'Front Desk User',     loginEmail: 'frontdesk@autiqafrica.com',           roleEnum: 'FrontDesk',          roleCode: 'FRONT_DESK'          },
    { name: 'Manager User',        loginEmail: 'manager@autiqafrica.com',             roleEnum: 'Manager',            roleCode: 'MANAGER'             },
    { name: 'Technician User',     loginEmail: 'technician@autiqafrica.com',          roleEnum: 'Technician',         roleCode: 'TECHNICIAN'          },
    { name: 'Workshop Controller', loginEmail: 'workshop.controller@autiqafrica.com', roleEnum: 'WorkshopController', roleCode: 'WORKSHOP_CONTROLLER' },
    { name: 'Parts Interpreter',   loginEmail: 'parts.interpreter@autiqafrica.com',   roleEnum: 'PartsInterpreter',   roleCode: 'PARTS_INTERPRETER'   },
    { name: 'Accounts User',       loginEmail: 'accounts@autiqafrica.com',            roleEnum: 'Accounts',           roleCode: 'ACCOUNTS'            },
    { name: 'CEO User',            loginEmail: 'ceo@autiqafrica.com',                 roleEnum: 'CEO',                roleCode: 'CEO'                 },
  ]

  for (const u of workshopUsers) {
    const pwd = await hash('Autiq@2026')
    await prisma.user.upsert({
      where:  { loginEmail: u.loginEmail },
      update: { passwordHash: pwd, status: 'Active', roleId: roleMap[u.roleCode] },
      create: {
        workshopId:   workshop.id,
        name:         u.name,
        loginEmail:   u.loginEmail,
        passwordHash: pwd,
        role:         u.roleEnum,
        roleId:       roleMap[u.roleCode],
        status:       'Active',
      },
    })
    console.log(`  ✓ ${u.roleCode.padEnd(22)}  →  ${u.loginEmail} / Autiq@2026`)
  }

  // ── 8. Legacy demo users (demo.autiq) — kept for backward compat ──────────────
  const legacyUsers = [
    { name: 'Demo Front Desk',          loginEmail: 'frontdesk@demo.autiq',   roleEnum: 'FrontDesk',          roleCode: 'FRONT_DESK' },
    { name: 'Demo Technician',          loginEmail: 'technician@demo.autiq',  roleEnum: 'Technician',         roleCode: 'TECHNICIAN' },
    { name: 'Demo Manager',             loginEmail: 'manager@demo.autiq',     roleEnum: 'Manager',            roleCode: 'MANAGER' },
    { name: 'Demo Workshop Controller', loginEmail: 'controller@demo.autiq',  roleEnum: 'WorkshopController', roleCode: 'WORKSHOP_CONTROLLER' },
    { name: 'Demo Accounts',            loginEmail: 'accounts@demo.autiq',    roleEnum: 'Accounts',           roleCode: 'ACCOUNTS' },
    { name: 'Demo Parts Interpreter',   loginEmail: 'partsinterp@demo.autiq', roleEnum: 'PartsInterpreter',   roleCode: 'PARTS_INTERPRETER' },
    { name: 'Demo CEO',                 loginEmail: 'ceo@demo.autiq',         roleEnum: 'CEO',                roleCode: 'CEO' },
  ]

  for (const u of legacyUsers) {
    const pwd = await hash('Autiq@2026')
    await prisma.user.upsert({
      where:  { loginEmail: u.loginEmail },
      update: { passwordHash: pwd, status: 'Active', roleId: roleMap[u.roleCode] },
      create: {
        workshopId:   workshop.id,
        name:         u.name,
        loginEmail:   u.loginEmail,
        passwordHash: pwd,
        role:         u.roleEnum,
        roleId:       roleMap[u.roleCode],
        status:       'Active',
      },
    })
  }
  console.log(`  ✓ ${legacyUsers.length} legacy demo users updated`)

  console.log('\n✅  Seed complete.\n')
  console.log('Production credentials (all password: Autiq@2026):')
  console.log('  Enterprise Admin    →  hiraljivan@autiqafrica.com')
  console.log('  Support Admin       →  support.admin@autiqafrica.com')
  console.log('  Front Desk          →  frontdesk@autiqafrica.com')
  console.log('  Manager             →  manager@autiqafrica.com')
  console.log('  Technician          →  technician@autiqafrica.com')
  console.log('  Workshop Controller →  workshop.controller@autiqafrica.com')
  console.log('  Parts Interpreter   →  parts.interpreter@autiqafrica.com')
  console.log('  Accounts            →  accounts@autiqafrica.com')
  console.log('  CEO                 →  ceo@autiqafrica.com\n')
}

main()
  .catch((e) => {
    console.error('\n❌  Seed error:', e.message)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

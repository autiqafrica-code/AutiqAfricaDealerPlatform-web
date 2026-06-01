'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { hashPassword, generateTempPassword } = require('../utils/passwordGenerator')
const { adminCode } = require('../utils/idGenerator')
const { getPagination, paginate } = require('../utils/pagination')
const notifications = require('../services/notifications.service')
const { onboardingEmail } = require('../utils/emailTemplates')

// ── Dashboard stats ──────────────────────────────────────────────────────────

async function getDashboardStats(req, res, next) {
  try {
    const now            = new Date()
    const thirtyDaysAgo  = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const sevenDaysAgo   = new Date(Date.now() - 7  * 24 * 60 * 60 * 1000)
    const startOfMonth   = new Date(now.getFullYear(), now.getMonth(), 1)

    const [
      activeClients,
      totalClients,
      activeWorkshops,
      activeUsers,
      totalLogins,
      failedLogins,
      pendingApprovals,
      activeJobs,
      completedThisMonth,
      newClientsThisMonth,
      paymentsThisMonth,
      recentClients,
    ] = await Promise.all([
      prisma.client.count({ where: { deletedAt: null, status: 'Active' } }),
      prisma.client.count({ where: { deletedAt: null } }),
      prisma.workshop.count({ where: { deletedAt: null, status: 'Active' } }),
      prisma.user.count({ where: { deletedAt: null, status: 'Active' } }),
      prisma.loginActivity.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.loginActivity.count({ where: { loginStatus: 'Failed', createdAt: { gte: sevenDaysAgo } } }),
      prisma.quotation.count({ where: { status: 'SentToCustomer' } }),
      // Active = anything that is not a terminal status (Completed or PaymentCleared)
      prisma.jobCard.count({ where: { status: { notIn: ['Completed', 'PaymentCleared'] } } }),
      // Completed this calendar month — completedAt gte already excludes null
      prisma.jobCard.count({
        where: { status: 'Completed', completedAt: { gte: startOfMonth } },
      }),
      prisma.client.count({ where: { deletedAt: null, createdAt: { gte: startOfMonth } } }),
      // PaymentStatus enum: DueToday | Overdue | PartPaid | Paid
      prisma.payment.count({ where: { status: 'Paid', paidAt: { gte: startOfMonth } } }),
      prisma.client.findMany({
        where: { deletedAt: null },
        select: {
          id: true, name: true, country: true, status: true,
          defaultCurrency: true, createdAt: true,
          _count: { select: { workshops: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
      }),
    ])

    return success(res, {
      activeClients,
      totalClients,
      activeWorkshops,
      activeUsers,
      totalLogins,
      failedLogins,
      pendingApprovals,
      activeJobs,
      completedThisMonth,
      newClientsThisMonth,
      paymentsThisMonth,
      recentClients,
    })
  } catch (e) { next(e) }
}

// ── Login activity ───────────────────────────────────────────────────────────

async function listLoginActivity(req, res, next) {
  try {
    const { clientId, workshopId, loginStatus } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = {}
    if (loginStatus) where.loginStatus = loginStatus

    const activities = await prisma.loginActivity.findMany({
      where,
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true, name: true, role: true, status: true, loginEmail: true, createdAt: true, lastLoginAt: true,
            workshop: {
              select: {
                id: true, name: true,
                client: { select: { id: true, name: true } },
              },
            },
          },
        },
        enterpriseAdmin: {
          select: { id: true, name: true, role: true, adminCode: true, status: true, loginEmail: true, createdAt: true, lastLoginAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    let filtered = activities
    if (clientId) {
      filtered = filtered.filter(a => a.user?.workshop?.client?.id === clientId)
    }
    if (workshopId) {
      filtered = filtered.filter(a => a.user?.workshop?.id === workshopId)
    }

    const total = await prisma.loginActivity.count({ where })
    return success(res, paginate(filtered, total, page, limit))
  } catch (e) { next(e) }
}

// ── List all workshop users (enterprise view) ────────────────────────────────

async function listAllUsers(req, res, next) {
  try {
    const { clientId, workshopId, status, role, search } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { deletedAt: null }
    if (workshopId) {
      where.workshopId = workshopId
    } else if (clientId) {
      const workshops = await prisma.workshop.findMany({
        where: { clientId, deletedAt: null },
        select: { id: true },
      })
      where.workshopId = { in: workshops.map(w => w.id) }
    }
    if (status) where.status = status
    if (role) where.role = role
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { loginEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true, name: true, role: true, loginEmail: true, phone: true,
          status: true, lastLoginAt: true, createdAt: true,
          workshop: {
            select: {
              id: true, name: true,
              client: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    return success(res, paginate(users, total, page, limit))
  } catch (e) { next(e) }
}

// ── Modules ──────────────────────────────────────────────────────────────────

async function listModules(req, res, next) {
  try {
    const modules = await prisma.module.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    })
    return success(res, { modules })
  } catch (e) { next(e) }
}

// ── Revenue analytics ────────────────────────────────────────────────────────

async function getRevenue(req, res, next) {
  try {
    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      include: {
        workshops: {
          where: { deletedAt: null },
          include: { _count: { select: { users: { where: { deletedAt: null } } } } },
        },
        clientModules: {
          where: { isEnabled: true },
          include: { module: { select: { name: true } } },
        },
      },
      orderBy: { name: 'asc' },
    })

    const clientResults = await Promise.all(clients.map(async (client) => {
      const workshopResults = await Promise.all(client.workshops.map(async (ws) => {
        const agg = await prisma.payment.aggregate({
          where: { invoice: { quotation: { workshopId: ws.id } } },
          _sum: { amountReceived: true },
        })
        const revenue = Number(agg._sum.amountReceived || 0)
        return {
          id: ws.id,
          client: client.name,
          workshop: ws.name,
          ceo: ws.ceoName || '',
          users: ws._count.users,
          phone: ws.phone || '',
          currency: ws.currency,
          revenue,
          revenueText: `${ws.currency} ${revenue.toLocaleString()}`,
        }
      }))

      const totalRevenue = workshopResults.reduce((s, w) => s + w.revenue, 0)
      return {
        id: client.id,
        name: client.name,
        country: client.country,
        currency: client.defaultCurrency,
        modules: client.clientModules.map(m => m.module.name).join(', ') || 'None',
        revenue: totalRevenue,
        revenueText: `${client.defaultCurrency} ${totalRevenue.toLocaleString()}`,
        workshops: workshopResults,
      }
    }))

    return success(res, { clients: clientResults })
  } catch (e) { next(e) }
}

// ── Data export ──────────────────────────────────────────────────────────────

async function getExportData(req, res, next) {
  try {
    const { workshopId, clientId } = req.query
    const wsWhere = { deletedAt: null }
    if (workshopId)      wsWhere.id       = workshopId
    else if (clientId)   wsWhere.clientId = clientId

    const workshops = await prisma.workshop.findMany({
      where: wsWhere,
      include: {
        client: { select: { id: true, name: true, country: true } },
        _count: { select: { users: true, customers: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    const wsIds = workshops.map(w => w.id)

    const [users, customers, jobs, quotations, payments] = await Promise.all([
      prisma.user.findMany({
        where: { workshopId: { in: wsIds }, deletedAt: null },
        select: {
          name: true, loginEmail: true, role: true, phone: true, status: true,
          lastLoginAt: true, createdAt: true,
          workshop: { select: { name: true, client: { select: { name: true } } } },
        },
        orderBy: { createdAt: 'asc' },
        take: 5000,
      }),
      prisma.customer.findMany({
        where: { workshopId: { in: wsIds }, deletedAt: null },
        select: {
          name: true, phone: true, email: true, status: true, createdAt: true,
          workshop: { select: { name: true, client: { select: { name: true } } } },
          _count: { select: { vehicles: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 5000,
      }),
      prisma.jobCard.findMany({
        where: { workshopId: { in: wsIds }, deletedAt: null },
        select: {
          jobNumber: true, status: true, priority: true,
          createdAt: true, completedAt: true,
          workshop: { select: { name: true, client: { select: { name: true } } } },
          quotation: {
            select: {
              quoteNumber: true, totalEstimate: true, currency: true, repairType: true,
              customer: { select: { name: true, phone: true } },
              vehicle:  { select: { registrationNo: true, makeModel: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      prisma.quotation.findMany({
        where: { workshopId: { in: wsIds }, deletedAt: null },
        select: {
          quoteNumber: true, status: true, totalEstimate: true, currency: true,
          repairType: true, priority: true, createdAt: true, approvedAt: true,
          workshop:  { select: { name: true, client: { select: { name: true } } } },
          customer:  { select: { name: true, phone: true } },
          vehicle:   { select: { registrationNo: true, makeModel: true } },
          createdBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
      prisma.payment.findMany({
        where: { invoice: { quotation: { workshopId: { in: wsIds } } } },
        select: {
          paymentCode: true, method: true, amountReceived: true, currency: true,
          referenceNumber: true, status: true, paidAt: true, createdAt: true,
          invoice: {
            select: {
              quotation: {
                select: {
                  quoteNumber: true,
                  workshop: { select: { name: true, client: { select: { name: true } } } },
                  customer:  { select: { name: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 2000,
      }),
    ])

    return success(res, {
      workshops: workshops.map(w => ({
        name: w.name, client: w.client.name, country: w.client.country,
        type: w.type, currency: w.currency, phone: w.phone || '',
        email: w.email || '', status: w.status,
        users: w._count.users, customers: w._count.customers,
        createdAt: w.createdAt,
      })),
      users,
      customers,
      jobs,
      quotations,
      payments,
      totals: {
        workshops:  workshops.length,
        users:      users.length,
        customers:  customers.length,
        jobs:       jobs.length,
        quotations: quotations.length,
        payments:   payments.length,
      },
    })
  } catch (e) { next(e) }
}

// ── Enterprise Admin management ──────────────────────────────────────────────

async function listAdmins(req, res, next) {
  try {
    const { search, status } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { deletedAt: null }
    if (status) where.status = status
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { loginEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [admins, total] = await Promise.all([
      prisma.enterpriseAdmin.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true, adminCode: true, name: true, role: true,
          email: true, loginEmail: true, status: true,
          lastLoginAt: true, createdAt: true,
        },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.enterpriseAdmin.count({ where }),
    ])

    return success(res, paginate(admins, total, page, limit))
  } catch (e) { next(e) }
}

async function createAdmin(req, res, next) {
  try {
    const { name, email, loginEmail, role, password, status } = req.body

    if (!name?.trim())       return badRequest(res, 'Name is required')
    if (!email?.trim())      return badRequest(res, 'Email is required')
    if (!loginEmail?.trim()) return badRequest(res, 'Login email is required')

    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRe.test(email))      return badRequest(res, 'Valid email required')
    if (!emailRe.test(loginEmail)) return badRequest(res, 'Valid login email required')

    const conflict = await prisma.enterpriseAdmin.findFirst({
      where: {
        OR: [
          { email: email.trim().toLowerCase() },
          { loginEmail: loginEmail.trim().toLowerCase() },
        ],
        deletedAt: null,
      },
    })
    if (conflict) return badRequest(res, 'An admin with this email or login email already exists')

    const count = await prisma.enterpriseAdmin.count()
    const code  = adminCode(count + 1)

    const plainPassword = password || generateTempPassword('Admin', count + 1)
    const passwordHash  = await hashPassword(plainPassword)

    const admin = await prisma.enterpriseAdmin.create({
      data: {
        adminCode:   code,
        name:        name.trim(),
        email:       email.trim().toLowerCase(),
        loginEmail:  loginEmail.trim().toLowerCase(),
        role:        role || 'Enterprise Admin',
        passwordHash,
        status:      status || 'Active',
      },
      select: {
        id: true, adminCode: true, name: true, role: true,
        email: true, loginEmail: true, status: true, createdAt: true,
      },
    })

    return created(res, { admin, tempPassword: plainPassword }, 'Admin user created')
  } catch (e) { next(e) }
}

async function getAdmin(req, res, next) {
  try {
    const admin = await prisma.enterpriseAdmin.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: {
        id: true, adminCode: true, name: true, role: true,
        email: true, loginEmail: true, status: true,
        lastLoginAt: true, createdAt: true,
      },
    })
    if (!admin) return notFound(res, 'Admin not found')
    return success(res, { admin })
  } catch (e) { next(e) }
}

async function updateAdmin(req, res, next) {
  try {
    const { name, email, loginEmail, role } = req.body
    const admin = await prisma.enterpriseAdmin.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!admin) return notFound(res, 'Admin not found')

    if (email && email.toLowerCase() !== admin.email) {
      const conflict = await prisma.enterpriseAdmin.findFirst({
        where: { email: email.trim().toLowerCase(), NOT: { id: req.params.id }, deletedAt: null },
      })
      if (conflict) return badRequest(res, 'Email already in use by another admin')
    }

    if (loginEmail && loginEmail.toLowerCase() !== admin.loginEmail) {
      const conflict = await prisma.enterpriseAdmin.findFirst({
        where: { loginEmail: loginEmail.trim().toLowerCase(), NOT: { id: req.params.id }, deletedAt: null },
      })
      if (conflict) return badRequest(res, 'Login email already in use by another admin')
    }

    const updated = await prisma.enterpriseAdmin.update({
      where: { id: req.params.id },
      data: {
        ...(name      && { name:      name.trim() }),
        ...(email     && { email:     email.trim().toLowerCase() }),
        ...(loginEmail && { loginEmail: loginEmail.trim().toLowerCase() }),
        ...(role      && { role }),
      },
      select: {
        id: true, adminCode: true, name: true, role: true,
        email: true, loginEmail: true, status: true,
        lastLoginAt: true, createdAt: true,
      },
    })
    return success(res, { admin: updated })
  } catch (e) { next(e) }
}

async function updateAdminStatus(req, res, next) {
  try {
    const { status } = req.body
    if (!['Active', 'Inactive', 'Blocked'].includes(status)) {
      return badRequest(res, 'Invalid status. Must be Active, Inactive, or Blocked')
    }

    const admin = await prisma.enterpriseAdmin.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!admin) return notFound(res, 'Admin not found')

    const updated = await prisma.enterpriseAdmin.update({
      where: { id: req.params.id },
      data: { status },
      select: { id: true, adminCode: true, name: true, status: true },
    })
    return success(res, { admin: updated })
  } catch (e) { next(e) }
}

async function resetAdminPassword(req, res, next) {
  try {
    const { newPassword } = req.body
    const admin = await prisma.enterpriseAdmin.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!admin) return notFound(res, 'Admin not found')

    const plainPassword = newPassword || generateTempPassword('Admin', 1)
    const passwordHash  = await hashPassword(plainPassword)

    await prisma.enterpriseAdmin.update({ where: { id: req.params.id }, data: { passwordHash } })
    return success(res, { tempPassword: plainPassword }, 'Password reset successfully')
  } catch (e) { next(e) }
}

async function deleteAdmin(req, res, next) {
  try {
    const admin = await prisma.enterpriseAdmin.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!admin) return notFound(res, 'Admin not found')

    const activeCount = await prisma.enterpriseAdmin.count({ where: { status: 'Active', deletedAt: null } })
    if (activeCount <= 1 && admin.status === 'Active') {
      return badRequest(res, 'Cannot delete the last active enterprise admin')
    }

    await prisma.enterpriseAdmin.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), status: 'Inactive' },
    })
    return success(res, {}, 'Admin deleted')
  } catch (e) { next(e) }
}

async function sendOnboardingEmail(req, res, next) {
  try {
    const { clientId, recipientEmail, cc, customBody } = req.body

    if (!recipientEmail?.trim()) return badRequest(res, 'recipientEmail is required')

    let clientName = null
    if (clientId) {
      const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } })
      if (client) clientName = client.name
    }

    const loginUrl = (process.env.FRONTEND_URL || 'http://localhost:5173') + '/login'

    const emailResult = await notifications.sendEmail({
      to:      recipientEmail.trim(),
      cc:      cc?.trim() || undefined,
      subject: `Welcome to Autiq Africa${clientName ? ` — ${clientName}` : ''}: Your workspace is ready`,
      html:    onboardingEmail({ clientName, loginUrl, customBody }),
      type:    'Onboarding',
    })

    return success(res, {
      recipientEmail: recipientEmail.trim(),
      clientName,
      emailStatus:  emailResult.status,
      message: emailResult.status === 'sent'
        ? `Onboarding email sent to ${recipientEmail.trim()}`
        : `Email ${emailResult.status}: ${emailResult.reason || ''}`,
    }, 'Onboarding email processed')
  } catch (e) { next(e) }
}

module.exports = {
  getDashboardStats,
  listLoginActivity,
  listAllUsers,
  listModules,
  getRevenue,
  getExportData,
  listAdmins,
  createAdmin,
  getAdmin,
  updateAdmin,
  updateAdminStatus,
  resetAdminPassword,
  deleteAdmin,
  sendOnboardingEmail,
}

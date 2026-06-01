'use strict'

const prisma = require('../config/db')
const { success } = require('../utils/apiResponse')

// ── Period helpers ────────────────────────────────────────────────────────────

function getPeriodDates(period, startDate, endDate) {
  if (period === 'custom' && startDate && endDate) {
    const start = new Date(startDate)
    const end   = new Date(endDate)
    end.setDate(end.getDate() + 1) // include the full end day
    if (!isNaN(start.getTime()) && !isNaN(end.getTime()) && start < end) {
      return { start, end }
    }
  }

  const now = new Date()
  let start, end = now

  switch (period) {
    case 'last_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      end   = new Date(now.getFullYear(), now.getMonth(), 1)
      break
    }
    case 'quarter': {
      const q = Math.floor(now.getMonth() / 3)
      start   = new Date(now.getFullYear(), q * 3, 1)
      break
    }
    case 'year': {
      start = new Date(now.getFullYear(), 0, 1)
      break
    }
    default: {
      start = new Date(now.getFullYear(), now.getMonth(), 1)
    }
  }
  return { start, end }
}

function getMonthLabel(date) {
  return date.toLocaleString('en', { month: 'short' })
}

// Returns { workshopId: { in: [...ids] } } for enterprise admin
// or { workshopId: singleId } for workshop users
async function getWsFilter(req) {
  if (req.user.type === 'enterprise_admin') {
    const { clientId } = req.query
    const where = { deletedAt: null }
    if (clientId) where.clientId = clientId
    const wsList = await prisma.workshop.findMany({ where, select: { id: true } })
    return { workshopId: { in: wsList.map(w => w.id) } }
  }
  return { workshopId: req.user.workshopId }
}

const isEnterpriseAdmin = req => req.user.type === 'enterprise_admin'

// ── Jobs report ───────────────────────────────────────────────────────────────

async function jobsReport(req, res, next) {
  try {
    const wsFilter = await getWsFilter(req)
    const period   = req.query.period || 'month'
    const { start, end } = getPeriodDates(period, req.query.startDate, req.query.endDate)

    const now = new Date()
    const monthly = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const [created, completed] = await Promise.all([
        prisma.jobCard.count({ where: { ...wsFilter, deletedAt: null, createdAt:   { gte: mStart, lt: mEnd } } }),
        prisma.jobCard.count({ where: { ...wsFilter, deletedAt: null, completedAt: { gte: mStart, lt: mEnd } } }),
      ])
      monthly.push({ month: getMonthLabel(mStart), created, completed })
    }

    const [periodCreated, periodCompleted, waitingParts, qcReview, inProgress] = await Promise.all([
      prisma.jobCard.count({ where: { ...wsFilter, deletedAt: null, createdAt:   { gte: start, lt: end } } }),
      prisma.jobCard.count({ where: { ...wsFilter, deletedAt: null, completedAt: { gte: start, lt: end } } }),
      prisma.jobCard.count({ where: { ...wsFilter, deletedAt: null, status: 'WaitingParts' } }),
      prisma.jobCard.count({ where: { ...wsFilter, deletedAt: null, status: 'QCReview' } }),
      prisma.jobCard.count({ where: { ...wsFilter, deletedAt: null, status: 'InProgress' } }),
    ])

    return success(res, { monthly, periodCreated, periodCompleted, waitingParts, qcReview, inProgress })
  } catch (err) { next(err) }
}

// ── Revenue report ────────────────────────────────────────────────────────────

async function revenueReport(req, res, next) {
  try {
    const wsFilter = await getWsFilter(req)
    const period   = req.query.period || 'month'
    const { start, end } = getPeriodDates(period, req.query.startDate, req.query.endDate)

    const now = new Date()
    const monthly = []
    for (let i = 5; i >= 0; i--) {
      const mStart = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const mEnd   = new Date(now.getFullYear(), now.getMonth() - i + 1, 1)
      const agg = await prisma.quotation.aggregate({
        where: { ...wsFilter, deletedAt: null, status: 'CustomerApproved', approvedAt: { gte: mStart, lt: mEnd } },
        _sum: { totalEstimate: true },
      })
      monthly.push({ month: getMonthLabel(mStart), revenue: Number(agg._sum?.totalEstimate || 0) })
    }

    // Derive a single workshop ID for currency lookup
    const currencyWsId = isEnterpriseAdmin(req)
      ? (Array.isArray(wsFilter.workshopId?.in) ? wsFilter.workshopId.in[0] : null)
      : req.user.workshopId

    const [periodRevAgg, pendingCustomer, approvedTotal, firstWorkshop] = await Promise.all([
      prisma.quotation.aggregate({
        where: { ...wsFilter, deletedAt: null, status: 'CustomerApproved', approvedAt: { gte: start, lt: end } },
        _sum: { totalEstimate: true },
      }),
      prisma.quotation.count({ where: { ...wsFilter, deletedAt: null, status: 'SentToCustomer' } }),
      prisma.quotation.aggregate({
        where: { ...wsFilter, deletedAt: null, status: 'CustomerApproved' },
        _sum: { totalEstimate: true },
      }),
      currencyWsId
        ? prisma.workshop.findFirst({ where: { id: currencyWsId }, select: { currency: true } })
        : Promise.resolve(null),
    ])

    return success(res, {
      monthly,
      periodRevenue:  Number(periodRevAgg._sum?.totalEstimate || 0),
      totalRevenue:   Number(approvedTotal._sum?.totalEstimate || 0),
      pendingCustomer,
      currency:       firstWorkshop?.currency || 'ZAR',
    })
  } catch (err) { next(err) }
}

// ── Technician performance report ─────────────────────────────────────────────

async function technicianPerformanceReport(req, res, next) {
  try {
    const wsFilter = await getWsFilter(req)
    const period   = req.query.period || 'month'
    const { start, end } = getPeriodDates(period, req.query.startDate, req.query.endDate)
    const isAdmin  = isEnterpriseAdmin(req)

    const technicians = await prisma.user.findMany({
      where: { ...wsFilter, deletedAt: null, role: 'Technician', status: 'Active' },
      select: {
        id:   true,
        name: true,
        workshop: isAdmin ? { select: { name: true, client: { select: { name: true } } } } : false,
        assignedJobCards: {
          where: { deletedAt: null, createdAt: { gte: start, lt: end } },
          select: {
            id:     true,
            status: true,
            issues: { where: { status: 'Open' } },
          },
        },
      },
      orderBy: { name: 'asc' },
    })

    const rows = technicians.map(tech => {
      const assigned   = tech.assignedJobCards.length
      const completed  = tech.assignedJobCards.filter(j => ['Completed', 'Ready'].includes(j.status)).length
      const openIssues = tech.assignedJobCards.reduce((sum, j) => sum + j.issues.length, 0)
      const rating     = assigned > 0 ? `${Math.round((completed / assigned) * 100)}%` : 'N/A'
      return {
        name:       tech.name,
        workshop:   tech.workshop?.name || '',
        client:     tech.workshop?.client?.name || '',
        assigned,
        completed,
        openIssues,
        rating,
      }
    })

    const avgRating = rows.length > 0 && rows.some(r => r.rating !== 'N/A')
      ? `${Math.round(rows.filter(r => r.rating !== 'N/A').reduce((sum, r) => sum + parseInt(r.rating), 0) / rows.filter(r => r.rating !== 'N/A').length)}%`
      : 'N/A'

    return success(res, { rows, avgRating, isAdmin })
  } catch (err) { next(err) }
}

// ── Pending approvals & payments report ───────────────────────────────────────

async function pendingReport(req, res, next) {
  try {
    const wsFilter = await getWsFilter(req)
    const isAdmin  = isEnterpriseAdmin(req)

    const [pendingApprovals, internalPending] = await Promise.all([
      prisma.quotation.findMany({
        where:   { ...wsFilter, deletedAt: null, status: 'SentToCustomer' },
        orderBy: { sentToCustomerAt: 'asc' },
        include: {
          customer: { select: { name: true } },
          vehicle:  { select: { makeModel: true, registrationNo: true } },
          workshop: isAdmin ? { select: { name: true, client: { select: { name: true } } } } : false,
        },
      }),
      prisma.quotation.findMany({
        where:   { ...wsFilter, deletedAt: null, status: { in: ['InternalReview', 'InternalUpdatesReceived', 'Draft'] } },
        orderBy: { createdAt: 'asc' },
        include: {
          customer: { select: { name: true } },
          vehicle:  { select: { makeModel: true } },
          workshop: isAdmin ? { select: { name: true, client: { select: { name: true } } } } : false,
        },
      }),
    ])

    const approvalRows = pendingApprovals.map(q => {
      const ageMs = q.sentToCustomerAt ? Date.now() - new Date(q.sentToCustomerAt).getTime() : 0
      const ageH  = Math.floor(ageMs / 3_600_000)
      const age   = ageH >= 24 ? `${Math.floor(ageH / 24)}d ${ageH % 24}h` : `${ageH}h`
      return {
        quoteNumber: q.quoteNumber,
        customer:    q.customer?.name || '—',
        vehicle:     `${q.vehicle?.makeModel || '—'} (${q.vehicle?.registrationNo || '—'})`,
        workshop:    q.workshop?.name || '',
        client:      q.workshop?.client?.name || '',
        age,
        amount:      q.totalEstimate ? `${q.currency} ${Number(q.totalEstimate).toLocaleString()}` : '—',
        amountRaw:   Number(q.totalEstimate || 0),
      }
    })

    const internalRows = internalPending.map(q => {
      const ageMs = Date.now() - new Date(q.createdAt).getTime()
      const ageH  = Math.floor(ageMs / 3_600_000)
      const age   = ageH >= 24 ? `${Math.floor(ageH / 24)}d ${ageH % 24}h` : `${ageH}h`
      return {
        quoteNumber: q.quoteNumber,
        customer:    q.customer?.name || '—',
        vehicle:     q.vehicle?.makeModel || '—',
        workshop:    q.workshop?.name || '',
        client:      q.workshop?.client?.name || '',
        status:      q.status,
        age,
        amount:      q.totalEstimate ? `${q.currency} ${Number(q.totalEstimate).toLocaleString()}` : '—',
        amountRaw:   Number(q.totalEstimate || 0),
      }
    })

    return success(res, {
      approvalRows,
      internalRows,
      totalPendingApprovals: pendingApprovals.length,
      totalInternal:         internalPending.length,
      isAdmin,
    })
  } catch (err) { next(err) }
}

module.exports = { jobsReport, revenueReport, technicianPerformanceReport, pendingReport }

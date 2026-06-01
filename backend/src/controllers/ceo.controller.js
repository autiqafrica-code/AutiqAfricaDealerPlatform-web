'use strict'

const prisma = require('../config/db')
const { success, badRequest, notFound } = require('../utils/apiResponse')

async function getDashboard(req, res, next) {
  try {
    const { workshopId } = req.user

    const now        = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 1)

    const [
      approvedRevenue,
      jobsCompletedMonth,
      approvalDelays,
      workshop,
      activeJobs,
      totalStaff,
      technicianCount,
    ] = await Promise.all([
      prisma.quotation.aggregate({
        where: {
          workshopId, deletedAt: null, status: 'CustomerApproved',
          approvedAt: { gte: monthStart, lt: monthEnd },
        },
        _sum: { totalEstimate: true },
      }),
      prisma.jobCard.count({
        where: { workshopId, deletedAt: null, completedAt: { gte: monthStart, lt: monthEnd } },
      }),
      prisma.quotation.count({
        where: {
          workshopId, deletedAt: null, status: 'SentToCustomer',
          sentToCustomerAt: { lt: new Date(Date.now() - 24 * 60 * 60 * 1000) },
        },
      }),
      prisma.workshop.findUnique({
        where: { id: workshopId },
        select: { dailyJobLimit: true, openingTime: true, closingTime: true, currency: true, name: true },
      }),
      prisma.jobCard.count({
        where: { workshopId, deletedAt: null, status: { notIn: ['Completed', 'Ready'] } },
      }),
      prisma.user.count({ where: { workshopId, deletedAt: null, status: 'Active' } }),
      prisma.user.count({ where: { workshopId, deletedAt: null, status: 'Active', role: 'Technician' } }),
    ])

    const revenue  = Number(approvedRevenue._sum?.totalEstimate || 0)
    const currency = workshop?.currency || 'ZAR'

    let revenueDisplay
    if (revenue >= 1_000_000)     revenueDisplay = `${currency} ${(revenue / 1_000_000).toFixed(1)}M`
    else if (revenue >= 1_000)    revenueDisplay = `${currency} ${Math.round(revenue / 1000)}k`
    else                          revenueDisplay = `${currency} ${revenue.toLocaleString()}`

    return success(res, {
      monthlyRevenue:        revenue,
      monthlyRevenueDisplay: revenueDisplay,
      jobsCompletedMonth,
      approvalDelays,
      dailyJobLimit:  workshop?.dailyJobLimit || 30,
      activeJobs,
      totalStaff,
      technicianCount,
      currency,
      workshopName: workshop?.name || '',
      openingTime:  workshop?.openingTime || '10:00',
      closingTime:  workshop?.closingTime || '20:00',
    })
  } catch (err) {
    next(err)
  }
}

async function getCalendarData(req, res, next) {
  try {
    const { workshopId } = req.user
    const { startDate, endDate } = req.query

    const start = startDate ? new Date(startDate) : (() => {
      const d = new Date(); d.setDate(1); d.setHours(0, 0, 0, 0); return d
    })()
    const end = endDate ? new Date(endDate) : (() => {
      const d = new Date(start); d.setMonth(d.getMonth() + 1); return d
    })()

    const [appointments, workshop] = await Promise.all([
      prisma.appointment.findMany({
        where: { workshopId, appointmentDate: { gte: start, lt: end } },
        orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          vehicle:  { select: { id: true, registrationNo: true, makeModel: true } },
        },
      }),
      prisma.workshop.findUnique({
        where: { id: workshopId },
        select: { dailyJobLimit: true, openingTime: true, closingTime: true },
      }),
    ])

    const grouped = {}
    for (const appt of appointments) {
      const key = appt.appointmentDate.toISOString().split('T')[0]
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(appt)
    }

    return success(res, {
      appointments,
      grouped,
      dailyJobLimit: workshop?.dailyJobLimit || 30,
      openingTime:   workshop?.openingTime || '10:00',
      closingTime:   workshop?.closingTime || '20:00',
    })
  } catch (err) {
    next(err)
  }
}

async function updateDailyLimit(req, res, next) {
  try {
    const { workshopId } = req.user
    const { dailyJobLimit } = req.body

    const limit = parseInt(dailyJobLimit, 10)
    if (!limit || limit < 1 || limit > 500) return badRequest(res, 'Daily job limit must be between 1 and 500')

    const workshop = await prisma.workshop.findUnique({ where: { id: workshopId } })
    if (!workshop) return notFound(res, 'Workshop not found')

    const updated = await prisma.workshop.update({
      where: { id: workshopId },
      data:  { dailyJobLimit: limit },
      select: { id: true, name: true, dailyJobLimit: true, openingTime: true, closingTime: true },
    })

    return success(res, { workshop: updated }, 'Daily job limit updated successfully')
  } catch (err) {
    next(err)
  }
}

module.exports = { getDashboard, getCalendarData, updateDailyLimit }

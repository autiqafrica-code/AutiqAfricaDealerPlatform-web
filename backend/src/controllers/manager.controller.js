'use strict'

const prisma = require('../config/db')
const { success, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')

async function getDashboard(req, res, next) {
  try {
    const { workshopId } = req.user

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const [
      todayAppointments,
      totalQuotations,
      draftQuotations,
      approvedQuotations,
      pendingQuotations,
      activeJobs,
      inProgressJobs,
      waitingPartsJobs,
      completedTodayJobs,
      qcReviewJobs,
      criticalJobs,
      newJobs,
      staffCount,
      technicianCount,
      workshop,
      pendingComponents,
      todayJobCount,
    ] = await Promise.all([
      prisma.appointment.count({
        where: { workshopId, appointmentDate: { gte: today, lt: tomorrow } },
      }),
      prisma.quotation.count({ where: { workshopId, deletedAt: null } }),
      prisma.quotation.count({ where: { workshopId, deletedAt: null, status: 'Draft' } }),
      prisma.quotation.count({ where: { workshopId, deletedAt: null, status: 'CustomerApproved' } }),
      prisma.quotation.count({
        where: { workshopId, deletedAt: null, status: { notIn: ['CustomerApproved', 'CustomerRejected'] } },
      }),
      prisma.jobCard.count({ where: { workshopId, deletedAt: null, status: { notIn: ['Completed', 'Ready'] } } }),
      prisma.jobCard.count({ where: { workshopId, deletedAt: null, status: 'InProgress' } }),
      prisma.jobCard.count({ where: { workshopId, deletedAt: null, status: 'WaitingParts' } }),
      prisma.jobCard.count({ where: { workshopId, deletedAt: null, completedAt: { gte: today, lt: tomorrow } } }),
      prisma.jobCard.count({ where: { workshopId, deletedAt: null, status: 'QCReview' } }),
      prisma.jobCard.count({ where: { workshopId, deletedAt: null, status: 'Critical' } }),
      prisma.jobCard.count({ where: { workshopId, deletedAt: null, status: 'New' } }),
      prisma.user.count({ where: { workshopId, deletedAt: null, status: 'Active' } }),
      prisma.user.count({ where: { workshopId, deletedAt: null, status: 'Active', role: 'Technician' } }),
      prisma.workshop.findUnique({
        where: { id: workshopId },
        select: { dailyJobLimit: true, openingTime: true, closingTime: true, currency: true, name: true },
      }),
      prisma.failedComponent.count({
        where: { workshopId, status: { in: ['PendingReview', 'InReview'] } },
      }),
      prisma.jobCard.count({
        where: { workshopId, deletedAt: null, createdAt: { gte: today, lt: tomorrow } },
      }),
    ])

    const dailyJobLimit = workshop?.dailyJobLimit || 30

    return success(res, {
      todayAppointments,
      totalQuotations,
      draftQuotations,
      approvedQuotations,
      pendingQuotations,
      activeJobs,
      newJobs,
      inProgressJobs,
      waitingPartsJobs,
      completedTodayJobs,
      qcReviewJobs,
      criticalJobs,
      staffCount,
      technicianCount,
      pendingComponents,
      dailyJobLimit,
      todayJobCount,
      openingTime:  workshop?.openingTime || '10:00',
      closingTime:  workshop?.closingTime || '20:00',
      currency:     workshop?.currency || 'ZAR',
      workshopName: workshop?.name || '',
    })
  } catch (err) {
    next(err)
  }
}

async function getCalendar(req, res, next) {
  try {
    const { workshopId } = req.user
    const { startDate, endDate } = req.query

    const start = startDate ? new Date(startDate) : (() => {
      const d = new Date()
      d.setDate(d.getDate() - d.getDay() + 1) // Monday
      d.setHours(0, 0, 0, 0)
      return d
    })()
    const end = endDate ? new Date(endDate) : (() => {
      const d = new Date(start)
      d.setDate(d.getDate() + 7)
      return d
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

    // Job counts per calendar day
    const dayIterator = new Date(start)
    const jobCountMap = {}
    while (dayIterator < end) {
      const key = dayIterator.toISOString().split('T')[0]
      const dayEnd = new Date(dayIterator)
      dayEnd.setDate(dayEnd.getDate() + 1)
      jobCountMap[key] = await prisma.jobCard.count({
        where: { workshopId, deletedAt: null, createdAt: { gte: dayIterator, lt: dayEnd } },
      })
      dayIterator.setDate(dayIterator.getDate() + 1)
    }

    // Group appointments by date string
    const grouped = {}
    for (const appt of appointments) {
      const key = appt.appointmentDate.toISOString().split('T')[0]
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(appt)
    }

    return success(res, {
      grouped,
      jobCountMap,
      dailyJobLimit: workshop?.dailyJobLimit || 30,
      openingTime:   workshop?.openingTime || '10:00',
      closingTime:   workshop?.closingTime || '20:00',
      startDate:     start.toISOString().split('T')[0],
      endDate:       end.toISOString().split('T')[0],
    })
  } catch (err) {
    next(err)
  }
}

async function listJobs(req, res, next) {
  try {
    const { workshopId } = req.user
    const { status, priority, technicianId } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId, deletedAt: null }
    if (status)      where.status                = status
    if (priority)    where.priority              = priority
    if (technicianId) where.assignedTechnicianId = technicianId

    const [jobs, total] = await Promise.all([
      prisma.jobCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          quotation: {
            select: {
              quoteNumber:   true,
              repairType:    true,
              currency:      true,
              totalEstimate: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
          vehicle:            { select: { id: true, registrationNo: true, makeModel: true } },
          assignedTechnician: { select: { id: true, name: true } },
          assignedController: { select: { id: true, name: true } },
          issues:             { where: { status: 'Open' }, orderBy: { createdAt: 'desc' } },
          _count:             { select: { checklistItems: true, issues: true, media: true } },
        },
      }),
      prisma.jobCard.count({ where }),
    ])

    return success(res, paginate(jobs, total, page, limit))
  } catch (err) {
    next(err)
  }
}

async function getJob(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        quotation: {
          include: {
            customer:  true,
            vehicle:   true,
            lineItems: true,
            updates: {
              orderBy: { createdAt: 'asc' },
              include: {
                updatedBy:    { select: { id: true, name: true, role: true } },
                media:        true,
                partLineItems: true,
              },
            },
          },
        },
        vehicle:            true,
        assignedTechnician: { select: { id: true, name: true, role: true } },
        assignedController: { select: { id: true, name: true, role: true } },
        checklistItems:     { orderBy: { createdAt: 'asc' } },
        issues:             { orderBy: { createdAt: 'desc' } },
        media:              { orderBy: { createdAt: 'desc' } },
        failedComponents: {
          include: {
            review:     true,
            technician: { select: { id: true, name: true } },
          },
        },
      },
    })

    if (!job) return notFound(res, 'Job not found')
    return success(res, { job })
  } catch (err) {
    next(err)
  }
}

async function listQuotations(req, res, next) {
  try {
    const { workshopId } = req.user
    const { status, customerId, priority } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId, deletedAt: null }
    if (status)     where.status     = status
    if (customerId) where.customerId = customerId
    if (priority)   where.priority   = priority

    const [quotations, total] = await Promise.all([
      prisma.quotation.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          customer:  { select: { id: true, name: true, phone: true } },
          vehicle:   { select: { id: true, registrationNo: true, makeModel: true } },
          lineItems: true,
          updates: {
            orderBy: { createdAt: 'desc' },
            take: 1,
            include: { updatedBy: { select: { name: true, role: true } } },
          },
          _count: { select: { updates: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ])

    return success(res, paginate(quotations, total, page, limit))
  } catch (err) {
    next(err)
  }
}

async function getQuotation(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const quotation = await prisma.quotation.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        customer:  true,
        vehicle:   true,
        lineItems: true,
        updates: {
          orderBy: { createdAt: 'asc' },
          include: {
            updatedBy:    { select: { id: true, name: true, role: true } },
            media:        true,
            partLineItems: true,
          },
        },
        media: true,
        jobCard: { select: { id: true, jobNumber: true, status: true, progress: true } },
      },
    })

    if (!quotation) return notFound(res, 'Quotation not found')
    return success(res, { quotation })
  } catch (err) {
    next(err)
  }
}

async function getStaffWorkload(req, res, next) {
  try {
    const { workshopId } = req.user

    const staff = await prisma.user.findMany({
      where: { workshopId, deletedAt: null, status: 'Active' },
      select: {
        id: true, name: true, role: true, status: true,
        assignedJobCards: {
          where: { deletedAt: null, status: { notIn: ['Completed', 'Ready'] } },
          select: { id: true, status: true, priority: true, jobNumber: true },
        },
      },
      orderBy: [{ role: 'asc' }, { name: 'asc' }],
    })

    return success(res, { staff })
  } catch (err) {
    next(err)
  }
}

async function getWorkshopSettings(req, res, next) {
  try {
    const { workshopId } = req.user

    const workshop = await prisma.workshop.findUnique({
      where: { id: workshopId },
      select: {
        id: true, name: true, dailyJobLimit: true,
        openingTime: true, closingTime: true,
        currency: true, type: true,
      },
    })

    if (!workshop) return notFound(res, 'Workshop not found')
    return success(res, { workshop })
  } catch (err) {
    next(err)
  }
}

async function getDailyLimitStatus(req, res, next) {
  try {
    const { workshopId } = req.user
    const { date } = req.query

    const day = date ? new Date(date) : new Date()
    day.setHours(0, 0, 0, 0)
    const nextDay = new Date(day)
    nextDay.setDate(nextDay.getDate() + 1)

    const [workshop, jobCount, apptCount] = await Promise.all([
      prisma.workshop.findUnique({
        where: { id: workshopId },
        select: { dailyJobLimit: true, openingTime: true, closingTime: true },
      }),
      prisma.jobCard.count({
        where: { workshopId, deletedAt: null, createdAt: { gte: day, lt: nextDay } },
      }),
      prisma.appointment.count({
        where: { workshopId, appointmentDate: { gte: day, lt: nextDay } },
      }),
    ])

    const limit = workshop?.dailyJobLimit || 30
    const pct   = Math.round((jobCount / limit) * 100)

    return success(res, {
      date:               day.toISOString().split('T')[0],
      dailyJobLimit:      limit,
      jobsCreatedToday:   jobCount,
      appointmentsToday:  apptCount,
      utilizationPercent: pct,
      isAtLimit:          jobCount >= limit,
      isOverLimit:        jobCount > limit,
    })
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getDashboard,
  getCalendar,
  listJobs,
  getJob,
  listQuotations,
  getQuotation,
  getStaffWorkload,
  getWorkshopSettings,
  getDailyLimitStatus,
}

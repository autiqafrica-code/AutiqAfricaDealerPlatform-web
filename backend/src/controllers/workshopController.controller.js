'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')

async function recordHistory(jobCardId, workshopId, fromStatus, toStatus, user, title, notes) {
  return prisma.jobStatusHistory.create({
    data: {
      jobCardId,
      workshopId,
      fromStatus:        fromStatus || null,
      toStatus,
      performedByUserId: user?.id       || null,
      performedByName:   user?.name     || null,
      performedByRole:   user?.roleCode || null,
      title:  title || `Status changed to ${toStatus}`,
      notes:  notes || null,
    },
  }).catch(() => {})
}

// ── GET /api/workshop-controller/jobs ─────────────────────────────────────────

async function listJobs(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { status, priority } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = {
      workshopId,
      deletedAt: null,
      OR: [
        { assignedControllerId: userId },
        { status: { in: ['SentToWorkshopController', 'New', 'Accepted', 'InProgress',
            'WaitingParts', 'AssignedToTechnician', 'AdditionalWorkApproved'] } },
      ],
    }
    if (status)   where.status   = status
    if (priority) where.priority = priority

    const [jobs, total] = await Promise.all([
      prisma.jobCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          quotation: {
            select: {
              quoteNumber: true, repairType: true, currency: true, totalEstimate: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
          vehicle:            { select: { id: true, registrationNo: true, makeModel: true } },
          assignedTechnician: { select: { id: true, name: true } },
        },
      }),
      prisma.jobCard.count({ where }),
    ])

    return success(res, paginate(jobs, total, page, limit))
  } catch (err) { next(err) }
}

// ── GET /api/workshop-controller/jobs/:id ─────────────────────────────────────

async function getJob(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        quotation: {
          include: {
            customer:  { select: { id: true, name: true, phone: true } },
            vehicle:   { select: { id: true, registrationNo: true, makeModel: true } },
            lineItems: { orderBy: { createdAt: 'asc' } },
            updates:   { orderBy: { createdAt: 'desc' }, include: { updatedBy: { select: { name: true, role: true } } } },
          },
        },
        vehicle:            true,
        assignedTechnician: { select: { id: true, name: true, role: true } },
        assignedController: { select: { id: true, name: true, role: true } },
        checklistItems:     { orderBy: { createdAt: 'asc' } },
        issues:             { orderBy: { createdAt: 'desc' } },
        media:              { orderBy: { createdAt: 'desc' } },
        statusHistory:      { orderBy: { createdAt: 'asc' } },
        completionReport:   true,
        additionalWorkRequests: { orderBy: { createdAt: 'desc' } },
        failedComponents:   { include: { review: true }, orderBy: { createdAt: 'desc' } },
      },
    })

    if (!job) return notFound(res, 'Job not found')
    return success(res, { job })
  } catch (err) { next(err) }
}

// ── POST /api/workshop-controller/jobs/:id/review ────────────────────────────

async function reviewJob(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { bayAllocation, repairRoute, labourEstimate, workshopNotes } = req.body

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const notes = [
      bayAllocation  ? `Bay: ${bayAllocation}`       : null,
      repairRoute    ? `Route: ${repairRoute}`        : null,
      labourEstimate ? `Labour: ${labourEstimate}`    : null,
      workshopNotes  || null,
    ].filter(Boolean).join(' | ')

    await recordHistory(id, workshopId, job.status, job.status,
      { id: userId, name: userName, roleCode },
      'Workshop Controller reviewed job',
      notes || 'Job reviewed by Workshop Controller')

    return success(res, { jobId: id }, 'Job review notes recorded')
  } catch (err) { next(err) }
}

// ── POST /api/workshop-controller/jobs/:id/assign-technician ─────────────────

async function assignTechnician(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { technicianId, notes } = req.body

    if (!technicianId) return badRequest(res, 'Technician ID is required')

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const technician = await prisma.user.findFirst({ where: { id: technicianId, workshopId, deletedAt: null } })
    if (!technician) return notFound(res, 'Technician not found in this workshop')
    if (technician.role !== 'Technician') return badRequest(res, 'Selected user is not a Technician')

    const updated = await prisma.jobCard.update({
      where: { id },
      data: {
        assignedTechnicianId: technicianId,
        status: 'AssignedToTechnician',
      },
    })

    await recordHistory(id, workshopId, job.status, 'AssignedToTechnician',
      { id: userId, name: userName, roleCode },
      `Job assigned to technician: ${technician.name}`,
      notes || null)

    await prisma.notification.create({
      data: {
        workshopId,
        userId:    technicianId,
        jobCardId: id,
        channel:   'WhatsApp',
        type:      'JobAssigned',
        message:   `Job ${job.jobNumber} has been assigned to you. Please review and start work.`,
        status:    'Pending',
      },
    }).catch(() => {})

    return success(res, { job: updated }, `Job assigned to ${technician.name}`)
  } catch (err) { next(err) }
}

// ── POST /api/workshop-controller/jobs/:id/send-to-technician ────────────────

async function sendToTechnician(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { notes } = req.body

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    if (!job.assignedTechnicianId) return badRequest(res, 'Please assign a Technician before sending job')

    const updated = await prisma.jobCard.update({
      where: { id },
      data: { status: 'Accepted' },
    })

    await recordHistory(id, workshopId, job.status, 'Accepted',
      { id: userId, name: userName, roleCode },
      'Job sent to Technician for execution',
      notes || null)

    await prisma.notification.create({
      data: {
        workshopId,
        userId:    job.assignedTechnicianId,
        jobCardId: id,
        channel:   'WhatsApp',
        type:      'JobReadyToStart',
        message:   `Job ${job.jobNumber} is ready to start. Begin work when ready.`,
        status:    'Pending',
      },
    }).catch(() => {})

    return success(res, { job: updated }, 'Job sent to Technician')
  } catch (err) { next(err) }
}

// ── GET /api/workshop-controller/jobs/:id/technician-updates ─────────────────

async function getTechnicianUpdates(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const [issues, media, completionReport, additionalWork] = await Promise.all([
      prisma.jobIssue.findMany({ where: { jobCardId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.jobMedia.findMany({ where: { jobCardId: id }, orderBy: { createdAt: 'desc' } }),
      prisma.jobCompletionReport.findFirst({ where: { jobCardId: id } }),
      prisma.jobAdditionalWorkRequest.findMany({ where: { jobCardId: id }, orderBy: { createdAt: 'desc' } }),
    ])

    return success(res, { issues, media, completionReport, additionalWork })
  } catch (err) { next(err) }
}

// ── POST /api/workshop-controller/jobs/:id/send-update-front-desk ─────────────

async function sendUpdateToFrontDesk(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { notes } = req.body

    if (!notes?.trim()) return badRequest(res, 'Update notes are required')

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    await recordHistory(id, workshopId, job.status, job.status,
      { id: userId, name: userName, roleCode },
      'Update sent to Front Desk',
      notes.trim())

    await prisma.notification.create({
      data: {
        workshopId,
        jobCardId: id,
        channel:   'WhatsApp',
        type:      'WorkshopUpdate',
        message:   `Workshop Controller update for job ${job.jobNumber}: ${notes.trim()}`,
        status:    'Pending',
      },
    }).catch(() => {})

    return success(res, { jobId: id }, 'Update sent to Front Desk')
  } catch (err) { next(err) }
}

// ── POST /api/workshop-controller/jobs/:id/assign-parts-interpreter ──────────

async function assignPartsInterpreter(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { partsInterpreterId, notes } = req.body

    if (!partsInterpreterId) return badRequest(res, 'Parts Interpreter ID is required')

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const pi = await prisma.user.findFirst({ where: { id: partsInterpreterId, workshopId, deletedAt: null } })
    if (!pi) return notFound(res, 'Parts Interpreter not found in this workshop')
    if (pi.role !== 'PartsInterpreter') return badRequest(res, 'Selected user is not a Parts Interpreter')

    const updated = await prisma.jobCard.update({
      where: { id },
      data: { assignedPartsInterpreterId: partsInterpreterId, status: 'Accepted' },
    })

    await recordHistory(id, workshopId, job.status, 'Accepted',
      { id: userId, name: userName, roleCode },
      `Parts Interpreter assigned: ${pi.name}`,
      notes || null)

    await prisma.notification.create({
      data: {
        workshopId,
        userId:    partsInterpreterId,
        jobCardId: id,
        channel:   'WhatsApp',
        type:      'JobAssigned',
        message:   `Job ${job.jobNumber} has been assigned to you for parts interpretation. Please review and start work.`,
        status:    'Pending',
      },
    }).catch(() => {})

    return success(res, { job: updated }, `Job assigned to ${pi.name}`)
  } catch (err) { next(err) }
}

module.exports = {
  listJobs,
  getJob,
  reviewJob,
  assignTechnician,
  assignPartsInterpreter,
  sendToTechnician,
  getTechnicianUpdates,
  sendUpdateToFrontDesk,
}

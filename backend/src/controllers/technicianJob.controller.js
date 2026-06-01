'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound, forbidden } = require('../utils/apiResponse')
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

// ── GET /api/technician/jobs ───────────────────────────────────────────────────

async function listJobs(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { status } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = {
      workshopId,
      assignedTechnicianId: userId,
      deletedAt: null,
    }
    if (status) where.status = status

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
              customerComplaint: true,
              customer: { select: { id: true, name: true, phone: true } },
            },
          },
          vehicle:            { select: { id: true, registrationNo: true, makeModel: true } },
          assignedController: { select: { id: true, name: true } },
          _count: { select: { issues: true, media: true, additionalWorkRequests: true } },
        },
      }),
      prisma.jobCard.count({ where }),
    ])

    return success(res, paginate(jobs, total, page, limit))
  } catch (err) { next(err) }
}

// ── GET /api/technician/jobs/:id ──────────────────────────────────────────────

async function getJob(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        quotation: {
          include: {
            customer: { select: { id: true, name: true, phone: true } },
            vehicle:  { select: { id: true, registrationNo: true, makeModel: true } },
            lineItems: { orderBy: { createdAt: 'asc' } },
          },
        },
        vehicle:            true,
        assignedController: { select: { id: true, name: true } },
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

    // Technicians can only view their assigned jobs
    if (job.assignedTechnicianId && job.assignedTechnicianId !== userId) {
      return forbidden(res, 'This job is not assigned to you')
    }

    return success(res, { job })
  } catch (err) { next(err) }
}

// ── POST /api/technician/jobs/:id/start ───────────────────────────────────────

async function startJob(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { notes } = req.body

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, assignedTechnicianId: userId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found or not assigned to you')

    const allowed = ['New', 'Accepted', 'AssignedToTechnician', 'AdditionalWorkApproved']
    if (!allowed.includes(job.status)) {
      return badRequest(res, `Cannot start job from status: ${job.status}`)
    }

    const updated = await prisma.jobCard.update({
      where: { id },
      data: { status: 'InProgress', startedAt: job.startedAt || new Date() },
    })

    await recordHistory(id, workshopId, job.status, 'InProgress',
      { id: userId, name: userName, roleCode },
      'Technician started work',
      notes || null)

    return success(res, { job: updated }, 'Job started — work is in progress')
  } catch (err) { next(err) }
}

// ── POST /api/technician/jobs/:id/progress-notes ─────────────────────────────

async function addProgressNotes(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { notes, progress } = req.body

    if (!notes?.trim()) return badRequest(res, 'Progress notes are required')

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, assignedTechnicianId: userId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found or not assigned to you')

    const data = {}
    if (progress !== undefined) {
      const pct = parseInt(progress)
      if (!isNaN(pct) && pct >= 0 && pct <= 100) data.progress = pct
    }

    if (Object.keys(data).length) await prisma.jobCard.update({ where: { id }, data })

    await recordHistory(id, workshopId, job.status, job.status,
      { id: userId, name: userName, roleCode },
      'Technician progress notes',
      notes.trim())

    return success(res, { jobId: id }, 'Progress notes added')
  } catch (err) { next(err) }
}

// ── POST /api/technician/jobs/:id/additional-work ────────────────────────────

async function requestAdditionalWork(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const {
      description, reason, severity,
      estimatedLabourHours, estimatedPartsCost, estimatedTotalCost,
    } = req.body

    if (!description?.trim()) return badRequest(res, 'Description is required')

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, assignedTechnicianId: userId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found or not assigned to you')

    if (!['InProgress', 'WaitingApproval', 'WaitingParts'].includes(job.status)) {
      return badRequest(res, `Cannot request additional work from status: ${job.status}`)
    }

    const request = await prisma.jobAdditionalWorkRequest.create({
      data: {
        jobCardId:            id,
        workshopId,
        technicianId:         userId,
        description:          description.trim(),
        reason:               reason?.trim()   || null,
        severity:             severity         || 'Medium',
        estimatedLabourHours: estimatedLabourHours?.trim() || null,
        estimatedPartsCost:   estimatedPartsCost ? parseFloat(estimatedPartsCost) : null,
        estimatedTotalCost:   estimatedTotalCost ? parseFloat(estimatedTotalCost) : null,
        currency:             job.quotation?.currency || 'ZAR',
        status:               'SENT_TO_FRONT_DESK',
      },
    })

    await prisma.jobCard.update({
      where: { id },
      data: { status: 'AdditionalWorkIdentified' },
    })

    await recordHistory(id, workshopId, job.status, 'AdditionalWorkIdentified',
      { id: userId, name: userName, roleCode },
      'Technician identified additional work',
      description.trim())

    await prisma.notification.create({
      data: {
        workshopId,
        jobCardId: id,
        channel:   'WhatsApp',
        type:      'AdditionalWorkIdentified',
        message:   `Technician has identified additional work for job ${job.jobNumber}: ${description.trim()}. Please review and get customer approval.`,
        status:    'Pending',
      },
    }).catch(() => {})

    return created(res, { request }, 'Additional work request sent to Front Desk')
  } catch (err) { next(err) }
}

// ── GET /api/technician/jobs/:id/additional-work-status ──────────────────────

async function getAdditionalWorkStatus(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, assignedTechnicianId: userId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found or not assigned to you')

    const requests = await prisma.jobAdditionalWorkRequest.findMany({
      where:   { jobCardId: id },
      orderBy: { createdAt: 'desc' },
    })
    return success(res, { requests })
  } catch (err) { next(err) }
}

// ── POST /api/technician/jobs/:id/complete ────────────────────────────────────

async function completeJob(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { issueSeverity, completionNotes, remainingIssues, customerAdvisoryNotes } = req.body

    if (!issueSeverity) return badRequest(res, 'Issue severity is required (RED, AMBER, or GREEN)')
    if (!['RED', 'AMBER', 'GREEN'].includes(issueSeverity)) {
      return badRequest(res, 'Issue severity must be RED, AMBER, or GREEN')
    }
    if (!completionNotes?.trim()) return badRequest(res, 'Completion notes are required')

    const job = await prisma.jobCard.findFirst({
      where: { id, workshopId, assignedTechnicianId: userId, deletedAt: null },
    })
    if (!job) return notFound(res, 'Job not found or not assigned to you')

    if (!['InProgress', 'WaitingApproval', 'WaitingParts', 'AdditionalWorkApproved'].includes(job.status)) {
      return badRequest(res, `Cannot complete job from status: ${job.status}`)
    }

    // Check for pending additional work requests
    const pendingAW = await prisma.jobAdditionalWorkRequest.findFirst({
      where: { jobCardId: id, status: { in: ['SENT_TO_FRONT_DESK', 'QUOTED', 'SENT_TO_CUSTOMER'] } },
    })
    if (pendingAW) {
      return badRequest(res, 'There is a pending additional work request. Please wait for customer decision before completing the job.')
    }

    const completedStatus = issueSeverity === 'RED'   ? 'Completed' :
                            issueSeverity === 'AMBER' ? 'Completed' : 'Completed'

    const [updatedJob] = await prisma.$transaction([
      prisma.jobCard.update({
        where: { id },
        data: {
          status:        completedStatus,
          issueSeverity: issueSeverity,
          completionNote: completionNotes.trim(),
          completedAt:   new Date(),
          progress:      100,
        },
      }),
      prisma.jobCompletionReport.upsert({
        where:  { jobCardId: id },
        update: {
          issueSeverity,
          completionNotes:       completionNotes.trim(),
          remainingIssues:       remainingIssues?.trim()          || null,
          customerAdvisoryNotes: customerAdvisoryNotes?.trim()    || null,
          completedAt:           new Date(),
        },
        create: {
          jobCardId:             id,
          workshopId,
          technicianId:          userId,
          issueSeverity,
          completionNotes:       completionNotes.trim(),
          remainingIssues:       remainingIssues?.trim()          || null,
          customerAdvisoryNotes: customerAdvisoryNotes?.trim()    || null,
        },
      }),
    ])

    await recordHistory(id, workshopId, job.status, completedStatus,
      { id: userId, name: userName, roleCode },
      `Technician completed job — Severity: ${issueSeverity}`,
      completionNotes.trim())

    const sevIcon = issueSeverity === 'RED' ? '🔴' : issueSeverity === 'AMBER' ? '🟡' : '🟢'
    await prisma.notification.create({
      data: {
        workshopId,
        jobCardId: id,
        channel:   'WhatsApp',
        type:      'TechnicianCompleted',
        message:   `${sevIcon} Job ${job.jobNumber} completed. Severity: ${issueSeverity}. ${completionNotes.trim()}`,
        status:    'Pending',
      },
    }).catch(() => {})

    return success(res, { job: updatedJob }, `Job completed with ${issueSeverity} severity`)
  } catch (err) { next(err) }
}

module.exports = {
  listJobs,
  getJob,
  startJob,
  addProgressNotes,
  requestAdditionalWork,
  getAdditionalWorkStatus,
  completeJob,
}

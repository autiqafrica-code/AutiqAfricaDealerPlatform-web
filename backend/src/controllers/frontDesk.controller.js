'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound, forbidden } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')

// ── Helper: record a timeline entry ──────────────────────────────────────────

async function recordHistory(jobCardId, workshopId, fromStatus, toStatus, user, title, notes) {
  return prisma.jobStatusHistory.create({
    data: {
      jobCardId,
      workshopId,
      fromStatus:        fromStatus || null,
      toStatus,
      performedByUserId: user?.id   || null,
      performedByName:   user?.name || null,
      performedByRole:   user?.roleCode || user?.role || null,
      title:  title || `Status changed to ${toStatus}`,
      notes:  notes || null,
    },
  }).catch(() => {})
}

// ── Helper: fire-and-forget notification ─────────────────────────────────────

async function notify(workshopId, userId, jobCardId, type, message, customerId) {
  return prisma.notification.create({
    data: {
      workshopId:  workshopId || null,
      userId:      userId     || null,
      customerId:  customerId || null,
      jobCardId:   jobCardId  || null,
      channel:     'WhatsApp',
      type,
      message,
      status:      'Pending',
    },
  }).catch(() => {})
}

// ── GET /api/front-desk/jobs ──────────────────────────────────────────────────

async function listJobs(req, res, next) {
  try {
    const { workshopId } = req.user
    const { status, priority, search } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId, deletedAt: null }
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
          assignedController: { select: { id: true, name: true } },
          invoice:            { select: { id: true, paymentStatus: true, sentToFrontDeskAt: true } },
        },
      }),
      prisma.jobCard.count({ where }),
    ])

    return success(res, paginate(jobs, total, page, limit))
  } catch (err) { next(err) }
}

// ── GET /api/front-desk/jobs/:id ──────────────────────────────────────────────

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
        invoice: {
          include: {
            lineItems: true,
            payments:  { orderBy: { createdAt: 'desc' } },
          },
        },
        statusHistory:            { orderBy: { createdAt: 'asc' } },
        completionReport:         true,
        additionalWorkRequests:   { orderBy: { createdAt: 'desc' } },
        deliveryPref:             true,
        failedComponents: {
          include: { review: true },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!job) return notFound(res, 'Job not found')
    return success(res, { job })
  } catch (err) { next(err) }
}

// ── POST /api/front-desk/jobs/:id/send-to-workshop-controller ─────────────────

async function sendToWorkshopController(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { notes } = req.body

    const job = await prisma.jobCard.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: { quotation: { select: { customerId: true, customer: { select: { name: true } } } } },
    })
    if (!job) return notFound(res, 'Job not found')

    const allowed = ['New', 'Accepted', 'Completed', 'QCReview', 'Ready']
    if (!allowed.includes(job.status)) {
      return badRequest(res, `Job cannot be sent to Workshop Controller from status: ${job.status}`)
    }

    const updated = await prisma.jobCard.update({
      where: { id },
      data: {
        status:            'SentToWorkshopController',
        sentToControllerAt: new Date(),
      },
    })

    await recordHistory(id, workshopId, job.status, 'SentToWorkshopController',
      { id: userId, name: userName, roleCode },
      'Sent to Workshop Controller',
      notes || null)

    await notify(workshopId, userId, id, 'JobSentToController',
      `Job ${job.jobNumber} has been sent to Workshop Controller for assignment.`,
      job.quotation?.customerId)

    return success(res, { job: updated }, 'Job sent to Workshop Controller')
  } catch (err) { next(err) }
}

// ── GET /api/front-desk/jobs/:id/additional-work ──────────────────────────────

async function listAdditionalWork(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const requests = await prisma.jobAdditionalWorkRequest.findMany({
      where: { jobCardId: id },
      orderBy: { createdAt: 'desc' },
    })
    return success(res, { requests })
  } catch (err) { next(err) }
}

// ── POST /api/front-desk/jobs/:id/additional-work/:reqId/approve ──────────────

async function approveAdditionalWork(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id, reqId } = req.params
    const { notes } = req.body

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const request = await prisma.jobAdditionalWorkRequest.findFirst({
      where: { id: reqId, jobCardId: id },
    })
    if (!request) return notFound(res, 'Additional work request not found')
    if (request.customerDecision) return badRequest(res, 'Customer has already decided on this request')

    const updated = await prisma.jobAdditionalWorkRequest.update({
      where: { id: reqId },
      data: {
        status:           'APPROVED',
        customerDecision: 'APPROVED',
        customerDecidedAt: new Date(),
        frontDeskNotes:   notes || null,
      },
    })

    await prisma.jobCard.update({
      where: { id },
      data: { status: 'AdditionalWorkApproved' },
    })

    await recordHistory(id, workshopId, job.status, 'AdditionalWorkApproved',
      { id: userId, name: userName, roleCode },
      'Customer approved additional work',
      notes || null)

    await notify(workshopId, userId, id, 'AdditionalWorkApproved',
      `Customer has approved the additional work for job ${job.jobNumber}. Technician can proceed.`,
      null)

    return success(res, { request: updated }, 'Additional work approved — Technician notified')
  } catch (err) { next(err) }
}

// ── POST /api/front-desk/jobs/:id/additional-work/:reqId/reject ───────────────

async function rejectAdditionalWork(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id, reqId } = req.params
    const { notes } = req.body

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const request = await prisma.jobAdditionalWorkRequest.findFirst({
      where: { id: reqId, jobCardId: id },
    })
    if (!request) return notFound(res, 'Additional work request not found')
    if (request.customerDecision) return badRequest(res, 'Customer has already decided on this request')

    const updated = await prisma.jobAdditionalWorkRequest.update({
      where: { id: reqId },
      data: {
        status:           'REJECTED',
        customerDecision: 'REJECTED',
        customerDecidedAt: new Date(),
        frontDeskNotes:   notes || null,
      },
    })

    await prisma.jobCard.update({
      where: { id },
      data: { status: 'AdditionalWorkRejected' },
    })

    await recordHistory(id, workshopId, job.status, 'AdditionalWorkRejected',
      { id: userId, name: userName, roleCode },
      'Customer rejected additional work',
      notes || null)

    return success(res, { request: updated }, 'Additional work rejected — Technician notified')
  } catch (err) { next(err) }
}

// ── POST /api/front-desk/jobs/:id/share-invoice ───────────────────────────────

async function shareInvoiceWithCustomer(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: { invoice: true, quotation: { select: { customerId: true, customer: { select: { name: true } } } } },
    })
    if (!job) return notFound(res, 'Job not found')
    if (!job.invoice) return badRequest(res, 'No invoice generated for this job yet')

    const invoice = await prisma.invoice.update({
      where: { id: job.invoice.id },
      data:  { sharedWithCustomerAt: new Date() },
    })

    await recordHistory(id, workshopId, job.status, job.status,
      { id: userId, name: userName, roleCode },
      'Invoice shared with customer',
      `Invoice ${invoice.invoiceNumber} shared with customer`)

    return success(res, { invoice }, 'Invoice shared with customer')
  } catch (err) { next(err) }
}

// ── GET /api/front-desk/jobs/ready-for-delivery ───────────────────────────────

async function listReadyForDelivery(req, res, next) {
  try {
    const { workshopId } = req.user
    const { page, limit, skip } = getPagination(req.query)

    const where = {
      workshopId,
      deletedAt: null,
      status: { in: ['PaymentCleared', 'ReadyForDelivery', 'CustomerContactedForDelivery'] },
    }

    const [jobs, total] = await Promise.all([
      prisma.jobCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          quotation: {
            select: {
              repairType: true,
              currency: true,
              totalEstimate: true,
              customer: { select: { id: true, name: true, phone: true, whatsapp: true, communicationPreference: true } },
            },
          },
          vehicle:  { select: { id: true, registrationNo: true, makeModel: true } },
          invoice:  { select: { id: true, total: true, paymentStatus: true } },
          deliveryPref: true,
          completionReport: true,
        },
      }),
      prisma.jobCard.count({ where }),
    ])

    return success(res, paginate(jobs, total, page, limit))
  } catch (err) { next(err) }
}

// ── POST /api/front-desk/jobs/:id/contact-customer-delivery ──────────────────

async function contactCustomerForDelivery(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { contactMethod, contactNotes } = req.body

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const validStatuses = ['PaymentCleared', 'ReadyForDelivery', 'CustomerContactedForDelivery']
    if (!validStatuses.includes(job.status)) {
      return badRequest(res, `Cannot contact customer for delivery from status: ${job.status}`)
    }

    const updated = await prisma.jobCard.update({
      where: { id },
      data: { status: 'CustomerContactedForDelivery', customerNotifiedAt: new Date() },
    })

    await recordHistory(id, workshopId, job.status, 'CustomerContactedForDelivery',
      { id: userId, name: userName, roleCode },
      'Customer contacted for delivery/collection',
      contactNotes ? `Method: ${contactMethod || 'Phone'}. ${contactNotes}` : `Method: ${contactMethod || 'Phone'}`)

    return success(res, { job: updated }, 'Customer contact recorded')
  } catch (err) { next(err) }
}

// ── POST /api/front-desk/jobs/:id/complete-delivery ──────────────────────────

async function completeDelivery(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { deliveryNotes, collectedBy } = req.body

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const validStatuses = ['PaymentCleared', 'ReadyForDelivery', 'CustomerContactedForDelivery']
    if (!validStatuses.includes(job.status)) {
      return badRequest(res, `Cannot complete delivery from status: ${job.status}`)
    }

    const updated = await prisma.jobCard.update({
      where: { id },
      data: {
        status:    'VehicleDelivered',
        closedAt:  new Date(),
      },
    })

    await recordHistory(id, workshopId, job.status, 'VehicleDelivered',
      { id: userId, name: userName, roleCode },
      'Vehicle delivered/collected',
      [deliveryNotes, collectedBy ? `Collected by: ${collectedBy}` : null].filter(Boolean).join('. ') || null)

    return success(res, { job: updated }, 'Vehicle delivery/collection recorded. Job is now closed.')
  } catch (err) { next(err) }
}

// ── POST /api/front-desk/jobs/:id/close ──────────────────────────────────────

async function closeJob(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { notes } = req.body

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    if (job.status === 'Closed') return badRequest(res, 'Job is already closed')
    if (job.status === 'Cancelled') return badRequest(res, 'Cancelled jobs cannot be closed')

    const updated = await prisma.jobCard.update({
      where: { id },
      data: { status: 'Closed', closedAt: new Date() },
    })

    await recordHistory(id, workshopId, job.status, 'Closed',
      { id: userId, name: userName, roleCode },
      'Job closed',
      notes || null)

    return success(res, { job: updated }, 'Job closed successfully')
  } catch (err) { next(err) }
}

// ── GET /api/front-desk/jobs/:id/timeline ────────────────────────────────────

async function getTimeline(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const history = await prisma.jobStatusHistory.findMany({
      where:   { jobCardId: id },
      orderBy: { createdAt: 'asc' },
    })
    return success(res, { history })
  } catch (err) { next(err) }
}

module.exports = {
  listJobs,
  getJob,
  sendToWorkshopController,
  listAdditionalWork,
  approveAdditionalWork,
  rejectAdditionalWork,
  shareInvoiceWithCustomer,
  listReadyForDelivery,
  contactCustomerForDelivery,
  completeDelivery,
  closeJob,
  getTimeline,
}

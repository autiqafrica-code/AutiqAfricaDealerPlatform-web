'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')
const { jobNumber } = require('../utils/idGenerator')

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

async function listJobs(req, res, next) {
  try {
    const { workshopId } = req.user
    const { status, technicianId, controllerId, priority } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId, deletedAt: null }
    if (status)                                  where.status               = status
    if (technicianId)                            where.assignedTechnicianId = technicianId
    if (controllerId)                            where.assignedControllerId = controllerId
    if (priority)                                where.priority             = priority
    if (req.query.myJobs           === 'true')   where.assignedTechnicianId = req.user.id
    if (req.query.myControllerJobs === 'true')   where.assignedControllerId = req.user.id
    if (req.query.myPartsJobs      === 'true')   where.assignedPartsInterpreterId = req.user.id

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
          assignedTechnician:       { select: { id: true, name: true } },
          assignedController:       { select: { id: true, name: true } },
          assignedPartsInterpreter: { select: { id: true, name: true } },
        },
      }),
      prisma.jobCard.count({ where }),
    ])

    return success(res, paginate(jobs, total, page, limit))
  } catch (err) {
    next(err)
  }
}

async function createJob(req, res, next) {
  try {
    const { workshopId } = req.user
    const { quotationId, assignedControllerId, department, priority, expectedStartDate, deliveryPreference } = req.body

    if (!quotationId) return badRequest(res, 'Quotation is required')

    const quotation = await prisma.quotation.findFirst({ where: { id: quotationId, workshopId, deletedAt: null } })
    if (!quotation) return notFound(res, 'Quotation not found')
    if (quotation.status !== 'CustomerApproved') return badRequest(res, 'Quotation must be customer-approved before creating a job')

    const existingJob = await prisma.jobCard.findFirst({ where: { quotationId } })
    if (existingJob) return badRequest(res, 'A job card already exists for this quotation')

    const count = await prisma.jobCard.count({ where: { workshopId } })
    const jNum  = jobNumber(count + 1)

    const job = await prisma.jobCard.create({
      data: {
        jobNumber:            jNum,
        workshopId,
        quotationId,
        vehicleId:            quotation.vehicleId || null,
        assignedControllerId: assignedControllerId || null,
        department:           department || null,
        priority:             priority || quotation.priority || 'Amber',
        status:               'New',
        expectedStartDate:    expectedStartDate ? new Date(expectedStartDate) : null,
        deliveryPreference:   deliveryPreference || null,
        progress:             0,
      },
      include: {
        quotation: {
          select: {
            quoteNumber: true,
            repairType:  true,
            customer:    { select: { name: true, phone: true } },
          },
        },
        vehicle: { select: { registrationNo: true, makeModel: true } },
      },
    })

    return created(res, { job }, 'Job created successfully')
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
          include: { customer: true, vehicle: true, lineItems: true },
        },
        vehicle:            true,
        assignedTechnician:       { select: { id: true, name: true, role: true } },
        assignedController:       { select: { id: true, name: true, role: true } },
        assignedPartsInterpreter: { select: { id: true, name: true, role: true } },
        checklistItems:           { orderBy: { createdAt: 'asc' } },
        issues:             { orderBy: { createdAt: 'desc' } },
        media:              { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!job) return notFound(res, 'Job not found')
    return success(res, { job })
  } catch (err) {
    next(err)
  }
}

async function updateJob(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { department, priority, expectedStartDate, deliveryPreference, completionNote } = req.body

    const existing = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Job not found')

    const job = await prisma.jobCard.update({
      where: { id },
      data: {
        ...(department !== undefined          && { department }),
        ...(priority                          && { priority }),
        ...(expectedStartDate !== undefined   && { expectedStartDate: expectedStartDate ? new Date(expectedStartDate) : null }),
        ...(deliveryPreference !== undefined  && { deliveryPreference }),
        ...(completionNote !== undefined      && { completionNote }),
      },
    })

    return success(res, { job }, 'Job updated')
  } catch (err) {
    next(err)
  }
}

async function updateJobStatus(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { status, notes } = req.body

    const valid = [
      'New','Accepted','InProgress','WaitingApproval','WaitingParts','Payment',
      'Completed','QCReview','Critical','Ready',
      'SentToWorkshopController','AssignedToTechnician','AdditionalWorkIdentified',
      'AdditionalWorkApproved','AdditionalWorkRejected','TechnicianCompleted',
      'ReadyForInvoice','InvoiceGenerated','PaymentCleared','ReadyForDelivery',
      'CustomerContactedForDelivery','VehicleDelivered','Closed','Cancelled',
    ]
    if (!valid.includes(status)) return badRequest(res, 'Invalid status value')

    const existing = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Job not found')

    const data = { status }
    if (status === 'InProgress' && !existing.startedAt) data.startedAt = new Date()
    if (status === 'Completed')  data.completedAt = new Date()
    if (status === 'Closed')     data.closedAt = new Date()

    const job = await prisma.jobCard.update({ where: { id }, data })

    await recordHistory(id, workshopId, existing.status, status,
      { id: userId, name: userName, roleCode },
      `Status changed to ${status}`,
      notes || null)

    return success(res, { job }, 'Job status updated')
  } catch (err) {
    next(err)
  }
}

async function updateJobProgress(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { progress } = req.body

    const pct = parseInt(progress)
    if (isNaN(pct) || pct < 0 || pct > 100) return badRequest(res, 'Progress must be 0–100')

    const existing = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Job not found')

    const job = await prisma.jobCard.update({ where: { id }, data: { progress: pct } })
    return success(res, { job }, 'Progress updated')
  } catch (err) {
    next(err)
  }
}

async function assignTechnician(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { technicianId, notes } = req.body

    if (!technicianId) return badRequest(res, 'Technician ID is required')

    const existing = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Job not found')

    const technician = await prisma.user.findFirst({ where: { id: technicianId, workshopId, deletedAt: null } })
    if (!technician) return notFound(res, 'Technician not found in this workshop')

    const job = await prisma.jobCard.update({
      where: { id },
      data: { assignedTechnicianId: technicianId, status: 'Accepted' },
    })

    await recordHistory(id, workshopId, existing.status, 'Accepted',
      { id: userId, name: userName, roleCode },
      `Technician assigned: ${technician.name}`,
      notes || null)

    return success(res, { job }, 'Technician assigned')
  } catch (err) {
    next(err)
  }
}

async function assignController(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { controllerId, notes } = req.body

    if (!controllerId) return badRequest(res, 'Controller ID is required')

    const existing = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Job not found')

    const controller = await prisma.user.findFirst({ where: { id: controllerId, workshopId, deletedAt: null } })
    if (!controller) return notFound(res, 'Workshop Controller not found in this workshop')

    const job = await prisma.jobCard.update({
      where: { id },
      data: { assignedControllerId: controllerId, sentToControllerAt: new Date() },
    })

    await recordHistory(id, workshopId, existing.status, existing.status,
      { id: userId, name: userName, roleCode },
      `Workshop Controller assigned: ${controller.name}`,
      notes || null)

    return success(res, { job }, 'Controller assigned')
  } catch (err) {
    next(err)
  }
}

async function assignPartsInterpreter(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { partsInterpreterId, notes } = req.body

    if (!partsInterpreterId) return badRequest(res, 'Parts Interpreter ID is required')

    const existing = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Job not found')

    const pi = await prisma.user.findFirst({ where: { id: partsInterpreterId, workshopId, deletedAt: null } })
    if (!pi) return notFound(res, 'Parts Interpreter not found in this workshop')

    const newStatus = existing.status === 'Accepted' ? 'Accepted' : 'Accepted'
    const job = await prisma.jobCard.update({
      where: { id },
      data: { assignedPartsInterpreterId: partsInterpreterId, status: 'Accepted' },
    })

    await recordHistory(id, workshopId, existing.status, 'Accepted',
      { id: userId, name: userName, roleCode },
      `Parts Interpreter assigned: ${pi.name}`,
      notes || null)

    return success(res, { job }, 'Parts Interpreter assigned')
  } catch (err) {
    next(err)
  }
}

async function qcApprove(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { notes } = req.body

    const existing = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Job not found')

    const job = await prisma.jobCard.update({
      where: { id },
      data:  { status: 'Ready', qcApprovedAt: new Date(), qcApprovedByUserId: userId },
    })

    await recordHistory(id, workshopId, existing.status, 'Ready',
      { id: userId, name: userName, roleCode },
      'QC approved — vehicle ready',
      notes || null)

    return success(res, { job }, 'QC approved')
  } catch (err) {
    next(err)
  }
}

async function getChecklist(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const items = await prisma.jobChecklistItem.findMany({ where: { jobCardId: id }, orderBy: { createdAt: 'asc' } })
    return success(res, { items })
  } catch (err) {
    next(err)
  }
}

async function updateChecklist(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { label, state, color, isRequired, completedAt, notes, itemId } = req.body

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    let item
    if (itemId) {
      item = await prisma.jobChecklistItem.update({
        where: { id: itemId },
        data: {
          ...(state !== undefined       && { state }),
          ...(color                     && { color }),
          ...(completedAt !== undefined && { completedAt: completedAt ? new Date(completedAt) : null }),
          ...(notes !== undefined       && { notes }),
        },
      })
    } else {
      item = await prisma.jobChecklistItem.create({
        data: {
          jobCardId:  id,
          label:      label?.trim() || 'Checklist item',
          state:      state || null,
          color:      color || 'Green',
          isRequired: isRequired !== false,
          notes:      notes?.trim() || null,
        },
      })
    }

    return success(res, { item }, 'Checklist updated')
  } catch (err) {
    next(err)
  }
}

async function listIssues(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const issues = await prisma.jobIssue.findMany({ where: { jobCardId: id }, orderBy: { createdAt: 'desc' } })
    return success(res, { issues })
  } catch (err) {
    next(err)
  }
}

async function raiseIssue(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { id } = req.params
    const { title, severity, note } = req.body

    if (!title?.trim()) return badRequest(res, 'Issue title is required')
    if (!['High','Medium','Low'].includes(severity)) return badRequest(res, 'Severity must be High, Medium, or Low')

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const issue = await prisma.jobIssue.create({
      data: {
        jobCardId:      id,
        title:          title.trim(),
        severity,
        note:           note?.trim() || null,
        raisedByUserId: userId,
      },
    })
    return created(res, { issue }, 'Issue raised')
  } catch (err) {
    next(err)
  }
}

async function resolveIssue(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id, issueId } = req.params

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const issue = await prisma.jobIssue.update({
      where: { id: issueId },
      data:  { status: 'Resolved', resolvedAt: new Date() },
    })
    return success(res, { issue }, 'Issue resolved')
  } catch (err) {
    next(err)
  }
}

async function uploadMedia(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { id } = req.params

    const job = await prisma.jobCard.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')
    if (!req.files || req.files.length === 0) return badRequest(res, 'No files uploaded')

    const media = await Promise.all(req.files.map(file =>
      prisma.jobMedia.create({
        data: {
          jobCardId:        id,
          uploadedByUserId: userId,
          mediaType:        file.mimetype.startsWith('video/') ? 'Video' : 'Photo',
          fileName:         file.originalname,
          fileUrl:          `/uploads/${file.filename}`,
          fileSize:         file.size,
          mimeType:         file.mimetype,
        },
      })
    ))
    return created(res, { media }, 'Media uploaded')
  } catch (err) {
    next(err)
  }
}

async function notifyCustomer(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { id } = req.params
    const { channel, message } = req.body

    const job = await prisma.jobCard.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: { quotation: { select: { customerId: true } } },
    })
    if (!job) return notFound(res, 'Job not found')

    await prisma.notification.create({
      data: {
        workshopId,
        customerId:  job.quotation?.customerId || null,
        userId,
        jobCardId:   id,
        channel:     channel || 'WhatsApp',
        type:        'JobCompleted',
        message:     message || 'Your vehicle service is complete.',
        status:      'Sent',
        sentAt:      new Date(),
      },
    })

    await prisma.jobCard.update({ where: { id }, data: { customerNotifiedAt: new Date() } })
    return success(res, null, 'Customer notified')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listJobs, createJob, getJob, updateJob, updateJobStatus, updateJobProgress,
  assignTechnician, assignController, assignPartsInterpreter, qcApprove,
  getChecklist, updateChecklist,
  listIssues, raiseIssue, resolveIssue,
  uploadMedia, notifyCustomer,
}

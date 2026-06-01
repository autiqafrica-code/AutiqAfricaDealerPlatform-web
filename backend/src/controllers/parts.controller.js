'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')

// ── Dashboard ─────────────────────────────────────────────────────────────────

async function getDashboard(req, res, next) {
  try {
    const { workshopId } = req.user

    const [
      quotationCount,
      waitingPartsCount,
      failedComponentCount,
      reviewedTodayCount,
    ] = await Promise.all([
      prisma.quotation.count({
        where: { workshopId, sendToPartsInterpreter: true, deletedAt: null,
          status: { notIn: ['CustomerApproved', 'CustomerRejected'] } },
      }),
      prisma.jobCard.count({
        where: { workshopId, status: 'WaitingParts', deletedAt: null },
      }),
      prisma.failedComponent.count({
        where: { workshopId, status: { in: ['PendingReview', 'InReview'] } },
      }),
      prisma.failedComponentReview.count({
        where: {
          partsInterpreter: { workshopId },
          createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ])

    return success(res, {
      quotationsPendingPricing: quotationCount,
      jobsWaitingParts:         waitingPartsCount,
      failedComponentsPending:  failedComponentCount,
      reviewedToday:            reviewedTodayCount,
    })
  } catch (err) {
    next(err)
  }
}

// ── Quotation Requests (sendToPartsInterpreter=true) ─────────────────────────

async function listQuotationRequests(req, res, next) {
  try {
    const { workshopId } = req.user
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId, sendToPartsInterpreter: true, deletedAt: null }

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
            include: { updatedBy: { select: { name: true } } },
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

// ── Jobs Waiting for Parts ────────────────────────────────────────────────────

async function listWaitingJobs(req, res, next) {
  try {
    const { workshopId } = req.user
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId, status: 'WaitingParts', deletedAt: null }

    const [jobs, total] = await Promise.all([
      prisma.jobCard.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          quotation: {
            select: {
              quoteNumber: true,
              repairType:  true,
              currency:    true,
              customer:    { select: { id: true, name: true, phone: true } },
            },
          },
          vehicle:            { select: { id: true, registrationNo: true, makeModel: true } },
          assignedTechnician: { select: { id: true, name: true } },
          issues:             { where: { status: 'Open' }, orderBy: { createdAt: 'desc' } },
        },
      }),
      prisma.jobCard.count({ where }),
    ])

    return success(res, paginate(jobs, total, page, limit))
  } catch (err) {
    next(err)
  }
}

// ── Failed Components ─────────────────────────────────────────────────────────

async function listFailedComponents(req, res, next) {
  try {
    const { workshopId } = req.user
    const { status } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId }
    if (status) where.status = status

    const [components, total] = await Promise.all([
      prisma.failedComponent.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          technician: { select: { id: true, name: true } },
          jobCard:    { select: { id: true, jobNumber: true } },
          quotation:  { select: { id: true, quoteNumber: true } },
          review:     true,
        },
      }),
      prisma.failedComponent.count({ where }),
    ])

    return success(res, paginate(components, total, page, limit))
  } catch (err) {
    next(err)
  }
}

async function getFailedComponent(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const component = await prisma.failedComponent.findFirst({
      where: { id, workshopId },
      include: {
        technician: { select: { id: true, name: true } },
        jobCard: {
          select: {
            id: true, jobNumber: true, status: true, progress: true,
            quotation: { select: { quoteNumber: true, repairType: true,
              customer: { select: { name: true, phone: true } } } },
          },
        },
        quotation:  { select: { id: true, quoteNumber: true, repairType: true } },
        review: {
          include: { partsInterpreter: { select: { id: true, name: true } } },
        },
      },
    })

    if (!component) return notFound(res, 'Failed component not found')
    return success(res, { component })
  } catch (err) {
    next(err)
  }
}

async function createFailedComponent(req, res, next) {
  try {
    const { workshopId, id: technicianId } = req.user
    const {
      jobCardId, quotationId, componentName, failureDescription,
      severity, replacementRequired, technicianNotes, technicianCostImpact,
    } = req.body

    if (!componentName?.trim()) return badRequest(res, 'Component name is required')

    // Validate job belongs to workshop
    if (jobCardId) {
      const job = await prisma.jobCard.findFirst({ where: { id: jobCardId, workshopId, deletedAt: null } })
      if (!job) return notFound(res, 'Job not found')
    }

    const workshop = await prisma.workshop.findUnique({ where: { id: workshopId }, select: { currency: true } })

    const component = await prisma.failedComponent.create({
      data: {
        workshopId,
        technicianId,
        jobCardId:            jobCardId    || null,
        quotationId:          quotationId  || null,
        componentName:        componentName.trim(),
        failureDescription:   failureDescription?.trim() || null,
        severity:             severity || 'Medium',
        replacementRequired:  replacementRequired !== false,
        technicianNotes:      technicianNotes?.trim() || null,
        technicianCostImpact: technicianCostImpact ? parseFloat(technicianCostImpact) : null,
        currency:             workshop?.currency || 'ZAR',
        status:               'PendingReview',
      },
      include: {
        technician: { select: { id: true, name: true } },
        jobCard:    { select: { id: true, jobNumber: true } },
      },
    })

    return created(res, { component }, 'Failed component recorded')
  } catch (err) {
    next(err)
  }
}

async function uploadComponentMedia(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { mediaCategory } = req.body

    const component = await prisma.failedComponent.findFirst({ where: { id, workshopId } })
    if (!component) return notFound(res, 'Failed component not found')
    if (!req.file) return badRequest(res, 'No file uploaded')

    const fileUrl = `/uploads/${req.file.filename}`
    const updateData = {}

    if (mediaCategory === 'replaced') {
      updateData.replacedComponentImageUrl = fileUrl
    } else {
      updateData.failedComponentImageUrl = fileUrl
    }

    const updated = await prisma.failedComponent.update({
      where: { id },
      data: updateData,
    })

    return success(res, { component: updated, fileUrl }, 'Media uploaded')
  } catch (err) {
    next(err)
  }
}

async function reviewFailedComponent(req, res, next) {
  try {
    const { workshopId, id: partsInterpreterId } = req.user
    const { id } = req.params
    const {
      replacementDecision, partNumber, partDescription,
      availabilityStatus, quantityRequired, unitCost,
      supplierName, supplierContact, expectedDeliveryDate,
      alternativePartSuggested, alternativePartNumber,
      partsNotes, status,
    } = req.body

    if (!replacementDecision) return badRequest(res, 'Replacement decision is required')

    const component = await prisma.failedComponent.findFirst({ where: { id, workshopId } })
    if (!component) return notFound(res, 'Failed component not found')

    const qty  = parseInt(quantityRequired) || 1
    const unit = unitCost ? parseFloat(unitCost) : null
    const total = unit ? unit * qty : null

    const review = await prisma.failedComponentReview.upsert({
      where:  { failedComponentId: id },
      update: {
        replacementDecision:      replacementDecision,
        partNumber:               partNumber?.trim()               || null,
        partDescription:          partDescription?.trim()          || null,
        availabilityStatus:       availabilityStatus               || null,
        quantityRequired:         qty,
        unitCost:                 unit,
        totalCost:                total,
        supplierName:             supplierName?.trim()             || null,
        supplierContact:          supplierContact?.trim()          || null,
        expectedDeliveryDate:     expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        alternativePartSuggested: alternativePartSuggested?.trim() || null,
        alternativePartNumber:    alternativePartNumber?.trim()    || null,
        partsNotes:               partsNotes?.trim()               || null,
        status:                   status || 'InReview',
        reviewedAt:               new Date(),
      },
      create: {
        failedComponentId:        id,
        partsInterpreterId,
        replacementDecision,
        partNumber:               partNumber?.trim()               || null,
        partDescription:          partDescription?.trim()          || null,
        availabilityStatus:       availabilityStatus               || null,
        quantityRequired:         qty,
        unitCost:                 unit,
        totalCost:                total,
        currency:                 component.currency || 'ZAR',
        supplierName:             supplierName?.trim()             || null,
        supplierContact:          supplierContact?.trim()          || null,
        expectedDeliveryDate:     expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        alternativePartSuggested: alternativePartSuggested?.trim() || null,
        alternativePartNumber:    alternativePartNumber?.trim()    || null,
        partsNotes:               partsNotes?.trim()               || null,
        status:                   status || 'InReview',
        reviewedAt:               new Date(),
      },
    })

    // Update component status
    const compStatus = replacementDecision === 'Replacement Approved' ? 'Approved'
      : replacementDecision === 'Replacement Rejected' ? 'Rejected'
      : replacementDecision === 'Clarification Required' ? 'ClarificationRequested'
      : 'InReview'

    await prisma.failedComponent.update({
      where: { id },
      data:  { status: compStatus },
    })

    return success(res, { review }, 'Review submitted')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  getDashboard,
  listQuotationRequests,
  listWaitingJobs,
  listFailedComponents,
  getFailedComponent,
  createFailedComponent,
  uploadComponentMedia,
  reviewFailedComponent,
}

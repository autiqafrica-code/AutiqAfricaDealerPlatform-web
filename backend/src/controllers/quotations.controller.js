'use strict'

const crypto       = require('crypto')
const prisma       = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')
const { quoteNumber } = require('../utils/idGenerator')
const notifications = require('../services/notifications.service')
const { customerApprovalEmail, staffAssignmentEmail } = require('../utils/emailTemplates')

async function listQuotations(req, res, next) {
  try {
    const { workshopId, id: userId, roleCode } = req.user
    const { status, customerId, vehicleId } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId, deletedAt: null }
    if (status)     where.status     = status
    if (customerId) where.customerId = customerId
    if (vehicleId)  where.vehicleId  = vehicleId

    // When filtering by role flag, show only broadcast (null) OR specifically assigned to this user,
    // and exclude quotations already sent back by that role (no longer need input)
    if (req.query.sendToTechnician === 'true') {
      where.sendToTechnician    = true
      where.technicianSentBack  = false
      where.OR = [{ assignedTechnicianId: null }, { assignedTechnicianId: userId }]
    }
    if (req.query.sendToWorkshopController === 'true') {
      where.sendToWorkshopController    = true
      where.workshopControllerSentBack  = false
      where.OR = [{ assignedWorkshopControllerId: null }, { assignedWorkshopControllerId: userId }]
    }
    if (req.query.sendToPartsInterpreter === 'true') {
      where.sendToPartsInterpreter    = true
      where.partsInterpreterSentBack  = false
      where.OR = [{ assignedPartsInterpreterId: null }, { assignedPartsInterpreterId: userId }]
    }

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
          _count:    { select: { updates: true } },
          assignedTechnician:       { select: { id: true, name: true } },
          assignedWorkshopCtrl:     { select: { id: true, name: true } },
          assignedPartsInterpreter: { select: { id: true, name: true } },
        },
      }),
      prisma.quotation.count({ where }),
    ])

    return success(res, paginate(quotations, total, page, limit))
  } catch (err) {
    next(err)
  }
}

async function createQuotation(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { customerId, vehicleId, repairType, priority, customerComplaint, currency } = req.body

    if (!customerId) return badRequest(res, 'Customer is required')
    if (!vehicleId)  return badRequest(res, 'Vehicle is required')

    const customer = await prisma.customer.findFirst({ where: { id: customerId, workshopId, deletedAt: null } })
    if (!customer) return notFound(res, 'Customer not found')

    const count    = await prisma.quotation.count({ where: { workshopId } })
    const qNum     = quoteNumber(count + 1)
    const workshop = await prisma.workshop.findUnique({ where: { id: workshopId }, select: { currency: true } })
    const cur      = currency || workshop?.currency || 'ZAR'

    const quotation = await prisma.quotation.create({
      data: {
        quoteNumber: qNum,
        workshopId,
        customerId,
        vehicleId,
        createdByUserId: userId,
        repairType: repairType?.trim() || '',
        priority: priority || 'Amber',
        customerComplaint: customerComplaint?.trim() || null,
        currency: cur,
        status: 'Draft',
      },
      include: {
        customer:  { select: { id: true, name: true, phone: true } },
        vehicle:   { select: { id: true, registrationNo: true, makeModel: true } },
        lineItems: true,
      },
    })

    return created(res, { quotation }, 'Quotation created successfully')
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
        customer:  { select: { id: true, name: true, phone: true, email: true, whatsapp: true, communicationPreference: true } },
        vehicle:   { select: { id: true, registrationNo: true, makeModel: true, vehicleType: true } },
        lineItems: { orderBy: { createdAt: 'asc' } },
        updates:   {
          orderBy: { createdAt: 'desc' },
          include: { updatedBy: { select: { name: true, role: true } } },
        },
        createdBy:                { select: { name: true, role: true } },
        assignedTechnician:       { select: { id: true, name: true } },
        assignedWorkshopCtrl:     { select: { id: true, name: true } },
        assignedPartsInterpreter: { select: { id: true, name: true } },
      },
    })

    if (!quotation) return notFound(res, 'Quotation not found')
    return success(res, { quotation })
  } catch (err) {
    next(err)
  }
}

async function updateQuotation(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { repairType, priority, customerComplaint, currency, frontDeskStatus } = req.body

    const existing = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Quotation not found')

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        ...(repairType              && { repairType: repairType.trim() }),
        ...(priority                && { priority }),
        ...(customerComplaint !== undefined && { customerComplaint: customerComplaint?.trim() || null }),
        ...(currency                && { currency }),
        ...(frontDeskStatus !== undefined   && { frontDeskStatus }),
      },
    })

    return success(res, { quotation }, 'Quotation updated')
  } catch (err) {
    next(err)
  }
}

async function deleteQuotation(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const existing = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Quotation not found')

    await prisma.quotation.update({ where: { id }, data: { deletedAt: new Date() } })
    return success(res, null, 'Quotation deleted')
  } catch (err) {
    next(err)
  }
}

async function sendInternalRequests(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const {
      sendToWorkshopController, sendToTechnician, sendToPartsInterpreter,
      assignedTechnicianId, assignedWorkshopControllerId, assignedPartsInterpreterId,
    } = req.body

    const existing = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Quotation not found')

    // Validate assigned users belong to the same workshop
    const userIds = [assignedTechnicianId, assignedWorkshopControllerId, assignedPartsInterpreterId].filter(Boolean)
    if (userIds.length > 0) {
      const count = await prisma.user.count({ where: { id: { in: userIds }, workshopId, deletedAt: null } })
      if (count !== userIds.length) return badRequest(res, 'One or more assigned users not found in this workshop')
    }

    const quotation = await prisma.quotation.update({
      where: { id },
      data: {
        sendToWorkshopController:    !!sendToWorkshopController,
        sendToTechnician:            !!sendToTechnician,
        sendToPartsInterpreter:      !!sendToPartsInterpreter,
        assignedTechnicianId:        sendToTechnician         ? (assignedTechnicianId        || null) : null,
        assignedWorkshopControllerId: sendToWorkshopController ? (assignedWorkshopControllerId || null) : null,
        assignedPartsInterpreterId:  sendToPartsInterpreter   ? (assignedPartsInterpreterId  || null) : null,
        status: 'InternalReview',
      },
    })

    // Email only specifically-assigned staff (not broadcast)
    const assignmentPairs = [
      { userId: assignedTechnicianId,         flag: sendToTechnician,         roleLabel: 'Technician' },
      { userId: assignedWorkshopControllerId, flag: sendToWorkshopController, roleLabel: 'Workshop Controller' },
      { userId: assignedPartsInterpreterId,   flag: sendToPartsInterpreter,   roleLabel: 'Parts Interpreter' },
    ].filter(p => p.flag && p.userId)

    if (assignmentPairs.length > 0) {
      const fullQuotation = await prisma.quotation.findFirst({
        where: { id, workshopId, deletedAt: null },
        include: {
          customer: { select: { name: true } },
          vehicle:  { select: { registrationNo: true, makeModel: true } },
          lineItems: { orderBy: { createdAt: 'asc' } },
          workshop:  { select: { name: true } },
        },
      })

      const dashboardUrl = process.env.FRONTEND_URL || 'http://localhost:5173'

      await Promise.all(assignmentPairs.map(async ({ userId, roleLabel }) => {
        const staffUser = await prisma.user.findFirst({ where: { id: userId, deletedAt: null } })
        if (!staffUser) return

        await notifications.sendEmail({
          to:         staffUser.loginEmail,
          subject:    `New quotation ${fullQuotation.quoteNumber} assigned to you — ${fullQuotation.workshop?.name || 'Workshop'}`,
          html:       staffAssignmentEmail({
            recipientName:    staffUser.name,
            roleLabel,
            quoteNumber:      fullQuotation.quoteNumber,
            customerName:     fullQuotation.customer?.name   || '—',
            vehicleReg:       fullQuotation.vehicle?.registrationNo || '—',
            vehicleMakeModel: fullQuotation.vehicle?.makeModel      || '—',
            customerComplaint: fullQuotation.customerComplaint,
            lineItems:        fullQuotation.lineItems || [],
            dashboardUrl,
          }),
          workshopId,
          userId: staffUser.id,
          quotationId: id,
          type: 'StaffAssignment',
        })
      }))
    }

    return success(res, { quotation }, 'Internal requests sent')
  } catch (err) {
    next(err)
  }
}

async function sendToCustomer(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const existing = await prisma.quotation.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        customer:  { select: { name: true, email: true } },
        vehicle:   { select: { registrationNo: true, makeModel: true } },
        lineItems: { orderBy: { createdAt: 'asc' } },
        workshop:  { select: { name: true } },
      },
    })
    if (!existing) return notFound(res, 'Quotation not found')

    const token = crypto.randomBytes(32).toString('hex')

    const quotation = await prisma.quotation.update({
      where: { id },
      data: { approvalToken: token, status: 'SentToCustomer', sentToCustomerAt: new Date() },
    })

    const base       = process.env.FRONTEND_URL || 'http://localhost:5173'
    const approvalUrl = `${base}/portal/${token}`

    await notifications.sendEmail({
      to:          existing.customer?.email,
      subject:     `Your repair quotation ${existing.quoteNumber} is ready for approval — ${existing.workshop?.name || 'Workshop'}`,
      html:        customerApprovalEmail({
        quoteNumber:      existing.quoteNumber,
        customerName:     existing.customer?.name   || 'Customer',
        vehicleReg:       existing.vehicle?.registrationNo || '—',
        vehicleMakeModel: existing.vehicle?.makeModel      || '—',
        lineItems:        existing.lineItems || [],
        totalEstimate:    existing.totalEstimate,
        currency:         existing.currency || 'ZAR',
        approvalUrl,
        workshopName:     existing.workshop?.name,
      }),
      workshopId,
      customerId:  existing.customerId,
      quotationId: id,
      type:        'QuotationApproval',
    })

    return success(res, { quotation, approvalUrl, token }, 'Quotation sent to customer for approval')
  } catch (err) {
    next(err)
  }
}

async function addLineItem(req, res, next) {
  try {
    const { workshopId, roleCode } = req.user
    const { id } = req.params
    const { item, repairType, repairTime, cost, currency, status, priority, notes } = req.body

    if (!item?.trim()) return badRequest(res, 'Item description is required')

    const existing = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Quotation not found')

    const lineItem = await prisma.quotationLineItem.create({
      data: {
        quotationId: id,
        item:        item.trim(),
        addedByRole: roleCode || 'FrontDesk',
        repairType:  repairType?.trim()  || null,
        repairTime:  repairTime?.trim()  || null,
        cost:        cost ? parseFloat(cost) : null,
        currency:    currency || existing.currency || 'ZAR',
        status:      status || 'Added',
        priority:    priority?.trim() || null,
        notes:       notes?.trim()    || null,
      },
    })

    const items = await prisma.quotationLineItem.findMany({ where: { quotationId: id } })
    const total = items.reduce((s, li) => s + parseFloat(li.cost || 0), 0)
    await prisma.quotation.update({ where: { id }, data: { totalEstimate: total } })

    return created(res, { lineItem }, 'Line item added')
  } catch (err) {
    next(err)
  }
}

async function updateLineItem(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id, liId } = req.params
    const { item, repairType, repairTime, cost, currency, status, priority, notes } = req.body

    const existing = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Quotation not found')

    const lineItem = await prisma.quotationLineItem.update({
      where: { id: liId },
      data: {
        ...(item       !== undefined && { item: item.trim() }),
        ...(repairType !== undefined && { repairType: repairType?.trim() || null }),
        ...(repairTime !== undefined && { repairTime: repairTime?.trim() || null }),
        ...(cost       !== undefined && { cost: cost ? parseFloat(cost) : null }),
        ...(currency                 && { currency }),
        ...(status                   && { status }),
        ...(priority   !== undefined && { priority: priority?.trim() || null }),
        ...(notes      !== undefined && { notes:    notes?.trim()    || null }),
      },
    })

    const items = await prisma.quotationLineItem.findMany({ where: { quotationId: id } })
    const total = items.reduce((s, li) => s + parseFloat(li.cost || 0), 0)
    await prisma.quotation.update({ where: { id }, data: { totalEstimate: total } })

    return success(res, { lineItem }, 'Line item updated')
  } catch (err) {
    next(err)
  }
}

async function deleteLineItem(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id, liId } = req.params

    const existing = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Quotation not found')

    await prisma.quotationLineItem.delete({ where: { id: liId } })

    const items = await prisma.quotationLineItem.findMany({ where: { quotationId: id } })
    const total = items.reduce((s, li) => s + parseFloat(li.cost || 0), 0)
    await prisma.quotation.update({ where: { id }, data: { totalEstimate: total } })

    return success(res, null, 'Line item removed')
  } catch (err) {
    next(err)
  }
}

async function submitRoleUpdate(req, res, next) {
  try {
    const { workshopId, id: userId, roleCode } = req.user
    const { id } = req.params
    const { focusNote, timeEta, costImpact, notes, status } = req.body

    const existing = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Quotation not found')

    const update = await prisma.quotationUpdate.create({
      data: {
        quotationId:     id,
        updatedByUserId: userId,
        role:            roleCode || 'Unknown',
        focusNote:       focusNote?.trim() || null,
        timeEta:         timeEta?.trim()   || null,
        costImpact:      costImpact ? parseFloat(costImpact) : null,
        currency:        existing.currency || 'ZAR',
        status:          status || 'InProgress',
        notes:           notes?.trim() || null,
      },
    })

    await prisma.quotation.update({ where: { id }, data: { status: 'InternalUpdatesReceived' } })

    return created(res, { update }, 'Role update submitted')
  } catch (err) {
    next(err)
  }
}

async function uploadMedia(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { id } = req.params

    const existing = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Quotation not found')
    if (!req.files || req.files.length === 0) return badRequest(res, 'No files uploaded')

    const media = await Promise.all(req.files.map(file =>
      prisma.quotationMedia.create({
        data: {
          quotationId:      id,
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

// ── Customer portal (public, token-based) ─────────────────────────────────────

async function getApprovalPage(req, res, next) {
  try {
    const { token } = req.params

    const quotation = await prisma.quotation.findFirst({
      where: { approvalToken: token, deletedAt: null },
      include: {
        customer:  { select: { name: true, phone: true } },
        vehicle:   { select: { registrationNo: true, makeModel: true } },
        lineItems: { orderBy: { createdAt: 'asc' } },
        workshop:  { select: { name: true, phone: true, email: true } },
      },
    })

    if (!quotation) return notFound(res, 'Approval link is invalid or has expired')
    return success(res, { quotation })
  } catch (err) {
    next(err)
  }
}

async function customerApprove(req, res, next) {
  try {
    const { token } = req.params
    const { customerSignature } = req.body

    const quotation = await prisma.quotation.findFirst({ where: { approvalToken: token, deletedAt: null } })
    if (!quotation)                                   return notFound(res, 'Approval link is invalid or has expired')
    if (quotation.status === 'CustomerApproved')      return badRequest(res, 'Quotation already approved')
    if (quotation.status === 'CustomerRejected')      return badRequest(res, 'Quotation was already rejected')

    const updated = await prisma.quotation.update({
      where: { id: quotation.id },
      data:  { status: 'CustomerApproved', approvedAt: new Date(), customerSignature: customerSignature || null },
    })

    return success(res, { quotation: updated }, 'Quotation approved successfully')
  } catch (err) {
    next(err)
  }
}

async function customerReject(req, res, next) {
  try {
    const { token } = req.params
    const { reason } = req.body

    const quotation = await prisma.quotation.findFirst({ where: { approvalToken: token, deletedAt: null } })
    if (!quotation)                              return notFound(res, 'Approval link is invalid or has expired')
    if (quotation.status === 'CustomerApproved') return badRequest(res, 'Quotation already approved')
    if (quotation.status === 'CustomerRejected') return badRequest(res, 'Quotation was already rejected')

    const updated = await prisma.quotation.update({
      where: { id: quotation.id },
      data:  { status: 'CustomerRejected', rejectedAt: new Date(), customerSignature: reason || null },
    })

    return success(res, { quotation: updated }, 'Quotation rejected')
  } catch (err) {
    next(err)
  }
}

const ROLE_SENT_BACK_FIELD = {
  TECHNICIAN:           'technicianSentBack',
  WORKSHOP_CONTROLLER:  'workshopControllerSentBack',
  PARTS_INTERPRETER:    'partsInterpreterSentBack',
}

const ROLE_NOTES_FIELD = {
  TECHNICIAN:           'technicianNotes',
  WORKSHOP_CONTROLLER:  'workshopControllerNotes',
  PARTS_INTERPRETER:    'partsInterpreterNotes',
}

const ROLE_COST_FIELD = {
  TECHNICIAN:           'technicianCost',
  WORKSHOP_CONTROLLER:  'workshopControllerCost',
  PARTS_INTERPRETER:    'partsInterpreterCost',
}

const ROLE_TIME_FIELD = {
  TECHNICIAN:           'technicianRepairTime',
  WORKSHOP_CONTROLLER:  'workshopControllerRepairTime',
  PARTS_INTERPRETER:    'partsInterpreterRepairTime',
}

const COST_SOURCE_MAP = {
  TECHNICIAN:          { costField: 'technicianCost',         timeField: 'technicianRepairTime' },
  WORKSHOP_CONTROLLER: { costField: 'workshopControllerCost', timeField: 'workshopControllerRepairTime' },
  PARTS_INTERPRETER:   { costField: 'partsInterpreterCost',   timeField: 'partsInterpreterRepairTime' },
}

async function updateLineItemRoleNotes(req, res, next) {
  try {
    const { workshopId, roleCode } = req.user
    const { id, liId } = req.params
    const { notes, cost, repairTime } = req.body

    const sentBackField = ROLE_SENT_BACK_FIELD[roleCode]
    const notesField    = ROLE_NOTES_FIELD[roleCode]
    const costField     = ROLE_COST_FIELD[roleCode]
    const timeField     = ROLE_TIME_FIELD[roleCode]
    if (!sentBackField || !notesField) return badRequest(res, 'Role not permitted')

    const quotation = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!quotation) return notFound(res, 'Quotation not found')
    if (quotation[sentBackField]) return badRequest(res, 'You have already sent this quotation back to Front Desk')

    const lineItem = await prisma.quotationLineItem.findFirst({ where: { id: liId, quotationId: id } })
    if (!lineItem) return notFound(res, 'Line item not found')

    const updated = await prisma.quotationLineItem.update({
      where: { id: liId },
      data: {
        ...(notes !== undefined && { [notesField]: notes?.trim() || null }),
        ...(costField && cost !== undefined && { [costField]: cost !== '' && cost !== null ? parseFloat(cost) : null }),
        ...(timeField && repairTime !== undefined && { [timeField]: repairTime?.trim() || null }),
      },
    })

    return success(res, { lineItem: updated }, 'Line item saved')
  } catch (err) {
    next(err)
  }
}

async function selectLineItemCost(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id, liId } = req.params
    const { source } = req.body

    if (!COST_SOURCE_MAP[source]) {
      return badRequest(res, 'Invalid source. Must be TECHNICIAN, WORKSHOP_CONTROLLER, or PARTS_INTERPRETER')
    }

    const quotation = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!quotation) return notFound(res, 'Quotation not found')

    const lineItem = await prisma.quotationLineItem.findFirst({ where: { id: liId, quotationId: id } })
    if (!lineItem) return notFound(res, 'Line item not found')

    const { costField, timeField } = COST_SOURCE_MAP[source]
    const selectedCost = lineItem[costField]
    const selectedTime = lineItem[timeField]

    const updated = await prisma.quotationLineItem.update({
      where: { id: liId },
      data: {
        cost:               selectedCost ?? lineItem.cost,
        repairTime:         selectedTime ?? lineItem.repairTime,
        selectedCostSource: source,
      },
    })

    // Recalculate total estimate
    const items = await prisma.quotationLineItem.findMany({ where: { quotationId: id } })
    const total = items.reduce((s, li) => s + parseFloat(li.cost || 0), 0)
    await prisma.quotation.update({ where: { id }, data: { totalEstimate: total } })

    return success(res, { lineItem: updated }, 'Cost selection saved')
  } catch (err) {
    next(err)
  }
}

async function sendBackToFrontDesk(req, res, next) {
  try {
    const { workshopId, id: userId, roleCode } = req.user
    const { id } = req.params
    const { overallNotes } = req.body

    const sentBackField = ROLE_SENT_BACK_FIELD[roleCode]
    if (!sentBackField) return badRequest(res, 'Role not permitted')

    const quotation = await prisma.quotation.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!quotation) return notFound(res, 'Quotation not found')
    if (quotation[sentBackField]) return badRequest(res, 'Already sent back to Front Desk')

    await Promise.all([
      prisma.quotation.update({
        where: { id },
        data:  { [sentBackField]: true, status: 'InternalUpdatesReceived' },
      }),
      prisma.quotationUpdate.create({
        data: {
          quotationId:     id,
          updatedByUserId: userId,
          role:            roleCode,
          notes:           overallNotes?.trim() || null,
          status:          'Completed',
          sentBackAt:      new Date(),
          currency:        quotation.currency || 'ZAR',
        },
      }),
    ])

    return success(res, {}, 'Sent back to Front Desk')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listQuotations, createQuotation, getQuotation, updateQuotation, deleteQuotation,
  sendInternalRequests, sendToCustomer,
  addLineItem, updateLineItem, deleteLineItem,
  submitRoleUpdate, uploadMedia,
  updateLineItemRoleNotes, sendBackToFrontDesk, selectLineItemCost,
  getApprovalPage, customerApprove, customerReject,
}

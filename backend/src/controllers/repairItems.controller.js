'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')

// ── Helpers ───────────────────────────────────────────────────────────────────

const VALID_STATUSES = [
  'Pending', 'AwaitingTechInput', 'AwaitingPartsInput', 'AwaitingControllerInput',
  'InputsComplete', 'QuotationBuilt', 'CustomerApproved', 'CustomerRejected',
  'InProgress', 'Completed', 'Cancelled', 'Skipped',
]

const VALID_PRIORITIES = ['Red', 'Amber', 'Green']

function calcTotalVehicleDuration(repairItems) {
  const parallel = repairItems.filter(r => r.isParallelAllowed !== false)
  const sequential = repairItems.filter(r => r.isParallelAllowed === false).sort((a, b) => (a.sequenceOrder || 0) - (b.sequenceOrder || 0))
  const parallelMax = parallel.reduce((max, r) => Math.max(max, r.calculatedDurationMinutes || r.estimatedDurationMinutes || 0), 0)
  const sequentialSum = sequential.reduce((s, r) => s + (r.calculatedDurationMinutes || r.estimatedDurationMinutes || 0), 0)
  return parallelMax + sequentialSum
}

async function notifyRole(workshopId, userId, jobCardId, repairItemId, type, message) {
  return prisma.notification.create({
    data: { workshopId, userId: userId || null, jobCardId: jobCardId || null, channel: 'WhatsApp', type, message, status: 'Pending' },
  }).catch(() => {})
}

// ── List repair items for a job ───────────────────────────────────────────────

async function listRepairItems(req, res, next) {
  try {
    const { workshopId } = req.user
    const { jobId } = req.params

    const job = await prisma.jobCard.findFirst({ where: { id: jobId, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const items = await prisma.repairItem.findMany({
      where: { jobCardId: jobId, workshopId, deletedAt: null },
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      include: {
        inputs:       { orderBy: { createdAt: 'desc' } },
        partsOptions: { orderBy: { createdAt: 'asc' } },
        timeEstimates:{ orderBy: { createdAt: 'desc' } },
        requestedBy:  { select: { id: true, name: true } },
      },
    })

    const totalDurationMinutes = calcTotalVehicleDuration(items)

    return success(res, { items, totalDurationMinutes })
  } catch (err) { next(err) }
}

// ── Get single repair item ────────────────────────────────────────────────────

async function getRepairItem(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const item = await prisma.repairItem.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        inputs:       { include: { user: { select: { id: true, name: true, role: true } } }, orderBy: { createdAt: 'desc' } },
        partsOptions: { orderBy: { recommended: 'desc' } },
        timeEstimates:{ include: { sourceUser: { select: { id: true, name: true } } }, orderBy: { createdAt: 'desc' } },
        requestedBy:  { select: { id: true, name: true } },
        vehicle:      { select: { makeModel: true, registrationNo: true } },
      },
    })

    if (!item) return notFound(res, 'Repair item not found')
    return success(res, { item })
  } catch (err) { next(err) }
}

// ── Create repair item ────────────────────────────────────────────────────────

async function createRepairItem(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { jobId } = req.params
    const {
      title, description, category, customerComplaint,
      priority, requiresTechnicianInput, requiresPartsInput, requiresControllerInput,
      estimatedDurationMinutes, isParallelAllowed, sequenceOrder, notes, sortOrder,
    } = req.body

    if (!title?.trim()) return badRequest(res, 'Repair item title is required')
    if (priority && !VALID_PRIORITIES.includes(priority)) return badRequest(res, 'Invalid priority')

    const job = await prisma.jobCard.findFirst({
      where: { id: jobId, workshopId, deletedAt: null },
      include: { quotation: { select: { customerId: true, vehicleId: true } } },
    })
    if (!job) return notFound(res, 'Job not found')

    const customerId = job.quotation?.customerId
    const vehicleId  = job.vehicleId || job.quotation?.vehicleId
    if (!customerId) return badRequest(res, 'Job has no customer linked via quotation')
    if (!vehicleId)  return badRequest(res, 'Job has no vehicle linked')

    const item = await prisma.repairItem.create({
      data: {
        workshopId,
        jobCardId:    jobId,
        customerId,
        vehicleId,
        title:        title.trim(),
        description:  description?.trim() || null,
        category:     category?.trim()    || null,
        customerComplaint: customerComplaint?.trim() || null,
        requestedByUserId: userId,
        priority:     priority || 'Amber',
        requiresTechnicianInput:  requiresTechnicianInput  === true || requiresTechnicianInput  === 'true',
        requiresPartsInput:       requiresPartsInput       === true || requiresPartsInput       === 'true',
        requiresControllerInput:  requiresControllerInput  === true || requiresControllerInput  === 'true',
        estimatedDurationMinutes: estimatedDurationMinutes ? parseInt(estimatedDurationMinutes) : null,
        isParallelAllowed: isParallelAllowed !== false && isParallelAllowed !== 'false',
        sequenceOrder: sequenceOrder ? parseInt(sequenceOrder) : null,
        notes:     notes?.trim()    || null,
        sortOrder: sortOrder ? parseInt(sortOrder) : 0,
        updatedAt: new Date(),
      },
    })

    return created(res, { item }, 'Repair item created')
  } catch (err) { next(err) }
}

// ── Update repair item ────────────────────────────────────────────────────────

async function updateRepairItem(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const {
      title, description, category, customerComplaint, priority,
      requiresTechnicianInput, requiresPartsInput, requiresControllerInput,
      estimatedDurationMinutes, isParallelAllowed, sequenceOrder, notes, sortOrder,
    } = req.body

    const existing = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Repair item not found')

    const item = await prisma.repairItem.update({
      where: { id },
      data: {
        ...(title                         && { title: title.trim() }),
        ...(description !== undefined     && { description: description?.trim() || null }),
        ...(category !== undefined        && { category: category?.trim()       || null }),
        ...(customerComplaint !== undefined && { customerComplaint: customerComplaint?.trim() || null }),
        ...(priority                      && { priority }),
        ...(requiresTechnicianInput !== undefined && { requiresTechnicianInput: requiresTechnicianInput === true || requiresTechnicianInput === 'true' }),
        ...(requiresPartsInput !== undefined      && { requiresPartsInput: requiresPartsInput === true || requiresPartsInput === 'true' }),
        ...(requiresControllerInput !== undefined && { requiresControllerInput: requiresControllerInput === true || requiresControllerInput === 'true' }),
        ...(estimatedDurationMinutes !== undefined && { estimatedDurationMinutes: estimatedDurationMinutes ? parseInt(estimatedDurationMinutes) : null }),
        ...(isParallelAllowed !== undefined && { isParallelAllowed: isParallelAllowed !== false && isParallelAllowed !== 'false' }),
        ...(sequenceOrder !== undefined   && { sequenceOrder: sequenceOrder ? parseInt(sequenceOrder) : null }),
        ...(notes !== undefined           && { notes: notes?.trim() || null }),
        ...(sortOrder !== undefined       && { sortOrder: parseInt(sortOrder) }),
        updatedAt: new Date(),
      },
    })

    return success(res, { item }, 'Repair item updated')
  } catch (err) { next(err) }
}

// ── Delete (soft) repair item ─────────────────────────────────────────────────

async function deleteRepairItem(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const existing = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Repair item not found')
    if (['InProgress', 'Completed'].includes(existing.status)) {
      return badRequest(res, 'Cannot delete a repair item that is in progress or completed')
    }

    await prisma.repairItem.update({ where: { id }, data: { deletedAt: new Date(), status: 'Cancelled', updatedAt: new Date() } })
    return success(res, null, 'Repair item removed')
  } catch (err) { next(err) }
}

// ── Send repair item to Technician ────────────────────────────────────────────

async function sendToTechnician(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { technicianId } = req.body

    const item = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!item) return notFound(res, 'Repair item not found')

    const updated = await prisma.repairItem.update({
      where: { id },
      data: {
        status: 'AwaitingTechInput',
        requiresTechnicianInput: true,
        sentToTechnicianAt: new Date(),
        updatedAt: new Date(),
      },
    })

    if (technicianId) {
      await notifyRole(workshopId, technicianId, item.jobCardId, id, 'RepairItemAssigned',
        `New repair item assigned: ${item.title}. Please provide your diagnosis and estimate.`)
    }

    return success(res, { item: updated }, 'Repair item sent to technician')
  } catch (err) { next(err) }
}

// ── Send repair item to Parts Interpreter ────────────────────────────────────

async function sendToParts(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { partsInterpreterId } = req.body

    const item = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!item) return notFound(res, 'Repair item not found')

    const updated = await prisma.repairItem.update({
      where: { id },
      data: {
        status: item.status === 'AwaitingTechInput' ? item.status : 'AwaitingPartsInput',
        requiresPartsInput: true,
        sentToPartsAt: new Date(),
        updatedAt: new Date(),
      },
    })

    if (partsInterpreterId) {
      await notifyRole(workshopId, partsInterpreterId, item.jobCardId, id, 'RepairItemPartsCheck',
        `Parts check required for: ${item.title}. Please provide parts options and availability.`)
    }

    return success(res, { item: updated }, 'Repair item sent to parts interpreter')
  } catch (err) { next(err) }
}

// ── Send repair item to Workshop Controller ───────────────────────────────────

async function sendToController(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { controllerId } = req.body

    const item = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!item) return notFound(res, 'Repair item not found')

    const updated = await prisma.repairItem.update({
      where: { id },
      data: {
        status: 'AwaitingControllerInput',
        requiresControllerInput: true,
        sentToControllerAt: new Date(),
        updatedAt: new Date(),
      },
    })

    if (controllerId) {
      await notifyRole(workshopId, controllerId, item.jobCardId, id, 'RepairItemPlanning',
        `Workshop planning required for: ${item.title}. Please add bay allocation and labour estimate.`)
    }

    return success(res, { item: updated }, 'Repair item sent to workshop controller')
  } catch (err) { next(err) }
}

// ── Build quotation from all repair items for a job ───────────────────────────

async function buildQuotationFromRepairItems(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { jobId } = req.params
    const { currency } = req.body

    const job = await prisma.jobCard.findFirst({
      where: { id: jobId, workshopId, deletedAt: null },
      include: { quotation: true },
    })
    if (!job) return notFound(res, 'Job not found')
    if (!job.quotation) return badRequest(res, 'Job has no linked quotation')

    const repairItems = await prisma.repairItem.findMany({
      where: { jobCardId: jobId, workshopId, deletedAt: null },
      include: {
        inputs:       true,
        partsOptions: { where: { selected: true } },
        timeEstimates:{ orderBy: { createdAt: 'desc' } },
      },
    })

    if (repairItems.length === 0) return badRequest(res, 'No repair items found for this job')

    const curr = currency || job.quotation.currency || 'ZAR'

    // Build line items from inputs and selected parts options
    const lineItems = []
    let totalEstimate = 0
    const updatedItemIds = []

    for (const ri of repairItems) {
      // Labour / diagnosis from inputs
      for (const inp of ri.inputs) {
        if (inp.status === 'Submitted' && Number(inp.labourCost || 0) > 0) {
          const cost = Number(inp.labourCost)
          lineItems.push({
            quotationId:  job.quotation.id,
            repairItemId: ri.id,
            item:         `[${ri.title}] Labour — ${inp.roleCode}`,
            addedByRole:  inp.roleCode,
            repairTime:   inp.estimatedDurationMinutes ? `${inp.estimatedDurationMinutes}min` : null,
            cost,
            currency:     curr,
            lineType:     'LABOUR',
          })
          totalEstimate += cost
        }
      }

      // Selected parts options
      for (const opt of ri.partsOptions) {
        const cost = Number(opt.sellingPrice) * opt.quantity
        lineItems.push({
          quotationId:  job.quotation.id,
          repairItemId: ri.id,
          item:         `[${ri.title}] Parts — ${opt.partName}${opt.brand ? ` (${opt.brand})` : ''}`,
          addedByRole:  'PARTS_INTERPRETER',
          repairTime:   opt.leadTimeDays ? `${opt.leadTimeDays}d lead` : null,
          cost,
          currency:     curr,
          lineType:     'PART',
        })
        totalEstimate += cost
      }

      // If no inputs had costs, add a placeholder line for the repair item
      if (!ri.inputs.some(i => i.status === 'Submitted' && Number(i.labourCost || 0) > 0) && ri.partsOptions.length === 0) {
        lineItems.push({
          quotationId:  job.quotation.id,
          repairItemId: ri.id,
          item:         `[${ri.title}] — ${ri.description || ri.category || 'Service required'}`,
          addedByRole:  'FRONT_DESK',
          cost:         null,
          currency:     curr,
          lineType:     'SERVICE',
        })
      }

      updatedItemIds.push(ri.id)
    }

    // Calculate total vehicle duration (max of parallel, sum of sequential)
    const updatedDuration = calcTotalVehicleDuration(repairItems.map(ri => ({
      ...ri,
      calculatedDurationMinutes: ri.timeEstimates[0]?.totalDurationMinutes || ri.estimatedDurationMinutes || 0,
    })))

    await prisma.$transaction(async tx => {
      // Delete existing line items that came from repair items (but keep manually added ones)
      await tx.quotationLineItem.deleteMany({
        where: { quotationId: job.quotation.id, repairItemId: { not: null } },
      })

      // Create new line items
      if (lineItems.length > 0) {
        await tx.quotationLineItem.createMany({ data: lineItems })
      }

      // Update quotation total and duration
      await tx.quotation.update({
        where: { id: job.quotation.id },
        data: {
          totalEstimate: totalEstimate > 0 ? totalEstimate : job.quotation.totalEstimate,
          estimatedDurationMinutes: updatedDuration || null,
          updatedAt: new Date(),
        },
      })

      // Mark repair items as QuotationBuilt
      await tx.repairItem.updateMany({
        where: { id: { in: updatedItemIds } },
        data: { status: 'QuotationBuilt', updatedAt: new Date() },
      })
    })

    const updatedQuotation = await prisma.quotation.findUnique({
      where: { id: job.quotation.id },
      include: {
        lineItems: { orderBy: { createdAt: 'asc' } },
        customer:  { select: { name: true } },
      },
    })

    return success(res, {
      quotationId:             updatedQuotation.id,
      quoteNumber:             updatedQuotation.quoteNumber,
      totalEstimate:           Number(updatedQuotation.totalEstimate || 0),
      estimatedDurationMinutes: updatedQuotation.estimatedDurationMinutes,
      lineItemsCount:          updatedQuotation.lineItems.length,
    }, 'Quotation built from repair items')
  } catch (err) { next(err) }
}

// ── Get repair time summary for a job ─────────────────────────────────────────

async function getTimeSummary(req, res, next) {
  try {
    const { workshopId } = req.user
    const { jobId } = req.params

    const job = await prisma.jobCard.findFirst({ where: { id: jobId, workshopId, deletedAt: null } })
    if (!job) return notFound(res, 'Job not found')

    const items = await prisma.repairItem.findMany({
      where: { jobCardId: jobId, workshopId, deletedAt: null },
      include: { timeEstimates: { orderBy: { createdAt: 'desc' }, take: 1 }, partsOptions: { where: { selected: true } } },
    })

    const itemSummary = items.map(ri => {
      const latestEstimate = ri.timeEstimates[0]
      const partsLead = ri.partsOptions.reduce((max, o) => Math.max(max, ((o.leadTimeDays || 0) * 1440) + ((o.leadTimeHours || 0) * 60)), 0)
      const totalMins = latestEstimate?.totalDurationMinutes || ri.calculatedDurationMinutes || ri.estimatedDurationMinutes || 0
      return {
        id:           ri.id,
        title:        ri.title,
        status:       ri.status,
        isParallel:   ri.isParallelAllowed,
        sequenceOrder: ri.sequenceOrder,
        labourMinutes: latestEstimate?.labourDurationMinutes || 0,
        partsLeadMinutes: partsLead || latestEstimate?.partsLeadTimeMinutes || 0,
        totalMinutes: totalMins,
        displayTime:  formatDuration(totalMins),
      }
    })

    const totalMinutes = calcTotalVehicleDuration(items.map(ri => ({
      ...ri,
      calculatedDurationMinutes: ri.timeEstimates[0]?.totalDurationMinutes || ri.estimatedDurationMinutes || 0,
    })))

    return success(res, {
      items: itemSummary,
      totalVehicleMinutes: totalMinutes,
      totalVehicleDisplay: formatDuration(totalMinutes),
    })
  } catch (err) { next(err) }
}

function formatDuration(minutes) {
  if (!minutes) return '—'
  if (minutes < 60) return `${minutes} min`
  const days = Math.floor(minutes / 1440)
  const hrs  = Math.floor((minutes % 1440) / 60)
  const mins = minutes % 60
  const parts = []
  if (days) parts.push(`${days}d`)
  if (hrs)  parts.push(`${hrs}h`)
  if (mins) parts.push(`${mins}m`)
  return parts.join(' ')
}

// ── Mark repair item inputs complete (all required inputs received) ─────────────

async function markInputsComplete(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const item = await prisma.repairItem.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: { inputs: true },
    })
    if (!item) return notFound(res, 'Repair item not found')

    const updated = await prisma.repairItem.update({
      where: { id },
      data: { status: 'InputsComplete', updatedAt: new Date() },
    })

    return success(res, { item: updated }, 'Repair item marked as inputs complete')
  } catch (err) { next(err) }
}

module.exports = {
  listRepairItems,
  getRepairItem,
  createRepairItem,
  updateRepairItem,
  deleteRepairItem,
  sendToTechnician,
  sendToParts,
  sendToController,
  buildQuotationFromRepairItems,
  getTimeSummary,
  markInputsComplete,
}

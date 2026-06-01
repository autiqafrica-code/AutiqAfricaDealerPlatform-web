'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')

// ── List repair items for workshop controller ─────────────────────────────────

async function listRepairItems(req, res, next) {
  try {
    const { workshopId } = req.user

    const items = await prisma.repairItem.findMany({
      where: {
        workshopId,
        deletedAt: null,
        requiresControllerInput: true,
        sentToControllerAt: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        jobCard: { select: { id: true, jobNumber: true, status: true, assignedTechnicianId: true } },
        vehicle: { select: { makeModel: true, registrationNo: true } },
        inputs: {
          where: { roleCode: 'WORKSHOP_CONTROLLER', status: 'Submitted' },
          take: 1,
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    return success(res, { items })
  } catch (err) { next(err) }
}

// ── Get repair item detail ────────────────────────────────────────────────────

async function getRepairItem(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const item = await prisma.repairItem.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        jobCard: {
          include: {
            assignedTechnician: { select: { id: true, name: true } },
            quotation: { select: { currency: true, repairType: true } },
          },
        },
        vehicle: { select: { makeModel: true, registrationNo: true } },
        inputs: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { name: true } } },
        },
        timeEstimates: { orderBy: { createdAt: 'desc' } },
      },
    })

    if (!item) return notFound(res, 'Repair item not found')

    // Get available technicians in workshop
    const technicians = await prisma.user.findMany({
      where: { workshopId, role: 'Technician', status: 'Active', deletedAt: null },
      select: { id: true, name: true },
    })

    return success(res, { item, technicians })
  } catch (err) { next(err) }
}

// ── Submit workshop controller planning input ─────────────────────────────────

async function submitPlanningInput(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName } = req.user
    const { id } = req.params
    const {
      bayRequired, repairRoute, canRunInParallel, sequenceOrder,
      labourHours, estimatedDurationMinutes, costImpact, currency,
      workshopNotes, technicianId, notes,
    } = req.body

    const item = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!item) return notFound(res, 'Repair item not found')

    // Upsert workshop controller input
    const existing = await prisma.repairItemInput.findFirst({
      where: { repairItemId: id, userId, roleCode: 'WORKSHOP_CONTROLLER' },
    })

    const inputData = {
      repairItemId: id, jobCardId: item.jobCardId, workshopId,
      roleCode: 'WORKSHOP_CONTROLLER', userId,
      bayRequired:    bayRequired?.trim()    || null,
      repairRoute:    repairRoute?.trim()    || null,
      canRunInParallel: canRunInParallel !== false && canRunInParallel !== 'false',
      labourHours:    labourHours   ? parseFloat(labourHours)           : null,
      estimatedDurationMinutes: estimatedDurationMinutes ? parseInt(estimatedDurationMinutes) : null,
      costImpact:     costImpact    ? parseFloat(costImpact)            : null,
      currency:       currency      || 'ZAR',
      workshopNotes:  workshopNotes?.trim()  || null,
      notes:          notes?.trim()          || null,
      status:         'Submitted',
      submittedAt:    new Date(),
      updatedAt:      new Date(),
    }

    let input
    if (existing) {
      input = await prisma.repairItemInput.update({ where: { id: existing.id }, data: inputData })
    } else {
      input = await prisma.repairItemInput.create({ data: { ...inputData, createdAt: new Date() } })
    }

    // Update time estimate
    if (estimatedDurationMinutes) {
      const labourMins = labourHours ? Math.round(parseFloat(labourHours) * 60) : null
      const est = await prisma.repairItemTimeEstimate.findFirst({ where: { repairItemId: id, sourceUserId: userId, sourceRole: 'WORKSHOP_CONTROLLER' } })
      if (est) {
        await prisma.repairItemTimeEstimate.update({ where: { id: est.id }, data: { labourDurationMinutes: labourMins, totalDurationMinutes: parseInt(estimatedDurationMinutes), updatedAt: new Date() } })
      } else {
        await prisma.repairItemTimeEstimate.create({ data: { repairItemId: id, workshopId, sourceRole: 'WORKSHOP_CONTROLLER', sourceUserId: userId, labourDurationMinutes: labourMins, totalDurationMinutes: parseInt(estimatedDurationMinutes), updatedAt: new Date() } })
      }
    }

    // Update parallel flag and sequence on repair item
    await prisma.repairItem.update({
      where: { id },
      data: {
        isParallelAllowed: canRunInParallel !== false && canRunInParallel !== 'false',
        ...(sequenceOrder !== undefined && { sequenceOrder: sequenceOrder ? parseInt(sequenceOrder) : null }),
        controllerInputSubmittedAt: new Date(),
        status: 'InputsComplete',
        updatedAt: new Date(),
      },
    })

    // Optionally assign technician to the job (if provided)
    if (technicianId) {
      await prisma.jobCard.update({ where: { id: item.jobCardId }, data: { assignedTechnicianId: technicianId } })
    }

    await prisma.notification.create({
      data: {
        workshopId, jobCardId: item.jobCardId, channel: 'WhatsApp',
        type: 'ControllerInputSubmitted',
        message: `Workshop Controller ${userName} has submitted planning for: ${item.title}`,
        status: 'Pending',
      },
    }).catch(() => {})

    return success(res, { input }, 'Workshop controller planning submitted')
  } catch (err) { next(err) }
}

module.exports = { listRepairItems, getRepairItem, submitPlanningInput }

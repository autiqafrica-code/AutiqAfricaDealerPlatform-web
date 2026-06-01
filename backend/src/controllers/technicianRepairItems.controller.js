'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')

// ── List repair items assigned to technician ──────────────────────────────────

async function listRepairItems(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user

    // Technician sees repair items where:
    // - requiresTechnicianInput = true
    // - sent to technician (sentToTechnicianAt not null)
    // - OR already has a Draft/Submitted input from this technician
    const items = await prisma.repairItem.findMany({
      where: {
        workshopId,
        deletedAt: null,
        requiresTechnicianInput: true,
        sentToTechnicianAt: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        jobCard: { select: { id: true, jobNumber: true, status: true } },
        vehicle: { select: { makeModel: true, registrationNo: true } },
        inputs:  {
          where: { userId, roleCode: 'TECHNICIAN' },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return success(res, { items })
  } catch (err) { next(err) }
}

// ── Get single repair item detail for technician ──────────────────────────────

async function getRepairItem(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { id } = req.params

    const item = await prisma.repairItem.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        jobCard: {
          select: {
            id: true, jobNumber: true, status: true,
            quotation: { select: { repairType: true, currency: true } },
          },
        },
        vehicle: { select: { makeModel: true, registrationNo: true, vin: true, mileage: true } },
        inputs:  {
          where: { roleCode: 'TECHNICIAN' },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
        },
      },
    })

    if (!item) return notFound(res, 'Repair item not found')
    return success(res, { item })
  } catch (err) { next(err) }
}

// ── Submit/update technician input for a repair item ─────────────────────────

async function submitInput(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { id } = req.params
    const {
      diagnosisNotes, labourHours, labourCost, currency,
      partsRequired, estimatedDurationMinutes, costImpact,
      technicianRisk, safetyFlag, additionalWorkFlag, notes,
    } = req.body

    const item = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!item) return notFound(res, 'Repair item not found')
    if (!item.requiresTechnicianInput) return badRequest(res, 'This repair item does not require technician input')

    // Upsert: one input per technician per repair item
    const existing = await prisma.repairItemInput.findFirst({
      where: { repairItemId: id, userId, roleCode: 'TECHNICIAN' },
    })

    const inputData = {
      repairItemId: id,
      jobCardId:    item.jobCardId,
      workshopId,
      roleCode:     'TECHNICIAN',
      userId,
      diagnosisNotes: diagnosisNotes?.trim() || null,
      labourHours:  labourHours  ? parseFloat(labourHours)  : null,
      labourCost:   labourCost   ? parseFloat(labourCost)   : null,
      currency:     currency     || 'ZAR',
      partsRequired: partsRequired === true || partsRequired === 'true',
      estimatedDurationMinutes: estimatedDurationMinutes ? parseInt(estimatedDurationMinutes) : null,
      costImpact:   costImpact   ? parseFloat(costImpact)  : null,
      technicianRisk:    technicianRisk?.trim()   || null,
      safetyFlag:        safetyFlag        === true || safetyFlag        === 'true',
      additionalWorkFlag: additionalWorkFlag === true || additionalWorkFlag === 'true',
      notes:        notes?.trim() || null,
      status:       'Draft',
      updatedAt:    new Date(),
    }

    let input
    if (existing) {
      input = await prisma.repairItemInput.update({ where: { id: existing.id }, data: inputData })
    } else {
      input = await prisma.repairItemInput.create({ data: { ...inputData, createdAt: new Date() } })
    }

    // Also update time estimate
    if (estimatedDurationMinutes) {
      const labourMins = labourHours ? Math.round(parseFloat(labourHours) * 60) : null
      const existingEst = await prisma.repairItemTimeEstimate.findFirst({ where: { repairItemId: id, sourceUserId: userId, sourceRole: 'TECHNICIAN' } })
      if (existingEst) {
        await prisma.repairItemTimeEstimate.update({ where: { id: existingEst.id }, data: { labourDurationMinutes: labourMins, totalDurationMinutes: parseInt(estimatedDurationMinutes), updatedAt: new Date() } })
      } else {
        await prisma.repairItemTimeEstimate.create({ data: { repairItemId: id, workshopId, sourceRole: 'TECHNICIAN', sourceUserId: userId, labourDurationMinutes: labourMins, totalDurationMinutes: parseInt(estimatedDurationMinutes), updatedAt: new Date() } })
      }
    }

    return success(res, { input }, 'Technician input saved')
  } catch (err) { next(err) }
}

// ── Finalize and submit technician input ─────────────────────────────────────

async function finalizeInput(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName } = req.user
    const { id } = req.params

    const item = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!item) return notFound(res, 'Repair item not found')

    const input = await prisma.repairItemInput.findFirst({
      where: { repairItemId: id, userId, roleCode: 'TECHNICIAN', status: 'Draft' },
    })
    if (!input) return badRequest(res, 'No draft technician input found. Save your input first.')

    await prisma.$transaction(async tx => {
      await tx.repairItemInput.update({ where: { id: input.id }, data: { status: 'Submitted', submittedAt: new Date(), updatedAt: new Date() } })
      await tx.repairItem.update({
        where: { id },
        data: {
          technicianInputSubmittedAt: new Date(),
          status: item.requiresPartsInput ? 'AwaitingPartsInput' : item.requiresControllerInput ? 'AwaitingControllerInput' : 'InputsComplete',
          updatedAt: new Date(),
        },
      })
    })

    // Notify front desk
    await prisma.notification.create({
      data: {
        workshopId, jobCardId: item.jobCardId, channel: 'WhatsApp',
        type: 'TechnicianInputSubmitted',
        message: `Technician ${userName} has submitted diagnosis for repair item: ${item.title}`,
        status: 'Pending',
      },
    }).catch(() => {})

    return success(res, null, 'Technician input submitted to Front Desk')
  } catch (err) { next(err) }
}

module.exports = { listRepairItems, getRepairItem, submitInput, finalizeInput }

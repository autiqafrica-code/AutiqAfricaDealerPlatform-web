'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')

const VALID_AVAILABILITY = ['InStock', 'AvailableNow', 'OrderRequired', 'Backordered', 'NotAvailable']

// ── List repair items needing parts input ─────────────────────────────────────

async function listRepairItems(req, res, next) {
  try {
    const { workshopId } = req.user

    const items = await prisma.repairItem.findMany({
      where: {
        workshopId,
        deletedAt: null,
        requiresPartsInput: true,
        sentToPartsAt: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        jobCard:      { select: { id: true, jobNumber: true, status: true } },
        vehicle:      { select: { makeModel: true, registrationNo: true } },
        partsOptions: { orderBy: { recommended: 'desc' } },
      },
    })

    return success(res, { items })
  } catch (err) { next(err) }
}

// ── Get repair item detail for parts interpreter ──────────────────────────────

async function getRepairItem(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const item = await prisma.repairItem.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        jobCard:      { select: { id: true, jobNumber: true, status: true, quotation: { select: { currency: true } } } },
        vehicle:      { select: { makeModel: true, registrationNo: true } },
        partsOptions: { orderBy: [{ recommended: 'desc' }, { createdAt: 'asc' }] },
        inputs: {
          where: { roleCode: { in: ['TECHNICIAN'] }, status: 'Submitted' },
          select: { diagnosisNotes: true, partsRequired: true, notes: true, roleCode: true },
        },
      },
    })

    if (!item) return notFound(res, 'Repair item not found')
    return success(res, { item })
  } catch (err) { next(err) }
}

// ── Add parts option ──────────────────────────────────────────────────────────

async function addPartsOption(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { id } = req.params
    const {
      partName, brand, partNumber, supplierName,
      availabilityStatus, availableQuantity, leadTimeDays, leadTimeHours,
      unitCost, sellingPrice, quantity, currency, expectedAvailableAt,
      recommended, notes,
    } = req.body

    if (!partName?.trim())        return badRequest(res, 'Part name is required')
    if (!availabilityStatus)      return badRequest(res, 'Availability status is required')
    if (!VALID_AVAILABILITY.includes(availabilityStatus)) return badRequest(res, `availabilityStatus must be one of: ${VALID_AVAILABILITY.join(', ')}`)
    if (unitCost === undefined || unitCost === null) return badRequest(res, 'Unit cost is required')
    if (sellingPrice === undefined || sellingPrice === null) return badRequest(res, 'Selling price is required')

    const item = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!item) return notFound(res, 'Repair item not found')

    const qty   = quantity ? parseInt(quantity) : 1
    const total = parseFloat(sellingPrice) * qty

    const option = await prisma.repairItemPartsOption.create({
      data: {
        repairItemId:       id,
        workshopId,
        partsInterpreterId: userId,
        partName:           partName.trim(),
        brand:              brand?.trim()        || null,
        partNumber:         partNumber?.trim()   || null,
        supplierName:       supplierName?.trim() || null,
        availabilityStatus,
        availableQuantity:  availableQuantity ? parseInt(availableQuantity) : null,
        leadTimeDays:       leadTimeDays  ? parseInt(leadTimeDays)  : null,
        leadTimeHours:      leadTimeHours ? parseInt(leadTimeHours) : null,
        unitCost:           parseFloat(unitCost),
        sellingPrice:       parseFloat(sellingPrice),
        quantity:           qty,
        totalCost:          total,
        currency:           currency || 'ZAR',
        expectedAvailableAt: expectedAvailableAt ? new Date(expectedAvailableAt) : null,
        recommended:        recommended === true || recommended === 'true',
        notes:              notes?.trim() || null,
        updatedAt:          new Date(),
      },
    })

    // Update time estimate with parts lead time
    const leadMinutes = ((leadTimeDays || 0) * 1440) + ((leadTimeHours || 0) * 60)
    if (leadMinutes > 0) {
      const existingEst = await prisma.repairItemTimeEstimate.findFirst({ where: { repairItemId: id, sourceUserId: userId, sourceRole: 'PARTS_INTERPRETER' } })
      const currentLabour = existingEst?.labourDurationMinutes || 0
      const total = currentLabour + leadMinutes
      if (existingEst) {
        await prisma.repairItemTimeEstimate.update({ where: { id: existingEst.id }, data: { partsLeadTimeMinutes: leadMinutes, totalDurationMinutes: total, updatedAt: new Date() } })
      } else {
        await prisma.repairItemTimeEstimate.create({ data: { repairItemId: id, workshopId, sourceRole: 'PARTS_INTERPRETER', sourceUserId: userId, partsLeadTimeMinutes: leadMinutes, totalDurationMinutes: total, updatedAt: new Date() } })
      }
    }

    return created(res, { option }, 'Parts option added')
  } catch (err) { next(err) }
}

// ── Update parts option ───────────────────────────────────────────────────────

async function updatePartsOption(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id, optionId } = req.params
    const {
      partName, brand, partNumber, supplierName,
      availabilityStatus, availableQuantity, leadTimeDays, leadTimeHours,
      unitCost, sellingPrice, quantity, currency, expectedAvailableAt,
      recommended, notes,
    } = req.body

    if (availabilityStatus && !VALID_AVAILABILITY.includes(availabilityStatus)) {
      return badRequest(res, `availabilityStatus must be one of: ${VALID_AVAILABILITY.join(', ')}`)
    }

    const item = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!item) return notFound(res, 'Repair item not found')

    const existing = await prisma.repairItemPartsOption.findFirst({ where: { id: optionId, repairItemId: id } })
    if (!existing) return notFound(res, 'Parts option not found')

    const qty   = quantity ? parseInt(quantity) : existing.quantity
    const sp    = sellingPrice ? parseFloat(sellingPrice) : Number(existing.sellingPrice)
    const total = sp * qty

    const option = await prisma.repairItemPartsOption.update({
      where: { id: optionId },
      data: {
        ...(partName         && { partName: partName.trim() }),
        ...(brand !== undefined         && { brand: brand?.trim() || null }),
        ...(partNumber !== undefined    && { partNumber: partNumber?.trim() || null }),
        ...(supplierName !== undefined  && { supplierName: supplierName?.trim() || null }),
        ...(availabilityStatus          && { availabilityStatus }),
        ...(availableQuantity !== undefined && { availableQuantity: availableQuantity ? parseInt(availableQuantity) : null }),
        ...(leadTimeDays !== undefined  && { leadTimeDays: leadTimeDays ? parseInt(leadTimeDays) : null }),
        ...(leadTimeHours !== undefined && { leadTimeHours: leadTimeHours ? parseInt(leadTimeHours) : null }),
        ...(unitCost       && { unitCost: parseFloat(unitCost) }),
        ...(sellingPrice   && { sellingPrice: sp }),
        quantity: qty, totalCost: total,
        ...(currency !== undefined      && { currency: currency || 'ZAR' }),
        ...(expectedAvailableAt !== undefined && { expectedAvailableAt: expectedAvailableAt ? new Date(expectedAvailableAt) : null }),
        ...(recommended !== undefined   && { recommended: recommended === true || recommended === 'true' }),
        ...(notes !== undefined         && { notes: notes?.trim() || null }),
        updatedAt: new Date(),
      },
    })

    return success(res, { option }, 'Parts option updated')
  } catch (err) { next(err) }
}

// ── Select/deselect a parts option ───────────────────────────────────────────

async function selectOption(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id, optionId } = req.params
    const { selected } = req.body

    const item = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!item) return notFound(res, 'Repair item not found')

    await prisma.$transaction(async tx => {
      // Deselect all options for this repair item first
      await tx.repairItemPartsOption.updateMany({ where: { repairItemId: id }, data: { selected: false, updatedAt: new Date() } })
      // Select the chosen option
      if (selected !== false && selected !== 'false') {
        await tx.repairItemPartsOption.update({ where: { id: optionId }, data: { selected: true, updatedAt: new Date() } })
      }
    })

    // Recalculate time estimate based on selected option lead time
    const selectedOption = await prisma.repairItemPartsOption.findUnique({ where: { id: optionId } })
    if (selectedOption && (selectedOption.leadTimeDays || selectedOption.leadTimeHours)) {
      const leadMins = ((selectedOption.leadTimeDays || 0) * 1440) + ((selectedOption.leadTimeHours || 0) * 60)
      // Update calculated duration on repair item
      const techInput = await prisma.repairItemInput.findFirst({ where: { repairItemId: id, roleCode: 'TECHNICIAN', status: 'Submitted' } })
      const labourMins = techInput?.estimatedDurationMinutes || 0
      const total = leadMins + labourMins
      await prisma.repairItem.update({ where: { id }, data: { calculatedDurationMinutes: total, updatedAt: new Date() } })
    }

    return success(res, null, selected === false || selected === 'false' ? 'Option deselected' : 'Parts option selected')
  } catch (err) { next(err) }
}

// ── Submit parts input (mark repair item parts check done) ────────────────────

async function submitPartsInput(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName } = req.user
    const { id } = req.params
    const { notes } = req.body

    const item = await prisma.repairItem.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!item) return notFound(res, 'Repair item not found')

    const optionsCount = await prisma.repairItemPartsOption.count({ where: { repairItemId: id } })
    if (optionsCount === 0) return badRequest(res, 'Please add at least one parts option before submitting')

    // Upsert a PARTS_INTERPRETER input record
    const existing = await prisma.repairItemInput.findFirst({ where: { repairItemId: id, userId, roleCode: 'PARTS_INTERPRETER' } })
    const inputData = {
      repairItemId: id, jobCardId: item.jobCardId, workshopId,
      roleCode: 'PARTS_INTERPRETER', userId,
      notes: notes?.trim() || null, status: 'Submitted', submittedAt: new Date(),
      partsRequired: true, updatedAt: new Date(),
    }
    if (existing) {
      await prisma.repairItemInput.update({ where: { id: existing.id }, data: inputData })
    } else {
      await prisma.repairItemInput.create({ data: { ...inputData, createdAt: new Date() } })
    }

    await prisma.repairItem.update({
      where: { id },
      data: {
        partsInputSubmittedAt: new Date(),
        status: item.requiresControllerInput ? 'AwaitingControllerInput' : 'InputsComplete',
        updatedAt: new Date(),
      },
    })

    await prisma.notification.create({
      data: {
        workshopId, jobCardId: item.jobCardId, channel: 'WhatsApp',
        type: 'PartsInputSubmitted',
        message: `Parts Interpreter ${userName} has submitted parts options for: ${item.title}`,
        status: 'Pending',
      },
    }).catch(() => {})

    return success(res, null, 'Parts input submitted to Front Desk')
  } catch (err) { next(err) }
}

module.exports = { listRepairItems, getRepairItem, addPartsOption, updatePartsOption, selectOption, submitPartsInput }

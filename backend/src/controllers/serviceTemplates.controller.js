'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')

async function listServiceTemplates(req, res, next) {
  try {
    const templates = await prisma.serviceTemplate.findMany({
      where: { isActive: true },
      include: {
        checklistTemplates: { orderBy: { sortOrder: 'asc' } },
        servicePricing: { where: { isActive: true }, orderBy: { createdAt: 'asc' } },
      },
      orderBy: { name: 'asc' },
    })
    return success(res, { templates })
  } catch (e) { next(e) }
}

async function createServiceTemplate(req, res, next) {
  try {
    const { name, module, defaultPricingMode, duration } = req.body
    if (!name?.trim()) return badRequest(res, 'Name is required')
    if (!module?.trim()) return badRequest(res, 'Module is required')

    const existing = await prisma.serviceTemplate.findFirst({ where: { name: name.trim() } })
    if (existing) return badRequest(res, 'A service template with this name already exists')

    const template = await prisma.serviceTemplate.create({
      data: {
        name: name.trim(),
        module: module.trim(),
        defaultPricingMode: defaultPricingMode || 'StandardPrice',
        duration: duration?.trim() || null,
      },
    })
    return created(res, { template }, 'Service template created')
  } catch (e) { next(e) }
}

async function updateServiceTemplate(req, res, next) {
  try {
    const { name, module, defaultPricingMode, duration } = req.body
    const template = await prisma.serviceTemplate.findFirst({ where: { id: req.params.id } })
    if (!template) return notFound(res, 'Service template not found')

    const updated = await prisma.serviceTemplate.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(module && { module: module.trim() }),
        ...(defaultPricingMode && { defaultPricingMode }),
        ...(duration !== undefined && { duration: duration?.trim() || null }),
      },
    })
    return success(res, { template: updated })
  } catch (e) { next(e) }
}

async function upsertServicePricing(req, res, next) {
  try {
    const { workshopId, currency, standardPrice, customPrice, allowCustomOverride, effectiveFrom, approvalRequired, taxIncluded } = req.body
    const template = await prisma.serviceTemplate.findFirst({ where: { id: req.params.id } })
    if (!template) return notFound(res, 'Service template not found')

    const existing = await prisma.servicePricing.findFirst({
      where: { serviceTemplateId: req.params.id, workshopId: workshopId || null, currency: currency || 'ZAR' },
    })

    const data = {
      serviceTemplateId: req.params.id,
      workshopId: workshopId || null,
      currency: currency || 'ZAR',
      ...(standardPrice !== undefined && { standardPrice: parseFloat(standardPrice) }),
      ...(customPrice !== undefined && { customPrice: parseFloat(customPrice) }),
      ...(allowCustomOverride !== undefined && { allowCustomOverride: Boolean(allowCustomOverride) }),
      ...(effectiveFrom && { effectiveFrom: new Date(effectiveFrom) }),
      ...(approvalRequired !== undefined && { approvalRequired: approvalRequired || null }),
      ...(taxIncluded !== undefined && { taxIncluded: Boolean(taxIncluded) }),
    }

    const pricing = existing
      ? await prisma.servicePricing.update({ where: { id: existing.id }, data })
      : await prisma.servicePricing.create({ data })

    return success(res, { pricing })
  } catch (e) { next(e) }
}

async function addChecklistItem(req, res, next) {
  try {
    const { item, isRequired, priceMode, standardPrice, customPrice, currency, technicianInstruction, sortOrder } = req.body
    if (!item?.trim()) return badRequest(res, 'Item description is required')

    const template = await prisma.serviceTemplate.findFirst({ where: { id: req.params.id } })
    if (!template) return notFound(res, 'Service template not found')

    const checklistItem = await prisma.serviceChecklistTemplate.create({
      data: {
        serviceTemplateId: req.params.id,
        item: item.trim(),
        isRequired: isRequired !== false,
        priceMode: priceMode || 'StandardPrice',
        ...(standardPrice !== undefined && { standardPrice: parseFloat(standardPrice) }),
        ...(customPrice !== undefined && { customPrice: parseFloat(customPrice) }),
        currency: currency || 'ZAR',
        technicianInstruction: technicianInstruction?.trim() || null,
        sortOrder: parseInt(sortOrder) || 0,
      },
    })
    return created(res, { checklistItem }, 'Checklist item added')
  } catch (e) { next(e) }
}

async function updateChecklistItem(req, res, next) {
  try {
    const { item, isRequired, priceMode, standardPrice, customPrice, currency, technicianInstruction, sortOrder } = req.body
    const checklistItem = await prisma.serviceChecklistTemplate.findFirst({
      where: { id: req.params.itemId, serviceTemplateId: req.params.id },
    })
    if (!checklistItem) return notFound(res, 'Checklist item not found')

    const updated = await prisma.serviceChecklistTemplate.update({
      where: { id: req.params.itemId },
      data: {
        ...(item && { item: item.trim() }),
        ...(isRequired !== undefined && { isRequired: Boolean(isRequired) }),
        ...(priceMode && { priceMode }),
        ...(standardPrice !== undefined && { standardPrice: parseFloat(standardPrice) }),
        ...(customPrice !== undefined && { customPrice: parseFloat(customPrice) }),
        ...(currency && { currency }),
        ...(technicianInstruction !== undefined && { technicianInstruction: technicianInstruction?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder: parseInt(sortOrder) }),
      },
    })
    return success(res, { checklistItem: updated })
  } catch (e) { next(e) }
}

async function deleteChecklistItem(req, res, next) {
  try {
    const checklistItem = await prisma.serviceChecklistTemplate.findFirst({
      where: { id: req.params.itemId, serviceTemplateId: req.params.id },
    })
    if (!checklistItem) return notFound(res, 'Checklist item not found')

    await prisma.serviceChecklistTemplate.delete({ where: { id: req.params.itemId } })
    return success(res, {}, 'Checklist item deleted')
  } catch (e) { next(e) }
}

module.exports = {
  listServiceTemplates,
  createServiceTemplate,
  updateServiceTemplate,
  upsertServicePricing,
  addChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
}

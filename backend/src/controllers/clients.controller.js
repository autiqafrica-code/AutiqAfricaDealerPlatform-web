'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound, error } = require('../utils/apiResponse')

async function listClients(req, res, next) {
  try {
    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      include: { _count: { select: { workshops: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return success(res, { clients })
  } catch (e) { next(e) }
}

async function createClient(req, res, next) {
  try {
    const { name, country, defaultCurrency, dealerLicenceNumber, website } = req.body

    if (!name?.trim()) return badRequest(res, 'Dealer name is required')
    if (!country?.trim()) return badRequest(res, 'Country is required')
    if (!defaultCurrency?.trim()) return badRequest(res, 'Currency is required')
    if (website && !/^https?:\/\/.+/.test(website.trim())) {
      return badRequest(res, 'Website must be a valid URL (include https://)')
    }

    const client = await prisma.client.create({
      data: {
        name: name.trim(),
        country: country.trim(),
        defaultCurrency: defaultCurrency.trim(),
        dealerLicenceNumber: dealerLicenceNumber?.trim() || null,
        website: website?.trim() || null,
      },
    })

    return created(res, { client }, 'Client created successfully')
  } catch (e) { next(e) }
}

async function getClient(req, res, next) {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { workshops: { where: { deletedAt: null } }, _count: { select: { workshops: true } } },
    })
    if (!client) return notFound(res, 'Client not found')
    return success(res, { client })
  } catch (e) { next(e) }
}

async function updateClient(req, res, next) {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!client) return notFound(res, 'Client not found')

    const { name, country, defaultCurrency, dealerLicenceNumber, website, status } = req.body
    if (website && !/^https?:\/\/.+/.test(website.trim())) {
      return badRequest(res, 'Website must be a valid URL (include https://)')
    }

    const updated = await prisma.client.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(country && { country: country.trim() }),
        ...(defaultCurrency && { defaultCurrency: defaultCurrency.trim() }),
        ...(dealerLicenceNumber !== undefined && { dealerLicenceNumber: dealerLicenceNumber?.trim() || null }),
        ...(website !== undefined && { website: website?.trim() || null }),
        ...(status && { status }),
      },
    })
    return success(res, { client: updated })
  } catch (e) { next(e) }
}

async function updateClientStatus(req, res, next) {
  try {
    const { status } = req.body
    if (!['Active', 'Inactive', 'Archived'].includes(status)) {
      return badRequest(res, 'Invalid status')
    }
    const client = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!client) return notFound(res, 'Client not found')
    const updated = await prisma.client.update({ where: { id: req.params.id }, data: { status } })
    return success(res, { client: updated })
  } catch (e) { next(e) }
}

async function deleteClient(req, res, next) {
  try {
    const client = await prisma.client.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!client) return notFound(res, 'Client not found')
    await prisma.client.update({ where: { id: req.params.id }, data: { deletedAt: new Date(), status: 'Archived' } })
    return success(res, {}, 'Client deleted')
  } catch (e) { next(e) }
}

async function getClientModules(req, res, next) {
  try {
    const modules = await prisma.clientModule.findMany({
      where: { clientId: req.params.id },
      include: { module: true },
    })
    return success(res, { modules })
  } catch (e) { next(e) }
}

async function updateClientModules(req, res, next) {
  try {
    const { moduleIds } = req.body
    const clientId = req.params.id

    const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } })
    if (!client) return notFound(res, 'Client not found')

    if (!Array.isArray(moduleIds)) return badRequest(res, 'moduleIds must be an array')

    const existing = await prisma.clientModule.findMany({ where: { clientId } })
    const existingMap = new Map(existing.map(m => [m.moduleId, m]))
    const targetSet   = new Set(moduleIds)

    for (const moduleId of targetSet) {
      if (!existingMap.has(moduleId)) {
        await prisma.clientModule.create({ data: { clientId, moduleId, isEnabled: true } })
      } else {
        await prisma.clientModule.update({
          where: { id: existingMap.get(moduleId).id },
          data: { isEnabled: true },
        })
      }
    }

    for (const [moduleId, cm] of existingMap) {
      if (!targetSet.has(moduleId)) {
        await prisma.clientModule.update({ where: { id: cm.id }, data: { isEnabled: false } })
      }
    }

    const modules = await prisma.clientModule.findMany({
      where: { clientId },
      include: { module: true },
    })
    return success(res, { modules }, 'Module configuration saved')
  } catch (e) { next(e) }
}

module.exports = { listClients, createClient, getClient, updateClient, updateClientStatus, deleteClient, getClientModules, updateClientModules }

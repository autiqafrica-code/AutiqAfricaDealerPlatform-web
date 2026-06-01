'use strict'

const prisma = require('../config/db')
const { workshopCode } = require('../utils/idGenerator')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')

const VALID_TYPES = ['Service', 'PaintAndPanel', 'FleetService', 'BodyShop']

const DISPLAY_TO_CODE = {
  'Front Desk / Service Consultant': 'FRONT_DESK',
  'Front Desk': 'FRONT_DESK',
  Technician: 'TECHNICIAN',
  'Workshop Controller': 'WORKSHOP_CONTROLLER',
  Manager: 'MANAGER',
  Accounts: 'ACCOUNTS',
  'Parts Interpreter': 'PARTS_INTERPRETER',
  CEO: 'CEO',
}

// After creating a workshop, persist role-wise user counts into the normalized table.
// Accepts either array format [{roleCode, count}] or display-name map {"Technician": 2}
async function persistRoleCounts(workshopId, clientId, roleUserCountsArray, userCountsJson) {
  let entries = roleUserCountsArray || []

  if (entries.length === 0 && userCountsJson && typeof userCountsJson === 'object') {
    for (const [displayName, rawCount] of Object.entries(userCountsJson)) {
      const code = DISPLAY_TO_CODE[displayName]
      const count = parseInt(rawCount, 10)
      if (code && count > 0) entries.push({ roleCode: code, count })
    }
  }

  for (const rc of entries) {
    if (!rc.count || rc.count <= 0) continue
    const role = await prisma.role.findFirst({ where: { code: rc.roleCode, isActive: true } })
    if (!role) continue
    await prisma.workshopRoleUserCount.upsert({
      where:  { workshopId_roleId: { workshopId, roleId: role.id } },
      update: { requiredCount: rc.count },
      create: { clientId, workshopId, roleId: role.id, roleCode: rc.roleCode, requiredCount: rc.count },
    }).catch(() => {}) // ignore if role code unknown
  }
}

async function listWorkshops(req, res, next) {
  try {
    const where = { deletedAt: null }
    if (req.query.clientId) where.clientId = req.query.clientId
    const workshops = await prisma.workshop.findMany({
      where,
      include: { client: { select: { id: true, name: true } }, _count: { select: { users: true } } },
      orderBy: { createdAt: 'desc' },
    })
    return success(res, { workshops })
  } catch (e) { next(e) }
}

async function createWorkshop(req, res, next) {
  try {
    const {
      clientId, name, type, address, phone, whatsapp, email, website,
      openingTime, closingTime, ceoName, ceoEmail, ceoPhone, dailyJobLimit,
    } = req.body

    if (!clientId) return badRequest(res, 'clientId is required')
    if (!name?.trim()) return badRequest(res, 'Workshop name is required')
    if (!openingTime) return badRequest(res, 'Opening time is required')
    if (!closingTime) return badRequest(res, 'Closing time is required')
    if (closingTime <= openingTime) return badRequest(res, 'Closing time must be after opening time')
    if (type && !VALID_TYPES.includes(type)) return badRequest(res, 'Invalid workshop type')
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return badRequest(res, 'Valid workshop email required')
    if (ceoEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ceoEmail)) return badRequest(res, 'Valid CEO email required')
    if (website && !/^https?:\/\/.+/.test(website.trim())) return badRequest(res, 'Workshop website must include https://')

    const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } })
    if (!client) return notFound(res, 'Client not found')

    const wsCount = await prisma.workshop.count()
    const code = workshopCode(wsCount + 1)

    const { userCounts, roleUserCounts } = req.body

    const workshop = await prisma.workshop.create({
      data: {
        clientId,
        name: name.trim(),
        type: type || 'Service',
        address: address?.trim() || null,
        phone: phone?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        email: email?.trim() || null,
        website: website?.trim() || null,
        openingTime,
        closingTime,
        workshopCode: code,
        currency: client.defaultCurrency || 'ZAR',
        dailyJobLimit: dailyJobLimit ? parseInt(dailyJobLimit, 10) : 30,
        ceoName: ceoName?.trim() || null,
        ceoEmail: ceoEmail?.trim() || null,
        ceoPhone: ceoPhone?.trim() || null,
        userCounts: userCounts || null,
      },
      include: { client: { select: { id: true, name: true } } },
    })

    // Persist normalized role user counts (non-blocking — don't fail the response if roles table not seeded)
    await persistRoleCounts(workshop.id, clientId, roleUserCounts, userCounts).catch(() => {})

    return created(res, { workshop }, 'Workshop created successfully')
  } catch (e) { next(e) }
}

async function getWorkshop(req, res, next) {
  try {
    const workshop = await prisma.workshop.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { client: { select: { id: true, name: true } }, _count: { select: { users: true } } },
    })
    if (!workshop) return notFound(res, 'Workshop not found')
    return success(res, { workshop })
  } catch (e) { next(e) }
}

async function updateWorkshop(req, res, next) {
  try {
    const workshop = await prisma.workshop.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!workshop) return notFound(res, 'Workshop not found')

    const { name, type, address, phone, whatsapp, email, website, openingTime, closingTime, ceoName, ceoEmail, ceoPhone, dailyJobLimit } = req.body
    if (type && !VALID_TYPES.includes(type)) return badRequest(res, 'Invalid workshop type')

    const updated = await prisma.workshop.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(type && { type }),
        ...(address !== undefined && { address: address?.trim() || null }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(whatsapp !== undefined && { whatsapp: whatsapp?.trim() || null }),
        ...(email !== undefined && { email: email?.trim() || null }),
        ...(website !== undefined && { website: website?.trim() || null }),
        ...(openingTime && { openingTime }),
        ...(closingTime && { closingTime }),
        ...(ceoName !== undefined && { ceoName: ceoName?.trim() || null }),
        ...(ceoEmail !== undefined && { ceoEmail: ceoEmail?.trim() || null }),
        ...(ceoPhone !== undefined && { ceoPhone: ceoPhone?.trim() || null }),
        ...(dailyJobLimit && { dailyJobLimit: parseInt(dailyJobLimit, 10) }),
      },
    })
    return success(res, { workshop: updated })
  } catch (e) { next(e) }
}

async function updateWorkshopStatus(req, res, next) {
  try {
    const { status } = req.body
    if (!['Active', 'Inactive'].includes(status)) return badRequest(res, 'Invalid status')
    const workshop = await prisma.workshop.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!workshop) return notFound(res, 'Workshop not found')
    const updated = await prisma.workshop.update({ where: { id: req.params.id }, data: { status } })
    return success(res, { workshop: updated })
  } catch (e) { next(e) }
}

async function getWorkshopUsers(req, res, next) {
  try {
    const users = await prisma.user.findMany({
      where: { workshopId: req.params.id, deletedAt: null },
      select: { id: true, name: true, role: true, loginEmail: true, status: true },
    })
    return success(res, { users })
  } catch (e) { next(e) }
}

async function getWorkshopSchedule(req, res, next) {
  try {
    const workshop = await prisma.workshop.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { openingTime: true, closingTime: true, dailyJobLimit: true },
    })
    if (!workshop) return notFound(res, 'Workshop not found')
    return success(res, { schedule: workshop })
  } catch (e) { next(e) }
}

async function updateWorkshopSchedule(req, res, next) {
  try {
    const { openingTime, closingTime, dailyJobLimit } = req.body
    const workshop = await prisma.workshop.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!workshop) return notFound(res, 'Workshop not found')
    const updated = await prisma.workshop.update({
      where: { id: req.params.id },
      data: {
        ...(openingTime && { openingTime }),
        ...(closingTime && { closingTime }),
        ...(dailyJobLimit && { dailyJobLimit: parseInt(dailyJobLimit, 10) }),
      },
    })
    return success(res, { schedule: updated })
  } catch (e) { next(e) }
}

module.exports = { listWorkshops, createWorkshop, getWorkshop, updateWorkshop, updateWorkshopStatus, getWorkshopUsers, getWorkshopSchedule, updateWorkshopSchedule }

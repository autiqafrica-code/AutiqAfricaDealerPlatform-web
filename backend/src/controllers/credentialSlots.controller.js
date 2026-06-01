'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { hashPassword, generateTempPassword } = require('../utils/passwordGenerator')
const { workshopCode: genWsCode } = require('../utils/idGenerator')

// ── Role mapping constants ────────────────────────────────────────────────────

const DISPLAY_TO_CODE = {
  'Front Desk / Service Consultant': 'FRONT_DESK',
  'Front Desk': 'FRONT_DESK',
  'Service Consultant': 'FRONT_DESK',
  Technician: 'TECHNICIAN',
  'Workshop Controller': 'WORKSHOP_CONTROLLER',
  Manager: 'MANAGER',
  Accounts: 'ACCOUNTS',
  'Parts Interpreter': 'PARTS_INTERPRETER',
  CEO: 'CEO',
}

const CODE_TO_ENUM = {
  TECHNICIAN: 'Technician',
  WORKSHOP_CONTROLLER: 'WorkshopController',
  FRONT_DESK: 'FrontDesk',
  MANAGER: 'Manager',
  ACCOUNTS: 'Accounts',
  PARTS_INTERPRETER: 'PartsInterpreter',
  CEO: 'CEO',
}

const ALLOWED_CODES = new Set(Object.keys(CODE_TO_ENUM))

// Display order for consistent UI rendering
const ROLE_DISPLAY_ORDER = [
  'FRONT_DESK', 'TECHNICIAN', 'WORKSHOP_CONTROLLER', 'MANAGER',
  'ACCOUNTS', 'PARTS_INTERPRETER', 'CEO',
]

// ── Helpers ───────────────────────────────────────────────────────────────────

// Look up all Role records once and return a map: code → Role
async function getRoleMap() {
  const roles = await prisma.role.findMany({ where: { isActive: true } })
  return new Map(roles.map(r => [r.code, r]))
}

// Derive WorkshopRoleUserCount-like objects from the legacy userCounts JSON blob.
// Used as a fallback when the normalized table has no rows.
async function deriveFromJson(ws, roleMap) {
  const counts = []
  const json = ws.userCounts || {}
  for (const [displayName, rawCount] of Object.entries(json)) {
    const code = DISPLAY_TO_CODE[displayName]
    const count = parseInt(rawCount, 10)
    if (!code || !(count > 0)) continue
    const role = roleMap.get(code)
    if (!role) continue
    counts.push({ workshopId: ws.id, clientId: ws.clientId, roleId: role.id, roleCode: code, requiredCount: count, role })
  }
  return counts
}

// ── Onboard client (full transactional) ──────────────────────────────────────

async function onboardClient(req, res, next) {
  try {
    const {
      clientName, country, currency, website, dealerLicenceNumber,
      workshops: workshopsInput,
    } = req.body

    if (!clientName?.trim()) return badRequest(res, 'clientName is required')
    if (!country?.trim())    return badRequest(res, 'country is required')
    if (!currency?.trim())   return badRequest(res, 'currency is required')
    if (!Array.isArray(workshopsInput) || workshopsInput.length === 0) {
      return badRequest(res, 'At least one workshop is required')
    }

    // Pre-validate roleUserCounts before touching the database
    for (const ws of workshopsInput) {
      if (!ws.workshopName?.trim()) return badRequest(res, 'workshopName is required for every workshop')
      if (!ws.openingTime)          return badRequest(res, `openingTime is required for workshop "${ws.workshopName}"`)
      if (!ws.closingTime)          return badRequest(res, `closingTime is required for workshop "${ws.workshopName}"`)

      const roleCounts = ws.roleUserCounts || []
      for (const rc of roleCounts) {
        if (!ALLOWED_CODES.has(rc.roleCode)) {
          return badRequest(res, `Invalid roleCode "${rc.roleCode}". Allowed: ${[...ALLOWED_CODES].join(', ')}`)
        }
        if (!Number.isInteger(rc.count) || rc.count < 0) {
          return badRequest(res, `count for ${rc.roleCode} must be a non-negative integer`)
        }
      }
    }

    const roleMap = await getRoleMap()

    const result = await prisma.$transaction(async (tx) => {
      // Create client
      const client = await tx.client.create({
        data: {
          name: clientName.trim(),
          country: country.trim(),
          defaultCurrency: currency.trim(),
          dealerLicenceNumber: dealerLicenceNumber?.trim() || null,
          website: website?.trim() || null,
          status: 'Active',
        },
      })

      const createdWorkshops = []

      for (const wsInput of workshopsInput) {
        const wsCount = await tx.workshop.count()
        const code = genWsCode(wsCount + 1)

        const workshop = await tx.workshop.create({
          data: {
            clientId:     client.id,
            name:         wsInput.workshopName.trim(),
            type:         wsInput.type || 'Service',
            address:      wsInput.address?.trim() || null,
            city:         wsInput.city?.trim() || null,
            phone:        wsInput.phone?.trim() || null,
            whatsapp:     wsInput.whatsapp?.trim() || null,
            email:        wsInput.email?.trim() || null,
            openingTime:  wsInput.openingTime,
            closingTime:  wsInput.closingTime,
            dailyJobLimit: wsInput.dailyJobLimit ? parseInt(wsInput.dailyJobLimit, 10) : 30,
            workshopCode: code,
            currency:     currency.trim(),
            ceoName:      wsInput.ceoName?.trim() || null,
            ceoEmail:     wsInput.ceoEmail?.trim() || null,
            ceoPhone:     wsInput.ceoPhone?.trim() || null,
            status:       'Active',
          },
        })

        // Normalize roleUserCounts: accept new array format OR legacy display-name map
        let roleCounts = wsInput.roleUserCounts || []
        if (roleCounts.length === 0 && wsInput.userCounts) {
          for (const [displayName, rawCount] of Object.entries(wsInput.userCounts)) {
            const roleCode = DISPLAY_TO_CODE[displayName]
            const count    = parseInt(rawCount, 10)
            if (roleCode && count > 0) roleCounts.push({ roleCode, count })
          }
        }

        const workshopRoleSummary = []
        for (const rc of roleCounts) {
          if (rc.count <= 0) continue
          const role = roleMap.get(rc.roleCode)
          if (!role) continue

          await tx.workshopRoleUserCount.create({
            data: {
              clientId:     client.id,
              workshopId:   workshop.id,
              roleId:       role.id,
              roleCode:     rc.roleCode,
              requiredCount: rc.count,
            },
          })
          workshopRoleSummary.push({ roleCode: rc.roleCode, roleName: role.name, requiredCount: rc.count })
        }

        createdWorkshops.push({ ...workshop, roleUserCounts: workshopRoleSummary })
      }

      return { client, workshops: createdWorkshops }
    })

    return created(res, result, 'Client onboarded successfully')
  } catch (e) { next(e) }
}

// ── Get credential slots for a client ────────────────────────────────────────

async function getCredentialSlots(req, res, next) {
  try {
    const { clientId } = req.params
    const { workshopId } = req.query

    const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } })
    if (!client) return notFound(res, 'Client not found')

    const wsWhere = { clientId, deletedAt: null }
    if (workshopId) wsWhere.id = workshopId

    const workshops = await prisma.workshop.findMany({
      where: wsWhere,
      orderBy: { createdAt: 'asc' },
    })

    const roleMap = await getRoleMap()
    const workshopResults = []

    for (const ws of workshops) {
      let roleCounts = await prisma.workshopRoleUserCount.findMany({
        where: { workshopId: ws.id },
        include: { role: true },
      })

      // Fallback: if no normalized rows, derive from legacy JSON blob
      if (roleCounts.length === 0 && ws.userCounts) {
        roleCounts = await deriveFromJson(ws, roleMap)
      }

      if (roleCounts.length === 0) continue

      // Sort by canonical display order
      roleCounts.sort((a, b) => {
        const ai = ROLE_DISPLAY_ORDER.indexOf(a.roleCode)
        const bi = ROLE_DISPLAY_ORDER.indexOf(b.roleCode)
        return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
      })

      const roleResults = []

      for (const rc of roleCounts) {
        if (rc.requiredCount <= 0) continue
        const userEnum = CODE_TO_ENUM[rc.roleCode]
        if (!userEnum) continue

        const existingUsers = await prisma.user.findMany({
          where: { workshopId: ws.id, role: userEnum, deletedAt: null },
          select: {
            id: true, name: true, loginEmail: true, phone: true,
            status: true, lastLoginAt: true, createdAt: true,
          },
          orderBy: { createdAt: 'asc' },
        })

        const createdCount   = existingUsers.length
        const remainingCount = Math.max(0, rc.requiredCount - createdCount)

        const slots = []
        for (let i = 0; i < rc.requiredCount; i++) {
          slots.push(i < existingUsers.length
            ? { slotNumber: i + 1, status: 'FILLED', user: existingUsers[i] }
            : { slotNumber: i + 1, status: 'EMPTY',  user: null })
        }

        roleResults.push({
          roleId:        rc.roleId,
          roleCode:      rc.roleCode,
          roleName:      rc.role?.name || rc.roleCode,
          requiredCount: rc.requiredCount,
          createdCount,
          remainingCount,
          slots,
        })
      }

      if (roleResults.length > 0) {
        workshopResults.push({
          id:           ws.id,
          name:         ws.name,
          workshopCode: ws.workshopCode,
          type:         ws.type,
          currency:     ws.currency,
          city:         ws.city,
          roles:        roleResults,
        })
      }
    }

    return success(res, {
      client: { id: client.id, name: client.name, country: client.country, currency: client.defaultCurrency },
      workshops: workshopResults,
    })
  } catch (e) { next(e) }
}

// ── Create user from a credential slot ───────────────────────────────────────

async function createUserFromSlot(req, res, next) {
  try {
    const { clientId, workshopId, roleCode, roleId: incomingRoleId, name, email, phone, password } = req.body

    if (!clientId)     return badRequest(res, 'clientId is required')
    if (!workshopId)   return badRequest(res, 'workshopId is required')
    if (!roleCode && !incomingRoleId) return badRequest(res, 'roleCode or roleId is required')
    if (!name?.trim()) return badRequest(res, 'name is required')
    if (!email?.trim()) return badRequest(res, 'email (loginEmail) is required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return badRequest(res, 'Valid email address is required')

    // Validate client
    const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } })
    if (!client) return notFound(res, 'Client not found')

    // Validate workshop belongs to this client
    const workshop = await prisma.workshop.findFirst({ where: { id: workshopId, clientId, deletedAt: null } })
    if (!workshop) return notFound(res, 'Workshop not found or does not belong to the selected client')

    // Resolve role code and ID
    let resolvedCode = roleCode
    let resolvedRoleId = incomingRoleId

    if (!resolvedCode && incomingRoleId) {
      const role = await prisma.role.findFirst({ where: { id: incomingRoleId } })
      if (!role) return notFound(res, 'Role not found')
      resolvedCode = role.code
    } else if (resolvedCode && !incomingRoleId) {
      const role = await prisma.role.findFirst({ where: { code: resolvedCode } })
      if (!role) return notFound(res, `Role with code ${resolvedCode} not found in roles table`)
      resolvedRoleId = role.id
    }

    if (!ALLOWED_CODES.has(resolvedCode)) {
      return badRequest(res, `Role ${resolvedCode} is not a valid workshop user role`)
    }

    const userEnum = CODE_TO_ENUM[resolvedCode]

    // Look up role count limit
    let roleCount = await prisma.workshopRoleUserCount.findFirst({
      where: { workshopId, roleId: resolvedRoleId },
    })

    // Fallback: check legacy JSON blob and opportunistically migrate to normalized table
    if (!roleCount && workshop.userCounts) {
      const roleMap = await getRoleMap()
      const derived = await deriveFromJson(workshop, roleMap)
      const found = derived.find(rc => rc.roleCode === resolvedCode)
      if (found) {
        try {
          roleCount = await prisma.workshopRoleUserCount.create({
            data: {
              clientId,
              workshopId,
              roleId:       resolvedRoleId,
              roleCode:     resolvedCode,
              requiredCount: found.requiredCount,
            },
          })
        } catch (_) {
          // Race condition: may already have been created — re-fetch
          roleCount = await prisma.workshopRoleUserCount.findFirst({ where: { workshopId, roleId: resolvedRoleId } })
        }
      }
    }

    if (!roleCount) {
      return badRequest(res, `No user count configured for role ${resolvedCode} in this workshop. Set counts during client onboarding first.`)
    }

    // Count existing users for this workshop + role
    const existingCount = await prisma.user.count({
      where: { workshopId, role: userEnum, deletedAt: null },
    })

    if (existingCount >= roleCount.requiredCount) {
      return res.status(409).json({
        success:  false,
        message:  `Slot limit reached: required count of ${roleCount.requiredCount} for ${resolvedCode} already filled`,
        required: roleCount.requiredCount,
        created:  existingCount,
      })
    }

    // Duplicate email check
    const emailConflict = await prisma.user.findFirst({ where: { loginEmail: email.trim().toLowerCase() } })
    if (emailConflict) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists' })
    }

    const plainPassword = password?.trim() || generateTempPassword(resolvedCode, existingCount + 1)
    const passwordHash  = await hashPassword(plainPassword)

    const user = await prisma.user.create({
      data: {
        workshopId,
        name:       name.trim(),
        loginEmail: email.trim().toLowerCase(),
        passwordHash,
        role:       userEnum,
        roleId:     resolvedRoleId,
        phone:      phone?.trim() || null,
        status:     'Active',
      },
      include: {
        workshop: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      },
    })

    const { passwordHash: _ph, ...safeUser } = user
    return created(res, {
      user:        safeUser,
      tempPassword: plainPassword,
      slotNumber:  existingCount + 1,
    }, 'User created successfully')
  } catch (e) { next(e) }
}

// ── Credential summary (all clients) ─────────────────────────────────────────

async function getCredentialSummary(req, res, next) {
  try {
    const clients = await prisma.client.findMany({
      where: { deletedAt: null },
      include: { workshops: { where: { deletedAt: null }, select: { id: true } } },
      orderBy: { name: 'asc' },
    })

    const summary = await Promise.all(clients.map(async (client) => {
      const wsIds = client.workshops.map(w => w.id)

      // Sum required counts from normalized table
      const roleCounts = await prisma.workshopRoleUserCount.findMany({
        where: { clientId: client.id },
      })
      let totalRequired = roleCounts.reduce((s, rc) => s + rc.requiredCount, 0)

      // Fallback to legacy JSON if normalized table is empty
      if (totalRequired === 0 && wsIds.length > 0) {
        const workshops = await prisma.workshop.findMany({
          where: { id: { in: wsIds }, deletedAt: null },
          select: { userCounts: true },
        })
        for (const ws of workshops) {
          if (ws.userCounts && typeof ws.userCounts === 'object') {
            for (const v of Object.values(ws.userCounts)) {
              totalRequired += parseInt(v, 10) || 0
            }
          }
        }
      }

      const totalCreated = wsIds.length
        ? await prisma.user.count({ where: { workshopId: { in: wsIds }, deletedAt: null } })
        : 0

      return {
        clientId:           client.id,
        clientName:         client.name,
        country:            client.country,
        currency:           client.defaultCurrency,
        workshopCount:      wsIds.length,
        totalRequiredUsers: totalRequired,
        totalCreatedUsers:  totalCreated,
        pendingUsers:       Math.max(0, totalRequired - totalCreated),
      }
    }))

    return success(res, { clients: summary })
  } catch (e) { next(e) }
}

// ── Update role user counts for an existing workshop ─────────────────────────

async function upsertWorkshopRoleCounts(req, res, next) {
  try {
    const { workshopId } = req.params
    const { roleUserCounts } = req.body

    if (!Array.isArray(roleUserCounts) || roleUserCounts.length === 0) {
      return badRequest(res, 'roleUserCounts must be a non-empty array')
    }

    const workshop = await prisma.workshop.findFirst({ where: { id: workshopId, deletedAt: null } })
    if (!workshop) return notFound(res, 'Workshop not found')

    const roleMap = await getRoleMap()
    const results = []

    for (const rc of roleUserCounts) {
      if (!ALLOWED_CODES.has(rc.roleCode)) continue
      if (!Number.isInteger(rc.count) || rc.count < 0) continue

      const role = roleMap.get(rc.roleCode)
      if (!role) continue

      const upserted = await prisma.workshopRoleUserCount.upsert({
        where:  { workshopId_roleId: { workshopId, roleId: role.id } },
        update: { requiredCount: rc.count },
        create: {
          clientId:     workshop.clientId,
          workshopId,
          roleId:       role.id,
          roleCode:     rc.roleCode,
          requiredCount: rc.count,
        },
      })
      results.push({ roleCode: rc.roleCode, roleName: role.name, requiredCount: upserted.requiredCount })
    }

    return success(res, { counts: results }, 'Role user counts updated')
  } catch (e) { next(e) }
}

// ── Add user directly (no slot-limit enforcement) ────────────────────────────

async function addUserDirect(req, res, next) {
  try {
    const { clientId, workshopId, roleCode, name, email, phone, password } = req.body

    if (!clientId)      return badRequest(res, 'clientId is required')
    if (!workshopId)    return badRequest(res, 'workshopId is required')
    if (!roleCode)      return badRequest(res, 'roleCode is required')
    if (!name?.trim())  return badRequest(res, 'name is required')
    if (!email?.trim()) return badRequest(res, 'email is required')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return badRequest(res, 'Valid email address is required')

    if (!ALLOWED_CODES.has(roleCode)) {
      return badRequest(res, `Role ${roleCode} is not a valid workshop user role. Allowed: ${[...ALLOWED_CODES].join(', ')}`)
    }

    const client = await prisma.client.findFirst({ where: { id: clientId, deletedAt: null } })
    if (!client) return notFound(res, 'Client not found')

    const workshop = await prisma.workshop.findFirst({ where: { id: workshopId, clientId, deletedAt: null } })
    if (!workshop) return notFound(res, 'Workshop not found or does not belong to the selected client')

    const roleMap   = await getRoleMap()
    const role      = roleMap.get(roleCode)
    if (!role) return notFound(res, `Role ${roleCode} not found in the roles table`)

    const userEnum  = CODE_TO_ENUM[roleCode]

    const emailConflict = await prisma.user.findFirst({ where: { loginEmail: email.trim().toLowerCase() } })
    if (emailConflict) {
      return res.status(409).json({ success: false, message: 'A user with this email already exists' })
    }

    const existingCount = await prisma.user.count({
      where: { workshopId, role: userEnum, deletedAt: null },
    })

    const plainPassword = password?.trim() || generateTempPassword(roleCode, existingCount + 1)
    const passwordHash  = await hashPassword(plainPassword)

    const user = await prisma.user.create({
      data: {
        workshopId,
        name:       name.trim(),
        loginEmail: email.trim().toLowerCase(),
        passwordHash,
        role:       userEnum,
        roleId:     role.id,
        phone:      phone?.trim() || null,
        status:     'Active',
      },
      include: {
        workshop: { select: { id: true, name: true, client: { select: { id: true, name: true } } } },
      },
    })

    // Keep WorkshopRoleUserCount in sync so the slot view reflects this user
    const roleCount = await prisma.workshopRoleUserCount.findFirst({
      where: { workshopId, roleId: role.id },
    })
    const newRequired = existingCount + 1
    if (!roleCount) {
      await prisma.workshopRoleUserCount.create({
        data: { clientId: client.id, workshopId, roleId: role.id, roleCode, requiredCount: newRequired },
      })
    } else if (newRequired > roleCount.requiredCount) {
      await prisma.workshopRoleUserCount.update({
        where: { workshopId_roleId: { workshopId, roleId: role.id } },
        data:  { requiredCount: newRequired },
      })
    }

    const { passwordHash: _ph, ...safeUser } = user
    return created(res, {
      user:         safeUser,
      tempPassword: plainPassword,
      slotNumber:   newRequired,
    }, 'User created successfully')
  } catch (e) { next(e) }
}

module.exports = {
  onboardClient,
  getCredentialSlots,
  createUserFromSlot,
  addUserDirect,
  getCredentialSummary,
  upsertWorkshopRoleCounts,
}

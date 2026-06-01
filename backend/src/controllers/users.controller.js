'use strict'

const prisma         = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { hashPassword, generateTempPassword } = require('../utils/passwordGenerator')
const { getPagination, paginate } = require('../utils/pagination')
const notifications  = require('../services/notifications.service')
const { credentialsEmail } = require('../utils/emailTemplates')

const VALID_ROLES = ['Technician', 'WorkshopController', 'Accounts', 'FrontDesk', 'Manager', 'PartsInterpreter', 'CEO']

const ENUM_TO_CODE = {
  Technician: 'TECHNICIAN',
  WorkshopController: 'WORKSHOP_CONTROLLER',
  FrontDesk: 'FRONT_DESK',
  Manager: 'MANAGER',
  Accounts: 'ACCOUNTS',
  PartsInterpreter: 'PARTS_INTERPRETER',
  CEO: 'CEO',
}

const ROLE_MAP = {
  Technician: 'Technician',
  'Workshop Controller': 'WorkshopController',
  WorkshopController: 'WorkshopController',
  Accounts: 'Accounts',
  'Front Desk': 'FrontDesk',
  FrontDesk: 'FrontDesk',
  'Front Desk / Service Consultant': 'FrontDesk',
  Manager: 'Manager',
  'Parts Interpreter': 'PartsInterpreter',
  PartsInterpreter: 'PartsInterpreter',
  CEO: 'CEO',
}

const ROLE_CODE_TO_ENUM = {
  TECHNICIAN:          'Technician',
  WORKSHOP_CONTROLLER: 'WorkshopController',
  FRONT_DESK:          'FrontDesk',
  MANAGER:             'Manager',
  ACCOUNTS:            'Accounts',
  PARTS_INTERPRETER:   'PartsInterpreter',
  CEO:                 'CEO',
}

async function listUsers(req, res, next) {
  try {
    const { workshopId, clientId, status, role, roleCode, search } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { deletedAt: null }

    if (req.user.type !== 'enterprise_admin') {
      where.workshopId = req.user.workshopId
    } else {
      if (workshopId) {
        where.workshopId = workshopId
      } else if (clientId) {
        const workshops = await prisma.workshop.findMany({
          where: { clientId, deletedAt: null },
          select: { id: true },
        })
        where.workshopId = { in: workshops.map(w => w.id) }
      }
    }

    if (status)   where.status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()
    if (roleCode) where.role   = ROLE_CODE_TO_ENUM[roleCode.toUpperCase()] || roleCode
    else if (role) where.role  = ROLE_MAP[role] || role
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { loginEmail: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: limit,
        include: {
          workshop: {
            select: {
              id: true,
              name: true,
              client: { select: { id: true, name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ])

    const safeUsers = users.map(({ passwordHash, ...u }) => u)
    return success(res, paginate(safeUsers, total, page, limit))
  } catch (e) { next(e) }
}

async function createUser(req, res, next) {
  try {
    const { workshopId, name, loginEmail, role, phone, password } = req.body

    if (!workshopId) return badRequest(res, 'workshopId is required')
    if (!name?.trim()) return badRequest(res, 'Name is required')
    if (!loginEmail?.trim()) return badRequest(res, 'Login email is required')
    if (!role) return badRequest(res, 'Role is required')

    const prismaRole = ROLE_MAP[role] || role
    if (!VALID_ROLES.includes(prismaRole)) return badRequest(res, `Invalid role: ${role}`)

    const workshop = await prisma.workshop.findFirst({ where: { id: workshopId, deletedAt: null } })
    if (!workshop) return notFound(res, 'Workshop not found')

    const existing = await prisma.user.findFirst({ where: { loginEmail: loginEmail.trim().toLowerCase() } })
    if (existing) {
      return res.status(409).json({ success: false, message: 'A user with this login email already exists' })
    }

    // Enforce slot limit if a WorkshopRoleUserCount record exists for this workshop + role
    const roleCode = ENUM_TO_CODE[prismaRole]
    if (roleCode) {
      const roleRecord = await prisma.role.findFirst({ where: { code: roleCode } })
      if (roleRecord) {
        const slotLimit = await prisma.workshopRoleUserCount.findFirst({
          where: { workshopId, roleId: roleRecord.id },
        })
        if (slotLimit) {
          const existingCount = await prisma.user.count({ where: { workshopId, role: prismaRole, deletedAt: null } })
          if (existingCount >= slotLimit.requiredCount) {
            return res.status(409).json({
              success:  false,
              message:  `Slot limit reached: required count of ${slotLimit.requiredCount} for ${roleCode} already filled`,
              required: slotLimit.requiredCount,
              created:  existingCount,
            })
          }
        }
      }
    }

    const plainPassword = password || generateTempPassword(role, 1)
    const passwordHash = await hashPassword(plainPassword)

    const user = await prisma.user.create({
      data: {
        workshopId,
        name: name.trim(),
        loginEmail: loginEmail.trim().toLowerCase(),
        passwordHash,
        role: prismaRole,
        phone: phone?.trim() || null,
        status: 'Active',
      },
      include: {
        workshop: {
          select: { id: true, name: true, client: { select: { id: true, name: true } } },
        },
      },
    })

    const { passwordHash: _, ...safeUser } = user
    return created(res, { user: safeUser, tempPassword: plainPassword }, 'User created')
  } catch (e) { next(e) }
}

async function bulkCreateUsers(req, res, next) {
  try {
    const { workshopId, userCounts } = req.body

    if (!workshopId) return badRequest(res, 'workshopId is required')
    if (!userCounts || typeof userCounts !== 'object') return badRequest(res, 'userCounts is required')

    const workshop = await prisma.workshop.findFirst({ where: { id: workshopId, deletedAt: null } })
    if (!workshop) return notFound(res, 'Workshop not found')

    const existingCounts = await prisma.user.groupBy({
      by: ['role'],
      where: { workshopId, deletedAt: null },
      _count: { id: true },
    })
    const countByRole = {}
    for (const row of existingCounts) countByRole[row.role] = row._count.id

    const wsCode = (workshop.workshopCode || workshopId.slice(-6)).toLowerCase().replace(/[^a-z0-9]/g, '')

    const ROLE_DISPLAY_TO_ENUM = {
      Technician: 'Technician',
      'Workshop Controller': 'WorkshopController',
      Accounts: 'Accounts',
      'Front Desk / Service Consultant': 'FrontDesk',
      'Front Desk': 'FrontDesk',
      Manager: 'Manager',
      'Parts Interpreter': 'PartsInterpreter',
    }
    const ROLE_SHORT = {
      Technician: 'tech',
      'Workshop Controller': 'ctrl',
      Accounts: 'accts',
      'Front Desk / Service Consultant': 'fd',
      'Front Desk': 'fd',
      Manager: 'mgr',
      'Parts Interpreter': 'parts',
    }

    const createdUsers = []
    const errors = []

    for (const [roleDisplay, countStr] of Object.entries(userCounts)) {
      const count = parseInt(countStr, 10)
      if (!count || count <= 0) continue
      const prismaRole = ROLE_DISPLAY_TO_ENUM[roleDisplay]
      if (!prismaRole) continue
      const alreadyExist = countByRole[prismaRole] || 0
      const roleShort = ROLE_SHORT[roleDisplay] || roleDisplay.toLowerCase().replace(/\s+/g, '').slice(0, 6)

      for (let i = 1; i <= count; i++) {
        const seq = alreadyExist + i
        const loginEmail = `${roleShort}${seq.toString().padStart(2, '0')}.${wsCode}@autiq.local`

        const alreadyExists = await prisma.user.findFirst({ where: { loginEmail } })
        if (alreadyExists) continue

        const plainPassword = generateTempPassword(roleDisplay, seq)
        const passwordHash = await hashPassword(plainPassword)

        try {
          const user = await prisma.user.create({
            data: {
              workshopId,
              name: `${roleDisplay} ${seq.toString().padStart(2, '0')}`,
              loginEmail,
              passwordHash,
              role: prismaRole,
              status: 'Active',
            },
          })
          const { passwordHash: _ph, ...safeUser } = user
          createdUsers.push({ ...safeUser, tempPassword: plainPassword })
        } catch (err) {
          errors.push(`${loginEmail}: ${err.message}`)
        }
      }
    }

    return created(
      res,
      { users: createdUsers, count: createdUsers.length, errors },
      `${createdUsers.length} users created`
    )
  } catch (e) { next(e) }
}

async function getUser(req, res, next) {
  try {
    const user = await prisma.user.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        workshop: {
          select: {
            id: true, name: true,
            client: { select: { id: true, name: true } },
          },
        },
      },
    })
    if (!user) return notFound(res, 'User not found')
    const { passwordHash, ...safeUser } = user
    return success(res, { user: safeUser })
  } catch (e) { next(e) }
}

async function updateUser(req, res, next) {
  try {
    const { name, loginEmail, phone, role } = req.body
    const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!user) return notFound(res, 'User not found')

    if (loginEmail && loginEmail.toLowerCase() !== user.loginEmail) {
      const existing = await prisma.user.findFirst({
        where: { loginEmail: loginEmail.trim().toLowerCase(), NOT: { id: req.params.id } },
      })
      if (existing) return badRequest(res, 'Login email already in use')
    }

    const prismaRole = role ? (ROLE_MAP[role] || role) : undefined
    if (prismaRole && !VALID_ROLES.includes(prismaRole)) return badRequest(res, `Invalid role: ${role}`)

    const updated = await prisma.user.update({
      where: { id: req.params.id },
      data: {
        ...(name && { name: name.trim() }),
        ...(loginEmail && { loginEmail: loginEmail.trim().toLowerCase() }),
        ...(phone !== undefined && { phone: phone?.trim() || null }),
        ...(prismaRole && { role: prismaRole }),
      },
      include: {
        workshop: {
          select: { id: true, name: true, client: { select: { id: true, name: true } } },
        },
      },
    })

    const { passwordHash, ...safeUser } = updated
    return success(res, { user: safeUser })
  } catch (e) { next(e) }
}

async function updateUserStatus(req, res, next) {
  try {
    const { status } = req.body
    if (!['Active', 'Inactive', 'Blocked'].includes(status)) {
      return badRequest(res, 'Invalid status. Must be Active, Inactive, or Blocked')
    }

    const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!user) return notFound(res, 'User not found')

    const updated = await prisma.user.update({ where: { id: req.params.id }, data: { status } })
    const { passwordHash, ...safeUser } = updated
    return success(res, { user: safeUser })
  } catch (e) { next(e) }
}

async function resetUserPassword(req, res, next) {
  try {
    const { newPassword } = req.body
    const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!user) return notFound(res, 'User not found')

    const plainPassword = newPassword || generateTempPassword(user.role, 1)
    const passwordHash = await hashPassword(plainPassword)

    await prisma.user.update({ where: { id: req.params.id }, data: { passwordHash } })
    return success(res, { tempPassword: plainPassword }, 'Password reset successfully')
  } catch (e) { next(e) }
}

async function deleteUser(req, res, next) {
  try {
    const user = await prisma.user.findFirst({ where: { id: req.params.id, deletedAt: null } })
    if (!user) return notFound(res, 'User not found')
    await prisma.user.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date(), status: 'Inactive' },
    })
    return success(res, {}, 'User deleted')
  } catch (e) { next(e) }
}

async function sendCredentials(req, res, next) {
  try {
    const { newPassword } = req.body

    const user = await prisma.user.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { workshop: { select: { id: true, name: true } } },
    })
    if (!user) return notFound(res, 'User not found')

    // If a fresh password is requested, reset it before sending
    let plainPassword = newPassword?.trim() || null
    if (plainPassword) {
      const passwordHash = await hashPassword(plainPassword)
      await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
    }

    const loginUrl = (process.env.FRONTEND_URL || 'http://localhost:5173') + '/login'

    const emailResult = await notifications.sendEmail({
      to:         user.loginEmail,
      subject:    `Your Autiq Africa login credentials — ${user.workshop?.name || 'Workshop'}`,
      html:       credentialsEmail({
        name:         user.name,
        loginEmail:   user.loginEmail,
        password:     plainPassword || '(set by your admin — ask your manager)',
        workshopName: user.workshop?.name,
        loginUrl,
      }),
      workshopId: user.workshopId,
      userId:     user.id,
      type:       'CredentialsSent',
    })

    return success(res, {
      name:         user.name,
      loginEmail:   user.loginEmail,
      workshopName: user.workshop?.name,
      emailStatus:  emailResult.status,
      message:      emailResult.status === 'sent'
        ? `Credentials emailed to ${user.loginEmail}`
        : `Credentials prepared (email ${emailResult.status}: ${emailResult.reason || ''})`,
    }, 'Credentials sent')
  } catch (e) { next(e) }
}

module.exports = {
  listUsers,
  createUser,
  bulkCreateUsers,
  getUser,
  updateUser,
  updateUserStatus,
  resetUserPassword,
  deleteUser,
  sendCredentials,
}

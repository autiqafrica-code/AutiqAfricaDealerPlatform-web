'use strict'

const crypto = require('crypto')
const prisma = require('../config/db')
const jwt = require('jsonwebtoken')
const {
  JWT_SECRET,
  JWT_EXPIRES_IN,
  JWT_REFRESH_SECRET,
  JWT_REFRESH_EXPIRES_IN,
} = require('../config/env')
const { comparePassword, hashPassword } = require('../utils/passwordGenerator')
const { USER_ROLE_TO_CODE, ADMIN_ROLE_TO_CODE, ROLE_DISPLAY } = require('../constants/roles')

/**
 * Unified credential verification for both User and EnterpriseAdmin tables.
 *
 * New login rule:
 * - Login only succeeds if user exists in database.
 * - Login never creates users.
 * - Password must match passwordHash.
 * - User/admin status must be Active.
 * - Selected role from frontend must match mapped database role.
 *
 * Frontend should send:
 * {
 *   email: "frontdesk@autiqafrica.com",
 *   password: "Autiq@2026",
 *   role: "FRONT_DESK"
 * }
 */
async function verifyCredentials(loginEmail, plainPassword, selectedRole) {
  // 1. Try workshop user first
  const user = await prisma.user.findUnique({
    where: { loginEmail },
    include: {
      workshop: {
        select: {
          id: true,
          name: true,
          clientId: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (user && !user.deletedAt) {
    const match = await comparePassword(plainPassword, user.passwordHash)

    if (!match) {
      return null
    }

    if (user.status !== 'Active') {
      return { error: 'inactive' }
    }

    const roleCode = USER_ROLE_TO_CODE[user.role] || null

    if (!roleCode) {
      return { error: 'unauthorized_role' }
    }

    if (selectedRole !== roleCode) {
      return { error: 'role_mismatch' }
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    return {
      id: user.id,
      name: user.name,
      roleCode,
      roleName: ROLE_DISPLAY[roleCode] || user.role,
      type: 'user',
      workshopId: user.workshopId,
      workshopName: user.workshop?.name,
      clientId: user.workshop?.clientId,
      clientName: user.workshop?.client?.name,
    }
  }

  // 2. Try enterprise admin
  const admin = await prisma.enterpriseAdmin.findUnique({
    where: { loginEmail },
  })

  if (admin && !admin.deletedAt) {
    const match = await comparePassword(plainPassword, admin.passwordHash)

    if (!match) {
      return null
    }

    if (admin.status !== 'Active') {
      return { error: 'inactive' }
    }

    const roleCode = ADMIN_ROLE_TO_CODE[admin.role] || null

    if (!roleCode) {
      return { error: 'unauthorized_role' }
    }

    if (selectedRole !== roleCode) {
      return { error: 'role_mismatch' }
    }

    await prisma.enterpriseAdmin.update({
      where: { id: admin.id },
      data: { lastLoginAt: new Date() },
    })

    return {
      id: admin.id,
      name: admin.name,
      roleCode,
      roleName: ROLE_DISPLAY[roleCode] || admin.role,
      type: 'enterprise_admin',
      adminCode: admin.adminCode,
      email: admin.email,
    }
  }

  // No matching database user/admin found
  return null
}

async function verifyWorkshopUserCredentials(loginEmail, plainPassword) {
  const user = await prisma.user.findUnique({
    where: { loginEmail },
    include: {
      workshop: {
        select: {
          id: true,
          name: true,
          clientId: true,
          client: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
    },
  })

  if (!user || user.deletedAt) {
    return null
  }

  const match = await comparePassword(plainPassword, user.passwordHash)

  if (!match) {
    return null
  }

  if (user.status !== 'Active') {
    return { error: 'inactive' }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  })

  const { passwordHash, ...safeUser } = user

  return safeUser
}

async function verifyEnterpriseAdminCredentials(loginEmail, plainPassword) {
  const admin = await prisma.enterpriseAdmin.findUnique({
    where: { loginEmail },
  })

  if (!admin || admin.deletedAt) {
    return null
  }

  const match = await comparePassword(plainPassword, admin.passwordHash)

  if (!match) {
    return null
  }

  if (admin.status !== 'Active') {
    return { error: 'inactive' }
  }

  await prisma.enterpriseAdmin.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  })

  const { passwordHash, ...safeAdmin } = admin

  return safeAdmin
}

function issueTokens(payload) {
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })

  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  })

  return { accessToken, refreshToken }
}

function issueAccessToken(payload) {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  })
}

function verifyRefreshToken(token) {
  return jwt.verify(token, JWT_REFRESH_SECRET)
}

async function recordLoginActivity({
  userId,
  enterpriseAdminId,
  loginEmail,
  loginStatus,
  ipAddress,
  userAgent,
}) {
  await prisma.loginActivity.create({
    data: {
      userId: userId ?? null,
      enterpriseAdminId: enterpriseAdminId ?? null,
      loginEmail,
      loginStatus,
      ipAddress: ipAddress ?? null,
      userAgent: userAgent ?? null,
    },
  })
}

async function generatePasswordResetToken(userId, adminId) {
  const token = crypto.randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: userId ?? null,
      adminId: adminId ?? null,
      expiresAt,
    },
  })

  return token
}

async function consumePasswordResetToken(token) {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  })

  if (!record) {
    return { error: 'not_found' }
  }

  if (record.usedAt) {
    return { error: 'already_used' }
  }

  if (record.expiresAt < new Date()) {
    return { error: 'expired' }
  }

  await prisma.passwordResetToken.update({
    where: { token },
    data: { usedAt: new Date() },
  })

  return {
    userId: record.userId,
    adminId: record.adminId,
  }
}

async function updateUserPassword(userId, newPlainPassword) {
  const passwordHash = await hashPassword(newPlainPassword)

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  })
}

async function updateAdminPassword(adminId, newPlainPassword) {
  const passwordHash = await hashPassword(newPlainPassword)

  await prisma.enterpriseAdmin.update({
    where: { id: adminId },
    data: { passwordHash },
  })
}

module.exports = {
  verifyCredentials,
  verifyWorkshopUserCredentials,
  verifyEnterpriseAdminCredentials,
  issueTokens,
  issueAccessToken,
  verifyRefreshToken,
  recordLoginActivity,
  generatePasswordResetToken,
  consumePasswordResetToken,
  updateUserPassword,
  updateAdminPassword,
}

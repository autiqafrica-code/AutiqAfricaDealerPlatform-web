'use strict'

const prisma = require('../config/db')
const authService = require('../services/auth.service')
const { success, unauthorized, badRequest, forbidden } = require('../utils/apiResponse')
const logger = require('../utils/logger')

async function login(req, res, next) {
  try {
    const { email, password, role } = req.body

    const result = await authService.verifyCredentials(email, password, role)

    if (!result) {
      await authService.recordLoginActivity({
        loginEmail: email,
        loginStatus: 'Failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      return unauthorized(res, 'Invalid email, password, or role')
    }

    if (result.error === 'inactive') {
      await authService.recordLoginActivity({
        loginEmail: email,
        loginStatus: 'Failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      return forbidden(res, 'Account is inactive. Contact your administrator.')
    }

    if (result.error === 'role_mismatch') {
      await authService.recordLoginActivity({
        loginEmail: email,
        loginStatus: 'Failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      return forbidden(res, 'Selected role is not assigned to this user.')
    }

    if (result.error === 'unauthorized_role') {
      await authService.recordLoginActivity({
        loginEmail: email,
        loginStatus: 'Failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      return forbidden(res, 'You are not authorized to access this area.')
    }

    const payload = {
      sub: result.id,
      id: result.id,
      roleCode: result.roleCode,
      roleName: result.roleName,
      type: result.type,
      ...(result.workshopId && { workshopId: result.workshopId }),
    }

    const { accessToken, refreshToken } = authService.issueTokens(payload)

    const activityData = {
      loginEmail: email,
      loginStatus: 'Success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    }

    if (result.type === 'enterprise_admin') {
      activityData.enterpriseAdminId = result.id
    } else {
      activityData.userId = result.id
    }

    await authService.recordLoginActivity(activityData)

    const user = {
      id: result.id,
      name: result.name,
      roleCode: result.roleCode,
      roleName: result.roleName,
      type: result.type,
    }

    if (result.workshopId) user.workshopId = result.workshopId
    if (result.workshopName) user.workshopName = result.workshopName
    if (result.clientId) user.clientId = result.clientId
    if (result.clientName) user.clientName = result.clientName
    if (result.adminCode) user.adminCode = result.adminCode
    if (result.email) user.email = result.email

    return success(res, { token: accessToken, refreshToken, user }, 'Login successful')
  } catch (err) {
    next(err)
  }
}

async function loginWorkshopUser(req, res, next) {
  try {
    const { email, password } = req.body
    const result = await authService.verifyWorkshopUserCredentials(email, password)

    if (!result) {
      await authService.recordLoginActivity({
        loginEmail: email,
        loginStatus: 'Failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      return unauthorized(res, 'Invalid email or password')
    }

    if (result.error === 'inactive') {
      return forbidden(res, 'Account is inactive. Contact your workshop administrator.')
    }

    const payload = {
      sub: result.id,
      id: result.id,
      workshopId: result.workshopId,
      role: result.role,
      type: 'user',
    }

    const { accessToken, refreshToken } = authService.issueTokens(payload)

    await authService.recordLoginActivity({
      userId: result.id,
      loginEmail: email,
      loginStatus: 'Success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return success(
      res,
      {
        token: accessToken,
        refreshToken,
        user: {
          id: result.id,
          name: result.name,
          role: result.role,
          workshopId: result.workshopId,
          workshopName: result.workshop?.name,
          clientId: result.workshop?.clientId,
          clientName: result.workshop?.client?.name,
        },
      },
      'Login successful'
    )
  } catch (err) {
    next(err)
  }
}

async function loginEnterpriseAdmin(req, res, next) {
  try {
    const { email, password } = req.body
    const result = await authService.verifyEnterpriseAdminCredentials(email, password)

    if (!result) {
      await authService.recordLoginActivity({
        loginEmail: email,
        loginStatus: 'Failed',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'],
      })

      return unauthorized(res, 'Invalid email or password')
    }

    if (result.error === 'inactive') {
      return forbidden(res, 'Account is inactive.')
    }

    const payload = {
      sub: result.id,
      id: result.id,
      role: result.role,
      type: 'enterprise_admin',
    }

    const { accessToken, refreshToken } = authService.issueTokens(payload)

    await authService.recordLoginActivity({
      enterpriseAdminId: result.id,
      loginEmail: email,
      loginStatus: 'Success',
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
    })

    return success(
      res,
      {
        token: accessToken,
        refreshToken,
        user: {
          id: result.id,
          name: result.name,
          role: result.role,
          adminCode: result.adminCode,
          email: result.email,
        },
      },
      'Login successful'
    )
  } catch (err) {
    next(err)
  }
}

async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body

    let decoded

    try {
      decoded = authService.verifyRefreshToken(token)
    } catch {
      return unauthorized(res, 'Invalid or expired refresh token')
    }

    const payload = {
      sub: decoded.sub,
      id: decoded.id,
      type: decoded.type,
      role: decoded.role,
      roleCode: decoded.roleCode,
      roleName: decoded.roleName,
      ...(decoded.workshopId && { workshopId: decoded.workshopId }),
    }

    const accessToken = authService.issueAccessToken(payload)

    return success(res, { token: accessToken }, 'Token refreshed')
  } catch (err) {
    next(err)
  }
}

async function logout(req, res, next) {
  return success(res, null, 'Logged out successfully')
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body

    const user = await prisma.user.findFirst({
      where: {
        loginEmail: email,
        deletedAt: null,
      },
    })

    const admin = !user
      ? await prisma.enterpriseAdmin.findFirst({
          where: {
            loginEmail: email,
            deletedAt: null,
          },
        })
      : null

    if (user || admin) {
      const resetToken = await authService.generatePasswordResetToken(
        user?.id ?? null,
        admin?.id ?? null
      )

      if (process.env.NODE_ENV !== 'production') {
        logger.info(`[DEV] Password reset token for ${email}: ${resetToken}`)
      }
    }

    return success(res, null, 'If this email exists, a password reset link will be sent.')
  } catch (err) {
    next(err)
  }
}

async function resetPassword(req, res, next) {
  try {
    const { token, newPassword } = req.body

    const result = await authService.consumePasswordResetToken(token)

    if (result.error === 'not_found' || result.error === 'expired') {
      return badRequest(res, 'Reset token is invalid or has expired.')
    }

    if (result.error === 'already_used') {
      return badRequest(res, 'Reset token has already been used.')
    }

    if (result.userId) {
      await authService.updateUserPassword(result.userId, newPassword)
    } else if (result.adminId) {
      await authService.updateAdminPassword(result.adminId, newPassword)
    }

    return success(res, null, 'Password updated successfully. Please log in with your new password.')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  login,
  loginWorkshopUser,
  loginEnterpriseAdmin,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
}

'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')
const { reminderCode } = require('../utils/idGenerator')

async function listNotifications(req, res, next) {
  try {
    const { workshopId } = req.user
    const { page, limit, skip } = getPagination(req.query)
    const where = { workshopId }

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { name: true } } },
      }),
      prisma.notification.count({ where }),
    ])

    return success(res, paginate(notifications, total, page, limit))
  } catch (err) {
    next(err)
  }
}

async function sendNotification(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { customerId, channel, type, message, jobCardId, quotationId } = req.body

    if (!message?.trim()) return badRequest(res, 'Message is required')
    if (!channel)         return badRequest(res, 'Channel is required')

    const notification = await prisma.notification.create({
      data: {
        workshopId,
        customerId:  customerId  || null,
        userId,
        jobCardId:   jobCardId   || null,
        quotationId: quotationId || null,
        channel,
        type:        type || 'Manual',
        message:     message.trim(),
        status:      'Sent',
        sentAt:      new Date(),
      },
    })

    return created(res, { notification }, 'Notification sent')
  } catch (err) {
    next(err)
  }
}

async function listReminderRules(req, res, next) {
  try {
    const { workshopId } = req.user
    const { status } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId }
    if (status) where.status = status

    const [rules, total] = await Promise.all([
      prisma.approvalReminderRule.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          quotation: {
            select: {
              quoteNumber: true,
              customer:    { select: { name: true } },
            },
          },
        },
      }),
      prisma.approvalReminderRule.count({ where }),
    ])

    return success(res, paginate(rules, total, page, limit))
  } catch (err) {
    next(err)
  }
}

async function createReminderRule(req, res, next) {
  try {
    const { workshopId } = req.user
    const {
      quotationId, channel, firstReminderDelay, repeatFrequency,
      maxAttempts, stopCondition, messageTemplate, status,
    } = req.body

    if (!quotationId)         return badRequest(res, 'Quotation is required')
    if (!channel)             return badRequest(res, 'Channel is required')
    if (!firstReminderDelay)  return badRequest(res, 'First reminder delay is required')
    if (!repeatFrequency)     return badRequest(res, 'Repeat frequency is required')
    if (!stopCondition)       return badRequest(res, 'Stop condition is required')

    const count = await prisma.approvalReminderRule.count({ where: { workshopId } })
    const code  = reminderCode(count + 1)

    const rule = await prisma.approvalReminderRule.create({
      data: {
        ruleCode:           code,
        workshopId,
        quotationId,
        channel,
        firstReminderDelay,
        repeatFrequency,
        maxAttempts:        maxAttempts ? parseInt(maxAttempts) : 3,
        stopCondition,
        messageTemplate:    messageTemplate?.trim() || null,
        status:             status || 'Active',
      },
      include: {
        quotation: { select: { quoteNumber: true, customer: { select: { name: true } } } },
      },
    })

    return created(res, { rule }, 'Reminder rule created')
  } catch (err) {
    next(err)
  }
}

async function updateReminderRule(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { channel, firstReminderDelay, repeatFrequency, maxAttempts, stopCondition, messageTemplate } = req.body

    const existing = await prisma.approvalReminderRule.findFirst({ where: { id, workshopId } })
    if (!existing) return notFound(res, 'Reminder rule not found')

    const rule = await prisma.approvalReminderRule.update({
      where: { id },
      data: {
        ...(channel              && { channel }),
        ...(firstReminderDelay   && { firstReminderDelay }),
        ...(repeatFrequency      && { repeatFrequency }),
        ...(maxAttempts !== undefined && { maxAttempts: parseInt(maxAttempts) }),
        ...(stopCondition        && { stopCondition }),
        ...(messageTemplate !== undefined && { messageTemplate: messageTemplate?.trim() || null }),
      },
    })

    return success(res, { rule }, 'Reminder rule updated')
  } catch (err) {
    next(err)
  }
}

async function updateReminderStatus(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { status } = req.body

    if (!['Active','Paused'].includes(status)) return badRequest(res, 'Status must be Active or Paused')

    const existing = await prisma.approvalReminderRule.findFirst({ where: { id, workshopId } })
    if (!existing) return notFound(res, 'Reminder rule not found')

    const rule = await prisma.approvalReminderRule.update({ where: { id }, data: { status } })
    return success(res, { rule }, `Reminder ${status.toLowerCase()}`)
  } catch (err) {
    next(err)
  }
}

async function deleteReminderRule(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const existing = await prisma.approvalReminderRule.findFirst({ where: { id, workshopId } })
    if (!existing) return notFound(res, 'Reminder rule not found')

    await prisma.approvalReminderRule.delete({ where: { id } })
    return success(res, null, 'Reminder rule deleted')
  } catch (err) {
    next(err)
  }
}

async function sendTestReminder(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { quotationId, channel, message } = req.body

    await prisma.notification.create({
      data: {
        workshopId,
        userId,
        quotationId: quotationId || null,
        channel:     channel || 'WhatsApp',
        type:        'ApprovalReminderTest',
        message:     message || 'Test reminder: Your quotation is waiting for approval.',
        status:      'Sent',
        sentAt:      new Date(),
      },
    })

    return success(res, null, 'Test reminder sent')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listNotifications, sendNotification,
  listReminderRules, createReminderRule, updateReminderRule, updateReminderStatus, deleteReminderRule,
  sendTestReminder,
}

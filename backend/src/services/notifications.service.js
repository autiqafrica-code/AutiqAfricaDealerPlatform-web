'use strict'

const prisma       = require('../config/db')
const logger       = require('../utils/logger')
const emailService = require('./email.service')

// ── Notification logging ──────────────────────────────────────────────────────

async function logNotification({ workshopId, customerId, userId, jobCardId, quotationId, channel, type, message, status, failureReason }) {
  try {
    await prisma.notification.create({
      data: {
        workshopId:    workshopId    || undefined,
        customerId:    customerId    || undefined,
        userId:        userId        || undefined,
        jobCardId:     jobCardId     || undefined,
        quotationId:   quotationId   || undefined,
        channel,
        type:          type          || 'General',
        message,
        status,
        failureReason: failureReason || null,
        sentAt:        status === 'Sent' ? new Date() : null,
      },
    })
  } catch (err) {
    // Never let logging failures break the main flow
    logger.error(`[Notification] Failed to log notification: ${err.message}`)
  }
}

// ── Email ─────────────────────────────────────────────────────────────────────

/**
 * Send an email and record the result in the notifications table.
 * Always resolves — never throws — so callers don't need try/catch.
 */
async function sendEmail({ to, cc, subject, html, workshopId, customerId, userId, quotationId, jobCardId, type }) {
  const result = await emailService.sendEmail({ to, cc, subject, html })

  const statusMap = { sent: 'Sent', skipped: 'Skipped', failed: 'Failed' }

  await logNotification({
    workshopId,
    customerId,
    userId,
    quotationId,
    jobCardId,
    channel:       'Email',
    type:          type || 'General',
    message:       subject,
    status:        statusMap[result.status] || 'Failed',
    failureReason: result.reason || null,
  })

  return result
}

// ── WhatsApp (stub — wire up your provider here) ──────────────────────────────

async function sendWhatsApp({ to, message, workshopId, customerId, userId, quotationId, type }) {
  // TODO: integrate 360Dialog / Twilio / Meta Business API
  logger.info(`[WhatsApp STUB] To: ${to} | Message: ${message}`)

  await logNotification({
    workshopId,
    customerId,
    userId,
    quotationId,
    channel:       'WhatsApp',
    type:          type || 'General',
    message,
    status:        'Skipped',
    failureReason: 'WhatsApp API not configured',
  })

  return { status: 'skipped', reason: 'WhatsApp API not configured' }
}

// ── Approval reminder scheduler (called by cron) ──────────────────────────────

async function processApprovalReminders() {
  const now = new Date()

  const activeRules = await prisma.approvalReminderRule.findMany({
    where: { status: 'Active' },
    include: {
      quotation: {
        include: {
          customer: { select: { name: true, email: true, phone: true } },
          vehicle:  { select: { registrationNo: true, makeModel: true } },
        },
      },
    },
  })

  for (const rule of activeRules) {
    const q = rule.quotation

    // Stop if quotation already approved/rejected
    if (['CustomerApproved', 'CustomerRejected'].includes(q?.status)) {
      await prisma.approvalReminderRule.update({ where: { id: rule.id }, data: { status: 'Paused' } })
      continue
    }

    // Stop if max attempts reached
    if (rule.currentAttempts >= rule.maxAttempts) {
      await prisma.approvalReminderRule.update({ where: { id: rule.id }, data: { status: 'Paused' } })
      continue
    }

    // Calculate next send time
    const delayMs = rule.currentAttempts === 0
      ? rule.firstReminderDelay * 60 * 1000
      : rule.repeatFrequency   * 60 * 1000

    const lastAttempt = rule.lastAttemptAt || rule.createdAt
    const nextSend    = new Date(lastAttempt.getTime() + delayMs)
    if (now < nextSend) continue

    // Send the reminder
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173'
    const approvalUrl = q?.approvalToken ? `${frontendUrl}/portal/${q.approvalToken}` : null

    if (!approvalUrl) continue

    const message = rule.messageTemplate
      || `Reminder: Your repair quotation ${q?.quoteNumber} is awaiting your approval. ${approvalUrl}`

    const customerEmail = q?.customer?.email
    if (customerEmail && emailService.isRealAddress(customerEmail)) {
      await sendEmail({
        to:          customerEmail,
        subject:     `Reminder: Quotation ${q?.quoteNumber} awaiting your approval`,
        html:        `<p>${message.replace(/\n/g, '<br>')}</p>`,
        workshopId:  rule.workshopId,
        customerId:  q?.customerId,
        quotationId: q?.id,
        type:        'ApprovalReminder',
      })
    }

    // Update attempt count
    await prisma.approvalReminderRule.update({
      where: { id: rule.id },
      data: {
        currentAttempts: { increment: 1 },
        lastAttemptAt:   now,
      },
    })

    await prisma.reminderLog.create({
      data: {
        ruleId:      rule.id,
        quotationId: q?.id || rule.quotationId,
        channel:     rule.channel,
        status:      'Sent',
        sentAt:      now,
      },
    })
  }
}

module.exports = { sendEmail, sendWhatsApp, logNotification, processApprovalReminders }

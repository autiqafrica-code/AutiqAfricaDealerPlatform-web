'use strict'

const nodemailer = require('nodemailer')
const logger     = require('../utils/logger')

let _transporter = null

function buildTransporter() {
  const host = process.env.SMTP_HOST?.trim()
  const user = process.env.SMTP_USER?.trim()
  const pass = process.env.SMTP_PASS?.trim()
  const port = parseInt(process.env.SMTP_PORT || '587', 10)

  if (!host || !user || !pass) return null

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  })
}

function getTransporter() {
  if (!_transporter) _transporter = buildTransporter()
  return _transporter
}

function isRealAddress(email) {
  if (!email) return false
  // Skip auto-generated internal emails
  if (email.includes('@autiq.local')) return false
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

/**
 * Send a single email.
 * @returns {{ status: 'sent'|'skipped'|'failed', messageId?: string, reason?: string }}
 */
async function sendEmail({ to, cc, subject, html, text }) {
  if (!isRealAddress(to)) {
    logger.warn(`[Email] Skipping non-deliverable address: ${to}`)
    return { status: 'skipped', reason: 'Non-deliverable address' }
  }

  const transporter = getTransporter()
  if (!transporter) {
    logger.warn(`[Email] SMTP not configured — skipping: "${subject}" → ${to}`)
    return { status: 'skipped', reason: 'SMTP not configured' }
  }

  const from = process.env.EMAIL_FROM || 'Autiq Africa <noreply@autiqafrica.com>'

  try {
    const info = await transporter.sendMail({
      from,
      to,
      cc:      cc      || undefined,
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim(),
    })
    logger.info(`[Email] Sent "${subject}" → ${to} (${info.messageId})`)
    return { status: 'sent', messageId: info.messageId }
  } catch (err) {
    logger.error(`[Email] Failed "${subject}" → ${to}: ${err.message}`)
    return { status: 'failed', reason: err.message }
  }
}

/** Reset cached transporter — useful when env changes in tests */
function resetTransporter() { _transporter = null }

module.exports = { sendEmail, isRealAddress, resetTransporter }

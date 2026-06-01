'use strict'

const crypto = require('crypto')
const prisma  = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')

function generateRawToken() {
  return crypto.randomBytes(32).toString('hex')
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

function buildPortalUrl(rawToken) {
  const base = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '')
  return `${base}/tracking/${rawToken}`
}

// ── Generate link ─────────────────────────────────────────────────────────────

async function generateLink(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { jobId } = req.params

    const job = await prisma.jobCard.findFirst({
      where: { id: jobId, workshopId, deletedAt: null },
    })
    if (!job) return notFound(res, 'Job not found')

    // Revoke any existing active link for this job
    await prisma.customerPortalLink.updateMany({
      where: { jobCardId: jobId, status: 'Active' },
      data:  { status: 'Revoked', revokedAt: new Date() },
    })

    const rawToken   = generateRawToken()
    const tokenHash  = hashToken(rawToken)

    await prisma.customerPortalLink.create({
      data: {
        tokenHash,
        workshopId,
        jobCardId:       jobId,
        status:          'Active',
        createdByUserId: userId,
      },
    })

    const url = buildPortalUrl(rawToken)

    // Notify log (fire and forget)
    prisma.notification.create({
      data: {
        workshopId,
        jobCardId: jobId,
        channel:   'Email',
        type:      'CUSTOMER_PORTAL_LINK_CREATED',
        message:   `Customer portal link generated for job ${job.jobNumber}.`,
        status:    'Sent',
        sentAt:    new Date(),
      },
    }).catch(() => {})

    return created(res, { url, token: rawToken, message: 'Customer portal link generated. Share this URL with the customer.' })
  } catch (err) { next(err) }
}

// ── Get link status ───────────────────────────────────────────────────────────

async function getLink(req, res, next) {
  try {
    const { workshopId } = req.user
    const { jobId }      = req.params

    const job = await prisma.jobCard.findFirst({
      where: { id: jobId, workshopId, deletedAt: null },
    })
    if (!job) return notFound(res, 'Job not found')

    const link = await prisma.customerPortalLink.findFirst({
      where:   { jobCardId: jobId },
      orderBy: { createdAt: 'desc' },
    })

    if (!link) return success(res, { hasLink: false, jobNumber: job.jobNumber })

    return success(res, {
      hasLink:       true,
      status:        link.status,
      accessCount:   link.accessCount,
      lastAccessedAt: link.lastAccessedAt,
      createdAt:     link.createdAt,
      expiresAt:     link.expiresAt,
      jobNumber:     job.jobNumber,
    })
  } catch (err) { next(err) }
}

// ── Revoke link ───────────────────────────────────────────────────────────────

async function revokeLink(req, res, next) {
  try {
    const { workshopId } = req.user
    const { jobId }      = req.params

    const job = await prisma.jobCard.findFirst({
      where: { id: jobId, workshopId, deletedAt: null },
    })
    if (!job) return notFound(res, 'Job not found')

    const updated = await prisma.customerPortalLink.updateMany({
      where: { jobCardId: jobId, status: 'Active' },
      data:  { status: 'Revoked', revokedAt: new Date() },
    })

    if (updated.count === 0) return badRequest(res, 'No active link found to revoke')

    return success(res, { message: 'Customer portal link revoked.' })
  } catch (err) { next(err) }
}

// ── Regenerate link ───────────────────────────────────────────────────────────

async function regenerateLink(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { jobId }                  = req.params

    const job = await prisma.jobCard.findFirst({
      where: { id: jobId, workshopId, deletedAt: null },
    })
    if (!job) return notFound(res, 'Job not found')

    // Revoke all existing
    await prisma.customerPortalLink.updateMany({
      where: { jobCardId: jobId, status: 'Active' },
      data:  { status: 'Revoked', revokedAt: new Date() },
    })

    const rawToken  = generateRawToken()
    const tokenHash = hashToken(rawToken)

    await prisma.customerPortalLink.create({
      data: {
        tokenHash,
        workshopId,
        jobCardId:       jobId,
        status:          'Active',
        createdByUserId: userId,
      },
    })

    const url = buildPortalUrl(rawToken)

    prisma.notification.create({
      data: {
        workshopId,
        jobCardId: jobId,
        channel:   'Email',
        type:      'CUSTOMER_PORTAL_LINK_REGENERATED',
        message:   `Customer portal link regenerated for job ${job.jobNumber}. Old link invalidated.`,
        status:    'Sent',
        sentAt:    new Date(),
      },
    }).catch(() => {})

    return created(res, { url, token: rawToken, message: 'New customer portal link generated. Old link is now invalid.' })
  } catch (err) { next(err) }
}

// ── Mark media customer-visible ───────────────────────────────────────────────

async function setMediaVisible(req, res, next) {
  try {
    const { workshopId } = req.user
    const { jobId, mediaId } = req.params
    const { customerVisible } = req.body

    const job = await prisma.jobCard.findFirst({
      where: { id: jobId, workshopId, deletedAt: null },
    })
    if (!job) return notFound(res, 'Job not found')

    const media = await prisma.jobMedia.findFirst({ where: { id: mediaId, jobCardId: jobId } })
    if (!media) return notFound(res, 'Media not found')

    await prisma.jobMedia.update({
      where: { id: mediaId },
      data:  { customerVisible: !!customerVisible },
    })

    return success(res, { mediaId, customerVisible: !!customerVisible })
  } catch (err) { next(err) }
}

module.exports = { generateLink, getLink, revokeLink, regenerateLink, setMediaVisible }

'use strict'

const crypto        = require('crypto')
const jwt           = require('jsonwebtoken')
const prisma        = require('../config/db')
const { JWT_SECRET } = require('../config/env')
const { success, badRequest, notFound, error: apiError } = require('../utils/apiResponse')
const notifications = require('../services/notifications.service')
const { jobNumber }  = require('../utils/idGenerator')

// ── Token helpers ─────────────────────────────────────────────────────────────

function hashToken(raw) {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

const INVALID_MSG = 'This tracking link is invalid, expired, or has been revoked.'

async function resolveLink(tokenParam) {
  if (!tokenParam) return null
  const hash = hashToken(tokenParam)
  const link  = await prisma.customerPortalLink.findUnique({
    where: { tokenHash: hash },
    include: {
      jobCard: {
        include: {
          quotation: {
            include: {
              customer:  { select: { name: true, phone: true, email: true } },
              vehicle:   { select: { registrationNo: true, makeModel: true } },
              lineItems: { orderBy: { createdAt: 'asc' } },
              workshop:  { select: { name: true, phone: true, email: true, address: true, city: true } },
            },
          },
          vehicle:  { select: { registrationNo: true, makeModel: true } },
          invoice:  {
            include: {
              lineItems: { orderBy: { createdAt: 'asc' } },
              payments:  { orderBy: { createdAt: 'desc' } },
            },
          },
          deliveryPref: true,
        },
      },
      workshop: { select: { name: true, phone: true, email: true, address: true, city: true } },
    },
  })

  if (!link) return null
  if (link.status === 'Revoked' || link.status === 'Expired') return null
  if (link.expiresAt && new Date() > new Date(link.expiresAt)) return null

  // Update access count and timestamp (fire and forget)
  prisma.customerPortalLink.update({
    where: { id: link.id },
    data: { accessCount: { increment: 1 }, lastAccessedAt: new Date() },
  }).catch(() => {})

  return link
}

// ── Progress step builder ─────────────────────────────────────────────────────

function buildProgressSteps(jobCard, quotation, invoice) {
  const js  = jobCard.status
  const qs  = quotation?.status
  const inv = invoice

  const completedStatuses = ['InProgress','WaitingApproval','WaitingParts','Payment','QCReview','Completed','Ready']
  const workStatuses      = ['WaitingParts','Payment','QCReview','Completed','Ready']
  const qcStatuses        = ['Payment','Completed','Ready']
  const paidStatuses      = ['Completed','Ready']

  const steps = [
    {
      key:    'job_created',
      label:  'Job created',
      detail: 'Your vehicle has been received by the workshop.',
      done:   true,
      active: js === 'New',
      ts:     jobCard.createdAt,
    },
    {
      key:    'inspection',
      label:  'Inspection in progress',
      detail: 'A technician is inspecting your vehicle.',
      done:   completedStatuses.includes(js),
      active: js === 'New' || js === 'Accepted',
      ts:     jobCard.startedAt,
    },
    {
      key:    'quotation_prepared',
      label:  'Quotation prepared',
      detail: 'A service quotation has been prepared for your approval.',
      done:   qs && ['SentToCustomer','CustomerApproved','CustomerRejected'].includes(qs),
      active: qs === 'InternalReview' || qs === 'InternalUpdatesReceived',
      ts:     quotation?.sentToCustomerAt,
    },
    {
      key:    'awaiting_approval',
      label:  'Awaiting your approval',
      detail: qs === 'CustomerApproved'
        ? 'You have approved the quotation. Thank you.'
        : qs === 'CustomerRejected'
        ? 'The quotation was declined.'
        : 'Please review and approve the quotation.',
      done:   qs === 'CustomerApproved',
      active: qs === 'SentToCustomer',
      blocked: qs === 'CustomerRejected',
      ts:     quotation?.approvedAt || quotation?.rejectedAt,
    },
    {
      key:    'work_in_progress',
      label:  'Repair work in progress',
      detail: 'The workshop team is working on your vehicle.',
      done:   workStatuses.includes(js),
      active: js === 'InProgress' || js === 'WaitingApproval',
      ts:     jobCard.startedAt,
    },
    {
      key:    'quality_check',
      label:  'Quality check',
      detail: 'Your vehicle is undergoing a final quality inspection.',
      done:   qcStatuses.includes(js) || !!jobCard.qcApprovedAt,
      active: js === 'QCReview',
      ts:     jobCard.qcApprovedAt,
    },
    {
      key:    'invoice_generated',
      label:  'Invoice generated',
      detail: inv ? `Invoice ${inv.invoiceNumber} has been issued.` : 'Invoice will be issued after work is completed.',
      done:   !!inv,
      active: js === 'Payment',
      ts:     inv?.issueDate,
    },
    {
      key:    'payment',
      label:  'Payment',
      detail: inv?.paymentStatus === 'Paid'
        ? 'Payment has been received. Thank you.'
        : inv
        ? 'Please arrange payment with the service team.'
        : 'Payment details will be available after invoicing.',
      done:   inv?.paymentStatus === 'Paid' || paidStatuses.includes(js),
      active: js === 'Payment' && inv && inv.paymentStatus !== 'Paid',
      ts:     null,
    },
    {
      key:    'ready',
      label:  'Ready for collection / delivery',
      detail: js === 'Completed'
        ? 'Your vehicle has been collected or delivered.'
        : js === 'Ready'
        ? 'Your vehicle is ready. Please arrange collection or delivery.'
        : 'Your vehicle will be ready once all previous steps are complete.',
      done:   js === 'Completed',
      active: js === 'Ready',
      ts:     jobCard.completedAt,
    },
  ]

  const doneCount = steps.filter(s => s.done).length
  const progressPercent = Math.round((doneCount / steps.length) * 100)

  const currentStep = steps.find(s => s.active && !s.done) || steps.findLast(s => s.done) || steps[0]

  return { steps, progressPercent, currentStage: currentStep?.label || 'In progress' }
}

// ── Customer-safe job summary ─────────────────────────────────────────────────

function buildJobSummary(link) {
  const job      = link.jobCard
  const quote    = job.quotation
  const customer = quote.customer
  const vehicle  = job.vehicle || quote.vehicle
  const workshop = link.workshop

  const firstName = customer?.name?.split(' ')[0] || 'Customer'

  return {
    jobNumber:       job.jobNumber,
    status:          job.status,
    progress:        job.progress,
    lastUpdatedAt:   job.updatedAt,
    customer: {
      firstName,
      phone: customer?.phone || null,
    },
    vehicle: {
      registrationNo: vehicle?.registrationNo || '—',
      makeModel:      vehicle?.makeModel      || '—',
    },
    workshop: {
      name:    workshop.name,
      phone:   workshop.phone   || null,
      email:   workshop.email   || null,
      address: workshop.address || workshop.city || null,
    },
  }
}

// ── Controllers ───────────────────────────────────────────────────────────────

async function getOverview(req, res, next) {
  try {
    const link = await resolveLink(req.params.token)
    if (!link) return res.status(404).json({ success: false, message: INVALID_MSG })

    const job     = link.jobCard
    const invoice = job.invoice
    const { steps, progressPercent, currentStage } = buildProgressSteps(job, job.quotation, invoice)

    return success(res, {
      ...buildJobSummary(link),
      progressPercent,
      currentStage,
      steps,
    })
  } catch (err) { next(err) }
}

async function getProgress(req, res, next) {
  try {
    const link = await resolveLink(req.params.token)
    if (!link) return res.status(404).json({ success: false, message: INVALID_MSG })

    const job  = link.jobCard
    const { steps, progressPercent, currentStage } = buildProgressSteps(job, job.quotation, job.invoice)

    return success(res, {
      jobNumber:      job.jobNumber,
      status:         job.status,
      progressPercent,
      currentStage,
      steps,
      lastUpdatedAt:  job.updatedAt,
    })
  } catch (err) { next(err) }
}

async function getMedia(req, res, next) {
  try {
    const link = await resolveLink(req.params.token)
    if (!link) return res.status(404).json({ success: false, message: INVALID_MSG })

    const media = await prisma.jobMedia.findMany({
      where: { jobCardId: link.jobCardId, customerVisible: true },
      orderBy: { createdAt: 'asc' },
    })

    const items = media.map(m => ({
      id:          m.id,
      mediaType:   m.mediaType,
      category:    m.mediaCategory || 'General',
      fileName:    m.fileName,
      fileUrl:     m.fileUrl,
      uploadedAt:  m.createdAt,
    }))

    return success(res, items)
  } catch (err) { next(err) }
}

async function getApprovals(req, res, next) {
  try {
    const link = await resolveLink(req.params.token)
    if (!link) return res.status(404).json({ success: false, message: INVALID_MSG })

    const quotation = link.jobCard.quotation
    if (!quotation) return success(res, [])

    const statusMap = {
      SentToCustomer:   { status: 'PENDING',   label: 'Awaiting your approval' },
      CustomerApproved: { status: 'APPROVED',  label: 'Approved' },
      CustomerRejected: { status: 'REJECTED',  label: 'Declined' },
    }
    const info = statusMap[quotation.status]
    if (!info) return success(res, [])

    const lineItems = (quotation.lineItems || []).map(li => ({
      description: li.item,
      cost:        Number(li.cost || 0),
      currency:    li.currency,
    }))

    const approval = {
      id:          quotation.id,
      approvalType: 'MAIN_QUOTATION',
      title:        'Service &amp; repair quotation',
      description:  quotation.customerComplaint || quotation.repairType || 'Workshop service quotation',
      amount:       Number(quotation.totalEstimate || 0),
      currency:     quotation.currency || 'ZAR',
      status:       info.status,
      statusLabel:  info.label,
      lineItems,
      respondedAt:  quotation.approvedAt || quotation.rejectedAt || null,
      createdAt:    quotation.sentToCustomerAt || quotation.createdAt,
    }

    return success(res, [approval])
  } catch (err) { next(err) }
}

async function respondToApproval(req, res, next) {
  try {
    const link = await resolveLink(req.params.token)
    if (!link) return res.status(404).json({ success: false, message: INVALID_MSG })

    const { approvalId } = req.params
    const { decision, customerComment } = req.body

    if (!['APPROVED', 'REJECTED'].includes(decision))
      return badRequest(res, 'decision must be APPROVED or REJECTED')

    const quotation = link.jobCard.quotation
    if (!quotation || quotation.id !== approvalId)
      return notFound(res, 'Approval not found for this job')

    if (quotation.status === 'CustomerApproved')
      return badRequest(res, 'Quotation has already been approved')
    if (quotation.status === 'CustomerRejected')
      return badRequest(res, 'Quotation has already been declined')
    if (quotation.status !== 'SentToCustomer')
      return badRequest(res, 'Quotation is not currently awaiting approval')

    const updateData = decision === 'APPROVED'
      ? { status: 'CustomerApproved', approvedAt: new Date(), customerSignature: customerComment || null }
      : { status: 'CustomerRejected', rejectedAt: new Date(), customerSignature: customerComment || null }

    await prisma.quotation.update({ where: { id: quotation.id }, data: updateData })

    // Notify Front Desk (fire and forget)
    prisma.notification.create({
      data: {
        workshopId:   link.workshopId,
        jobCardId:    link.jobCardId,
        quotationId:  quotation.id,
        channel:      'Email',
        type:         decision === 'APPROVED' ? 'CUSTOMER_APPROVED_QUOTATION' : 'CUSTOMER_REJECTED_QUOTATION',
        message:      decision === 'APPROVED'
          ? `Customer approved quotation ${quotation.quoteNumber} for job ${link.jobCard.jobNumber}.`
          : `Customer declined quotation ${quotation.quoteNumber} for job ${link.jobCard.jobNumber}. Comment: ${customerComment || 'none'}`,
        status:       'Sent',
        sentAt:       new Date(),
      },
    }).catch(() => {})

    // Auto-create job card and broadcast to workshop staff
    if (decision === 'APPROVED') {
      autoCreateJobCard(quotation.id, link.workshopId).catch(() => {})
    }

    const msg = decision === 'APPROVED' ? 'Quotation approved successfully.' : 'Quotation declined.'
    return success(res, { decision, message: msg })
  } catch (err) { next(err) }
}

async function getPaymentSummary(req, res, next) {
  try {
    const link = await resolveLink(req.params.token)
    if (!link) return res.status(404).json({ success: false, message: INVALID_MSG })

    const invoice = link.jobCard.invoice
    if (!invoice) {
      return success(res, {
        hasInvoice: false,
        message:    'Invoice has not been generated yet. Payment details will appear here once your repair is complete.',
      })
    }

    const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amountReceived), 0)

    const statusColor = {
      Paid:     'green',
      PartPaid: 'amber',
      DueToday: 'amber',
      Overdue:  'red',
    }[invoice.paymentStatus] || 'soft'

    return success(res, {
      hasInvoice:    true,
      invoiceNumber: invoice.invoiceNumber,
      issueDate:     invoice.issueDate,
      dueDate:       invoice.dueDate,
      subtotal:      Number(invoice.subtotal),
      tax:           Number(invoice.tax || 0),
      total:         Number(invoice.total),
      totalPaid,
      balance:       Number(invoice.total) - totalPaid,
      currency:      invoice.currency,
      paymentStatus: invoice.paymentStatus,
      statusColor,
      payments: invoice.payments.map(p => ({
        paymentDate:     p.paidAt || p.createdAt,
        amount:          Number(p.amountReceived),
        method:          p.method,
        referenceNumber: p.referenceNumber
          ? `****${String(p.referenceNumber).slice(-4)}`
          : null,
      })),
    })
  } catch (err) { next(err) }
}

async function getDeliveryPreference(req, res, next) {
  try {
    const link = await resolveLink(req.params.token)
    if (!link) return res.status(404).json({ success: false, message: INVALID_MSG })

    const pref = link.jobCard.deliveryPref
    const jobPreference = link.jobCard.deliveryPreference // existing string field fallback

    if (!pref && !jobPreference) {
      return success(res, { hasPreference: false })
    }

    if (pref) {
      return success(res, {
        hasPreference:      true,
        preference:         pref.preference,
        deliveryAddress:    pref.deliveryAddress,
        preferredDate:      pref.preferredDate,
        preferredTimeWindow: pref.preferredTimeWindow,
        notes:              pref.notes,
        selectedVia:        pref.selectedVia,
        updatedAt:          pref.updatedAt,
      })
    }

    return success(res, { hasPreference: true, preference: jobPreference, source: 'intake' })
  } catch (err) { next(err) }
}

async function setDeliveryPreference(req, res, next) {
  try {
    const link = await resolveLink(req.params.token)
    if (!link) return res.status(404).json({ success: false, message: INVALID_MSG })

    const job = link.jobCard
    if (['Completed', 'Ready'].includes(job.status) && job.status === 'Completed') {
      return res.status(409).json({ success: false, message: 'Delivery preference cannot be changed after vehicle has been collected or delivered.' })
    }

    const { preference, deliveryAddress, preferredDate, preferredTimeWindow, notes } = req.body

    if (!['DELIVERY', 'COLLECTION_AT_WORKSHOP'].includes(preference))
      return badRequest(res, 'preference must be DELIVERY or COLLECTION_AT_WORKSHOP')

    if (preference === 'DELIVERY' && !deliveryAddress?.trim())
      return badRequest(res, 'deliveryAddress is required when preference is DELIVERY')

    const data = {
      preference,
      deliveryAddress:     preference === 'DELIVERY' ? deliveryAddress.trim() : null,
      preferredDate:       preferredDate       || null,
      preferredTimeWindow: preferredTimeWindow || null,
      notes:               notes               || null,
      selectedVia:         'CUSTOMER_PORTAL',
    }

    await prisma.jobDeliveryPreference.upsert({
      where:  { jobCardId: link.jobCardId },
      create: { jobCardId: link.jobCardId, ...data },
      update: data,
    })

    // Notify Front Desk (fire and forget)
    prisma.notification.create({
      data: {
        workshopId: link.workshopId,
        jobCardId:  link.jobCardId,
        channel:    'Email',
        type:       preference === 'DELIVERY' ? 'CUSTOMER_SELECTED_DELIVERY' : 'CUSTOMER_SELECTED_COLLECTION',
        message:    preference === 'DELIVERY'
          ? `Customer selected delivery for job ${job.jobNumber}. Address: ${deliveryAddress}`
          : `Customer selected workshop collection for job ${job.jobNumber}.`,
        status:     'Sent',
        sentAt:     new Date(),
      },
    }).catch(() => {})

    return success(res, { preference, message: 'Your preference has been saved.' })
  } catch (err) { next(err) }
}

// ── Auto job-card creation + staff broadcast ──────────────────────────────────

async function autoCreateJobCard(quotationId, workshopId) {
  const existing = await prisma.jobCard.findFirst({ where: { quotationId } })
  if (existing) return existing

  const quotation = await prisma.quotation.findFirst({
    where: { id: quotationId },
    include: {
      customer:  { select: { name: true } },
      vehicle:   { select: { registrationNo: true, makeModel: true } },
      lineItems: { select: { repairType: true, item: true } },
    },
  })
  if (!quotation) return null

  const count = await prisma.jobCard.count({ where: { workshopId } })
  const jNum  = jobNumber(count + 1)

  const job = await prisma.jobCard.create({
    data: {
      jobNumber:  jNum,
      workshopId,
      quotationId,
      vehicleId:  quotation.vehicleId || null,
      priority:   quotation.priority  || 'Amber',
      status:     'New',
      progress:   0,
    },
  })

  // Determine whether Parts Interpreters are relevant
  const hasPartsWork = [quotation.repairType, ...quotation.lineItems.map(li => li.repairType || li.item)]
    .some(v => v && /part|spare/i.test(v))

  const rolesToNotify = ['WorkshopController', 'Technician']
  if (hasPartsWork) rolesToNotify.push('PartsInterpreter')

  const [staff, workshop] = await Promise.all([
    prisma.user.findMany({
      where: { workshopId, role: { in: rolesToNotify }, status: 'Active', deletedAt: null },
      select: { id: true, name: true, loginEmail: true },
    }),
    prisma.workshop.findUnique({ where: { id: workshopId }, select: { name: true } }),
  ])

  const customerName = quotation.customer?.name || 'Customer'
  const vehicleStr   = quotation.vehicle
    ? `${quotation.vehicle.makeModel} (${quotation.vehicle.registrationNo})`
    : 'Vehicle'
  const repairRow    = quotation.repairType
    ? `<tr style="background:#f8fafc;"><td style="padding:6px 10px;color:#667085;">Repair type</td><td style="padding:6px 10px;color:#101828;">${quotation.repairType}</td></tr>`
    : ''
  const wsName       = workshop?.name || 'Workshop'

  for (const user of staff) {
    notifications.sendEmail({
      to:        user.loginEmail,
      subject:   `New job ${jNum} — ${customerName} / ${vehicleStr}`,
      html: `
        <p style="font-family:sans-serif;font-size:15px;color:#101828;">Hi <strong>${user.name}</strong>,</p>
        <p style="font-family:sans-serif;font-size:14px;color:#344054;">A new job is ready on the board at <strong>${wsName}</strong>.</p>
        <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;margin-top:12px;">
          <tr><td style="padding:6px 10px;color:#667085;width:130px;">Job number</td><td style="padding:6px 10px;font-weight:700;color:#101828;">${jNum}</td></tr>
          <tr style="background:#f8fafc;"><td style="padding:6px 10px;color:#667085;">Customer</td><td style="padding:6px 10px;color:#101828;">${customerName}</td></tr>
          <tr><td style="padding:6px 10px;color:#667085;">Vehicle</td><td style="padding:6px 10px;color:#101828;">${vehicleStr}</td></tr>
          ${repairRow}
        </table>
        <p style="font-family:sans-serif;font-size:13px;color:#667085;margin-top:16px;">Log in to your Autiq dashboard to view and accept this job.</p>
      `,
      workshopId,
      jobCardId: job.id,
      type:      'NewJobBroadcast',
    }).catch(() => {})
  }

  return job
}

// ── OTP-based quotation approval ─────────────────────────────────────────────

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000))
}

async function requestOtp(req, res, next) {
  try {
    const { email } = req.body
    if (!email?.trim()) return badRequest(res, 'Email address is required')
    const emailNorm = email.trim().toLowerCase()

    const customer = await prisma.customer.findFirst({
      where: { email: { equals: emailNorm, mode: 'insensitive' }, deletedAt: null },
    })

    const otp = generateOtp()
    // Sign a 10-min session token regardless — prevents email enumeration
    const sessionToken = jwt.sign(
      { type: 'otp_session', email: emailNorm, otp },
      JWT_SECRET,
      { expiresIn: '10m' }
    )

    let emailDelivered = false
    if (customer) {
      const pendingCount = await prisma.quotation.count({
        where: { customerId: customer.id, status: 'SentToCustomer', deletedAt: null },
      })
      if (pendingCount > 0) {
        const emailResult = await notifications.sendEmail({
          to:      emailNorm,
          subject: 'Your quotation approval code',
          html: `
            <p style="font-family:sans-serif;font-size:15px;color:#101828;">Hi <strong>${customer.name}</strong>,</p>
            <p style="font-family:sans-serif;font-size:14px;color:#344054;">Use this one-time code to view and approve your pending repair quotation${pendingCount > 1 ? 's' : ''}:</p>
            <div style="font-family:monospace;font-size:36px;font-weight:900;letter-spacing:10px;padding:24px 16px;background:#f8fafc;border:1px solid #e4e7ec;border-radius:12px;text-align:center;color:#101828;">${otp}</div>
            <p style="font-family:sans-serif;font-size:13px;color:#667085;margin-top:16px;">This code is valid for <strong>10 minutes</strong>. If you did not request this, please ignore this email.</p>
          `,
          type: 'QuotationApprovalOtp',
        })
        emailDelivered = emailResult?.status === 'sent'
      }
    }

    const responseData = { sessionToken }
    if (!emailDelivered) responseData._devOtp = otp

    return success(res, responseData,
      'If your email is registered with a pending approval, an OTP has been sent.')
  } catch (err) { next(err) }
}

async function verifyOtp(req, res, next) {
  try {
    const { sessionToken, otp } = req.body
    if (!sessionToken) return badRequest(res, 'sessionToken is required')
    if (!otp?.trim())  return badRequest(res, 'OTP is required')

    let payload
    try {
      payload = jwt.verify(sessionToken, JWT_SECRET)
    } catch {
      return badRequest(res, 'This OTP has expired. Please request a new one.')
    }
    if (payload.type !== 'otp_session') return badRequest(res, 'Invalid session token.')
    if (payload.otp !== otp.trim())    return badRequest(res, 'Incorrect OTP. Please check your email and try again.')

    const customer = await prisma.customer.findFirst({
      where: { email: { equals: payload.email, mode: 'insensitive' }, deletedAt: null },
    })
    if (!customer) return badRequest(res, 'No account found for this email address.')

    const quotations = await prisma.quotation.findMany({
      where: { customerId: customer.id, status: 'SentToCustomer', deletedAt: null },
      include: {
        lineItems: { orderBy: { createdAt: 'asc' } },
        vehicle:   { select: { registrationNo: true, makeModel: true } },
        workshop:  { select: { name: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const verifiedToken = jwt.sign(
      { type: 'otp_verified', email: payload.email, customerId: customer.id },
      JWT_SECRET,
      { expiresIn: '60m' }
    )

    return success(res, {
      verifiedToken,
      customerName: customer.name,
      quotations: quotations.map(q => ({
        id:            q.id,
        quoteNumber:   q.quoteNumber,
        repairType:    q.repairType,
        totalEstimate: Number(q.totalEstimate || 0),
        currency:      q.currency || 'ZAR',
        vehicle:       q.vehicle,
        workshop:      q.workshop,
        sentAt:        q.sentToCustomerAt || q.updatedAt,
        lineItems:     q.lineItems.map(li => ({
          item:       li.item,
          repairType: li.repairType || null,
          cost:       Number(li.cost || 0),
        })),
      })),
    })
  } catch (err) { next(err) }
}

async function respondWithOtp(req, res, next) {
  try {
    const { verifiedToken, quotationId, decision, comment } = req.body
    if (!verifiedToken) return badRequest(res, 'verifiedToken is required')
    if (!quotationId)   return badRequest(res, 'quotationId is required')
    if (!['APPROVED', 'REJECTED'].includes(decision))
      return badRequest(res, 'decision must be APPROVED or REJECTED')

    let payload
    try {
      payload = jwt.verify(verifiedToken, JWT_SECRET)
    } catch {
      return badRequest(res, 'Session expired. Please verify your email again.')
    }
    if (payload.type !== 'otp_verified') return badRequest(res, 'Invalid session token.')

    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, deletedAt: null },
      include: {
        customer: { select: { id: true, email: true, name: true } },
        workshop: { select: { id: true, name: true } },
      },
    })
    if (!quotation) return notFound(res, 'Quotation not found.')

    if (quotation.customer.email?.toLowerCase() !== payload.email.toLowerCase())
      return res.status(403).json({ success: false, message: 'You are not authorised to respond to this quotation.' })

    if (quotation.status === 'CustomerApproved') return badRequest(res, 'This quotation has already been approved.')
    if (quotation.status === 'CustomerRejected') return badRequest(res, 'This quotation has already been declined.')
    if (quotation.status !== 'SentToCustomer')  return badRequest(res, 'This quotation is not awaiting approval.')

    const now = new Date()
    await prisma.quotation.update({
      where: { id: quotationId },
      data: decision === 'APPROVED'
        ? { status: 'CustomerApproved', approvedAt: now, customerSignature: comment || null }
        : { status: 'CustomerRejected', rejectedAt: now, customerSignature: comment || null },
    })

    prisma.notification.create({
      data: {
        workshopId:  quotation.workshopId,
        quotationId: quotation.id,
        channel:     'Email',
        type:        decision === 'APPROVED' ? 'CUSTOMER_APPROVED_QUOTATION' : 'CUSTOMER_REJECTED_QUOTATION',
        message:     decision === 'APPROVED'
          ? `Customer ${quotation.customer.name} approved quotation ${quotation.quoteNumber} via OTP verification.`
          : `Customer ${quotation.customer.name} declined quotation ${quotation.quoteNumber} via OTP. Comment: ${comment || 'none'}`,
        status: 'Sent',
        sentAt: now,
      },
    }).catch(() => {})

    // Auto-create job card and broadcast to workshop staff
    if (decision === 'APPROVED') {
      autoCreateJobCard(quotation.id, quotation.workshopId).catch(() => {})
    }

    return success(res, {
      decision,
      message: decision === 'APPROVED'
        ? 'Quotation approved. The workshop will be notified.'
        : 'Quotation declined. The workshop has been notified.',
    })
  } catch (err) { next(err) }
}

// ── Public job-number lookup (no token required) ──────────────────────────────

async function lookupByJobNumber(req, res, next) {
  try {
    const jobNumber = (req.params.jobNumber || '').trim().toUpperCase()
    if (!jobNumber) return badRequest(res, 'jobNumber is required')

    const job = await prisma.jobCard.findFirst({
      where: { jobNumber, deletedAt: null },
      include: {
        quotation: {
          include: {
            customer: { select: { name: true } },
            vehicle:  { select: { registrationNo: true, makeModel: true } },
            workshop: { select: { name: true, phone: true, email: true, address: true, city: true } },
          },
        },
        vehicle:  { select: { registrationNo: true, makeModel: true } },
        workshop: { select: { name: true, phone: true, email: true, address: true, city: true } },
        invoice:  { select: { paymentStatus: true, invoiceNumber: true } },
        deliveryPref: true,
      },
    })

    if (!job) return res.status(404).json({
      success: false,
      message: 'No job found with that job number. Please check the number and try again.',
    })

    const quote    = job.quotation
    const customer = quote?.customer
    const vehicle  = job.vehicle || quote?.vehicle
    const workshop = job.workshop || quote?.workshop

    const firstName = customer?.name?.split(' ')[0] || 'Customer'

    const { steps, progressPercent, currentStage } = buildProgressSteps(job, quote, job.invoice)

    // Minimal approval status (no action — action requires the full token link)
    let approvalSummary = null
    if (quote) {
      const statusMap = {
        SentToCustomer:   { status: 'PENDING',   label: 'Awaiting your approval' },
        CustomerApproved: { status: 'APPROVED',  label: 'Approved by you' },
        CustomerRejected: { status: 'REJECTED',  label: 'Declined by you' },
      }
      const info = statusMap[quote.status]
      if (info) {
        approvalSummary = {
          title:  'Service & repair quotation',
          status: info.status,
          label:  info.label,
        }
      }
    }

    return res.json({
      success: true,
      data: {
        jobNumber:       job.jobNumber,
        status:          job.status,
        progress:        job.progress,
        lastUpdatedAt:   job.updatedAt,
        lookupMode:      true,
        customer:        { firstName },
        vehicle: {
          registrationNo: vehicle?.registrationNo || '—',
          makeModel:      vehicle?.makeModel      || '—',
        },
        workshop: {
          name:    workshop?.name    || 'Workshop',
          phone:   workshop?.phone   || null,
          email:   workshop?.email   || null,
          address: workshop?.address || workshop?.city || null,
        },
        progressPercent,
        currentStage,
        steps,
        approvalSummary,
      },
    })
  } catch (err) { next(err) }
}

module.exports = {
  getOverview,
  getProgress,
  getMedia,
  getApprovals,
  respondToApproval,
  getPaymentSummary,
  getDeliveryPreference,
  setDeliveryPreference,
  lookupByJobNumber,
  requestOtp,
  verifyOtp,
  respondWithOtp,
}

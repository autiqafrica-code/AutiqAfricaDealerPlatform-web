'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')

// ── Helpers ───────────────────────────────────────────────────────────────────

async function recordHistory(jobCardId, workshopId, fromStatus, toStatus, user, title, notes) {
  if (!jobCardId) return
  return prisma.jobStatusHistory.create({
    data: {
      jobCardId,
      workshopId,
      fromStatus:        fromStatus || null,
      toStatus,
      performedByUserId: user?.id       || null,
      performedByName:   user?.name     || null,
      performedByRole:   user?.roleCode || null,
      title:  title || `Status changed to ${toStatus}`,
      notes:  notes || null,
    },
  }).catch(() => {})
}

function statusColor(status) {
  const map = { Paid: 'green', PartPaid: 'amber', DueToday: 'amber', Overdue: 'red' }
  return map[status] || 'soft'
}

function fmtMoney(amount, currency = 'ZAR') {
  return `${currency} ${Number(amount || 0).toLocaleString()}`
}

async function recalcInvoiceStatus(tx, invoiceId) {
  const inv = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: { total: true, dueDate: true, payments: { select: { amountReceived: true } } },
  })
  const totalPaid = inv.payments.reduce((s, p) => s + Number(p.amountReceived), 0)
  const total     = Number(inv.total)

  let paymentStatus
  if (totalPaid >= total) {
    paymentStatus = 'Paid'
  } else if (totalPaid > 0) {
    paymentStatus = 'PartPaid'
  } else if (inv.dueDate && new Date(inv.dueDate) < new Date()) {
    paymentStatus = 'Overdue'
  } else {
    paymentStatus = 'DueToday'
  }

  await tx.invoice.update({ where: { id: invoiceId }, data: { paymentStatus } })
  return paymentStatus
}

// ── Dashboard ─────────────────────────────────────────────────────────────────

async function getDashboard(req, res, next) {
  try {
    const { workshopId } = req.user

    const [invoices, pendingGeneration] = await Promise.all([
      prisma.invoice.findMany({
        where: { quotation: { workshopId, deletedAt: null } },
        select: { paymentStatus: true, total: true, currency: true },
      }),
      prisma.quotation.count({
        where: { workshopId, deletedAt: null, status: 'CustomerApproved', invoice: null },
      }),
    ])

    const byStatus = {
      DueToday: { count: 0, total: 0 },
      Overdue:  { count: 0, total: 0 },
      PartPaid: { count: 0, total: 0 },
      Paid:     { count: 0, total: 0 },
    }
    for (const inv of invoices) {
      const s = inv.paymentStatus
      if (byStatus[s]) { byStatus[s].count++; byStatus[s].total += Number(inv.total) }
    }

    const currency = invoices[0]?.currency || 'ZAR'

    return success(res, { totalInvoices: invoices.length, pendingGeneration, byStatus, currency })
  } catch (err) { next(err) }
}

// ── Invoice sources ───────────────────────────────────────────────────────────

async function listInvoiceSources(req, res, next) {
  try {
    const { workshopId } = req.user

    const quotations = await prisma.quotation.findMany({
      where: { workshopId, deletedAt: null, status: 'CustomerApproved', invoice: null },
      include: {
        customer: { select: { name: true } },
        vehicle:  { select: { makeModel: true, registrationNo: true } },
        jobCard:  { select: { id: true, jobNumber: true } },
      },
      orderBy: { approvedAt: 'desc' },
    })

    const sources = quotations.map(q => ({
      quotationId:    q.id,
      quoteNumber:    q.quoteNumber,
      customer:       q.customer?.name || '—',
      vehicle:        q.vehicle?.makeModel || '—',
      registrationNo: q.vehicle?.registrationNo || '—',
      jobNumber:      q.jobCard?.jobNumber || null,
      total:          Number(q.totalEstimate || 0),
      amountDisplay:  fmtMoney(q.totalEstimate, q.currency),
      currency:       q.currency || 'ZAR',
      approvedAt:     q.approvedAt,
    }))

    return success(res, sources)
  } catch (err) { next(err) }
}

// ── Generate invoice ──────────────────────────────────────────────────────────

async function generateInvoice(req, res, next) {
  try {
    const { workshopId } = req.user
    const { quotationId } = req.body

    if (!quotationId) return badRequest(res, 'quotationId is required')

    const quotation = await prisma.quotation.findFirst({
      where: { id: quotationId, workshopId, deletedAt: null, status: 'CustomerApproved' },
      include: { lineItems: true, jobCard: { select: { id: true } } },
    })

    if (!quotation) return notFound(res, 'Approved quotation not found')

    const existing = await prisma.invoice.findUnique({ where: { quotationId } })
    if (existing) return badRequest(res, 'Invoice already exists for this quotation')

    // Generate invoice number
    const now   = new Date()
    const year  = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const count = await prisma.invoice.count()
    const invoiceNumber = `AA-INV-${year}${month}-${String(count + 1).padStart(4, '0')}`

    // Financials from line items (or fallback to totalEstimate)
    const lineSubtotal = quotation.lineItems.reduce((s, li) => s + Number(li.cost || 0), 0)
    const subtotal     = lineSubtotal > 0 ? lineSubtotal : Number(quotation.totalEstimate || 0)
    const tax          = Math.round(subtotal * 0.15 * 100) / 100
    const total        = subtotal + tax
    const dueDate      = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

    const invoice = await prisma.$transaction(async tx => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          quotationId,
          jobCardId:     quotation.jobCard?.id || null,
          issueDate:     now,
          dueDate,
          subtotal,
          tax,
          total,
          currency:      quotation.currency || 'ZAR',
          paymentStatus: 'DueToday',
        },
      })

      if (quotation.lineItems.length > 0) {
        await tx.invoiceLineItem.createMany({
          data: quotation.lineItems.map(li => ({
            invoiceId:   inv.id,
            description: li.item,
            qty:         1,
            unitPrice:   Number(li.cost || 0),
            total:       Number(li.cost || 0),
            currency:    li.currency || quotation.currency || 'ZAR',
          })),
        })
      }

      return inv
    })

    return created(res, { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber })
  } catch (err) { next(err) }
}

// ── List invoices ─────────────────────────────────────────────────────────────

async function listInvoices(req, res, next) {
  try {
    const { workshopId } = req.user
    const { page, limit, skip } = getPagination(req.query)
    const { status } = req.query

    const where = { quotation: { workshopId, deletedAt: null } }
    if (status) where.paymentStatus = status

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          quotation: {
            include: {
              customer: { select: { name: true } },
              vehicle:  { select: { makeModel: true, registrationNo: true } },
            },
          },
          jobCard:  { select: { jobNumber: true } },
          payments: { select: { amountReceived: true, method: true }, orderBy: { createdAt: 'desc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    const rows = invoices.map(inv => ({
      id:            inv.id,
      invoiceNumber: inv.invoiceNumber,
      quoteNumber:   inv.quotation.quoteNumber,
      jobNumber:     inv.jobCard?.jobNumber || null,
      customer:      inv.quotation.customer?.name || '—',
      vehicle:       `${inv.quotation.vehicle?.makeModel || '—'} (${inv.quotation.vehicle?.registrationNo || '—'})`,
      subtotal:      Number(inv.subtotal),
      tax:           Number(inv.tax || 0),
      total:         Number(inv.total),
      currency:      inv.currency,
      amountDisplay: fmtMoney(inv.total, inv.currency),
      paymentStatus: inv.paymentStatus,
      statusColor:   statusColor(inv.paymentStatus),
      issueDate:     inv.issueDate,
      dueDate:       inv.dueDate,
      lastMethod:          inv.payments[0]?.method || null,
      sentToFrontDeskAt:   inv.sentToFrontDeskAt || null,
      sharedWithCustomerAt:inv.sharedWithCustomerAt || null,
    }))

    return success(res, paginate(rows, total, page, limit))
  } catch (err) { next(err) }
}

// ── Get invoice detail ────────────────────────────────────────────────────────

async function getInvoice(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const invoice = await prisma.invoice.findFirst({
      where: { id, quotation: { workshopId, deletedAt: null } },
      include: {
        quotation: {
          include: {
            customer: { select: { name: true, email: true, phone: true } },
            vehicle:  { select: { makeModel: true, registrationNo: true } },
          },
        },
        jobCard:   { select: { jobNumber: true, status: true } },
        lineItems: { orderBy: { createdAt: 'asc' } },
        payments:  {
          orderBy: { createdAt: 'desc' },
          include: { recordedBy: { select: { name: true } } },
        },
      },
    })

    if (!invoice) return notFound(res, 'Invoice not found')

    const totalPaid = invoice.payments.reduce((s, p) => s + Number(p.amountReceived), 0)

    return success(res, {
      id:            invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      quoteNumber:   invoice.quotation.quoteNumber,
      jobNumber:     invoice.jobCard?.jobNumber || null,
      customer: {
        name:  invoice.quotation.customer?.name  || '—',
        email: invoice.quotation.customer?.email || '—',
        phone: invoice.quotation.customer?.phone || '—',
      },
      vehicle: {
        makeModel:      invoice.quotation.vehicle?.makeModel      || '—',
        registrationNo: invoice.quotation.vehicle?.registrationNo || '—',
      },
      issueDate:     invoice.issueDate,
      dueDate:       invoice.dueDate,
      subtotal:      Number(invoice.subtotal),
      tax:           Number(invoice.tax || 0),
      total:         Number(invoice.total),
      totalPaid,
      balance:       Number(invoice.total) - totalPaid,
      currency:      invoice.currency,
      paymentStatus: invoice.paymentStatus,
      statusColor:   statusColor(invoice.paymentStatus),
      notes:         invoice.notes,
      lineItems: invoice.lineItems.map(li => ({
        id:          li.id,
        description: li.description,
        qty:         li.qty,
        unitPrice:   Number(li.unitPrice),
        total:       Number(li.total),
        currency:    li.currency,
      })),
      payments: invoice.payments.map(p => ({
        id:              p.id,
        paymentCode:     p.paymentCode,
        method:          p.method,
        amountReceived:  Number(p.amountReceived),
        currency:        p.currency,
        amountDisplay:   fmtMoney(p.amountReceived, p.currency),
        referenceNumber: p.referenceNumber,
        status:          p.status,
        statusColor:     statusColor(p.status),
        paidAt:          p.paidAt,
        recordedBy:      p.recordedBy?.name || '—',
        createdAt:       p.createdAt,
      })),
    })
  } catch (err) { next(err) }
}

// ── Record payment (customer or insurance) ────────────────────────────────────

async function recordPayment(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const {
      invoiceId, method, amountReceived, referenceNumber, notes,
      payerType, insuranceProvider, claimNumber, insuranceContactName,
    } = req.body

    if (!invoiceId)      return badRequest(res, 'invoiceId is required')
    if (!method)         return badRequest(res, 'method is required')
    if (!amountReceived || Number(amountReceived) <= 0)
      return badRequest(res, 'Valid amountReceived is required')

    const validMethods = ['Cash', 'Bank', 'MobileMoney', 'Card']
    if (!validMethods.includes(method))
      return badRequest(res, `method must be one of: ${validMethods.join(', ')}`)

    const validPayerTypes = ['Customer', 'Insurance']
    const payer = payerType || 'Customer'
    if (!validPayerTypes.includes(payer))
      return badRequest(res, `payerType must be Customer or Insurance`)

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, quotation: { workshopId, deletedAt: null } },
    })
    if (!invoice) return notFound(res, 'Invoice not found')

    const paymentCode = `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

    const result = await prisma.$transaction(async tx => {
      const payment = await tx.payment.create({
        data: {
          paymentCode,
          invoiceId,
          method,
          amountReceived:      Number(amountReceived),
          currency:            invoice.currency,
          referenceNumber:     referenceNumber     || null,
          notes:               notes               || null,
          payerType:           payer,
          insuranceProvider:   insuranceProvider   || null,
          claimNumber:         claimNumber         || null,
          insuranceContactName: insuranceContactName || null,
          status:              'Paid',
          recordedByUserId:    userId,
          paidAt:              new Date(),
        },
      })
      const newStatus = await recalcInvoiceStatus(tx, invoiceId)
      return { payment, newStatus }
    })

    return created(res, {
      paymentId:     result.payment.id,
      paymentCode:   result.payment.paymentCode,
      invoiceStatus: result.newStatus,
    })
  } catch (err) { next(err) }
}

// ── Payment summary (shows customer + insurance split) ───────────────────────

async function getPaymentSummary(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const invoice = await prisma.invoice.findFirst({
      where: { id, quotation: { workshopId, deletedAt: null } },
      include: {
        payments: { orderBy: { createdAt: 'desc' } },
        insurance: true,
      },
    })
    if (!invoice) return notFound(res, 'Invoice not found')

    const customerPayments  = invoice.payments.filter(p => p.payerType !== 'Insurance')
    const insurancePayments = invoice.payments.filter(p => p.payerType === 'Insurance')
    const totalCustomer  = customerPayments.reduce((s, p) => s + Number(p.amountReceived), 0)
    const totalInsurance = insurancePayments.reduce((s, p) => s + Number(p.amountReceived), 0)
    const totalPaid      = totalCustomer + totalInsurance
    const balance        = Number(invoice.total) - totalPaid

    return success(res, {
      invoiceId:       invoice.id,
      invoiceNumber:   invoice.invoiceNumber,
      total:           Number(invoice.total),
      totalPaid,
      balance,
      totalCustomerPaid:  totalCustomer,
      totalInsurancePaid: totalInsurance,
      paymentStatus:      invoice.paymentStatus,
      clearanceStatus:    invoice.clearanceStatus || null,
      clearedAt:          invoice.clearedAt       || null,
      hasInsurance:       invoice.hasInsurance,
      insurance:          invoice.insurance       || null,
      payments: invoice.payments.map(p => ({
        id:              p.id,
        paymentCode:     p.paymentCode,
        method:          p.method,
        payerType:       p.payerType || 'Customer',
        amountReceived:  Number(p.amountReceived),
        currency:        p.currency,
        insuranceProvider: p.insuranceProvider || null,
        claimNumber:     p.claimNumber         || null,
        referenceNumber: p.referenceNumber     || null,
        paidAt:          p.paidAt,
        createdAt:       p.createdAt,
      })),
    })
  } catch (err) { next(err) }
}

// ── List payments ─────────────────────────────────────────────────────────────

async function listPayments(req, res, next) {
  try {
    const { workshopId } = req.user
    const { page, limit, skip } = getPagination(req.query)

    const where = { invoice: { quotation: { workshopId, deletedAt: null } } }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          invoice: {
            include: {
              quotation: { include: { customer: { select: { name: true } } } },
            },
          },
          recordedBy: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.payment.count({ where }),
    ])

    const rows = payments.map(p => ({
      id:              p.id,
      paymentCode:     p.paymentCode,
      invoiceId:       p.invoiceId,
      invoiceNumber:   p.invoice.invoiceNumber,
      quoteNumber:     p.invoice.quotation.quoteNumber,
      customer:        p.invoice.quotation.customer?.name || '—',
      method:          p.method,
      amountReceived:  Number(p.amountReceived),
      currency:        p.currency,
      amountDisplay:   fmtMoney(p.amountReceived, p.currency),
      referenceNumber: p.referenceNumber,
      status:          p.status,
      statusColor:     statusColor(p.status),
      paidAt:          p.paidAt,
      recordedBy:      p.recordedBy?.name || '—',
      createdAt:       p.createdAt,
    }))

    return success(res, paginate(rows, total, page, limit))
  } catch (err) { next(err) }
}

// ── Send invoice to Front Desk ────────────────────────────────────────────────

async function sendInvoiceToFrontDesk(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params

    const invoice = await prisma.invoice.findFirst({
      where: { id, quotation: { workshopId, deletedAt: null } },
      include: { jobCard: { select: { id: true, jobNumber: true, status: true } } },
    })
    if (!invoice) return notFound(res, 'Invoice not found')
    if (invoice.sentToFrontDeskAt) return badRequest(res, 'Invoice has already been sent to Front Desk')

    const updated = await prisma.invoice.update({
      where: { id },
      data: { sentToFrontDeskAt: new Date() },
    })

    if (invoice.jobCard?.id) {
      await prisma.jobCard.update({
        where: { id: invoice.jobCard.id },
        data: { status: 'InvoiceGenerated' },
      })
      await recordHistory(invoice.jobCard.id, workshopId, invoice.jobCard.status, 'InvoiceGenerated',
        { id: userId, name: userName, roleCode },
        `Invoice ${invoice.invoiceNumber} sent to Front Desk`,
        null)

      await prisma.notification.create({
        data: {
          workshopId,
          jobCardId: invoice.jobCard.id,
          channel:   'WhatsApp',
          type:      'InvoiceReady',
          message:   `Invoice ${invoice.invoiceNumber} for job ${invoice.jobCard.jobNumber} is ready for Front Desk review.`,
          status:    'Pending',
        },
      }).catch(() => {})
    }

    return success(res, { invoice: updated }, 'Invoice sent to Front Desk')
  } catch (err) { next(err) }
}

// ── Clear payment / mark invoice cleared (supports customer + insurance) ──────

async function clearPayment(req, res, next) {
  try {
    const { workshopId, id: userId, name: userName, roleCode } = req.user
    const { id } = req.params
    const { notes, forceInsuranceClear } = req.body

    const invoice = await prisma.invoice.findFirst({
      where: { id, quotation: { workshopId, deletedAt: null } },
      include: {
        payments: { select: { amountReceived: true, payerType: true } },
        jobCard:  { select: { id: true, jobNumber: true, status: true } },
      },
    })
    if (!invoice) return notFound(res, 'Invoice not found')

    const totalPaid     = invoice.payments.reduce((s, p) => s + Number(p.amountReceived), 0)
    const invoiceTotal  = Number(invoice.total)
    const hasInsPayment = invoice.payments.some(p => p.payerType === 'Insurance')

    // Allow clearance if: fully paid, OR force-cleared by Accounts (e.g. insurance-approved)
    const isFullyPaid = totalPaid >= invoiceTotal
    const canClear    = isFullyPaid || forceInsuranceClear === true || forceInsuranceClear === 'true'

    if (!canClear) {
      return badRequest(res, `Invoice balance is ${invoice.currency} ${(invoiceTotal - totalPaid).toFixed(2)}. Record full payment before clearing, or use force-clear for insurance approval.`)
    }

    // Determine clearance type
    const insurancePaid  = invoice.payments.filter(p => p.payerType === 'Insurance').reduce((s, p) => s + Number(p.amountReceived), 0)
    const customerPaid   = invoice.payments.filter(p => p.payerType !== 'Insurance').reduce((s, p) => s + Number(p.amountReceived), 0)
    let clearanceStatus
    if (forceInsuranceClear) {
      clearanceStatus = 'Cleared'
    } else if (insurancePaid > 0 && customerPaid > 0) {
      clearanceStatus = 'PaidMixed'
    } else if (insurancePaid > 0) {
      clearanceStatus = 'PaidByInsurance'
    } else {
      clearanceStatus = 'PaidByCustomer'
    }

    await prisma.invoice.update({
      where: { id },
      data: { clearanceStatus, clearedAt: new Date(), clearedByUserId: userId },
    })

    if (invoice.jobCard?.id) {
      await prisma.jobCard.update({
        where: { id: invoice.jobCard.id },
        data: { status: 'PaymentCleared' },
      })
      await recordHistory(invoice.jobCard.id, workshopId, invoice.jobCard.status, 'PaymentCleared',
        { id: userId, name: userName, roleCode },
        `Payment cleared (${clearanceStatus}) — vehicle ready for delivery`,
        notes || null)

      await prisma.notification.create({
        data: {
          workshopId,
          jobCardId: invoice.jobCard.id,
          channel:   'WhatsApp',
          type:      'PaymentCleared',
          message:   `Payment cleared for job ${invoice.jobCard.jobNumber}. Status: ${clearanceStatus}. Vehicle is ready for delivery.`,
          status:    'Pending',
        },
      }).catch(() => {})
    }

    return success(res, { jobId: invoice.jobCard?.id || null, clearanceStatus }, 'Payment cleared — job ready for delivery')
  } catch (err) { next(err) }
}

module.exports = {
  getDashboard,
  listInvoiceSources,
  generateInvoice,
  listInvoices,
  getInvoice,
  recordPayment,
  getPaymentSummary,
  listPayments,
  sendInvoiceToFrontDesk,
  clearPayment,
}

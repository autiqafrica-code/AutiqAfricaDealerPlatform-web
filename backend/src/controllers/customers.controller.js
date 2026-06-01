'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')
const notifications = require('../services/notifications.service')

async function listCustomers(req, res, next) {
  try {
    const { workshopId } = req.user
    const { q, status } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId, deletedAt: null }
    if (status) where.status = status
    if (q) {
      where.OR = [
        { name:          { contains: q, mode: 'insensitive' } },
        { phone:         { contains: q, mode: 'insensitive' } },
        { email:         { contains: q, mode: 'insensitive' } },
        { licenseNumber: { contains: q, mode: 'insensitive' } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { vehicles: true, quotations: true } } },
      }),
      prisma.customer.count({ where }),
    ])

    return success(res, paginate(customers, total, page, limit))
  } catch (err) {
    next(err)
  }
}

async function createCustomer(req, res, next) {
  try {
    const { workshopId } = req.user
    const { name, phone, email, whatsapp, communicationPreference, licenseNumber, address } = req.body

    if (!name?.trim()) return badRequest(res, 'Customer name is required')
    if (!phone?.trim()) return badRequest(res, 'Phone number is required')

    const exists = await prisma.customer.findFirst({
      where: { workshopId, phone: phone.trim(), deletedAt: null },
    })
    if (exists) return badRequest(res, 'A customer with this phone number already exists in your workshop')

    const customer = await prisma.customer.create({
      data: {
        workshopId,
        name: name.trim(),
        phone: phone.trim(),
        email: email?.trim() || null,
        whatsapp: whatsapp?.trim() || null,
        communicationPreference: communicationPreference || 'WhatsApp',
        licenseNumber: licenseNumber?.trim() || null,
        address: address?.trim() || null,
      },
    })

    return created(res, { customer }, 'Customer created successfully')
  } catch (err) {
    next(err)
  }
}

async function getCustomer(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const customer = await prisma.customer.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: {
        vehicles: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
        _count: { select: { quotations: true, appointments: true } },
      },
    })

    if (!customer) return notFound(res, 'Customer not found')
    return success(res, { customer })
  } catch (err) {
    next(err)
  }
}

async function updateCustomer(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { name, phone, email, whatsapp, communicationPreference, licenseNumber, address, status } = req.body

    const existing = await prisma.customer.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Customer not found')

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        ...(name                         && { name: name.trim() }),
        ...(phone !== undefined          && { phone: phone?.trim() || null }),
        ...(email !== undefined          && { email: email?.trim() || null }),
        ...(whatsapp !== undefined       && { whatsapp: whatsapp?.trim() || null }),
        ...(communicationPreference      && { communicationPreference }),
        ...(licenseNumber !== undefined  && { licenseNumber: licenseNumber?.trim() || null }),
        ...(address !== undefined        && { address: address?.trim() || null }),
        ...(status                       && { status }),
      },
    })

    return success(res, { customer }, 'Customer updated successfully')
  } catch (err) {
    next(err)
  }
}

async function deleteCustomer(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const existing = await prisma.customer.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!existing) return notFound(res, 'Customer not found')

    await prisma.customer.update({ where: { id }, data: { deletedAt: new Date() } })
    return success(res, null, 'Customer deleted successfully')
  } catch (err) {
    next(err)
  }
}

async function getCustomerVehicles(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const customer = await prisma.customer.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!customer) return notFound(res, 'Customer not found')

    const vehicles = await prisma.vehicle.findMany({
      where: { customerId: id, deletedAt: null },
      orderBy: { createdAt: 'desc' },
    })

    return success(res, { vehicles })
  } catch (err) {
    next(err)
  }
}

async function getCustomerQuotations(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const customer = await prisma.customer.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!customer) return notFound(res, 'Customer not found')

    const quotations = await prisma.quotation.findMany({
      where: { customerId: id, workshopId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      include: {
        vehicle:   { select: { registrationNo: true, makeModel: true } },
        lineItems: true,
      },
    })

    return success(res, { quotations })
  } catch (err) {
    next(err)
  }
}

async function getCustomerJobs(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const customer = await prisma.customer.findFirst({ where: { id, workshopId, deletedAt: null } })
    if (!customer) return notFound(res, 'Customer not found')

    const jobs = await prisma.jobCard.findMany({
      where: { workshopId, deletedAt: null, quotation: { customerId: id } },
      orderBy: { createdAt: 'desc' },
      include: {
        quotation: {
          select: {
            quoteNumber: true,
            repairType: true,
            customer: { select: { name: true } },
          },
        },
        vehicle: { select: { registrationNo: true, makeModel: true } },
      },
    })

    return success(res, { jobs })
  } catch (err) {
    next(err)
  }
}

async function verifyEmail(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const customer = await prisma.customer.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: { workshop: { select: { name: true } } },
    })
    if (!customer) return notFound(res, 'Customer not found')
    if (!customer.email) return badRequest(res, 'Customer has no email address on file')

    const workshopName = customer.workshop?.name || 'Workshop'
    const verifyCode   = String(Math.floor(100000 + Math.random() * 900000))
    const emailResult  = await notifications.sendEmail({
      to:         customer.email,
      subject:    `Your contact details are confirmed — ${workshopName}`,
      html:       `<p style="font-family:sans-serif;font-size:15px;color:#101828;">Hi <strong>${customer.name}</strong>,</p>
                   <p style="font-family:sans-serif;font-size:14px;color:#344054;">Your email address has been confirmed on file at <strong>${workshopName}</strong>. You will receive job updates, quotation approvals and payment reminders at this address.</p>
                   <div style="font-family:monospace;font-size:28px;font-weight:900;letter-spacing:8px;padding:18px 14px;background:#f8fafc;border:1px solid #e4e7ec;border-radius:10px;text-align:center;color:#101828;">${verifyCode}</div>
                   <p style="font-family:sans-serif;font-size:13px;color:#667085;margin-top:12px;">Reference code for this confirmation. If you did not expect this, contact ${workshopName} directly.</p>`,
      workshopId,
      customerId: id,
      type:       'ContactVerification',
    })

    await prisma.customer.update({ where: { id }, data: { isEmailVerified: true } })

    const responseData = { email: customer.email, emailStatus: emailResult.status }
    if (emailResult.status !== 'sent') responseData._devOtp = verifyCode

    return success(res, responseData, emailResult.status === 'sent'
      ? `Verification email sent to ${customer.email}`
      : `Email marked as verified (send ${emailResult.status}: ${emailResult.reason || ''})`)
  } catch (err) {
    next(err)
  }
}

async function verifyWhatsapp(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const customer = await prisma.customer.findFirst({
      where: { id, workshopId, deletedAt: null },
      include: { workshop: { select: { name: true } } },
    })
    if (!customer) return notFound(res, 'Customer not found')
    if (!customer.whatsapp) return badRequest(res, 'Customer has no WhatsApp number on file')

    const workshopName = customer.workshop?.name || 'Workshop'
    const verifyCode   = String(Math.floor(100000 + Math.random() * 900000))
    const waResult     = await notifications.sendWhatsApp({
      to:         customer.whatsapp,
      message:    `Hi ${customer.name}, your WhatsApp number has been confirmed at ${workshopName}. Reference code: ${verifyCode}. You will receive job updates and reminders here.`,
      workshopId,
      customerId: id,
      type:       'ContactVerification',
    })

    await prisma.customer.update({ where: { id }, data: { isWhatsappVerified: true } })

    const responseData = { whatsapp: customer.whatsapp, whatsappStatus: waResult.status }
    if (waResult.status !== 'sent') responseData._devOtp = verifyCode

    return success(res, responseData, waResult.status === 'sent'
      ? `WhatsApp verification sent to ${customer.whatsapp}`
      : `WhatsApp marked as verified (${waResult.reason || 'provider not yet configured'})`)
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listCustomers, createCustomer, getCustomer, updateCustomer, deleteCustomer,
  getCustomerVehicles, getCustomerQuotations, getCustomerJobs,
  verifyEmail, verifyWhatsapp,
}

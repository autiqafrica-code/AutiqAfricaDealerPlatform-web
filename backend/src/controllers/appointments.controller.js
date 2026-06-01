'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')
const { appointmentCode } = require('../utils/idGenerator')

async function listAppointments(req, res, next) {
  try {
    const { workshopId } = req.user
    const { date, status, customerId } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = { workshopId }
    if (status) where.status = status
    if (customerId) where.customerId = customerId
    if (date) {
      const day  = new Date(date)
      const next = new Date(day)
      next.setDate(next.getDate() + 1)
      where.appointmentDate = { gte: day, lt: next }
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ appointmentDate: 'asc' }, { appointmentTime: 'asc' }],
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          vehicle:  { select: { id: true, registrationNo: true, makeModel: true } },
        },
      }),
      prisma.appointment.count({ where }),
    ])

    return success(res, paginate(appointments, total, page, limit))
  } catch (err) {
    next(err)
  }
}

async function createAppointment(req, res, next) {
  try {
    const { workshopId } = req.user
    const { customerId, vehicleId, appointmentDate, appointmentTime, serviceType, notes } = req.body

    if (!customerId)         return badRequest(res, 'Customer is required')
    if (!vehicleId)          return badRequest(res, 'Vehicle is required')
    if (!appointmentDate)    return badRequest(res, 'Appointment date is required')
    if (!appointmentTime)    return badRequest(res, 'Appointment time is required')
    if (!serviceType?.trim()) return badRequest(res, 'Service type is required')

    const customer = await prisma.customer.findFirst({ where: { id: customerId, workshopId, deletedAt: null } })
    if (!customer) return notFound(res, 'Customer not found')

    const count = await prisma.appointment.count({ where: { workshopId } })
    const code  = appointmentCode(count + 1)

    const appointment = await prisma.appointment.create({
      data: {
        appointmentCode: code,
        workshopId,
        customerId,
        vehicleId,
        appointmentDate: new Date(appointmentDate),
        appointmentTime,
        serviceType: serviceType.trim(),
        notes: notes?.trim() || null,
        status: 'Confirmed',
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        vehicle:  { select: { id: true, registrationNo: true, makeModel: true } },
      },
    })

    return created(res, { appointment }, 'Appointment created successfully')
  } catch (err) {
    next(err)
  }
}

async function getAppointment(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const appointment = await prisma.appointment.findFirst({
      where: { id, workshopId },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        vehicle:  { select: { id: true, registrationNo: true, makeModel: true, vehicleType: true } },
      },
    })

    if (!appointment) return notFound(res, 'Appointment not found')
    return success(res, { appointment })
  } catch (err) {
    next(err)
  }
}

async function updateAppointment(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { appointmentDate, appointmentTime, serviceType, notes } = req.body

    const existing = await prisma.appointment.findFirst({ where: { id, workshopId } })
    if (!existing) return notFound(res, 'Appointment not found')

    const appointment = await prisma.appointment.update({
      where: { id },
      data: {
        ...(appointmentDate && { appointmentDate: new Date(appointmentDate) }),
        ...(appointmentTime && { appointmentTime }),
        ...(serviceType     && { serviceType: serviceType.trim() }),
        ...(notes !== undefined && { notes: notes?.trim() || null }),
      },
    })

    return success(res, { appointment }, 'Appointment updated')
  } catch (err) {
    next(err)
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { status } = req.body

    const valid = ['Confirmed', 'WaitingApproval', 'Cancelled', 'Completed']
    if (!valid.includes(status)) return badRequest(res, `Status must be one of: ${valid.join(', ')}`)

    const existing = await prisma.appointment.findFirst({ where: { id, workshopId } })
    if (!existing) return notFound(res, 'Appointment not found')

    const appointment = await prisma.appointment.update({ where: { id }, data: { status } })
    return success(res, { appointment }, 'Appointment status updated')
  } catch (err) {
    next(err)
  }
}

async function deleteAppointment(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const existing = await prisma.appointment.findFirst({ where: { id, workshopId } })
    if (!existing) return notFound(res, 'Appointment not found')

    await prisma.appointment.update({ where: { id }, data: { status: 'Cancelled' } })
    return success(res, null, 'Appointment cancelled')
  } catch (err) {
    next(err)
  }
}

module.exports = {
  listAppointments, createAppointment, getAppointment,
  updateAppointment, updateAppointmentStatus, deleteAppointment,
}

'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')
const { getPagination, paginate } = require('../utils/pagination')

async function listVehicles(req, res, next) {
  try {
    const { workshopId } = req.user
    const { customerId, q } = req.query
    const { page, limit, skip } = getPagination(req.query)

    const where = {
      deletedAt: null,
      customer: { workshopId, deletedAt: null },
    }
    if (customerId) where.customerId = customerId
    if (q) {
      where.OR = [
        { registrationNo: { contains: q, mode: 'insensitive' } },
        { makeModel:      { contains: q, mode: 'insensitive' } },
        { vin:            { contains: q, mode: 'insensitive' } },
      ]
    }

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { id: true, name: true, phone: true } } },
      }),
      prisma.vehicle.count({ where }),
    ])

    return success(res, paginate(vehicles, total, page, limit))
  } catch (err) {
    next(err)
  }
}

async function createVehicle(req, res, next) {
  try {
    const { workshopId } = req.user
    const { customerId, registrationNo, vin, makeModel, mileage, vehicleType, notes } = req.body

    if (!customerId) return badRequest(res, 'Customer is required')
    if (!registrationNo?.trim()) return badRequest(res, 'Registration number is required')
    if (!makeModel?.trim()) return badRequest(res, 'Make & model is required')

    const customer = await prisma.customer.findFirst({
      where: { id: customerId, workshopId, deletedAt: null },
    })
    if (!customer) return notFound(res, 'Customer not found')

    const existing = await prisma.vehicle.findFirst({
      where: { registrationNo: registrationNo.trim(), customer: { workshopId }, deletedAt: null },
    })
    if (existing) return badRequest(res, 'A vehicle with this registration number already exists')

    const vehicle = await prisma.vehicle.create({
      data: {
        customerId,
        registrationNo: registrationNo.trim(),
        vin: vin?.trim() || null,
        makeModel: makeModel.trim(),
        mileage: mileage ? parseInt(mileage) : null,
        vehicleType: vehicleType || 'Private',
        notes: notes?.trim() || null,
      },
    })

    return created(res, { vehicle }, 'Vehicle added successfully')
  } catch (err) {
    next(err)
  }
}

async function getVehicle(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const vehicle = await prisma.vehicle.findFirst({
      where: { id, deletedAt: null, customer: { workshopId } },
      include: {
        customer: { select: { id: true, name: true, phone: true, email: true } },
        quotations: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, quoteNumber: true, status: true, totalEstimate: true, currency: true },
        },
      },
    })

    if (!vehicle) return notFound(res, 'Vehicle not found')
    return success(res, { vehicle })
  } catch (err) {
    next(err)
  }
}

async function updateVehicle(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params
    const { registrationNo, vin, makeModel, mileage, vehicleType, notes } = req.body

    const existing = await prisma.vehicle.findFirst({
      where: { id, deletedAt: null, customer: { workshopId } },
    })
    if (!existing) return notFound(res, 'Vehicle not found')

    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        ...(registrationNo !== undefined && { registrationNo: registrationNo.trim() }),
        ...(vin !== undefined            && { vin: vin?.trim() || null }),
        ...(makeModel !== undefined      && { makeModel: makeModel.trim() }),
        ...(mileage !== undefined        && { mileage: mileage ? parseInt(mileage) : null }),
        ...(vehicleType                  && { vehicleType }),
        ...(notes !== undefined          && { notes: notes?.trim() || null }),
      },
    })

    return success(res, { vehicle }, 'Vehicle updated successfully')
  } catch (err) {
    next(err)
  }
}

async function deleteVehicle(req, res, next) {
  try {
    const { workshopId } = req.user
    const { id } = req.params

    const existing = await prisma.vehicle.findFirst({
      where: { id, deletedAt: null, customer: { workshopId } },
    })
    if (!existing) return notFound(res, 'Vehicle not found')

    await prisma.vehicle.update({ where: { id }, data: { deletedAt: new Date() } })
    return success(res, null, 'Vehicle deleted successfully')
  } catch (err) {
    next(err)
  }
}

module.exports = { listVehicles, createVehicle, getVehicle, updateVehicle, deleteVehicle }

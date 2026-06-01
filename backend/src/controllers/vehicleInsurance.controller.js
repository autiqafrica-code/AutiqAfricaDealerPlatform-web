'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')

const VALID_STATUSES = ['Active', 'Expired', 'ClaimInProgress', 'Approved', 'Rejected']

// ── List insurance records for a vehicle ─────────────────────────────────────

async function listInsurance(req, res, next) {
  try {
    const { workshopId } = req.user
    const { vehicleId } = req.params

    // Verify vehicle belongs to workshop
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, customer: { workshopId }, deletedAt: null },
    })
    if (!vehicle) return notFound(res, 'Vehicle not found')

    const records = await prisma.vehicleInsuranceDetails.findMany({
      where: { vehicleId, workshopId },
      orderBy: { createdAt: 'desc' },
    })

    return success(res, { records })
  } catch (err) { next(err) }
}

// ── Get insurance by job ──────────────────────────────────────────────────────

async function getJobInsurance(req, res, next) {
  try {
    const { workshopId } = req.user
    const { jobId } = req.params

    const record = await prisma.vehicleInsuranceDetails.findFirst({
      where: { jobCardId: jobId, workshopId },
      orderBy: { createdAt: 'desc' },
    })

    return success(res, { record: record || null })
  } catch (err) { next(err) }
}

// ── Create insurance details ──────────────────────────────────────────────────

async function createInsurance(req, res, next) {
  try {
    const { workshopId, id: userId } = req.user
    const { vehicleId } = req.params
    const {
      jobCardId, providerName, policyNumber, claimNumber,
      insuranceContactName, insuranceContactPhone, insuranceContactEmail,
      coverageType, coverageLimit, deductibleAmount, currency,
      expiryDate, status, notes,
    } = req.body

    if (!providerName?.trim()) return badRequest(res, 'Insurance provider name is required')
    if (!policyNumber?.trim()) return badRequest(res, 'Policy number is required')
    if (status && !VALID_STATUSES.includes(status)) return badRequest(res, `status must be one of: ${VALID_STATUSES.join(', ')}`)

    const vehicle = await prisma.vehicle.findFirst({
      where: { id: vehicleId, customer: { workshopId }, deletedAt: null },
      include: { customer: { select: { id: true } } },
    })
    if (!vehicle) return notFound(res, 'Vehicle not found')

    // If jobCardId provided, verify it belongs to this workshop
    if (jobCardId) {
      const job = await prisma.jobCard.findFirst({ where: { id: jobCardId, workshopId, deletedAt: null } })
      if (!job) return notFound(res, 'Job not found')
    }

    const record = await prisma.vehicleInsuranceDetails.create({
      data: {
        workshopId,
        customerId:           vehicle.customer.id,
        vehicleId,
        jobCardId:            jobCardId || null,
        providerName:         providerName.trim(),
        policyNumber:         policyNumber.trim(),
        claimNumber:          claimNumber?.trim()           || null,
        insuranceContactName: insuranceContactName?.trim()  || null,
        insuranceContactPhone: insuranceContactPhone?.trim() || null,
        insuranceContactEmail: insuranceContactEmail?.trim() || null,
        coverageType:         coverageType?.trim()          || null,
        coverageLimit:        coverageLimit  ? parseFloat(coverageLimit)  : null,
        deductibleAmount:     deductibleAmount ? parseFloat(deductibleAmount) : null,
        currency:             currency        || 'ZAR',
        expiryDate:           expiryDate      ? new Date(expiryDate) : null,
        status:               status          || 'Active',
        notes:                notes?.trim()   || null,
        createdByUserId:      userId,
        updatedAt:            new Date(),
      },
    })

    // If linked to a job, also mark the invoice as having insurance (if it exists)
    if (jobCardId) {
      const invoice = await prisma.invoice.findFirst({ where: { jobCardId } })
      if (invoice) {
        await prisma.invoice.update({ where: { id: invoice.id }, data: { hasInsurance: true, insuranceId: record.id } })
      }
    }

    return created(res, { record }, 'Insurance details saved')
  } catch (err) { next(err) }
}

// ── Update insurance details ──────────────────────────────────────────────────

async function updateInsurance(req, res, next) {
  try {
    const { workshopId } = req.user
    const { vehicleId, insuranceId } = req.params
    const {
      providerName, policyNumber, claimNumber,
      insuranceContactName, insuranceContactPhone, insuranceContactEmail,
      coverageType, coverageLimit, deductibleAmount, currency,
      expiryDate, status, notes,
    } = req.body

    if (status && !VALID_STATUSES.includes(status)) return badRequest(res, `status must be one of: ${VALID_STATUSES.join(', ')}`)

    const existing = await prisma.vehicleInsuranceDetails.findFirst({ where: { id: insuranceId, vehicleId, workshopId } })
    if (!existing) return notFound(res, 'Insurance record not found')

    const record = await prisma.vehicleInsuranceDetails.update({
      where: { id: insuranceId },
      data: {
        ...(providerName        && { providerName: providerName.trim() }),
        ...(policyNumber        && { policyNumber: policyNumber.trim() }),
        ...(claimNumber !== undefined   && { claimNumber: claimNumber?.trim() || null }),
        ...(insuranceContactName !== undefined  && { insuranceContactName: insuranceContactName?.trim()  || null }),
        ...(insuranceContactPhone !== undefined && { insuranceContactPhone: insuranceContactPhone?.trim() || null }),
        ...(insuranceContactEmail !== undefined && { insuranceContactEmail: insuranceContactEmail?.trim() || null }),
        ...(coverageType !== undefined  && { coverageType: coverageType?.trim() || null }),
        ...(coverageLimit !== undefined && { coverageLimit: coverageLimit ? parseFloat(coverageLimit) : null }),
        ...(deductibleAmount !== undefined && { deductibleAmount: deductibleAmount ? parseFloat(deductibleAmount) : null }),
        ...(currency !== undefined      && { currency: currency || 'ZAR' }),
        ...(expiryDate !== undefined    && { expiryDate: expiryDate ? new Date(expiryDate) : null }),
        ...(status                      && { status }),
        ...(notes !== undefined         && { notes: notes?.trim() || null }),
        updatedAt: new Date(),
      },
    })

    return success(res, { record }, 'Insurance details updated')
  } catch (err) { next(err) }
}

module.exports = { listInsurance, getJobInsurance, createInsurance, updateInsurance }

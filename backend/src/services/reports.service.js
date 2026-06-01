'use strict'

// TODO: Reports service
// Responsible for: aggregating job data, revenue data, technician performance,
//                  pending approvals/payments, and CSV export generation

const prisma = require('../config/db')

async function getJobsReport({ workshopId, period }) {
  // TODO: query job_cards grouped by month, calc created vs completed, completion rate
}

async function getRevenueReport({ workshopId, period }) {
  // TODO: query invoices and payments grouped by month, sum totals
}

async function getTechnicianPerformanceReport({ workshopId, period }) {
  // TODO: query job_cards by technician, calc assigned/completed/avg hours/rework/rating
}

async function getPendingReport({ workshopId }) {
  // TODO: query quotations in CustomerApproved-pending state + invoices with DueToday/Overdue/PartPaid
}

async function buildCsvExport({ workshopId, exportReason, dataPackage }) {
  // TODO: build structured CSV rows from workshops, customers, vehicles, jobs, quotes, payments
}

module.exports = { getJobsReport, getRevenueReport, getTechnicianPerformanceReport, getPendingReport, buildCsvExport }

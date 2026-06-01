'use strict'

// TODO: Job card service
// Responsible for: creating jobs from approved quotations, Kanban data, status transitions,
//                  checklist population from service templates, issue management, progress tracking

const prisma = require('../config/db')
const { jobNumber } = require('../utils/idGenerator')

async function getNextJobSequence(workshopId) {
  // TODO: count existing jobs for workshop and increment
}

async function createJobFromQuotation(quotationId, payload) {
  // TODO: create job_card, copy service template checklist items, notify assigned controller/tech/parts
}

async function getKanbanData(workshopId) {
  // TODO: return jobs grouped by status for Kanban board
}

async function populateChecklistFromTemplate(jobCardId, serviceTemplateId) {
  // TODO: copy service_checklist_templates items into job_checklist_items
}

async function calculateOverallJobSeverity(jobCardId) {
  // TODO: determine Red/Amber/Green from open issues severity
}

module.exports = { getNextJobSequence, createJobFromQuotation, getKanbanData, populateChecklistFromTemplate, calculateOverallJobSeverity }

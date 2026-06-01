'use strict'

// TODO: Quotation workflow service
// Responsible for: creating quotes, dispatching internal requests, generating approval tokens,
//                  building quote totals, updating statuses, creating job after approval

const { v4: uuidv4 } = require('uuid')
const prisma = require('../config/db')
const { quoteNumber } = require('../utils/idGenerator')

async function generateApprovalToken() {
  return uuidv4()
}

async function getNextQuoteSequence(workshopId) {
  // TODO: count existing quotations for this workshop and increment
}

async function buildQuotationTotal(quotationId) {
  // TODO: sum all line items for the quotation
}

async function dispatchInternalRequests(quotationId, targets) {
  // TODO: update quotation flags, create notification records for each target role
}

async function sendApprovalToCustomer(quotationId, channel) {
  // TODO: generate approval token, build approval URL, send via WhatsApp or Email
}

async function processCustomerApproval(token, signature) {
  // TODO: find quotation by token, mark approved, record signature, trigger job creation
}

async function processCustomerRejection(token, reason) {
  // TODO: find quotation by token, mark rejected, notify front desk
}

module.exports = { generateApprovalToken, getNextQuoteSequence, buildQuotationTotal, dispatchInternalRequests, sendApprovalToCustomer, processCustomerApproval, processCustomerRejection }

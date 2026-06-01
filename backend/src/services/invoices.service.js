'use strict'

// TODO: Invoice service

const prisma = require('../config/db')
const { invoiceNumber } = require('../utils/idGenerator')

async function generateInvoiceFromQuotation(quotationId) {
  // TODO: fetch quotation, create invoice + line items from quotation_line_items,
  //       set paymentStatus=DueToday, return invoice
}

async function generatePdf(invoiceId) {
  // TODO: use a PDF library (e.g. pdfkit, puppeteer) to render invoice
}

module.exports = { generateInvoiceFromQuotation, generatePdf }

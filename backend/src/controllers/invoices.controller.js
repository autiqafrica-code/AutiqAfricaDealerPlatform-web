'use strict'

// TODO: Implement invoices controller

async function listInvoices(req, res, next) { res.json({ placeholder: 'listInvoices' }) }
async function createInvoice(req, res, next) { res.json({ placeholder: 'createInvoice' }) }
async function getInvoice(req, res, next) { res.json({ placeholder: 'getInvoice' }) }
async function downloadInvoicePdf(req, res, next) { res.json({ placeholder: 'downloadInvoicePdf' }) }

module.exports = { listInvoices, createInvoice, getInvoice, downloadInvoicePdf }

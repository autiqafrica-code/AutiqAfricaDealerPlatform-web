'use strict'

// TODO: Implement payments controller

async function listPayments(req, res, next) { res.json({ placeholder: 'listPayments' }) }
async function recordPayment(req, res, next) { res.json({ placeholder: 'recordPayment' }) }
async function getPayment(req, res, next) { res.json({ placeholder: 'getPayment' }) }
async function updatePaymentStatus(req, res, next) { res.json({ placeholder: 'updatePaymentStatus' }) }
async function gatewayTest(req, res, next) { res.json({ placeholder: 'gatewayTest' }) }
async function gatewayWebhook(req, res, next) { res.json({ placeholder: 'gatewayWebhook' }) }

module.exports = { listPayments, recordPayment, getPayment, updatePaymentStatus, gatewayTest, gatewayWebhook }

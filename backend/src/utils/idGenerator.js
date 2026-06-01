'use strict'

// Sequential-style prefixed IDs for display (not for database PKs)
// Database PKs use cuid() from Prisma

function padNum(n, digits = 4) {
  return String(n).padStart(digits, '0')
}

function quoteNumber(sequence) {
  return `AA-Q-${padNum(sequence)}`
}

function jobNumber(sequence) {
  return `AA-${padNum(sequence)}`
}

function appointmentCode(sequence) {
  return `APT-${padNum(sequence)}`
}

function invoiceNumber(year, sequence) {
  return `INV-${year}-${padNum(sequence, 3)}`
}

function paymentCode(sequence) {
  return `PAY-${padNum(sequence)}`
}

function reminderCode(sequence) {
  return `REM-${padNum(sequence, 3)}`
}

function adminCode(sequence) {
  return `ADM-${padNum(sequence, 3)}`
}

function workshopCode(sequence) {
  return `WS-${padNum(sequence)}`
}

module.exports = { quoteNumber, jobNumber, appointmentCode, invoiceNumber, paymentCode, reminderCode, adminCode, workshopCode }

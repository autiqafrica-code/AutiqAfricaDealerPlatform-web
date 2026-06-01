'use strict'

const bcrypt = require('bcryptjs')

const SALT_ROUNDS = 12

async function hashPassword(plain) {
  return bcrypt.hash(plain, SALT_ROUNDS)
}

async function comparePassword(plain, hash) {
  return bcrypt.compare(plain, hash)
}

function generateTempPassword(roleLabel = 'User', sequence = 1) {
  const base = roleLabel.replace(/\s+/g, '').slice(0, 8)
  return `Autiq@${base}${sequence}`
}

module.exports = { hashPassword, comparePassword, generateTempPassword }

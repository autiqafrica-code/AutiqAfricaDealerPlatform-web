'use strict'

const { PrismaClient } = require('@prisma/client')
const { LOG_LEVEL } = require('./env')

const prisma = new PrismaClient({
  log: LOG_LEVEL === 'debug'
    ? ['query', 'info', 'warn', 'error']
    : ['warn', 'error'],
})

module.exports = prisma

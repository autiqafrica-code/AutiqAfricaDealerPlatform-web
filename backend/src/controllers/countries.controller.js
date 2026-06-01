'use strict'

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function listCountries(req, res) {
  try {
    const countries = await prisma.country.findMany({
      where:   { isActive: true },
      orderBy: { name: 'asc' },
      select:  { id: true, name: true, iso2: true, iso3: true, isdCode: true, currencyName: true, currencyCode: true, currencySymbol: true },
    })
    res.json({ success: true, data: countries })
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to load countries' })
  }
}

module.exports = { listCountries }

'use strict'

const express = require('express')
const { listCountries } = require('../controllers/countries.controller')

const router = express.Router()

// Public — no auth required (reference data used on login forms and public screens)
router.get('/', listCountries)

module.exports = router

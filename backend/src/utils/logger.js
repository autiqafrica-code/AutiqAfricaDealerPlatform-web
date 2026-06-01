'use strict'

const fs = require('fs')
const path = require('path')
const winston = require('winston')
const { LOG_LEVEL, LOG_DIR, NODE_ENV } = require('../config/env')

// Ensure log directory exists before any transports are created
if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const extras = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : ''
    return `${timestamp} [${level}]: ${message}${extras}`
  })
)

const fileFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.json()
)

const logger = winston.createLogger({
  level: LOG_LEVEL,
  transports: [
    // Console — pretty-printed in development, JSON in production
    new winston.transports.Console({
      format: NODE_ENV === 'production' ? fileFormat : consoleFormat,
    }),

    // error.log — error level only, all environments
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10 * 1024 * 1024,  // 10 MB per file
      maxFiles: 7,                 // keep last 7 rotated files
      tailable: true,
    }),

    // combined.log — all levels, all environments
    new winston.transports.File({
      filename: path.join(LOG_DIR, 'combined.log'),
      format: fileFormat,
      maxsize: 20 * 1024 * 1024,  // 20 MB per file
      maxFiles: 7,
      tailable: true,
    }),
  ],
})

module.exports = logger

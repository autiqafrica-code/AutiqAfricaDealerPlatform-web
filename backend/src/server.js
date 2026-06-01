'use strict'

const app = require('./app')
const { PORT, NODE_ENV } = require('./config/env')
const logger = require('./utils/logger')
const prisma = require('./config/db')

async function startServer() {
  try {
    // Verify database connection
    await prisma.$connect()
    logger.info('Database connected successfully')

    app.listen(PORT, () => {
      logger.info(`Autiq Africa API running on port ${PORT} [${NODE_ENV}]`)
      logger.info(`Health check: http://localhost:${PORT}/api/health`)
    })
  } catch (error) {
    logger.error('Failed to start server', { error: error.message })
    await prisma.$disconnect()
    process.exit(1)
  }
}

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully')
  await prisma.$disconnect()
  process.exit(0)
})

startServer()

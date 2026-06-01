'use strict'

function success(res, data = {}, message = 'Success', statusCode = 200) {
  return res.status(statusCode).json({ success: true, message, data })
}

function created(res, data = {}, message = 'Created successfully') {
  return success(res, data, message, 201)
}

function error(res, message = 'Internal server error', statusCode = 500, errors = null) {
  const body = { success: false, message }
  if (errors) body.errors = errors
  return res.status(statusCode).json(body)
}

function notFound(res, message = 'Resource not found') {
  return error(res, message, 404)
}

function badRequest(res, message = 'Bad request', errors = null) {
  return error(res, message, 400, errors)
}

function unauthorized(res, message = 'Unauthorized') {
  return error(res, message, 401)
}

function forbidden(res, message = 'Forbidden') {
  return error(res, message, 403)
}

module.exports = { success, created, error, notFound, badRequest, unauthorized, forbidden }

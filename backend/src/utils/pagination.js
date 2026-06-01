'use strict'

function getPagination(query) {
  const page = Math.max(1, parseInt(query.page || '1', 10))
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || '20', 10)))
  const skip = (page - 1) * limit
  return { page, limit, skip }
}

function paginate(data, total, page, limit) {
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  }
}

module.exports = { getPagination, paginate }

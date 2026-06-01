'use strict'

const prisma = require('../config/db')
const { success, created, badRequest, notFound } = require('../utils/apiResponse')

async function listDrafts(req, res, next) {
  try {
    const drafts = await prisma.clientDraft.findMany({
      where: { enterpriseAdminId: req.user.id },
      select: { id: true, draftName: true, data: true, createdAt: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' },
    })
    return success(res, { drafts })
  } catch (e) { next(e) }
}

async function getDraft(req, res, next) {
  try {
    const draft = await prisma.clientDraft.findFirst({
      where: { id: req.params.id, enterpriseAdminId: req.user.id },
    })
    if (!draft) return notFound(res, 'Draft not found')
    return success(res, { draft })
  } catch (e) { next(e) }
}

async function createDraft(req, res, next) {
  try {
    const { draftName, data } = req.body
    if (!data) return badRequest(res, 'Draft data is required')
    const draft = await prisma.clientDraft.create({
      data: {
        enterpriseAdminId: req.user.id,
        draftName: draftName?.trim() || 'Untitled draft',
        data,
      },
    })
    return created(res, { draft }, 'Draft saved')
  } catch (e) { next(e) }
}

async function updateDraft(req, res, next) {
  try {
    const draft = await prisma.clientDraft.findFirst({
      where: { id: req.params.id, enterpriseAdminId: req.user.id },
    })
    if (!draft) return notFound(res, 'Draft not found')
    const { draftName, data } = req.body
    const updated = await prisma.clientDraft.update({
      where: { id: req.params.id },
      data: {
        ...(draftName !== undefined && { draftName: draftName?.trim() || 'Untitled draft' }),
        ...(data       !== undefined && { data }),
      },
    })
    return success(res, { draft: updated })
  } catch (e) { next(e) }
}

async function deleteDraft(req, res, next) {
  try {
    const draft = await prisma.clientDraft.findFirst({
      where: { id: req.params.id, enterpriseAdminId: req.user.id },
    })
    if (!draft) return notFound(res, 'Draft not found')
    await prisma.clientDraft.delete({ where: { id: req.params.id } })
    return success(res, {}, 'Draft deleted')
  } catch (e) { next(e) }
}

module.exports = { listDrafts, getDraft, createDraft, updateDraft, deleteDraft }

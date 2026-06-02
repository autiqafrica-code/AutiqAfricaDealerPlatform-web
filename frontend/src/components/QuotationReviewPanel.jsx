import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Edit2, MessageSquare, Plus, Send, X } from 'lucide-react'
import { apiFetch } from '../utils/api'

const NOTES_FIELD = {
  TECHNICIAN:          'technicianNotes',
  WORKSHOP_CONTROLLER: 'workshopControllerNotes',
  PARTS_INTERPRETER:   'partsInterpreterNotes',
}

const SENT_BACK_FIELD = {
  TECHNICIAN:          'technicianSentBack',
  WORKSHOP_CONTROLLER: 'workshopControllerSentBack',
  PARTS_INTERPRETER:   'partsInterpreterSentBack',
}

const COST_FIELD = {
  TECHNICIAN:          'technicianCost',
  WORKSHOP_CONTROLLER: 'workshopControllerCost',
  PARTS_INTERPRETER:   'partsInterpreterCost',
}

const TIME_FIELD = {
  TECHNICIAN:          'technicianRepairTime',
  WORKSHOP_CONTROLLER: 'workshopControllerRepairTime',
  PARTS_INTERPRETER:   'partsInterpreterRepairTime',
}

const NOTES_LABEL = {
  TECHNICIAN:          'Technician notes',
  WORKSHOP_CONTROLLER: 'Workshop controller notes',
  PARTS_INTERPRETER:   'Parts interpreter notes',
}

const PRIORITY_OPTIONS = ['Critical', 'Major', 'Low']

const EMPTY_ADD_FORM = { item: '', repairType: '', priority: '', cost: '', notes: '' }

export default function QuotationReviewPanel({ quotations, roleCode, onRefresh }) {
  const [expanded,     setExpanded]     = useState(null)
  const [lineNotes,    setLineNotes]    = useState({})
  const [lineCosts,    setLineCosts]    = useState({})
  const [lineTimes,    setLineTimes]    = useState({})
  const [overallNotes, setOverallNotes] = useState({})
  const [savingLi,     setSavingLi]     = useState(null)
  const [sendingBack,  setSendingBack]  = useState(null)
  const [msgs,         setMsgs]         = useState({})
  const [errs,         setErrs]         = useState({})

  // Add line item state
  const [addingLi,  setAddingLi]  = useState({})   // { [quoteId]: bool }
  const [addForm,   setAddForm]   = useState({})   // { [quoteId]: EMPTY_ADD_FORM }
  const [addBusy,   setAddBusy]   = useState({})   // { [quoteId]: bool }

  // Edit line item state
  const [editingLiId, setEditingLiId] = useState(null)  // liId | null
  const [editForm,    setEditForm]    = useState({ item: '', repairType: '', priority: '' })
  const [editBusy,    setEditBusy]    = useState(false)

  const notesField    = NOTES_FIELD[roleCode]
  const sentBackField = SENT_BACK_FIELD[roleCode]
  const costField     = COST_FIELD[roleCode]
  const timeField     = TIME_FIELD[roleCode]
  const notesLabel    = NOTES_LABEL[roleCode] || 'Your notes'

  function getNoteFor(li) { return lineNotes[li.id] !== undefined ? lineNotes[li.id] : (li[notesField] || '') }
  function getCostFor(li) { return lineCosts[li.id] !== undefined ? lineCosts[li.id] : (li[costField] != null ? String(li[costField]) : '') }
  function getTimeFor(li) { return lineTimes[li.id] !== undefined ? lineTimes[li.id] : (li[timeField] || '') }

  function setMsg(qid, text, isErr = false) {
    if (isErr) setErrs(p => ({ ...p, [qid]: text }))
    else       setMsgs(p => ({ ...p, [qid]: text }))
    setTimeout(() => {
      setMsgs(p => ({ ...p, [qid]: '' }))
      setErrs(p => ({ ...p, [qid]: '' }))
    }, 4000)
  }

  async function saveLineItem(quoteId, liId) {
    setSavingLi(liId)
    try {
      const payload = {}
      if (lineNotes[liId] !== undefined) payload.notes      = lineNotes[liId]
      if (lineCosts[liId] !== undefined) payload.cost       = lineCosts[liId]
      if (lineTimes[liId] !== undefined) payload.repairTime = lineTimes[liId]

      const res  = await apiFetch(`/quotations/${quoteId}/line-items/${liId}/role-notes`, {
        method: 'PATCH', body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!data.success) { setMsg(quoteId, data.message || 'Failed to save', true); return }
      setMsg(quoteId, 'Saved.')
      onRefresh && onRefresh()
    } catch {
      setMsg(quoteId, 'Network error', true)
    } finally {
      setSavingLi(null)
    }
  }

  async function sendBack(quoteId) {
    if (!window.confirm('Send back to Front Desk? You will no longer be able to edit this quotation.')) return
    setSendingBack(quoteId)
    try {
      const res  = await apiFetch(`/quotations/${quoteId}/send-back`, {
        method: 'POST', body: JSON.stringify({ overallNotes: overallNotes[quoteId] || '' }),
      })
      const data = await res.json()
      if (!data.success) { setMsg(quoteId, data.message || 'Failed to send back', true); return }
      setMsg(quoteId, 'Sent back to Front Desk.')
      onRefresh && onRefresh()
    } catch {
      setMsg(quoteId, 'Network error', true)
    } finally {
      setSendingBack(null)
    }
  }

  // ── Add line item ─────────────────────────────────────────────────────────

  function openAddForm(qid) {
    setAddingLi(p => ({ ...p, [qid]: true }))
    setAddForm(p => ({ ...p, [qid]: { ...EMPTY_ADD_FORM } }))
  }

  function closeAddForm(qid) {
    setAddingLi(p => ({ ...p, [qid]: false }))
  }

  function updateAdd(qid, field, value) {
    setAddForm(p => ({ ...p, [qid]: { ...(p[qid] || EMPTY_ADD_FORM), [field]: value } }))
  }

  async function submitAddLineItem(qid) {
    const form = addForm[qid] || {}
    if (!form.item?.trim()) { setMsg(qid, 'Item description is required', true); return }
    setAddBusy(p => ({ ...p, [qid]: true }))
    try {
      const body = { item: form.item.trim() }
      if (form.repairType?.trim()) body.repairType = form.repairType.trim()
      if (form.priority?.trim())   body.priority   = form.priority.trim()
      if (form.cost?.trim())       body.cost       = form.cost.trim()
      if (form.notes?.trim())      body.notes      = form.notes.trim()

      const res  = await apiFetch(`/quotations/${qid}/line-items`, { method: 'POST', body: JSON.stringify(body) })
      const data = await res.json()
      if (!data.success) { setMsg(qid, data.message || 'Failed to add line item', true); return }
      setMsg(qid, 'Line item added.')
      closeAddForm(qid)
      onRefresh && onRefresh()
    } catch {
      setMsg(qid, 'Network error', true)
    } finally {
      setAddBusy(p => ({ ...p, [qid]: false }))
    }
  }

  // ── Edit line item ────────────────────────────────────────────────────────

  function openEditLi(li) {
    setEditingLiId(li.id)
    setEditForm({ item: li.item || '', repairType: li.repairType || '', priority: li.priority || '' })
  }

  function cancelEdit() {
    setEditingLiId(null)
    setEditBusy(false)
  }

  async function submitEditLi(qid, liId) {
    if (!editForm.item?.trim()) { setMsg(qid, 'Item description is required', true); return }
    setEditBusy(true)
    try {
      const body = {
        item:       editForm.item.trim(),
        repairType: editForm.repairType?.trim() || null,
        priority:   editForm.priority?.trim()   || null,
      }
      const res  = await apiFetch(`/quotations/${qid}/line-items/${liId}`, { method: 'PUT', body: JSON.stringify(body) })
      const data = await res.json()
      if (!data.success) { setMsg(qid, data.message || 'Failed to update', true); return }
      setMsg(qid, 'Line item updated.')
      setEditingLiId(null)
      onRefresh && onRefresh()
    } catch {
      setMsg(qid, 'Network error', true)
    } finally {
      setEditBusy(false)
    }
  }

  if (!quotations || quotations.length === 0) {
    return (
      <div className="infoStrip" style={{ marginTop: 8 }}>
        No quotations currently assigned to you for review.
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {quotations.map(q => {
        const isSentBack = q[sentBackField]
        const isExpanded = expanded === q.id
        const isAdding   = addingLi[q.id]
        const isAddBusy  = addBusy[q.id]

        return (
          <div key={q.id} style={{
            border: `1px solid ${isSentBack ? '#abefc6' : '#e4e7ec'}`,
            borderRadius: 14,
            overflow: 'hidden',
            background: isSentBack ? '#f6fef9' : '#fff',
          }}>
            {/* ── Header row ──────────────────────────────────────────── */}
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }}
              onClick={() => setExpanded(isExpanded ? null : q.id)}
            >
              {isSentBack
                ? <CheckCircle2 size={16} style={{ color: '#039855', flexShrink: 0 }} />
                : <MessageSquare size={16} style={{ color: '#667085', flexShrink: 0 }} />}
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 14 }}>{q.quoteNumber}</strong>
                <span style={{ marginLeft: 10, fontSize: 13, color: 'var(--muted)' }}>
                  {q.customer?.name} · {q.vehicle?.registrationNo} {q.vehicle?.makeModel}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {isSentBack
                  ? <span className="pill green" style={{ fontSize: 11 }}>Sent back</span>
                  : <span className="pill amber" style={{ fontSize: 11 }}>Pending your input</span>}
                {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
              </div>
            </div>

            {isExpanded && (
              <div style={{ padding: '0 16px 16px', borderTop: '1px solid #f2f4f7' }}>
                {msgs[q.id] && (
                  <div style={{ background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 10, padding: '8px 12px', color: '#027a48', fontWeight: 700, fontSize: 13, margin: '10px 0' }}>
                    {msgs[q.id]}
                  </div>
                )}
                {errs[q.id] && (
                  <div style={{ background: '#fff8f7', border: '1px solid #fda29b', borderRadius: 10, padding: '8px 12px', color: '#b91c1c', fontWeight: 700, fontSize: 13, margin: '10px 0' }}>
                    {errs[q.id]}
                  </div>
                )}

                {/* ── Line items list ────────────────────────────────── */}
                {(q.lineItems || []).length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 13, padding: '10px 0' }}>No line items on this quotation yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {(q.lineItems || []).map(li => {
                      const isEditing = editingLiId === li.id

                      return (
                        <div key={li.id} style={{
                          background: '#f8fafc',
                          border: `1px solid ${isEditing ? 'var(--teal)' : '#e4e7ec'}`,
                          borderRadius: 10,
                          padding: '12px 14px',
                        }}>
                          {/* Item header: name/tags or edit form */}
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: isEditing ? 10 : 8, gap: 8 }}>
                            {isEditing ? (
                              /* ── Inline edit form ────────────────── */
                              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                                <input
                                  value={editForm.item}
                                  onChange={e => setEditForm(f => ({ ...f, item: e.target.value }))}
                                  placeholder="Item description *"
                                  style={{ fontSize: 13, padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontWeight: 600 }}
                                />
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                  <input
                                    value={editForm.repairType}
                                    onChange={e => setEditForm(f => ({ ...f, repairType: e.target.value }))}
                                    placeholder="Repair type (optional)"
                                    style={{ flex: 1, minWidth: 120, fontSize: 12, padding: '5px 9px', borderRadius: 8, border: '1px solid #d0d5dd' }}
                                  />
                                  <select
                                    value={editForm.priority}
                                    onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))}
                                    style={{ fontSize: 12, padding: '5px 9px', borderRadius: 8, border: '1px solid #d0d5dd', background: 'white' }}
                                  >
                                    <option value="">Priority (optional)</option>
                                    {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                                  </select>
                                </div>
                                <div style={{ display: 'flex', gap: 8 }}>
                                  <button
                                    className="primaryBtn"
                                    style={{ fontSize: 12, padding: '6px 14px' }}
                                    onClick={() => submitEditLi(q.id, li.id)}
                                    disabled={editBusy}
                                  >
                                    {editBusy ? 'Saving…' : 'Save changes'}
                                  </button>
                                  <button
                                    className="softBtn"
                                    style={{ fontSize: 12, padding: '6px 12px', margin: 0 }}
                                    onClick={cancelEdit}
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* ── Normal display ──────────────────── */
                              <div>
                                <strong style={{ fontSize: 13 }}>{li.item}</strong>
                                {li.repairType && (
                                  <span style={{ marginLeft: 8, fontSize: 11, background: '#e8f4f8', color: '#175cd3', borderRadius: 6, padding: '2px 7px' }}>
                                    {li.repairType}
                                  </span>
                                )}
                                {li.priority && (
                                  <span className={`pill ${li.priority === 'Critical' ? 'red' : li.priority === 'Major' ? 'amber' : 'green'}`} style={{ marginLeft: 6, fontSize: 10 }}>
                                    {li.priority}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Edit / cancel toggle — only when not sent back */}
                            {!isSentBack && (
                              <button
                                type="button"
                                onClick={() => isEditing ? cancelEdit() : openEditLi(li)}
                                title={isEditing ? 'Cancel edit' : 'Edit line item'}
                                style={{ border: 0, background: isEditing ? '#fee4e2' : '#f2f4f7', borderRadius: 8, padding: '4px 7px', cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', color: isEditing ? 'var(--red)' : 'var(--muted)' }}
                              >
                                {isEditing ? <X size={13} /> : <Edit2 size={13} />}
                              </button>
                            )}
                          </div>

                          {/* Skip cost/notes inputs while in edit mode */}
                          {!isEditing && (
                            <>
                              {/* Front Desk notes (read-only) */}
                              {li.notes && (
                                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '7px 10px', fontSize: 12, color: '#78350f', marginBottom: 10 }}>
                                  <strong>Customer complaint (Front Desk):</strong> {li.notes}
                                </div>
                              )}

                              {/* Sent-back read-only view */}
                              {isSentBack ? (
                                <div style={{ background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 8, padding: '9px 12px', fontSize: 12 }}>
                                  <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                                    {li[costField] != null && (
                                      <span><strong>Cost:</strong> {q.currency || ''} {parseFloat(li[costField]).toLocaleString()}</span>
                                    )}
                                    {li[timeField] && (
                                      <span><strong>Time:</strong> {li[timeField]}</span>
                                    )}
                                  </div>
                                  {li[notesField] && (
                                    <div style={{ marginTop: 6, color: '#027a48' }}>
                                      <strong>{notesLabel}:</strong> {li[notesField]}
                                    </div>
                                  )}
                                  {!li[costField] && !li[timeField] && !li[notesField] && (
                                    <em style={{ opacity: 0.6 }}>No input added</em>
                                  )}
                                </div>
                              ) : (
                                /* Editable role-notes form */
                                <div>
                                  <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                                    <label style={{ flex: 1, fontSize: 12, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      Your cost estimate
                                      <input
                                        type="number" min="0" step="0.01" placeholder="e.g. 1200"
                                        value={getCostFor(li)}
                                        onChange={e => setLineCosts(p => ({ ...p, [li.id]: e.target.value }))}
                                        style={{ fontSize: 12, padding: '5px 9px', borderRadius: 8, border: '1px solid #d0d5dd' }}
                                      />
                                    </label>
                                    <label style={{ flex: 1, fontSize: 12, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                      Your repair time estimate
                                      <input
                                        type="text" placeholder="e.g. 2.5 hrs"
                                        value={getTimeFor(li)}
                                        onChange={e => setLineTimes(p => ({ ...p, [li.id]: e.target.value }))}
                                        style={{ fontSize: 12, padding: '5px 9px', borderRadius: 8, border: '1px solid #d0d5dd' }}
                                      />
                                    </label>
                                  </div>
                                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                                    <textarea
                                      rows={2}
                                      placeholder={`${notesLabel}…`}
                                      value={getNoteFor(li)}
                                      onChange={e => setLineNotes(p => ({ ...p, [li.id]: e.target.value }))}
                                      style={{ flex: 1, fontSize: 12, padding: '6px 10px', borderRadius: 8, border: '1px solid #d0d5dd', resize: 'vertical', minHeight: 52 }}
                                    />
                                    <button
                                      className="softBtn"
                                      style={{ fontSize: 12, whiteSpace: 'nowrap', marginTop: 2 }}
                                      onClick={() => saveLineItem(q.id, li.id)}
                                      disabled={savingLi === li.id}
                                    >
                                      {savingLi === li.id ? 'Saving…' : 'Save'}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* ── Add line item ──────────────────────────────────── */}
                {!isSentBack && (
                  <div style={{ marginTop: 12 }}>
                    {isAdding ? (
                      <div style={{ background: '#f0fdfa', border: '1px solid #b9e8df', borderRadius: 12, padding: '14px 16px' }}>
                        <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 13, color: 'var(--navy)' }}>New line item</p>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          <input
                            value={(addForm[q.id] || {}).item || ''}
                            onChange={e => updateAdd(q.id, 'item', e.target.value)}
                            placeholder="Item description *"
                            style={{ fontSize: 13, padding: '7px 11px', borderRadius: 8, border: '1px solid #d0d5dd', fontWeight: 600 }}
                          />
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input
                              value={(addForm[q.id] || {}).repairType || ''}
                              onChange={e => updateAdd(q.id, 'repairType', e.target.value)}
                              placeholder="Repair type (optional)"
                              style={{ flex: 1, minWidth: 120, fontSize: 12, padding: '6px 9px', borderRadius: 8, border: '1px solid #d0d5dd' }}
                            />
                            <select
                              value={(addForm[q.id] || {}).priority || ''}
                              onChange={e => updateAdd(q.id, 'priority', e.target.value)}
                              style={{ fontSize: 12, padding: '6px 9px', borderRadius: 8, border: '1px solid #d0d5dd', background: 'white' }}
                            >
                              <option value="">Priority (optional)</option>
                              {PRIORITY_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <input
                              type="number" min="0" step="0.01"
                              value={(addForm[q.id] || {}).cost || ''}
                              onChange={e => updateAdd(q.id, 'cost', e.target.value)}
                              placeholder="Cost estimate (optional)"
                              style={{ flex: 1, minWidth: 120, fontSize: 12, padding: '6px 9px', borderRadius: 8, border: '1px solid #d0d5dd' }}
                            />
                            <input
                              value={(addForm[q.id] || {}).notes || ''}
                              onChange={e => updateAdd(q.id, 'notes', e.target.value)}
                              placeholder="Notes (optional)"
                              style={{ flex: 2, minWidth: 140, fontSize: 12, padding: '6px 9px', borderRadius: 8, border: '1px solid #d0d5dd' }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                            <button
                              className="primaryBtn"
                              style={{ fontSize: 12, padding: '7px 16px' }}
                              onClick={() => submitAddLineItem(q.id)}
                              disabled={isAddBusy}
                            >
                              <Plus size={13} /> {isAddBusy ? 'Adding…' : 'Add line item'}
                            </button>
                            <button
                              className="softBtn"
                              style={{ fontSize: 12, padding: '7px 14px', margin: 0 }}
                              onClick={() => closeAddForm(q.id)}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => openAddForm(q.id)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 700, color: 'var(--teal)', background: '#f0fdfa', border: '1px dashed #6de4c8', borderRadius: 10, padding: '8px 14px', cursor: 'pointer' }}
                      >
                        <Plus size={14} /> Add line item
                      </button>
                    )}
                  </div>
                )}

                {/* ── Send back section ──────────────────────────────── */}
                {!isSentBack && (
                  <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid #e4e7ec' }}>
                    <label style={{ fontWeight: 700, fontSize: 13, display: 'block', marginBottom: 6 }}>
                      Overall notes for Front Desk (optional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Any general observations or summary for Front Desk…"
                      value={overallNotes[q.id] || ''}
                      onChange={e => setOverallNotes(p => ({ ...p, [q.id]: e.target.value }))}
                      style={{ width: '100%', fontSize: 12, padding: '8px 12px', borderRadius: 8, border: '1px solid #d0d5dd', marginBottom: 10, boxSizing: 'border-box' }}
                    />
                    <button
                      className="primaryBtn"
                      onClick={() => sendBack(q.id)}
                      disabled={sendingBack === q.id}
                      style={{ background: '#039855' }}
                    >
                      <Send size={14} /> {sendingBack === q.id ? 'Sending…' : 'Send back to Front Desk'}
                    </button>
                  </div>
                )}

                {isSentBack && (
                  <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#027a48', fontWeight: 600 }}>
                    <CheckCircle2 size={15} />
                    Sent back to Front Desk — no further edits required.
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

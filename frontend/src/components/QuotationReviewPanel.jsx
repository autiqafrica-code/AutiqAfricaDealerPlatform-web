import { useState } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, MessageSquare, Send } from 'lucide-react'
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

export default function QuotationReviewPanel({ quotations, roleCode, onRefresh }) {
  const [expanded,     setExpanded]     = useState(null)
  const [lineNotes,    setLineNotes]    = useState({})   // { [liId]: string }
  const [lineCosts,    setLineCosts]    = useState({})   // { [liId]: string }
  const [lineTimes,    setLineTimes]    = useState({})   // { [liId]: string }
  const [overallNotes, setOverallNotes] = useState({})   // { [quoteId]: string }
  const [savingLi,     setSavingLi]     = useState(null) // liId
  const [sendingBack,  setSendingBack]  = useState(null) // quoteId
  const [msgs,         setMsgs]         = useState({})   // { [quoteId]: string }
  const [errs,         setErrs]         = useState({})   // { [quoteId]: string }

  const notesField    = NOTES_FIELD[roleCode]
  const sentBackField = SENT_BACK_FIELD[roleCode]
  const costField     = COST_FIELD[roleCode]
  const timeField     = TIME_FIELD[roleCode]
  const notesLabel    = NOTES_LABEL[roleCode] || 'Your notes'

  function getNoteFor(li)  { return lineNotes[li.id] !== undefined ? lineNotes[li.id] : (li[notesField] || '') }
  function getCostFor(li)  { return lineCosts[li.id] !== undefined ? lineCosts[li.id] : (li[costField] != null ? String(li[costField]) : '') }
  function getTimeFor(li)  { return lineTimes[li.id] !== undefined ? lineTimes[li.id] : (li[timeField] || '') }

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
      const body = {
        notes:      lineNotes[liId] !== undefined ? lineNotes[liId] : undefined,
        cost:       lineCosts[liId] !== undefined ? lineCosts[liId] : undefined,
        repairTime: lineTimes[liId] !== undefined ? lineTimes[liId] : undefined,
      }
      // Only send fields that were actually changed
      const payload = {}
      if (body.notes      !== undefined) payload.notes      = body.notes
      if (body.cost       !== undefined) payload.cost       = body.cost
      if (body.repairTime !== undefined) payload.repairTime = body.repairTime

      const res  = await apiFetch(`/quotations/${quoteId}/line-items/${liId}/role-notes`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
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
        method: 'POST',
        body: JSON.stringify({ overallNotes: overallNotes[quoteId] || '' }),
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

        return (
          <div key={q.id} style={{
            border: `1px solid ${isSentBack ? '#abefc6' : '#e4e7ec'}`,
            borderRadius: 14,
            overflow: 'hidden',
            background: isSentBack ? '#f6fef9' : '#fff',
          }}>
            {/* Header row */}
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

                {(q.lineItems || []).length === 0 ? (
                  <p style={{ color: 'var(--muted)', fontSize: 13, padding: '10px 0' }}>No line items on this quotation yet.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
                    {(q.lineItems || []).map(li => (
                      <div key={li.id} style={{
                        background: '#f8fafc',
                        border: '1px solid #e4e7ec',
                        borderRadius: 10,
                        padding: '12px 14px',
                      }}>
                        {/* Item name + tags */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8, gap: 8 }}>
                          <div>
                            <strong style={{ fontSize: 13 }}>{li.item}</strong>
                            {li.repairType && <span style={{ marginLeft: 8, fontSize: 11, background: '#e8f4f8', color: '#175cd3', borderRadius: 6, padding: '2px 7px' }}>{li.repairType}</span>}
                            {li.priority && (
                              <span className={`pill ${li.priority === 'Critical' ? 'red' : li.priority === 'Major' ? 'amber' : 'green'}`} style={{ marginLeft: 6, fontSize: 10 }}>
                                {li.priority}
                              </span>
                            )}
                          </div>
                        </div>

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
                          /* Editable form */
                          <div>
                            {/* Cost + Time row */}
                            <div style={{ display: 'flex', gap: 10, marginBottom: 8 }}>
                              <label style={{ flex: 1, fontSize: 12, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                Your cost estimate
                                <input
                                  type="number"
                                  min="0"
                                  step="0.01"
                                  placeholder="e.g. 1200"
                                  value={getCostFor(li)}
                                  onChange={e => setLineCosts(p => ({ ...p, [li.id]: e.target.value }))}
                                  style={{ fontSize: 12, padding: '5px 9px', borderRadius: 8, border: '1px solid #d0d5dd' }}
                                />
                              </label>
                              <label style={{ flex: 1, fontSize: 12, fontWeight: 600, display: 'flex', flexDirection: 'column', gap: 4 }}>
                                Your repair time estimate
                                <input
                                  type="text"
                                  placeholder="e.g. 2.5 hrs"
                                  value={getTimeFor(li)}
                                  onChange={e => setLineTimes(p => ({ ...p, [li.id]: e.target.value }))}
                                  style={{ fontSize: 12, padding: '5px 9px', borderRadius: 8, border: '1px solid #d0d5dd' }}
                                />
                              </label>
                            </div>
                            {/* Notes + Save */}
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                              <textarea
                                rows={2}
                                placeholder={`${notesLabel}…`}
                                value={getNoteFor(li)}
                                onChange={e => setLineNotes(p => ({ ...p, [li.id]: e.target.value }))}
                                style={{
                                  flex: 1, fontSize: 12, padding: '6px 10px',
                                  borderRadius: 8, border: '1px solid #d0d5dd',
                                  resize: 'vertical', minHeight: 52,
                                }}
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
                      </div>
                    ))}
                  </div>
                )}

                {/* Send back section */}
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

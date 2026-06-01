import { useEffect, useRef, useState } from 'react'
import {
  AlertTriangle, ArrowLeftRight, Camera, CheckCircle2, ChevronDown, ChevronUp,
  Edit3, FileText, ImagePlus, Plus, Save, Send, Trash2, Video,
} from 'lucide-react'
import { apiFetch, getToken } from '../utils/api'

// ── Config per role ───────────────────────────────────────────────────────────

const roleConfig = {
  'Workshop Controller': {
    title:        'Workshop Controller — Quotation Updates',
    subtitle:     'Review Front Desk quotation requests. Update bay / repair route, labour estimate, and cost impact per line item. Send the completed update back to Front Desk.',
    queryParam:   'sendToWorkshopController=true',
    showMedia:    false,
  },
  Technician: {
    title:        'Technician — Quotation Updates',
    subtitle:     'Review quotation requests, add diagnosis, upload photo/video evidence per line item, confirm repair time and cost, then return the completed technical update to Front Desk.',
    queryParam:   'sendToTechnician=true',
    showMedia:    true,
  },
  'Parts Interpreter': {
    title:        'Parts Interpreter — Quotation Updates',
    subtitle:     'Add part availability, lead time, price and photos per line item. Add new parts lines if required. Return the completed update to Front Desk.',
    queryParam:   'sendToPartsInterpreter=true',
    showMedia:    true,
  },
}

// ── Priority helpers ──────────────────────────────────────────────────────────

const PRIORITIES = ['Critical', 'Major', 'Minor']
const PRIORITY_COLOR = { Critical: 'red', Major: 'amber', Minor: 'green', '': 'soft' }

function PriorityPill({ value }) {
  if (!value) return null
  return <span className={`pill ${PRIORITY_COLOR[value] || 'soft'}`} style={{ fontSize: 11 }}>{value}</span>
}

// ── Media upload for a specific line item ─────────────────────────────────────

function LineItemMedia({ quotationId, lineItemDesc }) {
  const [uploaded, setUploaded] = useState([])
  const inputRef = useRef()

  async function handleUpload(e) {
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:8007').replace(/\/api$/, '')
    try {
      const res  = await fetch(`${base}/api/quotations/${quotationId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })
      const data = await res.json()
      if (data.success) setUploaded(p => [...p, ...files.map(f => f.name)])
    } catch { /* ignore */ }
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div style={{ marginTop: 8 }}>
      <input ref={inputRef} type="file" accept="image/*,video/*" multiple style={{ display: 'none' }} onChange={handleUpload} />
      <button
        type="button"
        className="softBtn"
        style={{ fontSize: 12, padding: '6px 10px' }}
        onClick={() => inputRef.current?.click()}
      >
        <Camera size={13} /> Upload photos / videos
      </button>
      {uploaded.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
          {uploaded.map((f, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 999, padding: '4px 9px', fontSize: 12 }}>
              {f.match(/\.(mp4|mov|webm)$/i) ? <Video size={12} /> : <ImagePlus size={12} />}
              {f}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Single line item row ──────────────────────────────────────────────────────

function LineItemRow({ li, quotationId, currency, showMedia, onSave, onDelete, canDelete }) {
  const [open,    setOpen]    = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [err,     setErr]     = useState('')
  const [form,    setForm]    = useState({
    item:       li.item        || '',
    priority:   li.priority    || '',
    repairTime: li.repairTime  || '',
    cost:       li.cost != null ? String(li.cost) : '',
    notes:      li.notes       || '',
  })

  // Reset form when li changes (after save)
  useEffect(() => {
    setForm({
      item:       li.item        || '',
      priority:   li.priority    || '',
      repairTime: li.repairTime  || '',
      cost:       li.cost != null ? String(li.cost) : '',
      notes:      li.notes       || '',
    })
  }, [li.id, li.item, li.priority, li.repairTime, li.cost, li.notes])

  async function handleSave() {
    setSaving(true); setErr('')
    try {
      const res  = await apiFetch(`/quotations/${quotationId}/line-items/${li.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          item:       form.item,
          priority:   form.priority || null,
          repairTime: form.repairTime || null,
          cost:       form.cost || null,
          notes:      form.notes || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onSave(data.data.lineItem)
        setOpen(false)
      } else {
        setErr(data.message || 'Failed to save')
      }
    } catch { setErr('Network error') }
    finally { setSaving(false) }
  }

  const roleLabel = li.addedByRole === 'FRONT_DESK' || li.addedByRole === 'FrontDesk' ? 'FD' : li.addedByRole?.replace(/_/g, ' ')

  return (
    <div style={{ borderBottom: '1px solid #f2f4f7' }}>
      {/* Row header */}
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 20px', cursor: 'pointer', transition: 'background .12s' }}
        onClick={() => setOpen(o => !o)}
        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
        onMouseLeave={e => e.currentTarget.style.background = ''}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <strong style={{ fontSize: 14 }}>{li.item}</strong>
            <PriorityPill value={li.priority} />
            <span style={{ fontSize: 11, color: 'var(--muted)', background: '#f2f4f7', borderRadius: 6, padding: '2px 6px' }}>{roleLabel}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
          {li.repairTime && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{li.repairTime}</span>}
          {li.cost != null && Number(li.cost) > 0 && (
            <span style={{ fontSize: 13, fontWeight: 700 }}>{currency} {Number(li.cost).toLocaleString()}</span>
          )}
          {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
        </div>
      </div>

      {/* Expanded edit form */}
      {open && (
        <div style={{ padding: '0 20px 16px', background: '#fafbff' }}>
          {err && <div style={{ background: '#fff8f7', border: '1px solid #fda29b', borderRadius: 8, padding: '6px 10px', color: '#b91c1c', fontSize: 13, marginBottom: 8 }}>{err}</div>}
          <div className="formGrid adminForm" style={{ marginBottom: 0 }}>
            <label>
              Description
              <input value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))} />
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="">— Not set —</option>
                {PRIORITIES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
              </select>
            </label>
            <label>
              Duration / Repair Time
              <input value={form.repairTime} onChange={e => setForm(p => ({ ...p, repairTime: e.target.value }))} placeholder="e.g. 2.5 hrs" />
            </label>
            <label>
              Cost ({currency})
              <input type="number" min={0} step={0.01} value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="0.00" />
            </label>
            <label className="wide">
              Notes / Diagnosis
              <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Describe diagnosis, availability, or advisory…" />
            </label>
          </div>

          {showMedia && <LineItemMedia quotationId={quotationId} lineItemDesc={li.item} />}

          <div className="rowActions" style={{ marginTop: 10 }}>
            <button className="softBtn" onClick={handleSave} disabled={saving} style={{ fontSize: 13 }}>
              <Save size={14} /> {saving ? 'Saving…' : 'Save changes'}
            </button>
            {canDelete && (
              <button className="softBtn" onClick={() => onDelete(li.id)} style={{ color: 'var(--red)', fontSize: 13 }}>
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Add new line item form ────────────────────────────────────────────────────

function AddLineItemForm({ quotationId, currency, onAdded, onCancel }) {
  const [form,   setForm]   = useState({ item: '', priority: '', repairTime: '', cost: '', notes: '' })
  const [saving, setSaving] = useState(false)
  const [err,    setErr]    = useState('')

  async function handleAdd() {
    if (!form.item.trim()) { setErr('Description is required'); return }
    setSaving(true); setErr('')
    try {
      const res  = await apiFetch(`/quotations/${quotationId}/line-items`, {
        method: 'POST',
        body: JSON.stringify({
          item:       form.item,
          priority:   form.priority || null,
          repairTime: form.repairTime || null,
          cost:       form.cost || null,
          notes:      form.notes || null,
          currency,
        }),
      })
      const data = await res.json()
      if (data.success) {
        onAdded(data.data.lineItem)
        setForm({ item: '', priority: '', repairTime: '', cost: '', notes: '' })
      } else {
        setErr(data.message || 'Failed to add')
      }
    } catch { setErr('Network error') }
    finally { setSaving(false) }
  }

  return (
    <div style={{ background: '#f8faff', borderRadius: 14, padding: 16, margin: '12px 0' }}>
      <strong style={{ fontSize: 14 }}>Add New Line Item</strong>
      {err && <div style={{ background: '#fff8f7', border: '1px solid #fda29b', borderRadius: 8, padding: '6px 10px', color: '#b91c1c', fontSize: 13, margin: '8px 0' }}>{err}</div>}
      <div className="formGrid adminForm" style={{ marginTop: 10 }}>
        <label>
          Description *
          <input value={form.item} onChange={e => setForm(p => ({ ...p, item: e.target.value }))} placeholder="e.g. Brake pad replacement" />
        </label>
        <label>
          Priority
          <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
            <option value="">— Not set —</option>
            {PRIORITIES.map(pr => <option key={pr} value={pr}>{pr}</option>)}
          </select>
        </label>
        <label>
          Duration / Repair Time
          <input value={form.repairTime} onChange={e => setForm(p => ({ ...p, repairTime: e.target.value }))} placeholder="e.g. 1.5 hrs" />
        </label>
        <label>
          Cost ({currency})
          <input type="number" min={0} step={0.01} value={form.cost} onChange={e => setForm(p => ({ ...p, cost: e.target.value }))} placeholder="0.00" />
        </label>
        <label className="wide">
          Notes
          <textarea rows={2} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} />
        </label>
      </div>
      <div className="rowActions" style={{ marginTop: 8 }}>
        <button className="primaryBtn" onClick={handleAdd} disabled={saving}><Plus size={15} /> {saving ? 'Adding…' : 'Add Line Item'}</button>
        <button className="softBtn" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  )
}

// ── Main workbench ────────────────────────────────────────────────────────────

export default function QuotationWorkbench({ role }) {
  const config  = roleConfig[role] || roleConfig.Technician
  const canDelete = role !== 'Workshop Controller'

  const [quotations,  setQuotations]  = useState([])
  const [loading,     setLoading]     = useState(true)
  const [selectedId,  setSelectedId]  = useState('')
  const [lineItems,   setLineItems]   = useState([])
  const [lastUpdates, setLastUpdates] = useState([])
  const [quoteDetail, setQuoteDetail] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [sendNotes,   setSendNotes]   = useState('')
  const [sending,     setSending]     = useState(false)
  const [msg,         setMsg]         = useState('')
  const [msgType,     setMsgType]     = useState('success')

  useEffect(() => { loadList() }, [role])

  async function loadList() {
    setLoading(true)
    try {
      const res  = await apiFetch(`/quotations?${config.queryParam}&limit=50`)
      const data = await res.json()
      if (data.success) {
        const list = data.data.data || []
        setQuotations(list)
        if (list.length > 0) await selectQuote(list[0].id)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function selectQuote(id) {
    setSelectedId(id)
    setMsg('')
    setShowAddForm(false)
    try {
      const res  = await apiFetch(`/quotations/${id}`)
      const data = await res.json()
      if (data.success) {
        const q = data.data.quotation
        setQuoteDetail(q)
        setLineItems(q.lineItems || [])
        setLastUpdates(q.updates || [])
      }
    } catch { /* ignore */ }
  }

  async function handleSendBack() {
    if (!selectedId) return
    setSending(true); setMsg('')
    try {
      const res  = await apiFetch(`/quotations/${selectedId}/updates`, {
        method: 'POST',
        body: JSON.stringify({ status: 'Completed', notes: sendNotes || null, focusNote: null }),
      })
      const data = await res.json()
      if (data.success) {
        setMsgType('success')
        setMsg(`Update sent back to Front Desk for ${quoteDetail?.quoteNumber}.`)
        setSendNotes('')
        await loadList()
      } else {
        setMsgType('error'); setMsg(data.message || 'Failed to send')
      }
    } catch { setMsgType('error'); setMsg('Network error') }
    finally { setSending(false) }
  }

  async function handleDeleteItem(liId) {
    try {
      await apiFetch(`/quotations/${selectedId}/line-items/${liId}`, { method: 'DELETE' })
      setLineItems(p => p.filter(li => li.id !== liId))
    } catch { /* ignore */ }
  }

  function handleItemSaved(updated) {
    setLineItems(p => p.map(li => li.id === updated.id ? updated : li))
  }

  function handleItemAdded(newItem) {
    setLineItems(p => [...p, newItem])
    setShowAddForm(false)
  }

  const currency    = quoteDetail?.currency || 'ZAR'
  const totalCost   = lineItems.reduce((s, li) => s + Number(li.cost || 0), 0)
  const withUpdates = quotations.filter(q => (q._count?.updates || 0) > 0).length

  return (
    <section className="panel">
      {/* Metrics */}
      <div className="metricGrid" style={{ marginBottom: 18 }}>
        <article className="metricCard"><p>Assigned quotes</p><h2>{quotations.length}</h2><span>From Front Desk</span></article>
        <article className="metricCard"><p>Pending updates</p><h2>{quotations.length - withUpdates}</h2><span>Need action</span></article>
        <article className="metricCard"><p>With updates</p><h2>{withUpdates}</h2><span>Updates submitted</span></article>
        <article className="metricCard"><p>Current role</p><h2 style={{ fontSize: 16 }}>{role}</h2><span>Quotation access</span></article>
      </div>

      {msg && (
        <div style={{ background: msgType === 'success' ? '#ecfdf3' : '#fee4e2', color: msgType === 'success' ? '#027a48' : '#d92d20', border: `1px solid ${msgType === 'success' ? '#abefc6' : '#fecdca'}`, borderRadius: 14, padding: '10px 14px', marginBottom: 14, fontWeight: 800, fontSize: 13 }}>
          {msg}
        </div>
      )}

      <div className="sectionHeader" style={{ marginBottom: 16 }}>
        <div>
          <p className="eyebrow">Quotation Handoff</p>
          <h3>{config.title}</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, maxWidth: 680 }}>{config.subtitle}</p>
        </div>
        <span className="accessBadge"><FileText size={16} /> View + update quotations</span>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading quotations…</p>
      ) : quotations.length === 0 ? (
        <div className="infoStrip">No quotations assigned to {role} yet. Front Desk must send a quotation for internal review first.</div>
      ) : (
        <>
          {/* ─── Quotation selector table ─── */}
          <div className="tableWrap" style={{ marginBottom: 18 }}>
            <table>
              <thead>
                <tr><th>Quote</th><th>Customer / Vehicle</th><th>Repair request</th><th>Estimate</th><th>Updates</th></tr>
              </thead>
              <tbody>
                {quotations.map(q => (
                  <tr key={q.id} style={{ cursor: 'pointer', background: q.id === selectedId ? '#f0f9ff' : undefined }} onClick={() => selectQuote(q.id)}>
                    <td>
                      <strong>{q.quoteNumber}</strong>
                      <br /><small style={{ color: 'var(--muted)' }}>{new Date(q.createdAt).toLocaleDateString('en-GB')}</small>
                    </td>
                    <td>
                      {q.customer?.name}
                      <br /><small style={{ color: 'var(--muted)' }}>{q.vehicle?.registrationNo} {q.vehicle?.makeModel}</small>
                    </td>
                    <td>{q.repairType}</td>
                    <td>{q.totalEstimate ? `${q.currency} ${parseFloat(q.totalEstimate).toLocaleString()}` : '—'}</td>
                    <td>
                      <span className={`pill ${(q._count?.updates || 0) > 0 ? 'green' : 'amber'}`}>
                        {(q._count?.updates || 0) > 0 ? `${q._count.updates} update(s)` : 'Pending'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ─── Line items + side panel ─── */}
          {quoteDetail && (
            <div className="quoteUpdateGrid">
              {/* LEFT: line items */}
              <div>
                <div className="panel" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{ padding: '14px 20px', borderBottom: '1px solid #f2f4f7', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h4 style={{ margin: 0 }}>Line items — {quoteDetail.quoteNumber}</h4>
                      <p style={{ margin: '3px 0 0', fontSize: 13, color: 'var(--muted)' }}>
                        {quoteDetail.customer?.name} · {quoteDetail.vehicle?.registrationNo} {quoteDetail.vehicle?.makeModel}
                      </p>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {/* Priority legend */}
                      <span className="pill red" style={{ fontSize: 11 }}>Critical</span>
                      <span className="pill amber" style={{ fontSize: 11 }}>Major</span>
                      <span className="pill green" style={{ fontSize: 11 }}>Minor</span>
                    </div>
                  </div>

                  {lineItems.length === 0 ? (
                    <div style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--muted)' }}>
                      <AlertTriangle size={32} style={{ color: '#d0d5dd', marginBottom: 8 }} />
                      <p style={{ margin: 0, fontSize: 14 }}>No line items on this quotation yet.</p>
                    </div>
                  ) : (
                    lineItems.map(li => (
                      <LineItemRow
                        key={li.id}
                        li={li}
                        quotationId={selectedId}
                        currency={currency}
                        showMedia={config.showMedia}
                        onSave={handleItemSaved}
                        onDelete={handleDeleteItem}
                        canDelete={canDelete}
                      />
                    ))
                  )}

                  {/* Total */}
                  {lineItems.length > 0 && (
                    <div style={{ padding: '12px 20px', borderTop: '1px solid #f2f4f7', display: 'flex', justifyContent: 'flex-end', gap: 10, alignItems: 'center' }}>
                      <span style={{ color: 'var(--muted)', fontSize: 13 }}>Total estimate</span>
                      <strong style={{ fontSize: 20, color: 'var(--teal)' }}>{currency} {totalCost.toLocaleString()}</strong>
                    </div>
                  )}
                </div>

                {/* Add line item */}
                {showAddForm ? (
                  <AddLineItemForm
                    quotationId={selectedId}
                    currency={currency}
                    onAdded={handleItemAdded}
                    onCancel={() => setShowAddForm(false)}
                  />
                ) : (
                  <button className="softBtn" style={{ marginTop: 10 }} onClick={() => setShowAddForm(true)}>
                    <Plus size={15} /> Add new line item
                  </button>
                )}

                {/* Send back */}
                <div style={{ marginTop: 16, background: '#f8faff', borderRadius: 14, padding: 16 }}>
                  <h4 style={{ margin: '0 0 10px' }}>Send completed update to Front Desk</h4>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontWeight: 700, fontSize: 13 }}>
                    Summary note (optional)
                    <textarea rows={2} value={sendNotes} onChange={e => setSendNotes(e.target.value)} placeholder="e.g. All parts priced, brake disc requires 1-day lead time." />
                  </label>
                  <div className="rowActions" style={{ marginTop: 8 }}>
                    <button className="primaryBtn" onClick={handleSendBack} disabled={sending}>
                      <Send size={15} /> {sending ? 'Sending…' : 'Send back to Front Desk'}
                    </button>
                  </div>
                </div>
              </div>

              {/* RIGHT: workflow guide */}
              <div className="quoteUpdateCard mutedCard">
                <h4>Front Desk return workflow</h4>
                <div className="handoffStep"><CheckCircle2 size={17} /> View quotation sent by Front Desk</div>
                <div className="handoffStep"><Edit3 size={17} /> Update line items — cost, duration, priority</div>
                <div className="handoffStep"><ArrowLeftRight size={17} /> Send completed update back to Front Desk</div>
                <p className="infoStrip">Front Desk receives the updated quote and can send the final quotation to the customer for approval.</p>

                {lastUpdates.length > 0 && (
                  <div className="infoStrip" style={{ marginTop: 10 }}>
                    <strong>Last update:</strong> {new Date(lastUpdates[0].createdAt).toLocaleString('en-GB')}
                    <br /><strong>By:</strong> {lastUpdates[0].updatedBy?.name || '—'}
                    <br /><strong>Status:</strong> {lastUpdates[0].status}
                    {lastUpdates[0].notes && <><br /><strong>Notes:</strong> {lastUpdates[0].notes}</>}
                  </div>
                )}

                {/* Customer complaint */}
                {quoteDetail?.customerComplaint && (
                  <div className="infoStrip" style={{ marginTop: 10 }}>
                    <strong>Customer complaint:</strong><br />{quoteDetail.customerComplaint}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}

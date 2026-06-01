import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { ClipboardList, Mail, MessageCircle, Plus, Send, Trash2 } from 'lucide-react'
import { apiFetch } from '../../utils/api'

export default function CreateQuotation() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  // Quotation list or detail view
  const [view,       setView]       = useState('list') // 'list' | 'create' | 'detail'
  const [quotations, setQuotations] = useState([])
  const [loadingList, setLoadingList] = useState(true)
  const [activeQuote, setActiveQuote] = useState(null)

  // Customer / vehicle search
  const [customerSearch, setCustomerSearch] = useState('')
  const [customers,      setCustomers]      = useState([])
  const [selectedCust,   setSelectedCust]   = useState(null)
  const [custVehicles,   setCustVehicles]   = useState([])

  // Form
  const [form, setForm] = useState({
    customerId: '', vehicleId: '', repairType: '', priority: 'Amber', customerComplaint: '',
    sendToWorkshopController: true, sendToTechnician: true, sendToPartsInterpreter: true,
  })

  // Per-role user assignment
  const [roleUsers, setRoleUsers]       = useState({ technicians: [], controllers: [], parts: [] })
  const [assigned,  setAssigned]        = useState({ technicianId: '', controllerId: '', partsId: '' })
  const [roleUsersLoaded, setRoleUsersLoaded] = useState(false)

  // Line item form
  const [liForm, setLiForm]   = useState({ item: '', repairType: '', priority: '', repairTime: '', cost: '', notes: '' })
  const [liError, setLiError] = useState('')

  const [saving,      setSaving]      = useState(false)
  const [sending,     setSending]     = useState(false)
  const [apiError,    setApiError]    = useState('')
  const [actionMsg,   setActionMsg]   = useState(null) // { ok, text }
  const [approvalUrl, setApprovalUrl] = useState('')

  useEffect(() => {
    loadQuotations()
    const cid = searchParams.get('customerId')
    const vid = searchParams.get('vehicleId')
    if (cid) {
      setForm(p => ({ ...p, customerId: cid, vehicleId: vid || '' }))
      loadCustomerForPrefill(cid)
      setView('create')
    }
  }, [])

  useEffect(() => {
    if (!customerSearch.trim() || customerSearch.length < 2) { setCustomers([]); return }
    const t = setTimeout(searchCustomers, 300)
    return () => clearTimeout(t)
  }, [customerSearch])

  async function loadQuotations() {
    setLoadingList(true)
    try {
      const res  = await apiFetch('/quotations?limit=50')
      const data = await res.json()
      if (data.success) setQuotations(data.data.data || [])
    } catch { /* ignore */ }
    finally { setLoadingList(false) }
  }

  async function searchCustomers() {
    try {
      const res  = await apiFetch(`/customers?q=${encodeURIComponent(customerSearch)}&limit=10`)
      const data = await res.json()
      if (data.success) setCustomers(data.data.data || [])
    } catch { /* ignore */ }
  }

  async function loadCustomerForPrefill(cid) {
    try {
      const res  = await apiFetch(`/customers/${cid}`)
      const data = await res.json()
      if (data.success) {
        setSelectedCust(data.data.customer)
        setCustVehicles(data.data.customer.vehicles || [])
      }
    } catch { /* ignore */ }
  }

  async function selectCustomer(c) {
    setSelectedCust(c)
    setForm(p => ({ ...p, customerId: c.id, vehicleId: '' }))
    setCustomers([])
    setCustomerSearch('')
    try {
      const res  = await apiFetch(`/customers/${c.id}/vehicles`)
      const data = await res.json()
      if (data.success) setCustVehicles(data.data.vehicles || [])
    } catch { /* ignore */ }
  }

  async function createQuotation() {
    if (!form.customerId) { setApiError('Please select a customer'); return }
    if (!form.vehicleId)  { setApiError('Please select a vehicle'); return }
    setSaving(true)
    setApiError('')
    try {
      const res  = await apiFetch('/quotations', {
        method: 'POST',
        body: JSON.stringify({
          customerId: form.customerId,
          vehicleId:  form.vehicleId,
        }),
      })
      const data = await res.json()
      if (!data.success) { setApiError(data.message || 'Failed to create quotation'); return }
      const q = data.data.quotation
      setActiveQuote(q)
      setForm(p => ({ ...p, repairType: q.repairType || '', priority: q.priority || 'Amber', customerComplaint: q.customerComplaint || '' }))
      setView('detail')
      loadQuotations()
    } catch {
      setApiError('Network error — could not reach server')
    } finally {
      setSaving(false)
    }
  }

  async function openQuote(id) {
    loadRoleUsers()
    try {
      const res  = await apiFetch(`/quotations/${id}`)
      const data = await res.json()
      if (data.success) {
        const q = data.data.quotation
        setActiveQuote(q)
        setAssigned({
          technicianId: q.assignedTechnicianId         || '',
          controllerId: q.assignedWorkshopControllerId || '',
          partsId:      q.assignedPartsInterpreterId   || '',
        })
        setForm(p => ({
          ...p,
          sendToWorkshopController: q.sendToWorkshopController ?? true,
          sendToTechnician:         q.sendToTechnician         ?? true,
          sendToPartsInterpreter:   q.sendToPartsInterpreter   ?? true,
          repairType:        q.repairType        || '',
          priority:          q.priority          || 'Amber',
          customerComplaint: q.customerComplaint || '',
        }))
        setView('detail')
      }
    } catch { /* ignore */ }
  }

  async function loadRoleUsers() {
    try {
      const [techRes, ctrlRes, partsRes] = await Promise.all([
        apiFetch('/users?roleCode=TECHNICIAN&limit=100'),
        apiFetch('/users?roleCode=WORKSHOP_CONTROLLER&limit=100'),
        apiFetch('/users?roleCode=PARTS_INTERPRETER&limit=100'),
      ])
      const [techData, ctrlData, partsData] = await Promise.all([
        techRes.json(), ctrlRes.json(), partsRes.json(),
      ])
      setRoleUsers({
        technicians: techData.success  ? (techData.data?.data  || []) : [],
        controllers: ctrlData.success  ? (ctrlData.data?.data  || []) : [],
        parts:       partsData.success ? (partsData.data?.data || []) : [],
      })
      setRoleUsersLoaded(true)
    } catch { /* ignore */ }
  }

  async function refreshQuote() {
    try {
      const res  = await apiFetch(`/quotations/${activeQuote.id}`)
      const data = await res.json()
      if (data.success) setActiveQuote(data.data.quotation)
    } catch { /* ignore */ }
  }

  async function sendInternal() {
    if (!activeQuote) return
    setSending(true)
    setActionMsg(null)
    try {
      const res  = await apiFetch(`/quotations/${activeQuote.id}/send-internal`, {
        method: 'POST',
        body: JSON.stringify({
          sendToWorkshopController:     form.sendToWorkshopController,
          sendToTechnician:             form.sendToTechnician,
          sendToPartsInterpreter:       form.sendToPartsInterpreter,
          assignedTechnicianId:         form.sendToTechnician          ? assigned.technicianId  || undefined : undefined,
          assignedWorkshopControllerId: form.sendToWorkshopController  ? assigned.controllerId || undefined : undefined,
          assignedPartsInterpreterId:   form.sendToPartsInterpreter    ? assigned.partsId      || undefined : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        await refreshQuote()
        setActionMsg({ ok: true, text: 'Internal requests sent to assigned roles.' })
      } else {
        setActionMsg({ ok: false, text: data.message || 'Failed to send internal requests' })
      }
    } catch {
      setActionMsg({ ok: false, text: 'Network error — could not reach server' })
    } finally {
      setSending(false)
    }
  }

  async function sendToCustomer() {
    if (!activeQuote) return
    setSending(true)
    setActionMsg(null)
    try {
      const res  = await apiFetch(`/quotations/${activeQuote.id}/send-to-customer`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        await refreshQuote()
        if (data.data?.approvalUrl) setApprovalUrl(data.data.approvalUrl)
        setActionMsg({ ok: true, text: 'Quotation sent to customer for approval.' })
      } else {
        setActionMsg({ ok: false, text: data.message || 'Failed to send to customer' })
      }
    } catch {
      setActionMsg({ ok: false, text: 'Network error — could not reach server' })
    } finally {
      setSending(false)
    }
  }

  async function addLineItem() {
    if (!liForm.item.trim()) { setLiError('Item description is required'); return }
    setLiError('')
    try {
      const res  = await apiFetch(`/quotations/${activeQuote.id}/line-items`, {
        method: 'POST',
        body: JSON.stringify({
          item:       liForm.item.trim(),
          repairType: liForm.repairType  || undefined,
          priority:   liForm.priority    || undefined,
          repairTime: liForm.repairTime.trim() || undefined,
          cost:       liForm.cost ? parseFloat(liForm.cost) : undefined,
          notes:      liForm.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setLiForm({ item: '', repairType: '', priority: '', repairTime: '', cost: '', notes: '' })
        // Refresh quote
        const r2 = await apiFetch(`/quotations/${activeQuote.id}`)
        const d2 = await r2.json()
        if (d2.success) setActiveQuote(d2.data.quotation)
      }
    } catch { /* ignore */ }
  }

  async function removeLineItem(liId) {
    if (!window.confirm('Remove this line item?')) return
    try {
      await apiFetch(`/quotations/${activeQuote.id}/line-items/${liId}`, { method: 'DELETE' })
      const r2 = await apiFetch(`/quotations/${activeQuote.id}`)
      const d2 = await r2.json()
      if (d2.success) setActiveQuote(d2.data.quotation)
    } catch { /* ignore */ }
  }

  async function selectCost(liId, source) {
    try {
      const res  = await apiFetch(`/quotations/${activeQuote.id}/line-items/${liId}/select-cost`, {
        method: 'PATCH',
        body: JSON.stringify({ source }),
      })
      const data = await res.json()
      if (data.success) {
        const r2 = await apiFetch(`/quotations/${activeQuote.id}`)
        const d2 = await r2.json()
        if (d2.success) setActiveQuote(d2.data.quotation)
      }
    } catch { /* ignore */ }
  }

  const statusColor = {
    Draft: 'amber', InternalReview: 'amber', InternalUpdatesReceived: 'teal',
    SentToCustomer: 'teal', CustomerApproved: 'green', CustomerRejected: 'red',
  }

  if (view === 'create') return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Quotation Workflow</p>
        <h2>Create Repair Quotation</h2>
        <p>Select a customer and vehicle, set repair details, then save as draft.</p>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div><h3>Customer Repair Request</h3></div>
          <button className="secondaryBtn" onClick={() => setView('list')}>← Back to list</button>
        </div>

        {apiError && (
          <div style={{ background: '#fff8f7', border: '1px solid #fda29b', borderRadius: 12,
            padding: '10px 14px', color: '#b91c1c', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
            ⚠ {apiError}
          </div>
        )}

        {/* Customer search */}
        <div style={{ position: 'relative', marginBottom: 16 }}>
          <label style={{ fontWeight: 700, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
            Customer *
            <input
              placeholder="Search by name or phone…"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
            />
          </label>
          {customers.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
              border: '1px solid #e4e7ec', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.1)',
              zIndex: 50, maxHeight: 200, overflowY: 'auto',
            }}>
              {customers.map(c => (
                <button key={c.id} onClick={() => selectCustomer(c)}
                  style={{ display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 16px', border: 0, background: 'transparent', cursor: 'pointer',
                    borderBottom: '1px solid #f2f4f7' }}>
                  <strong>{c.name}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 8 }}>{c.phone}</span>
                </button>
              ))}
            </div>
          )}
          {selectedCust && (
            <div style={{ marginTop: 8, background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 10, padding: '8px 14px', fontSize: 13 }}>
              Selected: <strong>{selectedCust.name}</strong> — {selectedCust.phone}
            </div>
          )}
        </div>

        <div className="formGrid adminForm" style={{ gridTemplateColumns: '1fr' }}>
          <label>
            Vehicle *
            <select value={form.vehicleId} onChange={e => setForm(p => ({ ...p, vehicleId: e.target.value }))}>
              <option value="">— Select vehicle —</option>
              {custVehicles.map(v => (
                <option key={v.id} value={v.id}>{v.registrationNo} — {v.makeModel}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button className="primaryBtn" onClick={createQuotation} disabled={saving}>
            {saving ? 'Creating…' : 'Create Draft Quotation'}
          </button>
          <button className="secondaryBtn" onClick={() => setView('list')}>Cancel</button>
        </div>
      </section>
    </div>
  )

  if (view === 'detail' && activeQuote) {
    const isSentToCustomer = ['SentToCustomer', 'CustomerApproved', 'CustomerRejected'].includes(activeQuote.status)
    return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Quotation Workflow</p>
        <h2>{activeQuote.quoteNumber}</h2>
        <p>
          {activeQuote.customer?.name} · {activeQuote.vehicle?.registrationNo} — {activeQuote.vehicle?.makeModel}
          <span className={`statusPill ${statusColor[activeQuote.status] || 'amber'}`} style={{ marginLeft: 12 }}>
            {activeQuote.status}
          </span>
        </p>
      </section>

      {actionMsg && (
        <div style={{
          background: actionMsg.ok ? '#ecfdf3' : '#fff8f7',
          border: `1px solid ${actionMsg.ok ? '#abefc6' : '#fda29b'}`,
          borderRadius: 12, padding: '12px 16px',
          color: actionMsg.ok ? '#027a48' : '#b91c1c',
          fontWeight: 700, fontSize: 14,
        }}>
          {actionMsg.ok ? '✓ ' : '⚠ '}{actionMsg.text}
          {approvalUrl && (
            <div style={{ marginTop: 8, fontWeight: 400, fontSize: 13, wordBreak: 'break-all' }}>
              Approval link: <span style={{ fontFamily: 'monospace', background: '#f0fdf4', padding: '2px 6px', borderRadius: 4 }}>{approvalUrl}</span>
            </div>
          )}
        </div>
      )}

      <section className="panel">
        <div className="sectionHeader">
          <h3>Quotation Line Items</h3>
          <span className="accessBadge">Add manually or wait for role inputs</span>
        </div>

        {/* Add line item form — hidden once sent to customer */}
        {isSentToCustomer && (
          <div style={{ background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 12,
            padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#027a48', marginBottom: 16 }}>
            ✓ This quotation has been sent to the customer. Line items are locked.
          </div>
        )}
        {!isSentToCustomer && <div style={{ background: '#f8fafc', border: '1px solid #e4e7ec', borderRadius: 16, padding: 18, marginBottom: 18 }}>
          <p style={{ fontWeight: 800, fontSize: 13, margin: '0 0 12px', color: 'var(--navy)' }}>Add Line Item</p>
          <div className="formGrid adminForm">
            <label className="wide">
              Item Description *
              <input placeholder="e.g. Brake pad replacement" value={liForm.item}
                onChange={e => setLiForm(p => ({ ...p, item: e.target.value }))} />
            </label>
            <label>
              Repair Type
              <select value={liForm.repairType} onChange={e => setLiForm(p => ({ ...p, repairType: e.target.value }))}>
                <option value="">— Select type —</option>
                {['Brake Repair','Service','Paint & Panel','Electrical','Suspension','Transmission','Tyres','Other'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </label>
            <label>
              Priority
              <select value={liForm.priority} onChange={e => setLiForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="">— No priority —</option>
                <option value="Critical">Critical</option>
                <option value="Major">Major</option>
                <option value="Minor">Minor</option>
              </select>
            </label>
            <label>
              Estimated Repair Time
              <input placeholder="e.g. 2.5 hrs" value={liForm.repairTime}
                onChange={e => setLiForm(p => ({ ...p, repairTime: e.target.value }))} />
            </label>
            <label>
              Estimated Cost
              <input type="number" placeholder="e.g. 1450" value={liForm.cost}
                onChange={e => setLiForm(p => ({ ...p, cost: e.target.value }))} />
            </label>
            <label className="wide">
              Customer Complaint / Repair Requested
              <textarea rows={2} placeholder="e.g. Customer reports brake noise and vibration while stopping."
                value={liForm.notes} onChange={e => setLiForm(p => ({ ...p, notes: e.target.value }))}
                style={{ minHeight: 68 }} />
            </label>
          </div>
          {liError && <p style={{ color: '#b91c1c', fontSize: 13, margin: '4px 0 10px' }}>⚠ {liError}</p>}
          <button className="primaryBtn" onClick={addLineItem}>
            <Plus size={14} /> <ClipboardList size={14} /> Add Line Item
          </button>
        </div>}

        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>Item</th><th>Type</th><th>Priority</th><th>Customer Notes</th><th>Role Notes</th><th>Role Estimates</th><th>Time</th><th>Cost</th><th></th></tr>
            </thead>
            <tbody>
              {(activeQuote.lineItems || []).length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: 'center', color: 'var(--muted)', padding: 20 }}>No line items yet. Add one above.</td></tr>
              ) : (activeQuote.lineItems || []).map(li => {
                const roleEstimates = [
                  activeQuote.sendToTechnician         && { role: 'TECHNICIAN',          label: 'T',  bg: '#dbeafe', fg: '#1d4ed8', cost: li.technicianCost,        time: li.technicianRepairTime },
                  activeQuote.sendToWorkshopController && { role: 'WORKSHOP_CONTROLLER', label: 'WC', bg: '#fef9c3', fg: '#92400e', cost: li.workshopControllerCost, time: li.workshopControllerRepairTime },
                  activeQuote.sendToPartsInterpreter   && { role: 'PARTS_INTERPRETER',   label: 'PI', bg: '#dcfce7', fg: '#166534', cost: li.partsInterpreterCost,   time: li.partsInterpreterRepairTime },
                ].filter(Boolean)
                return (
                  <tr key={li.id}>
                    <td><strong>{li.item}</strong></td>
                    <td>{li.repairType || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                    <td>
                      {li.priority
                        ? <span className={`pill ${li.priority === 'Critical' ? 'red' : li.priority === 'Major' ? 'amber' : 'green'}`}>{li.priority}</span>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td style={{ maxWidth: 140, whiteSpace: 'normal', fontSize: 12, color: 'var(--muted)' }}>{li.notes || '—'}</td>
                    <td style={{ maxWidth: 160, whiteSpace: 'normal', fontSize: 11 }}>
                      {li.technicianNotes && (
                        <div style={{ marginBottom: 3 }}>
                          <span style={{ background: '#dbeafe', color: '#1d4ed8', borderRadius: 5, padding: '1px 5px', fontSize: 10, fontWeight: 700, marginRight: 4 }}>T</span>
                          {li.technicianNotes}
                        </div>
                      )}
                      {li.workshopControllerNotes && (
                        <div style={{ marginBottom: 3 }}>
                          <span style={{ background: '#fef9c3', color: '#92400e', borderRadius: 5, padding: '1px 5px', fontSize: 10, fontWeight: 700, marginRight: 4 }}>WC</span>
                          {li.workshopControllerNotes}
                        </div>
                      )}
                      {li.partsInterpreterNotes && (
                        <div>
                          <span style={{ background: '#dcfce7', color: '#166534', borderRadius: 5, padding: '1px 5px', fontSize: 10, fontWeight: 700, marginRight: 4 }}>PI</span>
                          {li.partsInterpreterNotes}
                        </div>
                      )}
                      {!li.technicianNotes && !li.workshopControllerNotes && !li.partsInterpreterNotes && (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                    </td>
                    {/* Role Estimates column */}
                    <td style={{ minWidth: 160 }}>
                      {roleEstimates.length === 0 ? (
                        <span style={{ color: 'var(--muted)', fontSize: 11 }}>—</span>
                      ) : roleEstimates.map(({ role, label, bg, fg, cost, time }) => {
                        const hasCost = cost != null
                        const isSelected = li.selectedCostSource === role
                        return (
                          <div key={role} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4, fontSize: 11 }}>
                            <span style={{ background: bg, color: fg, borderRadius: 4, padding: '1px 5px', fontWeight: 700, flexShrink: 0 }}>{label}</span>
                            {hasCost || time ? (
                              <>
                                <span style={{ color: isSelected ? '#027a48' : 'inherit' }}>
                                  {cost != null ? `${activeQuote.currency} ${parseFloat(cost).toLocaleString()}` : '—'}
                                  {time ? ` · ${time}` : ''}
                                </span>
                                <button
                                  onClick={() => selectCost(li.id, role)}
                                  style={{
                                    fontSize: 10, padding: '1px 7px', borderRadius: 4,
                                    border: `1px solid ${isSelected ? '#abefc6' : '#d0d5dd'}`,
                                    background: isSelected ? '#ecfdf3' : 'transparent',
                                    color: isSelected ? '#027a48' : '#667085',
                                    cursor: 'pointer', marginLeft: 2, flexShrink: 0,
                                  }}
                                >
                                  {isSelected ? '✓ Used' : 'Use'}
                                </button>
                              </>
                            ) : (
                              <span style={{ color: 'var(--muted)' }}>Pending…</span>
                            )}
                          </div>
                        )
                      })}
                    </td>
                    <td>{li.repairTime || '—'}</td>
                    <td>{li.cost ? `${activeQuote.currency} ${parseFloat(li.cost).toLocaleString()}` : '—'}</td>
                    <td>
                      {!isSentToCustomer && (
                        <button onClick={() => removeLineItem(li.id)} title="Remove" style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#d92d20' }}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        {activeQuote.totalEstimate && (
          <div className="quoteTotal">
            <span>Total Estimate</span>
            <strong>{activeQuote.currency} {parseFloat(activeQuote.totalEstimate).toLocaleString()}</strong>
          </div>
        )}
      </section>

      {(() => {
        const sentToCustomer = isSentToCustomer
        return (
          <section className="panel" style={sentToCustomer ? { opacity: 0.55, pointerEvents: 'none' } : {}}>
            <div className="sectionHeader">
              <div>
                <h3>Internal Routing</h3>
                <p>
                  {sentToCustomer
                    ? 'Disabled — this quotation has already been sent to the customer.'
                    : 'Send update request to operational roles. Optionally assign a specific user.'}
                </p>
              </div>
              <button className="primaryBtn" onClick={sendInternal} disabled={sending || sentToCustomer}>
                <Send size={16} /> Send Internal Requests
              </button>
            </div>
            {sentToCustomer && (
              <div style={{ background: '#fef9c3', border: '1px solid #fde047', borderRadius: 12, padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#854d0e', marginBottom: 12 }}>
                Internal routing is disabled because this quotation has been sent to the customer ({activeQuote.status}).
              </div>
            )}
            {/* Per-role sent-back status — shown when in InternalReview or later */}
            {activeQuote.status !== 'Draft' && (
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16, marginTop: 4 }}>
                {activeQuote.sendToWorkshopController && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                    background: activeQuote.workshopControllerSentBack ? '#ecfdf3' : '#f8fafc',
                    border: `1px solid ${activeQuote.workshopControllerSentBack ? '#abefc6' : '#e4e7ec'}`,
                    borderRadius: 8, padding: '5px 10px',
                    color: activeQuote.workshopControllerSentBack ? '#027a48' : '#667085',
                  }}>
                    <span>{activeQuote.workshopControllerSentBack ? '✓' : '⏳'}</span>
                    Workshop Controller
                  </div>
                )}
                {activeQuote.sendToTechnician && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                    background: activeQuote.technicianSentBack ? '#ecfdf3' : '#f8fafc',
                    border: `1px solid ${activeQuote.technicianSentBack ? '#abefc6' : '#e4e7ec'}`,
                    borderRadius: 8, padding: '5px 10px',
                    color: activeQuote.technicianSentBack ? '#027a48' : '#667085',
                  }}>
                    <span>{activeQuote.technicianSentBack ? '✓' : '⏳'}</span>
                    Technician
                  </div>
                )}
                {activeQuote.sendToPartsInterpreter && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600,
                    background: activeQuote.partsInterpreterSentBack ? '#ecfdf3' : '#f8fafc',
                    border: `1px solid ${activeQuote.partsInterpreterSentBack ? '#abefc6' : '#e4e7ec'}`,
                    borderRadius: 8, padding: '5px 10px',
                    color: activeQuote.partsInterpreterSentBack ? '#027a48' : '#667085',
                  }}>
                    <span>{activeQuote.partsInterpreterSentBack ? '✓' : '⏳'}</span>
                    Parts Interpreter
                  </div>
                )}
              </div>
            )}

            <div className="quoteRoutingGrid">
              <div className="routingRow">
                <label className="routingCheck">
                  <input type="checkbox" checked={form.sendToWorkshopController}
                    onChange={e => { setForm(p => ({ ...p, sendToWorkshopController: e.target.checked })); if (e.target.checked) loadRoleUsers() }} />
                  <div><strong>Workshop Controller</strong><span>Assign repair route and estimated bay time</span></div>
                </label>
                {form.sendToWorkshopController && (
                  <select className="routingUserSelect" value={assigned.controllerId} onChange={e => setAssigned(p => ({ ...p, controllerId: e.target.value }))}>
                    <option value="">— Any controller (broadcast) —</option>
                    {roleUsers.controllers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                )}
              </div>
              <div className="routingRow">
                <label className="routingCheck">
                  <input type="checkbox" checked={form.sendToTechnician}
                    onChange={e => { setForm(p => ({ ...p, sendToTechnician: e.target.checked })); if (e.target.checked) loadRoleUsers() }} />
                  <div><strong>Technician</strong><span>Add diagnosis, repair time and media notes</span></div>
                </label>
                {form.sendToTechnician && (
                  <select className="routingUserSelect" value={assigned.technicianId} onChange={e => setAssigned(p => ({ ...p, technicianId: e.target.value }))}>
                    <option value="">— Any technician (broadcast) —</option>
                    {roleUsers.technicians.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                )}
              </div>
              <div className="routingRow">
                <label className="routingCheck">
                  <input type="checkbox" checked={form.sendToPartsInterpreter}
                    onChange={e => { setForm(p => ({ ...p, sendToPartsInterpreter: e.target.checked })); if (e.target.checked) loadRoleUsers() }} />
                  <div><strong>Parts Interpreter</strong><span>Add parts to replace or repair with availability</span></div>
                </label>
                {form.sendToPartsInterpreter && (
                  <select className="routingUserSelect" value={assigned.partsId} onChange={e => setAssigned(p => ({ ...p, partsId: e.target.value }))}>
                    <option value="">— Any parts interpreter (broadcast) —</option>
                    {roleUsers.parts.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                  </select>
                )}
              </div>
            </div>
          </section>
        )
      })()}

      <section className="panel" style={isSentToCustomer ? { opacity: 0.55, pointerEvents: 'none' } : {}}>
        <div className="sectionHeader">
          <div>
            <h3>Send for Customer Approval</h3>
            <p>{isSentToCustomer ? `Sent — awaiting customer response (${activeQuote.status})` : 'Approval link sent through WhatsApp or email.'}</p>
          </div>
          {!isSentToCustomer && (
            <div className="rowActions notificationActions">
              <button className="primaryBtn" onClick={sendToCustomer} disabled={sending}>
                <MessageCircle size={16} /> Send to Customer
              </button>
              <button className="softBtn" onClick={sendToCustomer} disabled={sending}>
                <Mail size={16} /> Via Email
              </button>
            </div>
          )}
        </div>
        {!isSentToCustomer && (
          <div className="infoStrip">
            Customer receives a secure approval link with quote details, line items, approve/reject buttons and digital signature.
          </div>
        )}
        {isSentToCustomer && (
          <div style={{ background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 10, padding: '10px 14px', fontSize: 13, fontWeight: 600, color: '#027a48' }}>
            ✓ Sent to customer — status: <strong>{activeQuote.status}</strong>
          </div>
        )}
      </section>

      <div style={{ display: 'flex', gap: 10, paddingBottom: 16 }}>
        <button className="secondaryBtn" onClick={() => { setView('list'); loadQuotations() }}>← Back to list</button>
      </div>
    </div>
  )
  }

  // List view
  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Quotation Workflow</p>
        <h2>Create Repair Quotation</h2>
        <p>Build quotations, request inputs from workshop teams, then send for customer approval.</p>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <h3>All Quotations</h3>
            <p>{loadingList ? 'Loading…' : `${quotations.length} quotation${quotations.length !== 1 ? 's' : ''} in your workshop`}</p>
          </div>
          <button className="primaryBtn" onClick={() => setView('create')}>
            <Plus size={16} /> New Quotation
          </button>
        </div>

        <div className="tableWrap">
          {loadingList ? (
            <p style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
          ) : quotations.length === 0 ? (
            <p style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>No quotations yet. Create your first quotation.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Quote #</th><th>Customer</th><th>Vehicle</th><th>Repair Type</th><th>Total</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                {quotations.map(q => (
                  <tr key={q.id} style={{ cursor: 'pointer' }} onClick={() => openQuote(q.id)}>
                    <td><strong>{q.quoteNumber}</strong></td>
                    <td>{q.customer?.name}</td>
                    <td>{q.vehicle?.registrationNo}</td>
                    <td>{q.repairType}</td>
                    <td>{q.totalEstimate ? `${q.currency} ${parseFloat(q.totalEstimate).toLocaleString()}` : '—'}</td>
                    <td><span className={`statusPill ${statusColor[q.status] || 'amber'}`}>{q.status}</span></td>
                    <td><button className="softBtn" onClick={e => { e.stopPropagation(); openQuote(q.id) }}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  )
}

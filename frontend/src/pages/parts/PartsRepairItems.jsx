import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, Package, Plus, Send } from 'lucide-react'
import { apiFetch } from '../../utils/api'

const AVAILABILITY = ['InStock', 'AvailableNow', 'OrderRequired', 'Backordered', 'NotAvailable']
const AVAIL_COLOR  = { InStock: 'green', AvailableNow: 'green', OrderRequired: 'amber', Backordered: 'amber', NotAvailable: 'red' }

export default function PartsRepairItems() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [showOptionForm, setShowOptionForm] = useState(null)
  const [saving,   setSaving]   = useState(null)
  const [submitting, setSubmitting] = useState(null)
  const [msgs,     setMsgs]     = useState({})
  const [errs,     setErrs]     = useState({})

  const emptyOptionForm = {
    partName: '', brand: '', partNumber: '', supplierName: '', availabilityStatus: 'InStock',
    availableQuantity: '', leadTimeDays: '', leadTimeHours: '', unitCost: '', sellingPrice: '',
    quantity: '1', currency: 'ZAR', expectedAvailableAt: '', recommended: false, notes: '',
  }
  const [optionForms, setOptionForms] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await apiFetch('/parts/repair-items')
      const data = await res.json()
      if (data.success) setItems(data.data?.items || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function getOptionForm(id) { return optionForms[id] || { ...emptyOptionForm } }
  function setOptionField(id, key, val) { setOptionForms(prev => ({ ...prev, [id]: { ...getOptionForm(id), [key]: val } })) }

  async function handleAddOption(itemId) {
    setSaving(itemId); setErrs(prev => ({ ...prev, [itemId]: '' }))
    try {
      const f = getOptionForm(itemId)
      if (!f.partName.trim()) { setErrs(prev => ({ ...prev, [itemId]: 'Part name is required' })); setSaving(null); return }
      if (!f.unitCost || !f.sellingPrice) { setErrs(prev => ({ ...prev, [itemId]: 'Unit cost and selling price are required' })); setSaving(null); return }
      const res  = await apiFetch(`/parts/repair-items/${itemId}/options`, {
        method: 'POST',
        body: JSON.stringify({
          ...f,
          availableQuantity: f.availableQuantity || undefined,
          leadTimeDays: f.leadTimeDays || undefined,
          leadTimeHours: f.leadTimeHours || undefined,
          expectedAvailableAt: f.expectedAvailableAt || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMsgs(prev => ({ ...prev, [itemId]: 'Parts option added.' }))
        setShowOptionForm(null)
        setOptionForms(prev => ({ ...prev, [itemId]: { ...emptyOptionForm } }))
        load()
      } else {
        setErrs(prev => ({ ...prev, [itemId]: data.message || 'Failed to add option.' }))
      }
    } catch { setErrs(prev => ({ ...prev, [itemId]: 'Network error.' })) }
    finally { setSaving(null) }
  }

  async function handleSelect(itemId, optionId, selected) {
    try {
      await apiFetch(`/parts/repair-items/${itemId}/options/${optionId}/select`, {
        method: 'PATCH', body: JSON.stringify({ selected }),
      })
      load()
    } catch { /* ignore */ }
  }

  async function handleSubmit(itemId) {
    setSubmitting(itemId); setErrs(prev => ({ ...prev, [itemId]: '' }))
    try {
      const res  = await apiFetch(`/parts/repair-items/${itemId}/submit`, { method: 'POST', body: JSON.stringify({}) })
      const data = await res.json()
      if (data.success) {
        setMsgs(prev => ({ ...prev, [itemId]: 'Parts input submitted to Front Desk.' }))
        load()
      } else {
        setErrs(prev => ({ ...prev, [itemId]: data.message || 'Failed to submit.' }))
      }
    } catch { setErrs(prev => ({ ...prev, [itemId]: 'Network error.' })) }
    finally { setSubmitting(null) }
  }

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Parts Interpreter</p>
        <h2>Repair Items — Parts Check</h2>
        <p>For each repair item, add parts options with brand, availability, and lead time. Submit when done.</p>
      </section>

      {loading ? (
        <section className="panel"><p style={{ color: 'var(--muted)' }}>Loading…</p></section>
      ) : items.length === 0 ? (
        <section className="panel">
          <div className="portalEmptyState"><Package size={44} /><p>No repair items requiring parts input right now.</p></div>
        </section>
      ) : (
        items.map(item => {
          const isExp    = expanded === item.id
          const isSubmitted = !!item.partsInputSubmittedAt
          const f        = getOptionForm(item.id)

          return (
            <section key={item.id} className="panel" style={{ padding: 0 }}>
              <div className="riItemHeader" style={{ padding: '14px 20px', cursor: 'pointer' }} onClick={() => setExpanded(isExp ? null : item.id)}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className={`pill ${isSubmitted ? 'green' : 'amber'}`} style={{ fontSize: 11 }}>{isSubmitted ? 'Submitted' : 'Pending'}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{item.jobCard?.jobNumber} · {item.vehicle?.makeModel}</span>
                  </div>
                </div>
                {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              </div>

              {isExp && (
                <div style={{ padding: '0 20px 20px' }}>
                  {msgs[item.id] && <div style={{ background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 10, padding: '8px 12px', color: '#027a48', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{msgs[item.id]}</div>}
                  {errs[item.id] && <div style={{ background: '#fff8f7', border: '1px solid #fda29b', borderRadius: 10, padding: '8px 12px', color: '#b91c1c', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{errs[item.id]}</div>}

                  {item.customerComplaint && <div className="infoStrip" style={{ marginBottom: 12 }}><strong>Customer complaint:</strong> {item.customerComplaint}</div>}

                  {/* Existing options */}
                  {item.partsOptions?.length > 0 && (
                    <div className="tableWrap" style={{ marginBottom: 14 }}>
                      <table>
                        <thead><tr><th>Part</th><th>Brand</th><th>Availability</th><th>Lead Time</th><th>Selling Price</th><th>Qty</th><th>Total</th><th>Action</th></tr></thead>
                        <tbody>
                          {item.partsOptions.map(opt => (
                            <tr key={opt.id} style={{ background: opt.selected ? '#f0fdf4' : undefined }}>
                              <td><strong>{opt.partName}</strong>{opt.partNumber ? <span style={{ color: 'var(--muted)', fontSize: 11, marginLeft: 4 }}>{opt.partNumber}</span> : null}</td>
                              <td>{opt.brand || '—'}</td>
                              <td><span className={`pill ${AVAIL_COLOR[opt.availabilityStatus] || 'soft'}`} style={{ fontSize: 11 }}>{opt.availabilityStatus}</span></td>
                              <td style={{ whiteSpace: 'nowrap' }}>{opt.leadTimeDays ? `${opt.leadTimeDays}d` : ''}{opt.leadTimeHours ? ` ${opt.leadTimeHours}h` : ''}{!opt.leadTimeDays && !opt.leadTimeHours ? '—' : ''}</td>
                              <td>{opt.currency} {Number(opt.sellingPrice).toLocaleString()}</td>
                              <td>{opt.quantity}</td>
                              <td>{opt.currency} {Number(opt.totalCost).toLocaleString()}</td>
                              <td>
                                <button className={`softBtn ${opt.selected ? 'green' : ''}`} style={{ fontSize: 11 }} onClick={() => handleSelect(item.id, opt.id, !opt.selected)}>
                                  {opt.selected ? <><CheckCircle2 size={12} /> Selected</> : 'Select'}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Add option form */}
                  {!isSubmitted && showOptionForm === item.id ? (
                    <div style={{ background: '#f8faff', borderRadius: 12, padding: 16, marginBottom: 12 }}>
                      <strong style={{ fontSize: 14 }}>Add Parts Option</strong>
                      <div className="formGrid adminForm" style={{ marginTop: 10 }}>
                        <label>Part Name * <input value={f.partName} onChange={e => setOptionField(item.id, 'partName', e.target.value)} placeholder="e.g. Apollo Tyre" /></label>
                        <label>Brand <input value={f.brand} onChange={e => setOptionField(item.id, 'brand', e.target.value)} /></label>
                        <label>Part Number <input value={f.partNumber} onChange={e => setOptionField(item.id, 'partNumber', e.target.value)} /></label>
                        <label>Supplier <input value={f.supplierName} onChange={e => setOptionField(item.id, 'supplierName', e.target.value)} /></label>
                        <label>Availability *
                          <select value={f.availabilityStatus} onChange={e => setOptionField(item.id, 'availabilityStatus', e.target.value)}>
                            {AVAILABILITY.map(a => <option key={a} value={a}>{a}</option>)}
                          </select>
                        </label>
                        <label>Lead Time (days) <input type="number" min={0} value={f.leadTimeDays} onChange={e => setOptionField(item.id, 'leadTimeDays', e.target.value)} /></label>
                        <label>Lead Time (hours) <input type="number" min={0} value={f.leadTimeHours} onChange={e => setOptionField(item.id, 'leadTimeHours', e.target.value)} /></label>
                        <label>Unit Cost * <input type="number" min={0} step={0.01} value={f.unitCost} onChange={e => setOptionField(item.id, 'unitCost', e.target.value)} /></label>
                        <label>Selling Price * <input type="number" min={0} step={0.01} value={f.sellingPrice} onChange={e => setOptionField(item.id, 'sellingPrice', e.target.value)} /></label>
                        <label>Quantity <input type="number" min={1} value={f.quantity} onChange={e => setOptionField(item.id, 'quantity', e.target.value)} /></label>
                        <label className="wide">Notes <textarea rows={2} value={f.notes} onChange={e => setOptionField(item.id, 'notes', e.target.value)} /></label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <input type="checkbox" checked={f.recommended} onChange={e => setOptionField(item.id, 'recommended', e.target.checked)} />
                          Recommended option
                        </label>
                      </div>
                      <div className="rowActions" style={{ marginTop: 10 }}>
                        <button className="primaryBtn" onClick={() => handleAddOption(item.id)} disabled={saving === item.id}>{saving === item.id ? 'Adding…' : 'Add Option'}</button>
                        <button className="softBtn" onClick={() => setShowOptionForm(null)}>Cancel</button>
                      </div>
                    </div>
                  ) : null}

                  {!isSubmitted && (
                    <div className="rowActions">
                      <button className="softBtn" onClick={() => setShowOptionForm(item.id)}><Plus size={15} /> Add Parts Option</button>
                      {item.partsOptions?.length > 0 && (
                        <button className="softBtn" onClick={() => handleSubmit(item.id)} disabled={submitting === item.id} style={{ color: 'var(--teal)' }}>
                          <Send size={15} /> {submitting === item.id ? 'Submitting…' : 'Submit to Front Desk'}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          )
        })
      )}
    </div>
  )
}

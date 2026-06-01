import { useEffect, useState, useCallback } from 'react'
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Clock, Send, Wrench } from 'lucide-react'
import { apiFetch } from '../../utils/api'

const STATUS_COLOR = {
  AwaitingTechInput: 'amber', InputsComplete: 'green', QuotationBuilt: 'blue',
  CustomerApproved: 'green', InProgress: 'amber', Completed: 'green',
}

export default function TechnicianRepairItems() {
  const [items,    setItems]    = useState([])
  const [loading,  setLoading]  = useState(true)
  const [expanded, setExpanded] = useState(null)
  const [forms,    setForms]    = useState({})
  const [saving,   setSaving]   = useState(null)
  const [finalizing, setFinalizing] = useState(null)
  const [msgs,     setMsgs]     = useState({})
  const [errs,     setErrs]     = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await apiFetch('/technician/repair-items')
      const data = await res.json()
      if (data.success) {
        const its = data.data?.items || []
        setItems(its)
        // Pre-fill forms from existing inputs
        const f = {}
        for (const i of its) {
          const myInput = i.inputs?.[0]
          f[i.id] = {
            diagnosisNotes: myInput?.diagnosisNotes || '',
            labourHours: myInput?.labourHours ? String(myInput.labourHours) : '',
            labourCost: myInput?.labourCost ? String(myInput.labourCost) : '',
            partsRequired: myInput?.partsRequired || false,
            estimatedDurationMinutes: myInput?.estimatedDurationMinutes ? String(myInput.estimatedDurationMinutes) : '',
            technicianRisk: myInput?.technicianRisk || '',
            safetyFlag: myInput?.safetyFlag || false,
            additionalWorkFlag: myInput?.additionalWorkFlag || false,
            notes: myInput?.notes || '',
          }
        }
        setForms(f)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  function getForm(id) {
    return forms[id] || { diagnosisNotes: '', labourHours: '', labourCost: '', partsRequired: false, estimatedDurationMinutes: '', technicianRisk: '', safetyFlag: false, additionalWorkFlag: false, notes: '' }
  }

  function setField(id, key, val) {
    setForms(prev => ({ ...prev, [id]: { ...getForm(id), [key]: val } }))
  }

  async function handleSave(itemId) {
    setSaving(itemId); setErrs(prev => ({ ...prev, [itemId]: '' }))
    try {
      const f = getForm(itemId)
      const res  = await apiFetch(`/technician/repair-items/${itemId}/input`, {
        method: 'POST',
        body: JSON.stringify({ ...f, labourHours: f.labourHours || undefined, labourCost: f.labourCost || undefined, estimatedDurationMinutes: f.estimatedDurationMinutes || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setMsgs(prev => ({ ...prev, [itemId]: 'Input saved.' }))
      } else {
        setErrs(prev => ({ ...prev, [itemId]: data.message || 'Failed to save.' }))
      }
    } catch { setErrs(prev => ({ ...prev, [itemId]: 'Network error.' })) }
    finally { setSaving(null) }
  }

  async function handleFinalize(itemId) {
    if (!window.confirm('Submit this input to Front Desk? You cannot edit it after submission.')) return
    setFinalizing(itemId); setErrs(prev => ({ ...prev, [itemId]: '' }))
    try {
      const res  = await apiFetch(`/technician/repair-items/${itemId}/finalize`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setMsgs(prev => ({ ...prev, [itemId]: 'Input submitted to Front Desk.' }))
        load()
      } else {
        setErrs(prev => ({ ...prev, [itemId]: data.message || 'Failed to submit.' }))
      }
    } catch { setErrs(prev => ({ ...prev, [itemId]: 'Network error.' })) }
    finally { setFinalizing(null) }
  }

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Technician</p>
        <h2>Assigned Repair Items</h2>
        <p>Review each repair item sent to you. Provide diagnosis, labour estimate, and parts notes. Submit when complete.</p>
      </section>

      {loading ? (
        <section className="panel"><p style={{ color: 'var(--muted)' }}>Loading repair items…</p></section>
      ) : items.length === 0 ? (
        <section className="panel">
          <div className="portalEmptyState">
            <Wrench size={44} />
            <p>No repair items assigned to you. Items will appear here when Front Desk sends them to you.</p>
          </div>
        </section>
      ) : (
        items.map(item => {
          const f = getForm(item.id)
          const isExpanded = expanded === item.id
          const myInput = item.inputs?.[0]
          const submitted = myInput?.status === 'Submitted'

          return (
            <section key={item.id} className="panel" style={{ padding: 0 }}>
              <div className="riItemHeader" style={{ padding: '14px 20px', cursor: 'pointer' }} onClick={() => setExpanded(isExpanded ? null : item.id)}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className={`pill ${STATUS_COLOR[item.status] || 'soft'}`} style={{ fontSize: 11 }}>{item.status}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{item.jobCard?.jobNumber}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{item.vehicle?.makeModel} {item.vehicle?.registrationNo ? `(${item.vehicle.registrationNo})` : ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {submitted && <span className="pill green" style={{ fontSize: 11 }}>Submitted</span>}
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {isExpanded && (
                <div style={{ padding: '0 20px 20px' }}>
                  {item.customerComplaint && (
                    <div className="infoStrip" style={{ marginBottom: 14 }}>
                      <AlertTriangle size={14} /> <strong>Customer complaint:</strong> {item.customerComplaint}
                    </div>
                  )}

                  {msgs[item.id] && <div style={{ background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 10, padding: '8px 12px', color: '#027a48', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{msgs[item.id]}</div>}
                  {errs[item.id] && <div style={{ background: '#fff8f7', border: '1px solid #fda29b', borderRadius: 10, padding: '8px 12px', color: '#b91c1c', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{errs[item.id]}</div>}

                  {submitted ? (
                    <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 14 }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--green)', verticalAlign: 'middle', marginRight: 6 }} />
                      Input submitted. Awaiting Front Desk review.
                    </div>
                  ) : (
                    <div className="formGrid adminForm">
                      <label className="wide">
                        Diagnosis Notes
                        <textarea placeholder="Describe your findings…" rows={3} value={f.diagnosisNotes} onChange={e => setField(item.id, 'diagnosisNotes', e.target.value)} disabled={submitted} />
                      </label>
                      <label>
                        Labour Hours
                        <input type="number" min={0} step={0.5} placeholder="e.g. 3.5" value={f.labourHours} onChange={e => setField(item.id, 'labourHours', e.target.value)} disabled={submitted} />
                      </label>
                      <label>
                        Labour Cost
                        <input type="number" min={0} placeholder="0.00" value={f.labourCost} onChange={e => setField(item.id, 'labourCost', e.target.value)} disabled={submitted} />
                      </label>
                      <label>
                        Estimated Duration (minutes)
                        <input type="number" min={0} placeholder="e.g. 240" value={f.estimatedDurationMinutes} onChange={e => setField(item.id, 'estimatedDurationMinutes', e.target.value)} disabled={submitted} />
                      </label>
                      <label>
                        Technical Risk
                        <input placeholder="e.g. corrosion found, bracket damaged" value={f.technicianRisk} onChange={e => setField(item.id, 'technicianRisk', e.target.value)} disabled={submitted} />
                      </label>
                      <label className="wide">
                        Notes
                        <textarea placeholder="Any additional notes for Front Desk…" rows={2} value={f.notes} onChange={e => setField(item.id, 'notes', e.target.value)} disabled={submitted} />
                      </label>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', gridColumn: '1/-1' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                          <input type="checkbox" checked={f.partsRequired} onChange={e => setField(item.id, 'partsRequired', e.target.checked)} />
                          Parts required
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                          <input type="checkbox" checked={f.safetyFlag} onChange={e => setField(item.id, 'safetyFlag', e.target.checked)} />
                          Safety concern
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                          <input type="checkbox" checked={f.additionalWorkFlag} onChange={e => setField(item.id, 'additionalWorkFlag', e.target.checked)} />
                          Additional work found
                        </label>
                      </div>
                    </div>
                  )}

                  {!submitted && (
                    <div className="rowActions" style={{ marginTop: 12 }}>
                      <button className="primaryBtn" onClick={() => handleSave(item.id)} disabled={saving === item.id}>
                        {saving === item.id ? 'Saving…' : 'Save Draft'}
                      </button>
                      <button className="softBtn" onClick={() => handleFinalize(item.id)} disabled={finalizing === item.id} style={{ color: 'var(--teal)' }}>
                        <Send size={15} /> {finalizing === item.id ? 'Submitting…' : 'Submit to Front Desk'}
                      </button>
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

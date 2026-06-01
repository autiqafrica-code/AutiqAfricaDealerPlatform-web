import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, ChevronDown, ChevronUp, GitBranch, Send, Sliders } from 'lucide-react'
import { apiFetch } from '../../utils/api'

const STATUS_COLOR = {
  AwaitingTechInput: 'amber', InputsComplete: 'green', QuotationBuilt: 'blue',
  CustomerApproved: 'green', InProgress: 'amber', Completed: 'green',
  SentToController: 'amber',
}

export default function WorkshopRepairItems() {
  const [items,      setItems]      = useState([])
  const [loading,    setLoading]    = useState(true)
  const [expanded,   setExpanded]   = useState(null)
  const [techMap,    setTechMap]    = useState({})
  const [forms,      setForms]      = useState({})
  const [saving,     setSaving]     = useState(null)
  const [msgs,       setMsgs]       = useState({})
  const [errs,       setErrs]       = useState({})

  const emptyForm = {
    bayRequired: '', repairRoute: '', canRunInParallel: true, sequenceOrder: '',
    labourHours: '', estimatedDurationMinutes: '', costImpact: '', workshopNotes: '', notes: '', technicianId: '',
  }

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await apiFetch('/workshop-controller/repair-items')
      const data = await res.json()
      if (data.success) {
        const its = data.data?.items || []
        setItems(its)
        const f = {}
        for (const i of its) {
          const myInput = i.inputs?.[0]
          f[i.id] = {
            bayRequired: myInput?.bayRequired || '',
            repairRoute: myInput?.repairRoute || '',
            canRunInParallel: myInput?.canRunInParallel !== false,
            sequenceOrder: i.sequenceOrder != null ? String(i.sequenceOrder) : '',
            labourHours: myInput?.labourHours != null ? String(myInput.labourHours) : '',
            estimatedDurationMinutes: myInput?.estimatedDurationMinutes != null ? String(myInput.estimatedDurationMinutes) : '',
            costImpact: myInput?.costImpact != null ? String(myInput.costImpact) : '',
            workshopNotes: myInput?.workshopNotes || '',
            notes: myInput?.notes || '',
            technicianId: '',
          }
        }
        setForms(f)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { load() }, [load])

  async function loadTechs(itemId) {
    if (techMap[itemId]) return
    try {
      const res  = await apiFetch(`/workshop-controller/repair-items/${itemId}`)
      const data = await res.json()
      if (data.success) {
        setTechMap(prev => ({ ...prev, [itemId]: data.data?.technicians || [] }))
      }
    } catch { /* ignore */ }
  }

  function getForm(id) { return forms[id] || { ...emptyForm } }
  function setField(id, key, val) { setForms(prev => ({ ...prev, [id]: { ...getForm(id), [key]: val } })) }

  function handleExpand(itemId) {
    const next = expanded === itemId ? null : itemId
    setExpanded(next)
    if (next) loadTechs(next)
  }

  async function handleSubmit(itemId) {
    setSaving(itemId); setErrs(prev => ({ ...prev, [itemId]: '' }))
    try {
      const f = getForm(itemId)
      const res  = await apiFetch(`/workshop-controller/repair-items/${itemId}/planning`, {
        method: 'POST',
        body: JSON.stringify({
          bayRequired:             f.bayRequired || undefined,
          repairRoute:             f.repairRoute || undefined,
          canRunInParallel:        f.canRunInParallel,
          sequenceOrder:           f.sequenceOrder || undefined,
          labourHours:             f.labourHours || undefined,
          estimatedDurationMinutes: f.estimatedDurationMinutes || undefined,
          costImpact:              f.costImpact || undefined,
          workshopNotes:           f.workshopNotes || undefined,
          notes:                   f.notes || undefined,
          technicianId:            f.technicianId || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMsgs(prev => ({ ...prev, [itemId]: 'Planning input submitted to Front Desk.' }))
        load()
      } else {
        setErrs(prev => ({ ...prev, [itemId]: data.message || 'Failed to submit.' }))
      }
    } catch { setErrs(prev => ({ ...prev, [itemId]: 'Network error.' })) }
    finally { setSaving(null) }
  }

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Workshop Controller</p>
        <h2>Repair Item Planning</h2>
        <p>For each repair item sent to you, set bay allocation, repair route, parallel scheduling, and estimated duration. Submit when done.</p>
      </section>

      {loading ? (
        <section className="panel"><p style={{ color: 'var(--muted)' }}>Loading repair items…</p></section>
      ) : items.length === 0 ? (
        <section className="panel">
          <div className="portalEmptyState">
            <Sliders size={44} />
            <p>No repair items awaiting controller planning right now.</p>
          </div>
        </section>
      ) : (
        items.map(item => {
          const isExp       = expanded === item.id
          const myInput     = item.inputs?.[0]
          const submitted   = myInput?.status === 'Submitted'
          const f           = getForm(item.id)
          const techs       = techMap[item.id] || []

          return (
            <section key={item.id} className="panel" style={{ padding: 0 }}>
              <div className="riItemHeader" style={{ padding: '14px 20px', cursor: 'pointer' }} onClick={() => handleExpand(item.id)}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <span className={`pill ${STATUS_COLOR[item.status] || 'soft'}`} style={{ fontSize: 11 }}>{item.status}</span>
                  <div>
                    <strong>{item.title}</strong>
                    <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{item.jobCard?.jobNumber}</span>
                    <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{item.vehicle?.makeModel}{item.vehicle?.registrationNo ? ` (${item.vehicle.registrationNo})` : ''}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {submitted && <span className="pill green" style={{ fontSize: 11 }}>Submitted</span>}
                  {isExp ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {isExp && (
                <div style={{ padding: '0 20px 20px' }}>
                  {msgs[item.id] && <div style={{ background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 10, padding: '8px 12px', color: '#027a48', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{msgs[item.id]}</div>}
                  {errs[item.id] && <div style={{ background: '#fff8f7', border: '1px solid #fda29b', borderRadius: 10, padding: '8px 12px', color: '#b91c1c', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>{errs[item.id]}</div>}

                  {item.customerComplaint && (
                    <div className="infoStrip" style={{ marginBottom: 14 }}>
                      <strong>Customer complaint:</strong> {item.customerComplaint}
                    </div>
                  )}

                  {submitted ? (
                    <div style={{ padding: '12px 0', color: 'var(--muted)', fontSize: 14 }}>
                      <CheckCircle2 size={16} style={{ color: 'var(--green)', verticalAlign: 'middle', marginRight: 6 }} />
                      Planning input submitted to Front Desk.
                      {myInput?.bayRequired && <span style={{ marginLeft: 8 }}>Bay: <strong>{myInput.bayRequired}</strong></span>}
                      {myInput?.repairRoute && <span style={{ marginLeft: 8 }}>Route: <strong>{myInput.repairRoute}</strong></span>}
                      {myInput?.estimatedDurationMinutes && <span style={{ marginLeft: 8 }}>Est: <strong>{myInput.estimatedDurationMinutes} min</strong></span>}
                      <span style={{ marginLeft: 8 }}>
                        <GitBranch size={12} style={{ verticalAlign: 'middle' }} />
                        {myInput?.canRunInParallel ? ' Parallel allowed' : ' Sequential only'}
                      </span>
                    </div>
                  ) : (
                    <div className="formGrid adminForm">
                      <label>
                        Bay Allocation
                        <input value={f.bayRequired} onChange={e => setField(item.id, 'bayRequired', e.target.value)} placeholder="e.g. Bay 3" />
                      </label>
                      <label>
                        Repair Route
                        <input value={f.repairRoute} onChange={e => setField(item.id, 'repairRoute', e.target.value)} placeholder="e.g. Engine strip and rebuild" />
                      </label>
                      <label>
                        Labour Hours
                        <input type="number" min={0} step={0.5} value={f.labourHours} onChange={e => setField(item.id, 'labourHours', e.target.value)} placeholder="e.g. 4.5" />
                      </label>
                      <label>
                        Estimated Duration (minutes)
                        <input type="number" min={0} value={f.estimatedDurationMinutes} onChange={e => setField(item.id, 'estimatedDurationMinutes', e.target.value)} placeholder="e.g. 270" />
                      </label>
                      <label>
                        Cost Impact
                        <input type="number" min={0} step={0.01} value={f.costImpact} onChange={e => setField(item.id, 'costImpact', e.target.value)} placeholder="0.00" />
                      </label>
                      <label>
                        Sequence Order
                        <input type="number" min={1} value={f.sequenceOrder} onChange={e => setField(item.id, 'sequenceOrder', e.target.value)} placeholder="e.g. 1, 2, 3…" />
                      </label>
                      {techs.length > 0 && (
                        <label>
                          Assign Technician (optional)
                          <select value={f.technicianId} onChange={e => setField(item.id, 'technicianId', e.target.value)}>
                            <option value="">— Keep existing —</option>
                            {techs.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </label>
                      )}
                      <label className="wide">
                        Workshop Notes
                        <textarea rows={2} value={f.workshopNotes} onChange={e => setField(item.id, 'workshopNotes', e.target.value)} placeholder="Internal notes for the workshop floor…" />
                      </label>
                      <label className="wide">
                        Notes for Front Desk
                        <textarea rows={2} value={f.notes} onChange={e => setField(item.id, 'notes', e.target.value)} placeholder="Any advisory for Front Desk…" />
                      </label>
                      <div style={{ display: 'flex', gap: 16, alignItems: 'center', gridColumn: '1/-1' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 }}>
                          <input type="checkbox" checked={f.canRunInParallel} onChange={e => setField(item.id, 'canRunInParallel', e.target.checked)} />
                          <GitBranch size={13} /> Can run in parallel with other repairs
                        </label>
                      </div>
                    </div>
                  )}

                  {!submitted && (
                    <div className="rowActions" style={{ marginTop: 12 }}>
                      <button className="softBtn" onClick={() => handleSubmit(item.id)} disabled={saving === item.id} style={{ color: 'var(--teal)' }}>
                        <Send size={15} /> {saving === item.id ? 'Submitting…' : 'Submit to Front Desk'}
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

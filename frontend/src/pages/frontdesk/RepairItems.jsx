import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Car, CheckCircle2, ChevronDown, ChevronRight, ChevronUp,
  Clock, FilePlus2, Package, Plus, Send, Settings2, Trash2, Wrench,
} from 'lucide-react'
import { apiFetch } from '../../utils/api'

const STATUS_COLOR = {
  Pending: 'soft', AwaitingTechInput: 'amber', AwaitingPartsInput: 'amber',
  AwaitingControllerInput: 'amber', InputsComplete: 'blue', QuotationBuilt: 'blue',
  CustomerApproved: 'green', CustomerRejected: 'red', InProgress: 'amber',
  Completed: 'green', Cancelled: 'soft', Skipped: 'soft',
}

const CATEGORIES = ['Mechanical', 'Electrical', 'Body & Panel', 'Paint', 'Tyres & Wheels', 'Brakes', 'Suspension', 'AC & Cooling', 'Diagnostic', 'Maintenance', 'Other']
const PRIORITIES  = [{ value: 'Red', label: 'Red — Critical' }, { value: 'Amber', label: 'Amber — Standard' }, { value: 'Green', label: 'Green — Low' }]

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function RepairItems() {
  const [params] = useSearchParams()
  const navigate  = useNavigate()
  const jobId     = params.get('jobId')

  const [job,        setJob]        = useState(null)
  const [items,      setItems]      = useState([])
  const [timeSummary, setTimeSummary] = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [expanded,   setExpanded]   = useState(null)
  const [showForm,   setShowForm]   = useState(false)
  const [saving,     setSaving]     = useState(false)
  const [actionMsg,  setActionMsg]  = useState('')
  const [actionErr,  setActionErr]  = useState('')
  const [building,   setBuilding]   = useState(false)

  const [form, setForm] = useState({
    title: '', description: '', category: '', customerComplaint: '',
    priority: 'Amber', requiresTechnicianInput: false, requiresPartsInput: false,
    requiresControllerInput: false, estimatedDurationMinutes: '', notes: '',
    isParallelAllowed: true,
  })
  const [formErrors, setFormErrors] = useState({})

  // Dispatch modals
  const [dispatching, setDispatching]   = useState(null)  // { itemId, type }
  const [dispatchId,  setDispatchId]    = useState('')
  const [technicians, setTechnicians]   = useState([])
  const [controllers, setControllers]   = useState([])
  const [partsUsers,  setPartsUsers]    = useState([])

  const load = useCallback(async () => {
    if (!jobId) return
    setLoading(true)
    try {
      const [jobRes, itemsRes, timeRes] = await Promise.all([
        apiFetch(`/front-desk/jobs/${jobId}`).then(r => r.json()),
        apiFetch(`/front-desk/repair-items/jobs/${jobId}`).then(r => r.json()),
        apiFetch(`/front-desk/repair-items/jobs/${jobId}/time-summary`).then(r => r.json()),
      ])
      if (jobRes.success)  setJob(jobRes.data?.job || null)
      if (itemsRes.success) { setItems(itemsRes.data?.items || []); setTimeSummary(itemsRes.data) }
      if (timeRes.success)  setTimeSummary(timeRes.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }, [jobId])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (!job) return
    const { workshopId } = job
    // Load role users
    apiFetch('/users?limit=100').then(r => r.json()).then(d => {
      if (!d.success) return
      const users = d.data?.data || []
      setTechnicians(users.filter(u => u.role === 'Technician'))
      setControllers(users.filter(u => u.role === 'WorkshopController'))
      setPartsUsers(users.filter(u => u.role === 'PartsInterpreter'))
    }).catch(() => {})
  }, [job])

  function validateForm() {
    const e = {}
    if (!form.title.trim()) e.title = 'Title is required'
    setFormErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleCreate() {
    if (!validateForm()) return
    setSaving(true); setActionErr('')
    try {
      const res  = await apiFetch(`/front-desk/repair-items/jobs/${jobId}`, {
        method: 'POST',
        body: JSON.stringify({
          ...form,
          estimatedDurationMinutes: form.estimatedDurationMinutes ? parseInt(form.estimatedDurationMinutes) : undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setShowForm(false)
        setForm({ title: '', description: '', category: '', customerComplaint: '', priority: 'Amber', requiresTechnicianInput: false, requiresPartsInput: false, requiresControllerInput: false, estimatedDurationMinutes: '', notes: '', isParallelAllowed: true })
        setActionMsg('Repair item added.')
        load()
      } else {
        setActionErr(data.message || 'Failed to add repair item.')
      }
    } catch { setActionErr('Network error.') }
    finally { setSaving(false) }
  }

  async function handleDelete(id) {
    if (!window.confirm('Remove this repair item?')) return
    try {
      const res  = await apiFetch(`/front-desk/repair-items/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (data.success) { setActionMsg('Repair item removed.'); load() }
      else setActionErr(data.message || 'Failed to remove.')
    } catch { setActionErr('Network error.') }
  }

  async function handleDispatch() {
    if (!dispatching) return
    const { itemId, type } = dispatching
    setActionErr('')
    try {
      const endpoint = type === 'tech' ? 'send-to-technician' : type === 'parts' ? 'send-to-parts' : 'send-to-controller'
      const bodyKey  = type === 'tech' ? 'technicianId' : type === 'parts' ? 'partsInterpreterId' : 'controllerId'
      const res  = await apiFetch(`/front-desk/repair-items/${itemId}/${endpoint}`, {
        method: 'POST',
        body: JSON.stringify({ [bodyKey]: dispatchId || undefined }),
      })
      const data = await res.json()
      if (data.success) {
        setDispatching(null); setDispatchId('')
        setActionMsg('Repair item dispatched successfully.')
        load()
      } else {
        setActionErr(data.message || 'Failed to dispatch.')
      }
    } catch { setActionErr('Network error.') }
  }

  async function buildQuotation() {
    setBuilding(true); setActionErr(''); setActionMsg('')
    try {
      const res  = await apiFetch(`/front-desk/repair-items/jobs/${jobId}/build-quotation`, { method: 'POST', body: JSON.stringify({}) })
      const data = await res.json()
      if (data.success) {
        setActionMsg(`Quotation built — ${data.data.lineItemsCount} line items, ${job?.quotation?.currency || ''} ${Number(data.data.totalEstimate || 0).toLocaleString()}`)
        load()
      } else {
        setActionErr(data.message || 'Failed to build quotation.')
      }
    } catch { setActionErr('Network error.') }
    finally { setBuilding(false) }
  }

  if (!jobId) return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Front Desk</p>
        <h2>Repair Items</h2>
        <p>No job selected. Go to <a href="/front-desk/post-approval-job">Post-Approval Jobs</a> and open a job to manage repair items.</p>
      </section>
    </div>
  )

  const currency = job?.quotation?.currency || 'ZAR'
  const allInputsComplete = items.length > 0 && items.every(i => ['InputsComplete', 'QuotationBuilt', 'CustomerApproved'].includes(i.status))

  return (
    <div className="pageStack">
      {/* Hero */}
      <section className="panel heroPanel">
        <p className="eyebrow">Front Desk / Multiple Repairs</p>
        <h2>Repair Items</h2>
        {job && (
          <p>
            Job <strong>{job.jobNumber}</strong> &nbsp;·&nbsp; {job.quotation?.customer?.name || '—'} &nbsp;·&nbsp; {job.vehicle?.makeModel} {job.vehicle?.registrationNo ? `(${job.vehicle.registrationNo})` : ''}
          </p>
        )}
      </section>

      {/* Feedback */}
      {(actionMsg || actionErr) && (
        <div style={{ background: actionErr ? '#fff8f7' : '#f0fdf4', border: `1px solid ${actionErr ? '#fda29b' : '#abefc6'}`, borderRadius: 12, padding: '10px 16px', color: actionErr ? '#b91c1c' : '#027a48', fontWeight: 700, fontSize: 13 }}>
          {actionErr || actionMsg}
        </div>
      )}

      {/* Time summary bar */}
      {timeSummary?.totalVehicleMinutes > 0 && (
        <div className="riTimeBanner">
          <Clock size={16} />
          <span>Estimated vehicle repair time: <strong>{timeSummary.totalVehicleDisplay || '—'}</strong></span>
          <span style={{ color: 'var(--muted)', fontSize: 12 }}>(max of parallel repairs)</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="rowActions" style={{ justifyContent: 'space-between' }}>
        <button className="primaryBtn" onClick={() => { setShowForm(f => !f); setActionMsg(''); setActionErr('') }}>
          <Plus size={16} /> Add Repair Item
        </button>
        <div style={{ display: 'flex', gap: 8 }}>
          {allInputsComplete && (
            <button className="softBtn" onClick={buildQuotation} disabled={building} style={{ color: 'var(--teal)' }}>
              <FilePlus2 size={16} /> {building ? 'Building…' : 'Build Quotation'}
            </button>
          )}
          <button className="softBtn" onClick={() => navigate(`/front-desk/post-approval-job?jobId=${jobId}`)}>
            <ChevronRight size={16} /> Back to Job
          </button>
        </div>
      </div>

      {/* Add form */}
      {showForm && (
        <section className="panel">
          <h3 style={{ margin: '0 0 16px' }}>New Repair Item</h3>
          <div className="formGrid adminForm">
            <label className="wide">
              Repair Title *
              <input placeholder="e.g. Tyre Replacement" value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} style={formErrors.title ? { borderColor: '#d92d20' } : undefined} />
              {formErrors.title && <span style={{ color: '#d92d20', fontSize: 12 }}>{formErrors.title}</span>}
            </label>
            <label>
              Category
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                <option value="">Select category</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label>
              Priority
              <select value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
            </label>
            <label className="wide">
              Customer Complaint
              <textarea placeholder="What the customer reported…" value={form.customerComplaint} onChange={e => setForm(p => ({ ...p, customerComplaint: e.target.value }))} rows={2} />
            </label>
            <label className="wide">
              Description / Scope
              <textarea placeholder="Additional details or scope…" value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} rows={2} />
            </label>
            <label>
              Estimated Duration (minutes)
              <input type="number" min={0} placeholder="e.g. 240" value={form.estimatedDurationMinutes} onChange={e => setForm(p => ({ ...p, estimatedDurationMinutes: e.target.value }))} />
            </label>
            <label>
              Can run in parallel?
              <select value={form.isParallelAllowed ? 'yes' : 'no'} onChange={e => setForm(p => ({ ...p, isParallelAllowed: e.target.value === 'yes' }))}>
                <option value="yes">Yes — parallel with other repairs</option>
                <option value="no">No — must be sequential</option>
              </select>
            </label>
          </div>
          <div className="riCheckRow">
            <span style={{ fontWeight: 600, fontSize: 13 }}>Input required from:</span>
            <label className="riCheckLabel">
              <input type="checkbox" checked={form.requiresTechnicianInput} onChange={e => setForm(p => ({ ...p, requiresTechnicianInput: e.target.checked }))} />
              <Wrench size={14} /> Technician
            </label>
            <label className="riCheckLabel">
              <input type="checkbox" checked={form.requiresPartsInput} onChange={e => setForm(p => ({ ...p, requiresPartsInput: e.target.checked }))} />
              <Package size={14} /> Parts Interpreter
            </label>
            <label className="riCheckLabel">
              <input type="checkbox" checked={form.requiresControllerInput} onChange={e => setForm(p => ({ ...p, requiresControllerInput: e.target.checked }))} />
              <Settings2 size={14} /> Workshop Controller
            </label>
          </div>
          <label style={{ display: 'block', marginTop: 12 }}>
            Notes
            <textarea placeholder="Internal notes…" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
          </label>
          <div className="rowActions" style={{ marginTop: 16 }}>
            <button className="primaryBtn" onClick={handleCreate} disabled={saving}>{saving ? 'Saving…' : 'Add Repair Item'}</button>
            <button className="softBtn" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </section>
      )}

      {/* Items list */}
      {loading ? (
        <section className="panel"><p style={{ color: 'var(--muted)' }}>Loading repair items…</p></section>
      ) : items.length === 0 ? (
        <section className="panel">
          <div className="portalEmptyState">
            <Wrench size={44} />
            <p>No repair items yet. Add one above to start building the repair workflow for this job.</p>
          </div>
        </section>
      ) : (
        <section className="panel" style={{ padding: 0 }}>
          {items.map((item, idx) => (
            <RepairItemRow
              key={item.id}
              item={item}
              currency={currency}
              expanded={expanded === item.id}
              onToggle={() => setExpanded(expanded === item.id ? null : item.id)}
              onDelete={() => handleDelete(item.id)}
              onDispatch={(type) => { setDispatching({ itemId: item.id, type }); setDispatchId('') }}
              technicians={technicians}
              controllers={controllers}
              partsUsers={partsUsers}
              isLast={idx === items.length - 1}
            />
          ))}
        </section>
      )}

      {/* Dispatch modal */}
      {dispatching && (
        <div className="riModal" onClick={() => setDispatching(null)}>
          <div className="riModalBox" onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0 }}>
              {dispatching.type === 'tech' ? 'Send to Technician' : dispatching.type === 'parts' ? 'Send to Parts Interpreter' : 'Send to Workshop Controller'}
            </h3>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
              Optionally select a specific staff member to notify, or leave blank to broadcast.
            </p>
            <select value={dispatchId} onChange={e => setDispatchId(e.target.value)}>
              <option value="">— Broadcast to all (no specific assignment) —</option>
              {(dispatching.type === 'tech' ? technicians : dispatching.type === 'parts' ? partsUsers : controllers).map(u => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            {actionErr && <p style={{ color: '#b91c1c', fontSize: 13, marginTop: 8 }}>{actionErr}</p>}
            <div className="rowActions" style={{ marginTop: 16 }}>
              <button className="primaryBtn" onClick={handleDispatch}><Send size={15} /> Send</button>
              <button className="softBtn" onClick={() => setDispatching(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function RepairItemRow({ item, currency, expanded, onToggle, onDelete, onDispatch, technicians, controllers, partsUsers, isLast }) {
  const pillColor = STATUS_COLOR[item.status] || 'soft'
  const techInput   = item.inputs?.find(i => i.roleCode === 'TECHNICIAN')
  const partsInput  = item.inputs?.find(i => i.roleCode === 'PARTS_INTERPRETER')
  const ctrlInput   = item.inputs?.find(i => i.roleCode === 'WORKSHOP_CONTROLLER')
  const selectedPart = item.partsOptions?.find(o => o.selected)

  return (
    <div className={`riItemRow${isLast ? ' last' : ''}`}>
      <div className="riItemHeader" onClick={onToggle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className={`pill ${pillColor}`} style={{ fontSize: 11, padding: '3px 8px', minWidth: 90, textAlign: 'center' }}>{item.status}</span>
          <div>
            <strong style={{ fontSize: 15 }}>{item.title}</strong>
            {item.category && <span style={{ color: 'var(--muted)', fontSize: 12, marginLeft: 8 }}>{item.category}</span>}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {item.calculatedDurationMinutes || item.estimatedDurationMinutes ? (
            <span style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={12} /> {fmtMinutes(item.calculatedDurationMinutes || item.estimatedDurationMinutes)}
            </span>
          ) : null}
          <span className={`pill ${item.priority === 'Red' ? 'red' : item.priority === 'Green' ? 'green' : 'amber'}`} style={{ fontSize: 11, padding: '2px 8px' }}>{item.priority}</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {expanded && (
        <div className="riItemBody">
          {item.customerComplaint && (
            <div className="infoStrip" style={{ marginBottom: 12 }}>
              <strong>Customer complaint:</strong> {item.customerComplaint}
            </div>
          )}
          {item.description && <p style={{ margin: '0 0 10px', color: 'var(--muted)', fontSize: 13 }}>{item.description}</p>}

          {/* Role input status */}
          <div className="riInputStatus">
            <RoleStatus label="Technician" required={item.requiresTechnicianInput} input={techInput} sentAt={item.sentToTechnicianAt} />
            <RoleStatus label="Parts" required={item.requiresPartsInput} input={partsInput} sentAt={item.sentToPartsAt} />
            <RoleStatus label="Controller" required={item.requiresControllerInput} input={ctrlInput} sentAt={item.sentToControllerAt} />
          </div>

          {/* Selected parts option */}
          {selectedPart && (
            <div style={{ background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 10, padding: '8px 12px', fontSize: 13, margin: '10px 0' }}>
              <strong>Selected part:</strong> {selectedPart.partName} {selectedPart.brand ? `(${selectedPart.brand})` : ''}
              &nbsp;·&nbsp; {selectedPart.availabilityStatus}
              {selectedPart.leadTimeDays ? ` · ${selectedPart.leadTimeDays}d lead` : ''}
              &nbsp;·&nbsp; {currency} {Number(selectedPart.totalCost).toLocaleString()}
            </div>
          )}

          {/* Technician input summary */}
          {techInput?.status === 'Submitted' && (
            <div style={{ background: '#f8faff', borderRadius: 10, padding: '8px 12px', fontSize: 13, margin: '6px 0' }}>
              <strong>Tech diagnosis:</strong> {techInput.diagnosisNotes || '—'}
              {techInput.estimatedDurationMinutes && <span style={{ color: 'var(--muted)', marginLeft: 8 }}>&middot; {fmtMinutes(techInput.estimatedDurationMinutes)}</span>}
              {techInput.labourCost && <span style={{ color: 'var(--muted)', marginLeft: 8 }}>&middot; {currency} {Number(techInput.labourCost).toLocaleString()}</span>}
            </div>
          )}

          {/* Actions */}
          <div className="rowActions" style={{ marginTop: 12 }}>
            {item.requiresTechnicianInput && !item.sentToTechnicianAt && (
              <button className="softBtn" onClick={() => onDispatch('tech')} style={{ fontSize: 12 }}>
                <Wrench size={13} /> Send to Technician
              </button>
            )}
            {item.requiresPartsInput && !item.sentToPartsAt && (
              <button className="softBtn" onClick={() => onDispatch('parts')} style={{ fontSize: 12 }}>
                <Package size={13} /> Send to Parts
              </button>
            )}
            {item.requiresControllerInput && !item.sentToControllerAt && (
              <button className="softBtn" onClick={() => onDispatch('controller')} style={{ fontSize: 12 }}>
                <Settings2 size={13} /> Send to Controller
              </button>
            )}
            {!['InProgress', 'Completed', 'CustomerApproved'].includes(item.status) && (
              <button className="softBtn" onClick={onDelete} style={{ color: 'var(--red)', fontSize: 12 }}>
                <Trash2 size={13} /> Remove
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function RoleStatus({ label, required, input, sentAt }) {
  if (!required) return <div className="riRoleChip soft"><span>{label}</span><span style={{ fontSize: 11 }}>N/A</span></div>
  const submitted = input?.status === 'Submitted'
  const sent      = !!sentAt
  return (
    <div className={`riRoleChip ${submitted ? 'green' : sent ? 'amber' : 'soft'}`}>
      {submitted ? <CheckCircle2 size={12} /> : sent ? <Clock size={12} /> : <AlertTriangle size={12} />}
      <span>{label}</span>
      <span style={{ fontSize: 11 }}>{submitted ? 'Done' : sent ? 'Sent' : 'Pending'}</span>
    </div>
  )
}

function fmtMinutes(mins) {
  if (!mins) return '—'
  if (mins < 60) return `${mins}m`
  const d = Math.floor(mins / 1440), h = Math.floor((mins % 1440) / 60), m = mins % 60
  return [d && `${d}d`, h && `${h}h`, m && `${m}m`].filter(Boolean).join(' ')
}

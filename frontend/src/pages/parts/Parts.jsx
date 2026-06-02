import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Camera, CheckCircle2, ChevronDown, ChevronRight,
  FileText, Package, RefreshCw, Save, Send, Upload, Wrench, X,
} from 'lucide-react'
import { apiFetch, getToken, getUser } from '../../utils/api'
import QuotationReviewPanel from '../../components/QuotationReviewPanel'

const TABS = ['Dashboard', 'My Assigned Jobs', 'Quotation Requests', 'Part Replacement', 'Jobs Waiting']

const DECISIONS = [
  'Replacement Approved',
  'Replacement Rejected',
  'Alternative Suggested',
  'Clarification Required',
  'Pending Supplier Confirmation',
]
const AVAILABILITY = [
  'In Stock', 'Out of Stock', 'On Order',
  'Supplier Confirmation Pending', 'Discontinued', 'Alternative Available',
]

const defaultReviewForm = {
  replacementDecision: 'Replacement Approved',
  partNumber: '', partDescription: '', availabilityStatus: 'In Stock',
  quantityRequired: '1', unitCost: '', supplierName: '', supplierContact: '',
  expectedDeliveryDate: '', alternativePartSuggested: '', alternativePartNumber: '',
  partsNotes: '', status: 'InReview',
}

const defaultComponentForm = {
  jobCardId: '', componentName: '', failureDescription: '',
  severity: 'Medium', replacementRequired: true,
  technicianNotes: '', technicianCostImpact: '',
}

export default function Parts() {
  const [tab, setTab] = useState('Dashboard')

  // Dashboard
  const [stats, setStats] = useState({ quotationsPendingPricing: 0, jobsWaitingParts: 0, failedComponentsPending: 0, reviewedToday: 0 })
  const [loadingStats, setLoadingStats] = useState(true)

  // Quotation requests
  const [quotations,   setQuotations]   = useState([])
  const [loadingQuotes,setLoadingQuotes]= useState(false)
  const [selectedQuote,setSelectedQuote]= useState(null)

  // Failed components
  const [components,      setComponents]      = useState([])
  const [loadingComponents,setLoadingComponents] = useState(false)
  const [selectedComp,    setSelectedComp]    = useState(null)
  const [reviewForm,      setReviewForm]      = useState(defaultReviewForm)
  const [savingReview,    setSavingReview]    = useState(false)
  const [showNewComp,     setShowNewComp]     = useState(false)
  const [compForm,        setCompForm]        = useState(defaultComponentForm)
  const [savingComp,      setSavingComp]      = useState(false)
  const [jobs,            setJobs]            = useState([])

  // Jobs waiting
  const [waitingJobs,    setWaitingJobs]    = useState([])
  const [loadingWaiting, setLoadingWaiting] = useState(false)

  // My Assigned Jobs
  const [myJobs,          setMyJobs]          = useState([])
  const [loadingMyJobs,   setLoadingMyJobs]   = useState(false)
  const [selectedMyJob,   setSelectedMyJob]   = useState(null)
  const [statusNotes,     setStatusNotes]     = useState('')
  const [statusBusy,      setStatusBusy]      = useState(false)

  // Feedback
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState('success')

  useEffect(() => { loadDashboard() }, [])
  useEffect(() => {
    if (tab === 'Quotation Requests') loadQuotations()
    if (tab === 'Part Replacement')   loadComponents()
    if (tab === 'Jobs Waiting')       loadWaitingJobs()
    if (tab === 'My Assigned Jobs')   loadMyJobs()
  }, [tab])

  async function loadDashboard() {
    setLoadingStats(true)
    try {
      const res  = await apiFetch('/parts/dashboard')
      const data = await res.json()
      if (data.success) setStats(data.data)
    } catch { /* ignore */ }
    finally { setLoadingStats(false) }
  }

  async function loadQuotations() {
    setLoadingQuotes(true)
    try {
      const res  = await apiFetch('/parts/quotation-requests?limit=50')
      const data = await res.json()
      if (data.success) setQuotations(data.data.data || [])
    } catch { /* ignore */ }
    finally { setLoadingQuotes(false) }
  }

  async function loadComponents() {
    setLoadingComponents(true)
    try {
      const [cRes, jRes] = await Promise.all([
        apiFetch('/parts/failed-components?limit=50'),
        apiFetch('/jobs?myJobs=true&limit=50'),
      ])
      const [cData, jData] = await Promise.all([cRes.json(), jRes.json()])
      if (cData.success) setComponents(cData.data.data || [])
      if (jData.success) setJobs(jData.data.data || [])
    } catch { /* ignore */ }
    finally { setLoadingComponents(false) }
  }

  async function loadWaitingJobs() {
    setLoadingWaiting(true)
    try {
      const res  = await apiFetch('/parts/waiting-jobs?limit=50')
      const data = await res.json()
      if (data.success) setWaitingJobs(data.data.data || [])
    } catch { /* ignore */ }
    finally { setLoadingWaiting(false) }
  }

  async function loadMyJobs() {
    setLoadingMyJobs(true)
    try {
      const res  = await apiFetch('/jobs?myPartsJobs=true&limit=50')
      const data = await res.json()
      if (data.success) setMyJobs(data.data?.data || [])
    } catch { /* ignore */ }
    finally { setLoadingMyJobs(false) }
  }

  async function updateMyJobStatus(jobId, status) {
    setStatusBusy(true); setMessage('')
    try {
      const res  = await apiFetch(`/jobs/${jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, notes: statusNotes || undefined }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setMyJobs(p => p.map(j => j.id === jobId ? { ...j, status } : j))
      if (selectedMyJob?.id === jobId) setSelectedMyJob(p => ({ ...p, status }))
      setMsgType('success'); setMessage(`Job marked as ${status}.`)
      setStatusNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setStatusBusy(false) }
  }

  async function openComponent(id) {
    try {
      const res  = await apiFetch(`/parts/failed-components/${id}`)
      const data = await res.json()
      if (data.success) {
        const comp = data.data.component
        setSelectedComp(comp)
        const r = comp.review
        setReviewForm(r ? {
          replacementDecision: r.replacementDecision || 'Replacement Approved',
          partNumber:              r.partNumber             || '',
          partDescription:         r.partDescription        || '',
          availabilityStatus:      r.availabilityStatus     || 'In Stock',
          quantityRequired:        String(r.quantityRequired || 1),
          unitCost:                r.unitCost ? String(r.unitCost) : '',
          supplierName:            r.supplierName            || '',
          supplierContact:         r.supplierContact         || '',
          expectedDeliveryDate:    r.expectedDeliveryDate ? new Date(r.expectedDeliveryDate).toISOString().slice(0,10) : '',
          alternativePartSuggested:r.alternativePartSuggested || '',
          alternativePartNumber:   r.alternativePartNumber   || '',
          partsNotes:              r.partsNotes              || '',
          status:                  r.status                  || 'InReview',
        } : defaultReviewForm)
      }
    } catch { /* ignore */ }
  }

  async function submitReview() {
    if (!selectedComp) return
    if (!reviewForm.replacementDecision) { setMsgType('error'); setMessage('Replacement decision is required'); return }
    setSavingReview(true)
    setMessage('')
    try {
      const res  = await apiFetch(`/parts/failed-components/${selectedComp.id}/review`, {
        method: 'POST',
        body: JSON.stringify({
          ...reviewForm,
          quantityRequired: parseInt(reviewForm.quantityRequired) || 1,
          unitCost:         reviewForm.unitCost ? parseFloat(reviewForm.unitCost) : undefined,
          expectedDeliveryDate: reviewForm.expectedDeliveryDate || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to submit review'); return }
      setMsgType('success')
      setMessage('Parts review submitted successfully.')
      setSelectedComp(null)
      loadComponents()
      loadDashboard()
    } catch {
      setMsgType('error'); setMessage('Network error')
    } finally { setSavingReview(false) }
  }

  async function saveNewComponent() {
    if (!compForm.componentName.trim()) { setMsgType('error'); setMessage('Component name is required'); return }
    setSavingComp(true)
    setMessage('')
    try {
      const res  = await apiFetch('/parts/failed-components', {
        method: 'POST',
        body: JSON.stringify({
          ...compForm,
          technicianCostImpact: compForm.technicianCostImpact ? parseFloat(compForm.technicianCostImpact) : undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to save'); return }
      setMsgType('success')
      setMessage('Failed component recorded successfully.')
      setShowNewComp(false)
      setCompForm(defaultComponentForm)
      loadComponents()
      loadDashboard()
    } catch {
      setMsgType('error'); setMessage('Network error')
    } finally { setSavingComp(false) }
  }

  async function uploadMedia(componentId, file, category) {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('mediaCategory', category)
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:8007').replace(/\/api$/, '')
    try {
      const res  = await fetch(`${base}/api/parts/failed-components/${componentId}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })
      const data = await res.json()
      if (data.success) {
        setMsgType('success'); setMessage('Image uploaded.')
        // Refresh the selected component
        if (selectedComp?.id === componentId) await openComponent(componentId)
      }
    } catch { /* ignore */ }
  }

  const rf = (key) => ({ value: reviewForm[key], onChange: e => setReviewForm(p => ({ ...p, [key]: e.target.value })) })

  const statusBadge = (s) => {
    const map = { PendingReview: 'amber', InReview: 'amber', Approved: 'green', Rejected: 'red', ClarificationRequested: 'amber' }
    return <span className={`pill ${map[s] || 'amber'}`}>{s}</span>
  }

  return (
    <div className="pageStack">
      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
        {TABS.map(t => (
          <button key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
              background: tab === t ? 'var(--brand, #1a3c5e)' : '#f2f4f7',
              color: tab === t ? '#fff' : '#344054',
              transition: 'background .15s',
            }}
          >
            {t}
          </button>
        ))}
        <Link className="softBtn" to="/parts/quotation-update" style={{ marginLeft: 'auto' }}>
          <FileText size={15} /> Parts Quote Update
        </Link>
      </div>

      {message && (
        <div style={{
          background: msgType === 'success' ? '#ecfdf3' : '#fee4e2',
          color:      msgType === 'success' ? '#027a48' : '#d92d20',
          border:     `1px solid ${msgType === 'success' ? '#abefc6' : '#fecdca'}`,
          borderRadius: 12, padding: '10px 14px', fontWeight: 700, fontSize: 13,
        }}>
          {message}
        </div>
      )}

      {/* ─── DASHBOARD TAB ─────────────────────────────────────── */}
      {tab === 'Dashboard' && (
        <>
          <div className="metricGrid">
            <Card title="Quotes needing pricing" value={loadingStats ? '…' : String(stats.quotationsPendingPricing)} note="Line-item pricing"  onClick={() => setTab('Quotation Requests')} />
            <Card title="Jobs waiting parts"     value={loadingStats ? '…' : String(stats.jobsWaitingParts)}         note="Supplier follow-up" onClick={() => setTab('Jobs Waiting')} />
            <Card title="Failed components"      value={loadingStats ? '…' : String(stats.failedComponentsPending)}  note="Pending review"     onClick={() => setTab('Part Replacement')} />
            <Card title="Reviews today"          value={loadingStats ? '…' : String(stats.reviewedToday)}            note="Completed today"    onClick={() => setTab('Quotation Requests')} />
          </div>

          <section className="panel heroPanel">
            <p className="eyebrow">Parts Interpreter workspace</p>
            <h2>Parts Interpreter: quote and parts workflow</h2>
            <p>Review quotation requests, manage part replacements, update parts pricing and manage jobs waiting for parts.</p>
            <div className="rowActions">
              <button className="primaryBtn" onClick={() => setTab('Quotation Requests')}>
                <FileText size={15} /> View Quotation Requests
              </button>
              <button className="softBtn" onClick={() => setTab('Part Replacement')}>
                <Package size={15} /> Part Replacement Review
              </button>
              <button className="softBtn" onClick={() => setTab('Jobs Waiting')}>
                <Wrench size={15} /> Jobs Waiting for Parts
              </button>
            </div>
          </section>
        </>
      )}

      {/* ─── MY ASSIGNED JOBS TAB ──────────────────────────────── */}
      {tab === 'My Assigned Jobs' && (
        <section className="panel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Assigned to me</p>
              <h3>Jobs assigned to you as Parts Interpreter</h3>
              <p>Start work, flag waiting for parts, and mark ready once done.</p>
            </div>
            <button className="softBtn" onClick={loadMyJobs}><RefreshCw size={14} /> Refresh</button>
          </div>

          {loadingMyJobs ? (
            <p style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading…</p>
          ) : myJobs.length === 0 ? (
            <div className="infoStrip">No jobs are currently assigned to you.</div>
          ) : (
            <>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr><th>Job #</th><th>Customer</th><th>Vehicle</th><th>Repair</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {myJobs.map(j => (
                      <tr key={j.id} style={{ background: selectedMyJob?.id === j.id ? '#f0f9ff' : undefined }}>
                        <td><strong>{j.jobNumber}</strong></td>
                        <td>{j.quotation?.customer?.name}</td>
                        <td>{j.vehicle?.registrationNo}</td>
                        <td>{j.quotation?.repairType}</td>
                        <td>
                          <span className={`pill ${j.status === 'InProgress' ? 'blue' : j.status === 'Ready' ? 'green' : j.status === 'WaitingParts' ? 'amber' : 'amber'}`}>
                            {j.status}
                          </span>
                        </td>
                        <td>
                          <button className="softBtn" onClick={() => { setSelectedMyJob(j); setStatusNotes('') }}>
                            <ChevronRight size={14} /> Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedMyJob && (
                <div style={{ marginTop: 20, background: '#f9fafb', borderRadius: 12, padding: 16, border: '1px solid #e4e7ec' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div>
                      <h4 style={{ margin: 0 }}>{selectedMyJob.jobNumber}</h4>
                      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
                        {selectedMyJob.quotation?.customer?.name}
                        {selectedMyJob.vehicle?.registrationNo ? ` · ${selectedMyJob.vehicle.registrationNo}` : ''}
                        {selectedMyJob.quotation?.repairType ? ` — ${selectedMyJob.quotation.repairType}` : ''}
                      </p>
                      <span className={`pill ${selectedMyJob.status === 'InProgress' ? 'blue' : selectedMyJob.status === 'Ready' ? 'green' : 'amber'}`} style={{ marginTop: 4, display: 'inline-block' }}>
                        {selectedMyJob.status}
                      </span>
                    </div>
                    <button className="softBtn" onClick={() => setSelectedMyJob(null)}><X size={14} /> Close</button>
                  </div>

                  <label style={{ display: 'block', marginBottom: 10 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Notes for this status change</span>
                    <textarea
                      value={statusNotes}
                      onChange={e => setStatusNotes(e.target.value)}
                      placeholder="Describe what you did, parts needed, or completion details…"
                      rows={3}
                      style={{ display: 'block', width: '100%', marginTop: 4, padding: '8px 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
                    />
                  </label>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {['Accepted', 'New', 'AssignedToTechnician'].includes(selectedMyJob.status) && (
                      <button className="primaryBtn" onClick={() => updateMyJobStatus(selectedMyJob.id, 'InProgress')}
                        disabled={statusBusy} style={{ background: '#175cd3' }}>
                        Start — Mark In Progress
                      </button>
                    )}
                    {selectedMyJob.status === 'InProgress' && (
                      <button className="softBtn" onClick={() => updateMyJobStatus(selectedMyJob.id, 'WaitingParts')}
                        disabled={statusBusy} style={{ borderColor: '#f79009', color: '#b54708' }}>
                        Waiting for Parts
                      </button>
                    )}
                    {['InProgress', 'WaitingParts'].includes(selectedMyJob.status) && (
                      <button className="primaryBtn" onClick={() => updateMyJobStatus(selectedMyJob.id, 'Ready')}
                        disabled={statusBusy} style={{ background: '#039855' }}>
                        Mark as Ready
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* ─── QUOTATION REQUESTS TAB ─────────────────────────────── */}
      {tab === 'Quotation Requests' && (
        <section className="panel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">From Front Desk</p>
              <h3>Quotations needing your parts input</h3>
              <p>Review each line item, add your parts interpreter notes, then send back to Front Desk.</p>
            </div>
            <Link className="softBtn" to="/parts/quotation-update">
              <FileText size={15} /> Parts Repair Items
            </Link>
          </div>

          {loadingQuotes ? (
            <p style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading…</p>
          ) : (
            <QuotationReviewPanel
              quotations={quotations}
              roleCode={(getUser()?.roleCode) || 'PARTS_INTERPRETER'}
              onRefresh={loadQuotations}
            />
          )}
        </section>
      )}

      {/* ─── PART REPLACEMENT TAB ───────────────────────────────── */}
      {tab === 'Part Replacement' && (
        <>
          <div className="panel">
            <div className="sectionHeader compact">
              <div>
                <p className="eyebrow">Failed component review</p>
                <h3>Part replacement requests from Technician</h3>
                <p>Review failed components, add parts availability, pricing and supplier details.</p>
              </div>
              <button className="primaryBtn" onClick={() => setShowNewComp(p => !p)}>
                {showNewComp ? <X size={15} /> : <Package size={15} />}
                {showNewComp ? 'Cancel' : 'Record Failed Component'}
              </button>
            </div>

            {/* New component form (Technician-side quick add) */}
            {showNewComp && (
              <div style={{ background: '#f9fafb', border: '1px solid #e4e7ec', borderRadius: 12, padding: 16, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 12 }}>Record Failed Component</h4>
                <div className="formGrid adminForm twoCols">
                  <label>
                    Linked job
                    <select value={compForm.jobCardId} onChange={e => setCompForm(p => ({ ...p, jobCardId: e.target.value }))}>
                      <option value="">— None —</option>
                      {jobs.map(j => <option key={j.id} value={j.id}>{j.jobNumber} — {j.quotation?.customer?.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Component name *
                    <input placeholder="e.g. Front brake pads" value={compForm.componentName}
                      onChange={e => setCompForm(p => ({ ...p, componentName: e.target.value }))} />
                  </label>
                  <label>
                    Severity
                    <select value={compForm.severity} onChange={e => setCompForm(p => ({ ...p, severity: e.target.value }))}>
                      <option>High</option><option>Medium</option><option>Low</option>
                    </select>
                  </label>
                  <label>
                    Technician cost estimate
                    <input type="number" placeholder="e.g. 12500" value={compForm.technicianCostImpact}
                      onChange={e => setCompForm(p => ({ ...p, technicianCostImpact: e.target.value }))} />
                  </label>
                  <label className="wide">
                    Failure description
                    <textarea placeholder="Describe what failed and why replacement is needed"
                      value={compForm.failureDescription}
                      onChange={e => setCompForm(p => ({ ...p, failureDescription: e.target.value }))} />
                  </label>
                  <label className="wide">
                    Technician notes
                    <textarea placeholder="Additional notes"
                      value={compForm.technicianNotes}
                      onChange={e => setCompForm(p => ({ ...p, technicianNotes: e.target.value }))} />
                  </label>
                </div>
                <button className="primaryBtn" onClick={saveNewComponent} disabled={savingComp}>
                  <Save size={15} /> {savingComp ? 'Saving…' : 'Save Failed Component'}
                </button>
              </div>
            )}

            {loadingComponents ? (
              <p style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading…</p>
            ) : components.length === 0 ? (
              <div className="infoStrip">No failed component records yet.</div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Component</th><th>Technician</th><th>Job / Quote</th>
                      <th>Severity</th><th>Tech estimate</th><th>Status</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {components.map(c => (
                      <tr key={c.id}>
                        <td>
                          <strong>{c.componentName}</strong>
                          {c.failureDescription && <><br /><small>{c.failureDescription.slice(0,60)}{c.failureDescription.length > 60 ? '…' : ''}</small></>}
                        </td>
                        <td>{c.technician?.name}</td>
                        <td>
                          {c.jobCard && <span>{c.jobCard.jobNumber}</span>}
                          {c.quotation && <><br /><small>{c.quotation.quoteNumber}</small></>}
                        </td>
                        <td>
                          <span className={`pill ${c.severity === 'High' ? 'red' : c.severity === 'Medium' ? 'amber' : 'green'}`}>
                            {c.severity}
                          </span>
                        </td>
                        <td>{c.technicianCostImpact ? `${c.currency} ${parseFloat(c.technicianCostImpact).toLocaleString()}` : '—'}</td>
                        <td>{statusBadge(c.status)}</td>
                        <td>
                          <button className="softBtn" onClick={() => openComponent(c.id)}>
                            <ChevronRight size={14} /> Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Review panel */}
          {selectedComp && (
            <div className="panel">
              <div className="sectionHeader compact">
                <div>
                  <h3>Review: {selectedComp.componentName}</h3>
                  <p>
                    {selectedComp.technician?.name}
                    {selectedComp.jobCard ? ` · Job ${selectedComp.jobCard.jobNumber}` : ''}
                    {selectedComp.jobCard?.quotation?.customer ? ` · ${selectedComp.jobCard.quotation.customer.name}` : ''}
                  </p>
                </div>
                <button className="softBtn" onClick={() => setSelectedComp(null)}><X size={14} /> Close</button>
              </div>

              {/* Technician info card */}
              <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, padding: 14, marginBottom: 16 }}>
                <strong>Technician submission</strong>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 20px', marginTop: 8, fontSize: 13 }}>
                  <div><span style={{ color: 'var(--muted)' }}>Severity:</span>{' '}
                    <span className={`pill ${selectedComp.severity === 'High' ? 'red' : selectedComp.severity === 'Medium' ? 'amber' : 'green'}`}>
                      {selectedComp.severity}
                    </span>
                  </div>
                  <div><span style={{ color: 'var(--muted)' }}>Replacement required:</span> {selectedComp.replacementRequired ? 'Yes' : 'No'}</div>
                  <div><span style={{ color: 'var(--muted)' }}>Cost estimate:</span>{' '}
                    {selectedComp.technicianCostImpact ? `${selectedComp.currency} ${parseFloat(selectedComp.technicianCostImpact).toLocaleString()}` : '—'}
                  </div>
                  <div><span style={{ color: 'var(--muted)' }}>Status:</span> {statusBadge(selectedComp.status)}</div>
                  {selectedComp.failureDescription && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--muted)' }}>Failure description:</span> {selectedComp.failureDescription}
                    </div>
                  )}
                  {selectedComp.technicianNotes && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <span style={{ color: 'var(--muted)' }}>Technician notes:</span> {selectedComp.technicianNotes}
                    </div>
                  )}
                </div>

                {/* Component images */}
                <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Failed component image</p>
                    {selectedComp.failedComponentImageUrl ? (
                      <a href={selectedComp.failedComponentImageUrl} target="_blank" rel="noreferrer">
                        <img src={selectedComp.failedComponentImageUrl} alt="Failed component"
                          style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #d0d5dd' }} />
                      </a>
                    ) : (
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        width: 120, height: 90, border: '2px dashed #d0d5dd', borderRadius: 8, cursor: 'pointer',
                        justifyContent: 'center', fontSize: 12, color: 'var(--muted)' }}>
                        <Camera size={18} /> Upload failed
                        <input type="file" accept="image/*,video/*" style={{ display: 'none' }}
                          onChange={e => e.target.files[0] && uploadMedia(selectedComp.id, e.target.files[0], 'failed')} />
                      </label>
                    )}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>Replaced component image</p>
                    {selectedComp.replacedComponentImageUrl ? (
                      <a href={selectedComp.replacedComponentImageUrl} target="_blank" rel="noreferrer">
                        <img src={selectedComp.replacedComponentImageUrl} alt="Replaced component"
                          style={{ width: 120, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid #d0d5dd' }} />
                      </a>
                    ) : (
                      <label style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                        width: 120, height: 90, border: '2px dashed #d0d5dd', borderRadius: 8, cursor: 'pointer',
                        justifyContent: 'center', fontSize: 12, color: 'var(--muted)' }}>
                        <Upload size={18} /> Upload replaced
                        <input type="file" accept="image/*,video/*" style={{ display: 'none' }}
                          onChange={e => e.target.files[0] && uploadMedia(selectedComp.id, e.target.files[0], 'replaced')} />
                      </label>
                    )}
                  </div>
                </div>
              </div>

              {/* Parts interpreter review form */}
              <h4 style={{ marginBottom: 12 }}>Parts Interpreter Review</h4>
              <div className="formGrid adminForm twoCols">
                <label>
                  Replacement decision *
                  <select {...rf('replacementDecision')}>
                    {DECISIONS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </label>
                <label>
                  Availability status
                  <select {...rf('availabilityStatus')}>
                    {AVAILABILITY.map(a => <option key={a}>{a}</option>)}
                  </select>
                </label>
                <label>
                  Part number / SKU
                  <input placeholder="e.g. BP-0042-F" {...rf('partNumber')} />
                </label>
                <label>
                  Part description
                  <input placeholder="e.g. OEM front brake pad set" {...rf('partDescription')} />
                </label>
                <label>
                  Quantity required
                  <input type="number" min="1" {...rf('quantityRequired')} />
                </label>
                <label>
                  Unit cost
                  <input type="number" placeholder="e.g. 98000" {...rf('unitCost')} />
                </label>
                <label>
                  Supplier name
                  <input placeholder="Supplier name" {...rf('supplierName')} />
                </label>
                <label>
                  Supplier contact
                  <input placeholder="+27 xxx xxxx" {...rf('supplierContact')} />
                </label>
                <label>
                  Expected delivery date
                  <input type="date" {...rf('expectedDeliveryDate')} />
                </label>
                <label>
                  Review status
                  <select {...rf('status')}>
                    <option value="InReview">In Review</option>
                    <option value="Completed">Completed — send to Front Desk</option>
                    <option value="NeedClarification">Need clarification from Technician</option>
                  </select>
                </label>
                {reviewForm.replacementDecision === 'Alternative Suggested' && (
                  <>
                    <label>
                      Alternative part description
                      <input placeholder="Alternative part description" {...rf('alternativePartSuggested')} />
                    </label>
                    <label>
                      Alternative part number
                      <input placeholder="Alt part number" {...rf('alternativePartNumber')} />
                    </label>
                  </>
                )}
                <label className="wide">
                  Parts notes
                  <textarea placeholder="Additional notes for Front Desk / Technician" {...rf('partsNotes')} />
                </label>
              </div>

              {reviewForm.unitCost && reviewForm.quantityRequired && (
                <div style={{ background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
                  <strong>Total cost estimate:</strong>{' '}
                  {selectedComp.currency} {(parseFloat(reviewForm.unitCost || 0) * parseInt(reviewForm.quantityRequired || 1)).toLocaleString()}
                </div>
              )}

              <div className="rowActions">
                <button className="primaryBtn" onClick={submitReview} disabled={savingReview}>
                  <Send size={15} /> {savingReview ? 'Submitting…' : 'Submit Parts Review'}
                </button>
                <button className="softBtn" onClick={() => setSelectedComp(null)}>Cancel</button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── JOBS WAITING TAB ───────────────────────────────────── */}
      {tab === 'Jobs Waiting' && (
        <section className="panel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Parts required</p>
              <h3>Jobs waiting for parts</h3>
              <p>Jobs where the Technician or Workshop Controller has indicated parts are required before work can continue.</p>
            </div>
          </div>

          {loadingWaiting ? (
            <p style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>Loading…</p>
          ) : waitingJobs.length === 0 ? (
            <div className="infoStrip">No jobs currently waiting for parts.</div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Job #</th><th>Customer</th><th>Vehicle</th>
                    <th>Repair</th><th>Technician</th><th>Open issues</th><th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {waitingJobs.map(j => (
                    <tr key={j.id}>
                      <td><strong>{j.jobNumber}</strong></td>
                      <td>{j.quotation?.customer?.name}</td>
                      <td>{j.vehicle?.registrationNo} {j.vehicle?.makeModel}</td>
                      <td>{j.quotation?.repairType}</td>
                      <td>{j.assignedTechnician?.name || '—'}</td>
                      <td>
                        {j.issues?.length > 0 ? (
                          j.issues.slice(0, 2).map((iss, idx) => (
                            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12 }}>
                              <AlertTriangle size={12} />
                              <span className={`pill ${iss.severity === 'High' ? 'red' : iss.severity === 'Medium' ? 'amber' : 'green'}`} style={{ fontSize: 10 }}>
                                {iss.severity}
                              </span>
                              {iss.title}
                            </div>
                          ))
                        ) : '—'}
                      </td>
                      <td><span className="pill amber">{j.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </div>
  )
}

function Card({ title, value, note, onClick }) {
  return (
    <article
      className={`metricCard${onClick ? ' metricCardLink' : ''}`}
      onClick={onClick}
      style={onClick ? { cursor: 'pointer' } : undefined}
    >
      {onClick && <ChevronRight size={13} style={{ position: 'absolute', top: 10, right: 10, color: 'var(--muted)', opacity: 0.5 }} />}
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </article>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, ChevronRight, FileText,
  Package, Send, Sliders, UserCheck, Wrench, X,
} from 'lucide-react'

import { apiFetch, getUser } from '../../utils/api'
import QuotationReviewPanel from '../../components/QuotationReviewPanel'

const TABS = ['Dashboard', 'Jobs', 'Quotation Requests', 'Failed Components']

export default function Workshop() {
  const [tab, setTab] = useState('Dashboard')

  const [jobs,               setJobs]               = useState([])
  const [technicians,        setTechnicians]        = useState([])
  const [partsInterpreters,  setPartsInterpreters]  = useState([])
  const [quotations,         setQuotations]         = useState([])
  const [components,  setComponents]  = useState([])

  const [loadingJobs,   setLoadingJobs]   = useState(true)
  const [loadingQuotes, setLoadingQuotes] = useState(false)
  const [loadingComps,  setLoadingComps]  = useState(false)
  const [quoteCount,    setQuoteCount]    = useState(0)

  const [selectedJob,   setSelectedJob]   = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Review form
  const [bayAllocation,  setBayAllocation]  = useState('')
  const [repairRoute,    setRepairRoute]    = useState('')
  const [labourEstimate, setLabourEstimate] = useState('')
  const [reviewNotes,    setReviewNotes]    = useState('')

  // Assign + send
  const [assignTechId,  setAssignTechId]  = useState('')
  const [assignNotes,   setAssignNotes]   = useState('')
  const [sendNotes,     setSendNotes]     = useState('')

  // Parts Interpreter assignment
  const [assignPiId,    setAssignPiId]    = useState('')
  const [assignPiNotes, setAssignPiNotes] = useState('')

  // Front desk update
  const [fdUpdateNotes, setFdUpdateNotes] = useState('')

  const [saving,   setSaving]   = useState(false)
  const [message,  setMessage]  = useState('')
  const [msgType,  setMsgType]  = useState('success')

  useEffect(() => { loadJobs(); loadTechnicians(); loadPartsInterpreters(); loadQuoteCount() }, [])
  useEffect(() => {
    if (tab === 'Quotation Requests') loadQuotations()
    if (tab === 'Failed Components')  loadComponents()
  }, [tab])

  async function loadQuoteCount() {
    try {
      const res  = await apiFetch('/quotations?sendToWorkshopController=true&limit=1')
      const data = await res.json()
      if (data.success) setQuoteCount(data.data.meta?.total ?? (data.data.data?.length || 0))
    } catch { /* ignore */ }
  }

  async function loadJobs() {
    setLoadingJobs(true)
    try {
      const res  = await apiFetch('/workshop-controller/jobs?limit=100')
      const data = await res.json()
      if (data.success) setJobs(data.data.data || [])
    } catch { /* ignore */ }
    finally { setLoadingJobs(false) }
  }

  async function loadTechnicians() {
    try {
      const res  = await apiFetch('/users?role=Technician&limit=50')
      const data = await res.json()
      if (data.success) setTechnicians(data.data.data || data.data || [])
    } catch { /* ignore */ }
  }

  async function loadPartsInterpreters() {
    try {
      const res  = await apiFetch('/users?role=PartsInterpreter&limit=50')
      const data = await res.json()
      if (data.success) setPartsInterpreters(data.data.data || data.data || [])
    } catch { /* ignore */ }
  }

  async function loadQuotations() {
    setLoadingQuotes(true)
    try {
      const res  = await apiFetch('/quotations?sendToWorkshopController=true&limit=50')
      const data = await res.json()
      if (data.success) setQuotations(data.data.data || [])
    } catch { /* ignore */ }
    finally { setLoadingQuotes(false) }
  }

  async function loadComponents() {
    setLoadingComps(true)
    try {
      const res  = await apiFetch('/parts/failed-components?limit=50')
      const data = await res.json()
      if (data.success) setComponents(data.data.data || [])
    } catch { /* ignore */ }
    finally { setLoadingComps(false) }
  }

  async function openJob(jobId) {
    setLoadingDetail(true)
    setMessage('')
    setBayAllocation(''); setRepairRoute(''); setLabourEstimate(''); setReviewNotes('')
    setAssignNotes(''); setSendNotes(''); setFdUpdateNotes(''); setAssignPiNotes('')
    try {
      const res  = await apiFetch(`/workshop-controller/jobs/${jobId}`)
      const data = await res.json()
      if (data.success) {
        const job = data.data.job
        setSelectedJob(job)
        setAssignTechId(job.assignedTechnicianId || '')
      }
    } catch { /* ignore */ }
    finally { setLoadingDetail(false) }
  }

  async function submitReview() {
    if (!selectedJob) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/workshop-controller/jobs/${selectedJob.id}/review`, {
        method: 'POST',
        body: JSON.stringify({ bayAllocation, repairRoute, labourEstimate, workshopNotes: reviewNotes }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to save review'); return }
      setMsgType('success'); setMessage('Job review notes recorded.')
      setBayAllocation(''); setRepairRoute(''); setLabourEstimate(''); setReviewNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function assignTechnician() {
    if (!selectedJob || !assignTechId) { setMsgType('error'); setMessage('Select a technician'); return }
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/workshop-controller/jobs/${selectedJob.id}/assign-technician`, {
        method: 'POST',
        body: JSON.stringify({ technicianId: assignTechId, notes: assignNotes }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to assign technician'); return }
      setSelectedJob(p => ({ ...p, status: 'AssignedToTechnician', assignedTechnicianId: assignTechId }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'AssignedToTechnician', assignedTechnicianId: assignTechId } : j))
      setMsgType('success'); setMessage('Technician assigned successfully.')
      setAssignNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function assignPartsInterpreterFn() {
    if (!selectedJob || !assignPiId) { setMsgType('error'); setMessage('Select a Parts Interpreter'); return }
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/workshop-controller/jobs/${selectedJob.id}/assign-parts-interpreter`, {
        method: 'POST',
        body: JSON.stringify({ partsInterpreterId: assignPiId, notes: assignPiNotes }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to assign'); return }
      setSelectedJob(p => ({ ...p, status: 'Accepted', assignedPartsInterpreterId: assignPiId }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'Accepted', assignedPartsInterpreterId: assignPiId } : j))
      setMsgType('success'); setMessage('Parts Interpreter assigned.')
      setAssignPiNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function sendToTechnician() {
    if (!selectedJob) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/workshop-controller/jobs/${selectedJob.id}/send-to-technician`, {
        method: 'POST',
        body: JSON.stringify({ notes: sendNotes }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to send to technician'); return }
      setSelectedJob(p => ({ ...p, status: 'Accepted' }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'Accepted' } : j))
      setMsgType('success'); setMessage('Job sent to technician for execution.')
      setSendNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function sendUpdateToFrontDesk() {
    if (!fdUpdateNotes.trim()) { setMsgType('error'); setMessage('Update notes are required'); return }
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/workshop-controller/jobs/${selectedJob.id}/send-update-front-desk`, {
        method: 'POST',
        body: JSON.stringify({ notes: fdUpdateNotes.trim() }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to send update'); return }
      setMsgType('success'); setMessage('Update sent to Front Desk.')
      setFdUpdateNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function resolveIssue(jobId, issueId) {
    try {
      const res  = await apiFetch(`/jobs/${jobId}/issues/${issueId}/resolve`, { method: 'PATCH' })
      const data = await res.json()
      if (data.success && selectedJob) {
        setSelectedJob(p => ({
          ...p,
          issues: p.issues.map(i => i.id === issueId ? { ...i, status: 'Resolved' } : i),
        }))
        setMsgType('success'); setMessage('Issue marked as resolved.')
      }
    } catch { /* ignore */ }
  }

  const today = new Date().toDateString()
  const stats = useMemo(() => ({
    accepted:       jobs.filter(j => ['Accepted', 'New', 'SentToWorkshopController', 'AssignedToTechnician'].includes(j.status)).length,
    inProgress:     jobs.filter(j => j.status === 'InProgress').length,
    waitingParts:   jobs.filter(j => j.status === 'WaitingParts').length,
    completedToday: jobs.filter(j => j.status === 'Completed' && new Date(j.updatedAt).toDateString() === today).length,
  }), [jobs])

  const pillColor = (s) => {
    const m = { InProgress: 'blue', Completed: 'green', Ready: 'green', QCReview: 'green',
      WaitingParts: 'amber', WaitingApproval: 'amber', New: 'amber', Accepted: 'blue',
      SentToWorkshopController: 'amber', AssignedToTechnician: 'blue', AdditionalWorkApproved: 'amber' }
    return m[s] || 'amber'
  }

  const canAssign     = selectedJob && !['Completed', 'Closed', 'Cancelled', 'VehicleDelivered'].includes(selectedJob.status)
  const canSendToTech = selectedJob && selectedJob.assignedTechnicianId && ['AssignedToTechnician', 'SentToWorkshopController', 'New', 'Accepted'].includes(selectedJob.status)

  return (
    <div className="pageStack">
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: tab === t ? 'var(--brand, #1a3c5e)' : '#f2f4f7',
            color: tab === t ? '#fff' : '#344054', transition: 'background .15s',
          }}>
            {t}
          </button>
        ))}
        <Link className="softBtn" to="/workshop/quotation-update" style={{ marginLeft: 'auto' }}>
          <FileText size={15} /> Workshop Quote Update
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

      {/* ─── DASHBOARD ─────────────────────────────────────────────── */}
      {tab === 'Dashboard' && (
        <>
          <div className="metricGrid">
            <Card title="Pending / assigned"  value={loadingJobs ? '…' : String(stats.accepted)}   note="Ready to action"  onClick={() => setTab('Jobs')} />
            <Card title="In progress"         value={loadingJobs ? '…' : String(stats.inProgress)} note="Workshop floor"   onClick={() => setTab('Jobs')} />
            <Card title="Waiting parts"       value={loadingJobs ? '…' : String(stats.waitingParts)} note="Parts handoff"  onClick={() => setTab('Jobs')} />
            <Card title="Quotation requests"  value={String(quoteCount)}                            note="Pending input"    onClick={() => setTab('Quotation Requests')} />
          </div>

          <section className="panel heroPanel">
            <p className="eyebrow">Workshop Controller workspace</p>
            <h2>Assign technicians, review jobs and send updates</h2>
            <p>Review incoming jobs, allocate bays, assign technicians, and send progress updates to Front Desk.</p>
            <div className="rowActions">
              <button className="primaryBtn" onClick={() => setTab('Jobs')}><Wrench size={15} /> View All Jobs</button>
              <button className="softBtn" onClick={() => setTab('Quotation Requests')}><FileText size={15} /> Quotation Requests</button>
            </div>
          </section>

          <section className="panel">
            <div className="sectionHead"><h2>Recent jobs</h2></div>
            {loadingJobs ? (
              <p style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading jobs…</p>
            ) : jobs.length === 0 ? (
              <div className="infoStrip">No jobs assigned to you yet.</div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead><tr><th>Job</th><th>Vehicle</th><th>Status</th><th>Technician</th><th>Progress</th></tr></thead>
                  <tbody>
                    {jobs.slice(0, 10).map(j => (
                      <tr key={j.id}>
                        <td><strong>{j.jobNumber}</strong></td>
                        <td>{j.vehicle?.registrationNo} {j.vehicle?.makeModel}</td>
                        <td><span className={`pill ${pillColor(j.status)}`}>{j.status}</span></td>
                        <td>{j.assignedTechnician?.name || '—'}</td>
                        <td>
                          <div className="progress"><span style={{ width: `${j.progress}%` }} /></div>
                          <small>{j.progress}%</small>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ─── JOBS TAB ──────────────────────────────────────────────── */}
      {tab === 'Jobs' && (
        <>
          <section className="panel">
            <div className="sectionHeader compact">
              <div>
                <p className="eyebrow">Workshop jobs</p>
                <h3>Review, assign technicians and manage workflow</h3>
              </div>
              <span className="accessBadge"><Sliders size={15} /> Workshop Controller</span>
            </div>

            {loadingJobs ? (
              <p style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
            ) : jobs.length === 0 ? (
              <div className="infoStrip">No jobs are currently in your workshop queue.</div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr><th>Job #</th><th>Customer</th><th>Vehicle</th><th>Repair</th><th>Status</th><th>Technician</th><th>Progress</th><th></th></tr>
                  </thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id} style={{ background: selectedJob?.id === j.id ? '#f0f9ff' : undefined }}>
                        <td><strong>{j.jobNumber}</strong></td>
                        <td>{j.quotation?.customer?.name}</td>
                        <td>{j.vehicle?.registrationNo}</td>
                        <td>{j.quotation?.repairType}</td>
                        <td><span className={`pill ${pillColor(j.status)}`}>{j.status}</span></td>
                        <td>{j.assignedTechnician?.name || <span style={{ color: 'var(--muted)' }}>Unassigned</span>}</td>
                        <td>{j.progress || 0}%</td>
                        <td>
                          <button className="softBtn" onClick={() => openJob(j.id)}>
                            <ChevronRight size={14} /> Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {loadingDetail && (
            <div className="panel" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Loading job details…</div>
          )}

          {selectedJob && !loadingDetail && (
            <section className="panel">
              <div className="sectionHeader compact">
                <div>
                  <h3>Manage job — {selectedJob.jobNumber}</h3>
                  <p>
                    {selectedJob.quotation?.customer?.name}
                    {selectedJob.vehicle?.registrationNo ? ` · ${selectedJob.vehicle.registrationNo}` : ''}
                    {selectedJob.vehicle?.makeModel ? ` — ${selectedJob.vehicle.makeModel}` : ''}
                    {selectedJob.quotation?.repairType ? ` · ${selectedJob.quotation.repairType}` : ''}
                  </p>
                  <p style={{ marginTop: 4 }}>
                    <span className={`pill ${pillColor(selectedJob.status)}`}>{selectedJob.status}</span>
                    {selectedJob.assignedTechnician && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--muted)' }}>
                        Technician: {selectedJob.assignedTechnician.name}
                      </span>
                    )}
                  </p>
                </div>
                <button className="softBtn" onClick={() => setSelectedJob(null)}><X size={14} /> Close</button>
              </div>

              {/* Review / bay allocation */}
              <div style={{ borderBottom: '1px solid #e4e7ec', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 10 }}>Job review &amp; bay allocation</h4>
                <div className="formGrid twoCols">
                  <label>
                    Bay allocation
                    <input value={bayAllocation} onChange={e => setBayAllocation(e.target.value)} placeholder="e.g. Bay 3" />
                  </label>
                  <label>
                    Repair route
                    <input value={repairRoute} onChange={e => setRepairRoute(e.target.value)} placeholder="e.g. Full engine strip" />
                  </label>
                  <label>
                    Labour estimate
                    <input value={labourEstimate} onChange={e => setLabourEstimate(e.target.value)} placeholder="e.g. 4 hours" />
                  </label>
                  <label>
                    Workshop notes
                    <input value={reviewNotes} onChange={e => setReviewNotes(e.target.value)} placeholder="Internal notes…" />
                  </label>
                </div>
                <button className="softBtn" onClick={submitReview} disabled={saving} style={{ marginTop: 8 }}>
                  Record Review Notes
                </button>
              </div>

              {/* Assign technician */}
              <div style={{ borderBottom: '1px solid #e4e7ec', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 10 }}>Assign technician</h4>
                <div className="formGrid twoCols">
                  <label>
                    Technician
                    <select value={assignTechId} onChange={e => setAssignTechId(e.target.value)} disabled={!canAssign}>
                      <option value="">— Select technician —</option>
                      {technicians.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Assignment notes
                    <input value={assignNotes} onChange={e => setAssignNotes(e.target.value)} placeholder="Optional notes…" />
                  </label>
                </div>
                <div className="rowActions" style={{ marginTop: 8 }}>
                  <button className="softBtn" onClick={assignTechnician} disabled={saving || !canAssign || !assignTechId}>
                    <UserCheck size={14} /> Assign Technician
                  </button>
                  {canSendToTech && (
                    <button className="primaryBtn" onClick={sendToTechnician} disabled={saving} style={{ background: '#039855', color: '#fff' }}>
                      <Send size={14} /> Send to Technician
                    </button>
                  )}
                </div>
              </div>

              {/* Assign Parts Interpreter */}
              <div style={{ borderBottom: '1px solid #e4e7ec', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 10 }}>Assign Parts Interpreter</h4>
                {selectedJob.assignedPartsInterpreter && (
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    Currently assigned: <strong>{selectedJob.assignedPartsInterpreter.name}</strong>
                  </p>
                )}
                <div className="formGrid twoCols">
                  <label>
                    Parts Interpreter
                    <select value={assignPiId} onChange={e => setAssignPiId(e.target.value)} disabled={!canAssign}>
                      <option value="">— Select Parts Interpreter —</option>
                      {partsInterpreters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                  <label>
                    Notes
                    <input value={assignPiNotes} onChange={e => setAssignPiNotes(e.target.value)} placeholder="Optional notes…" />
                  </label>
                </div>
                <div className="rowActions" style={{ marginTop: 8 }}>
                  <button className="softBtn" onClick={assignPartsInterpreterFn} disabled={saving || !canAssign || !assignPiId}>
                    <UserCheck size={14} /> Assign Parts Interpreter
                  </button>
                </div>
              </div>

              {/* Send update to front desk */}
              <div style={{ borderBottom: '1px solid #e4e7ec', paddingBottom: 16, marginBottom: 16 }}>
                <h4 style={{ marginBottom: 10 }}>Send update to Front Desk</h4>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13 }}
                    value={fdUpdateNotes}
                    onChange={e => setFdUpdateNotes(e.target.value)}
                    placeholder="Status update, parts ETA, customer advisory…"
                  />
                  <button className="softBtn" onClick={sendUpdateToFrontDesk} disabled={saving}>
                    <Send size={14} /> Send
                  </button>
                </div>
              </div>

              {/* Issues */}
              {selectedJob.issues?.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: 8 }}>Technician issues</h4>
                  <div className="issueList">
                    {selectedJob.issues.map(issue => {
                      const color = issue.severity === 'High' ? 'red' : issue.severity === 'Medium' ? 'amber' : 'green'
                      return (
                        <article key={issue.id} className={`issueCard ${color}`}>
                          <div>
                            <AlertTriangle size={16} />
                            <strong>{issue.title}</strong>
                            <span className={`pill ${color}`} style={{ marginLeft: 8 }}>{issue.severity}</span>
                            {issue.status === 'Resolved' && (
                              <span style={{ marginLeft: 8, fontSize: 11, color: '#027a48' }}>(resolved)</span>
                            )}
                          </div>
                          <p>{issue.note}</p>
                          {issue.status !== 'Resolved' && (
                            <button className="softBtn" style={{ marginTop: 6 }} onClick={() => resolveIssue(selectedJob.id, issue.id)}>
                              <CheckCircle2 size={13} /> Mark resolved
                            </button>
                          )}
                        </article>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Completion report */}
              {selectedJob.completionReport && (
                <div style={{ marginTop: 16, background: '#f9fafb', borderRadius: 10, padding: '12px 16px' }}>
                  <h4 style={{ marginBottom: 8 }}>Technician completion report</h4>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
                    <span className={`pill ${selectedJob.completionReport.issueSeverity === 'GREEN' ? 'green' : selectedJob.completionReport.issueSeverity === 'AMBER' ? 'amber' : 'red'}`}>
                      {selectedJob.completionReport.issueSeverity}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--muted)' }}>{selectedJob.completionReport.completionNotes}</span>
                  </div>
                  {selectedJob.completionReport.remainingIssues && (
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>Remaining: {selectedJob.completionReport.remainingIssues}</p>
                  )}
                  {selectedJob.completionReport.customerAdvisoryNotes && (
                    <p style={{ fontSize: 12, color: 'var(--muted)' }}>Advisory: {selectedJob.completionReport.customerAdvisoryNotes}</p>
                  )}
                </div>
              )}

              {/* Additional work requests */}
              {selectedJob.additionalWorkRequests?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Additional work requests</h4>
                  {selectedJob.additionalWorkRequests.map(aw => (
                    <div key={aw.id} style={{
                      background: aw.status === 'APPROVED' ? '#ecfdf3' : aw.status === 'REJECTED' ? '#fee4e2' : '#fffaeb',
                      borderRadius: 10, padding: '10px 14px', marginBottom: 8,
                      border: `1px solid ${aw.status === 'APPROVED' ? '#abefc6' : aw.status === 'REJECTED' ? '#fecdca' : '#fde68a'}`,
                    }}>
                      <strong style={{ fontSize: 13 }}>{aw.description}</strong>
                      <span className={`pill ${aw.status === 'APPROVED' ? 'green' : aw.status === 'REJECTED' ? 'red' : 'amber'}`} style={{ marginLeft: 8, fontSize: 11 }}>
                        {aw.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Checklist */}
              {selectedJob.checklistItems?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Checklist</h4>
                  {selectedJob.checklistItems.map(item => (
                    <div className="checkRow" key={item.id}>
                      <div>
                        <strong>{item.label}</strong>
                        <span>{item.state || 'Pending'}</span>
                      </div>
                      <span className={`pill ${item.state === 'Done' ? 'green' : item.state === 'Failed' ? 'red' : 'amber'}`}>
                        {item.state || 'Pending'}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* Status history */}
              {selectedJob.statusHistory?.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Status timeline</h4>
                  <div style={{ borderLeft: '3px solid #e4e7ec', paddingLeft: 14 }}>
                    {selectedJob.statusHistory.map((h, i) => (
                      <div key={h.id || i} style={{ marginBottom: 12, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: '#175cd3' }} />
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{h.title}</p>
                        {h.notes && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{h.notes}</p>}
                        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {h.performedByName || 'System'} · {new Date(h.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* ─── QUOTATION REQUESTS TAB ─────────────────────────────────── */}
      {tab === 'Quotation Requests' && (
        <section className="panel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">From Front Desk</p>
              <h3>Quotations needing your workshop input</h3>
              <p>Add your notes per line item, then send back to Front Desk.</p>
            </div>
            <Link className="softBtn" to="/workshop/quotation-update"><FileText size={15} /> Repair Items</Link>
          </div>

          {loadingQuotes ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
          ) : (
            <QuotationReviewPanel
              quotations={quotations}
              roleCode={(getUser()?.roleCode) || 'WORKSHOP_CONTROLLER'}
              onRefresh={loadQuotations}
            />
          )}
        </section>
      )}

      {/* ─── FAILED COMPONENTS TAB ──────────────────────────────────── */}
      {tab === 'Failed Components' && (
        <section className="panel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Technician evidence</p>
              <h3>Failed component records</h3>
            </div>
            <span className="accessBadge"><Package size={15} /> Parts evidence</span>
          </div>

          {loadingComps ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
          ) : components.length === 0 ? (
            <div className="infoStrip">No failed component records for this workshop yet.</div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr><th>Component</th><th>Technician</th><th>Job</th><th>Severity</th><th>Parts review</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {components.map(c => (
                    <tr key={c.id}>
                      <td>
                        <strong>{c.componentName}</strong>
                        {c.failureDescription && <><br /><small>{c.failureDescription.slice(0, 60)}{c.failureDescription.length > 60 ? '…' : ''}</small></>}
                      </td>
                      <td>{c.technician?.name}</td>
                      <td>{c.jobCard?.jobNumber || c.quotation?.quoteNumber || '—'}</td>
                      <td>
                        <span className={`pill ${c.severity === 'High' ? 'red' : c.severity === 'Medium' ? 'amber' : 'green'}`}>
                          {c.severity}
                        </span>
                      </td>
                      <td>
                        {c.review
                          ? <span className="pill green">{c.review.replacementDecision || 'Reviewed'}</span>
                          : <span className="pill amber">Pending</span>}
                      </td>
                      <td>
                        <span className={`pill ${c.status === 'Approved' ? 'green' : c.status === 'Rejected' ? 'red' : 'amber'}`}>
                          {c.status}
                        </span>
                      </td>
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

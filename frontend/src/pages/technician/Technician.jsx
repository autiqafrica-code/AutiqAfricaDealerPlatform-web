import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Camera, Check, CheckSquare, ChevronRight, ClipboardCheck,
  FileText, Plus, Save, Wrench,
} from 'lucide-react'
import { apiFetch, getToken, getUser } from '../../utils/api'
import QuotationReviewPanel from '../../components/QuotationReviewPanel'

const TABS = ['Job Workspace', 'Quotation Requests']

const COMPLETION_SEVERITY = [
  { value: 'GREEN', color: 'green', label: 'GREEN — All clear',   helper: 'Vehicle is in good condition. No issues found.' },
  { value: 'AMBER', color: 'amber', label: 'AMBER — Minor issues', helper: 'Minor issues noted. Customer should be advised.' },
  { value: 'RED',   color: 'red',   label: 'RED — Critical issues', helper: 'Critical issues found. Requires urgent attention.' },
]

const ISSUE_SEVERITY = [
  { value: 'High',   color: 'red',   helper: 'Critical issue. Needs immediate attention.' },
  { value: 'Medium', color: 'amber', helper: 'Should be addressed within 5000 km.' },
  { value: 'Low',    color: 'green', helper: 'Minor observation. Low risk.' },
]

export default function Technician() {
  const [tab, setTab] = useState('Job Workspace')

  const [jobs,          setJobs]          = useState([])
  const [loading,       setLoading]       = useState(true)
  const [selectedJob,   setSelectedJob]   = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [checklist,     setChecklist]     = useState([])
  const [issues,        setIssues]        = useState([])
  const [additionalWork,setAdditionalWork]= useState([])

  // Progress notes form
  const [progressNotes, setProgressNotes] = useState('')
  const [progress,      setProgress]      = useState(0)

  // Completion form
  const [completing,      setCompleting]      = useState(false)
  const [completionSev,   setCompletionSev]   = useState('GREEN')
  const [completionNotes, setCompletionNotes] = useState('')
  const [remainingIssues, setRemainingIssues] = useState('')
  const [advisoryNotes,   setAdvisoryNotes]   = useState('')

  // Additional work form
  const [showAWForm,    setShowAWForm]    = useState(false)
  const [awDesc,        setAwDesc]        = useState('')
  const [awReason,      setAwReason]      = useState('')
  const [awSeverity,    setAwSeverity]    = useState('Medium')
  const [awLabourHours, setAwLabourHours] = useState('')
  const [awPartsCost,   setAwPartsCost]   = useState('')
  const [awTotalCost,   setAwTotalCost]   = useState('')

  // Issue form
  const [newIssue,      setNewIssue]      = useState({ title: '', severity: 'High', note: '' })
  const [newCheckLabel, setNewCheckLabel] = useState('')

  // Parts Interpreter assignment
  const [partsInterpreters,  setPartsInterpreters]  = useState([])
  const [assignPiId,         setAssignPiId]         = useState('')
  const [assignPiNotes,      setAssignPiNotes]      = useState('')
  const [assignPiBusy,       setAssignPiBusy]       = useState(false)

  // WaitingParts / Ready
  const [waitingPartsNotes,  setWaitingPartsNotes]  = useState('')
  const [readyNotes,         setReadyNotes]         = useState('')

  const [saving,      setSaving]      = useState(false)
  const [issueSaving, setIssueSaving] = useState(false)
  const [awSaving,    setAwSaving]    = useState(false)
  const [message,     setMessage]     = useState('')
  const [msgType,     setMsgType]     = useState('success')
  const [quoteCount,  setQuoteCount]  = useState(0)
  const [quotations,  setQuotations]  = useState([])
  const [loadingQuotes, setLoadingQuotes] = useState(false)

  const workspaceRef = useRef(null)

  useEffect(() => { loadJobs(); loadQuoteCount(); loadPartsInterpreters() }, [])
  useEffect(() => { if (tab === 'Quotation Requests') loadQuotations() }, [tab])

  async function loadPartsInterpreters() {
    try {
      const res  = await apiFetch('/users?role=PartsInterpreter&limit=50')
      const data = await res.json()
      if (data.success) setPartsInterpreters(data.data.data || data.data || [])
    } catch { /* ignore */ }
  }

  async function loadQuoteCount() {
    try {
      const res  = await apiFetch('/quotations?sendToTechnician=true&limit=1')
      const data = await res.json()
      if (data.success) setQuoteCount(data.data.meta?.total ?? (data.data.data?.length || 0))
    } catch { /* ignore */ }
  }

  async function loadQuotations() {
    setLoadingQuotes(true)
    try {
      const res  = await apiFetch('/quotations?sendToTechnician=true&limit=50')
      const data = await res.json()
      if (data.success) setQuotations(data.data.data || [])
    } catch { /* ignore */ }
    finally { setLoadingQuotes(false) }
  }

  async function loadJobs() {
    setLoading(true)
    try {
      const res  = await apiFetch('/technician/jobs?limit=50')
      const data = await res.json()
      if (data.success) {
        const list = data.data.data || []
        setJobs(list)
        const active = list.find(j => ['InProgress', 'Accepted', 'AssignedToTechnician', 'AdditionalWorkApproved'].includes(j.status)) || list[0]
        if (active) await selectJob(active.id)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function selectJob(jobId) {
    setLoadingDetail(true)
    setMessage('')
    setCompleting(false)
    setShowAWForm(false)
    try {
      const res  = await apiFetch(`/technician/jobs/${jobId}`)
      const data = await res.json()
      if (data.success) {
        const job = data.data.job
        setSelectedJob(job)
        setProgress(job.progress || 0)
        setChecklist(job.checklistItems || [])
        setIssues(job.issues || [])
        setAdditionalWork(job.additionalWorkRequests || [])
      }
    } catch { /* ignore */ }
    finally { setLoadingDetail(false) }
  }

  const overallStatus = useMemo(() => {
    const open = issues.filter(i => i.status !== 'Resolved')
    if (open.some(i => i.severity === 'High'))   return { label: 'High severity issue', color: 'red' }
    if (open.some(i => i.severity === 'Medium')) return { label: 'Medium severity issue', color: 'amber' }
    return { label: 'Good to go', color: 'green' }
  }, [issues])

  const activeIssueSev = ISSUE_SEVERITY.find(s => s.value === newIssue.severity) || ISSUE_SEVERITY[0]

  async function assignPartsInterpreterFn() {
    if (!selectedJob || !assignPiId) { setMsgType('error'); setMessage('Select a Parts Interpreter'); return }
    setAssignPiBusy(true); setMessage('')
    try {
      const res  = await apiFetch(`/jobs/${selectedJob.id}/assign-parts-interpreter`, {
        method: 'PATCH',
        body: JSON.stringify({ partsInterpreterId: assignPiId, notes: assignPiNotes || undefined }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to assign'); return }
      setSelectedJob(p => ({ ...p, assignedPartsInterpreterId: assignPiId }))
      setMsgType('success'); setMessage('Parts Interpreter assigned to this job.')
      setAssignPiId(''); setAssignPiNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setAssignPiBusy(false) }
  }

  async function markWaitingParts() {
    if (!selectedJob) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/jobs/${selectedJob.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'WaitingParts', notes: waitingPartsNotes || undefined }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setSelectedJob(p => ({ ...p, status: 'WaitingParts' }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'WaitingParts' } : j))
      setMsgType('success'); setMessage('Job marked as Waiting for Parts.')
      setWaitingPartsNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function markReady() {
    if (!selectedJob) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/jobs/${selectedJob.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Ready', notes: readyNotes || undefined }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setSelectedJob(p => ({ ...p, status: 'Ready' }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'Ready' } : j))
      setMsgType('success'); setMessage('Job marked as Ready. Front Desk notified.')
      setReadyNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function startJob() {
    if (!selectedJob) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/technician/jobs/${selectedJob.id}/start`, { method: 'POST', body: JSON.stringify({}) })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to start job'); return }
      setSelectedJob(p => ({ ...p, status: 'InProgress' }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'InProgress' } : j))
      setMsgType('success'); setMessage('Job started — work is in progress.')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function saveProgressNotes() {
    if (!progressNotes.trim()) { setMsgType('error'); setMessage('Progress notes are required'); return }
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/technician/jobs/${selectedJob.id}/progress-notes`, {
        method: 'POST',
        body: JSON.stringify({ notes: progressNotes.trim(), progress }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to save notes'); return }
      setSelectedJob(p => ({ ...p, progress }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, progress } : j))
      setProgressNotes('')
      setMsgType('success'); setMessage('Progress notes saved.')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function completeJob() {
    if (!completionNotes.trim()) { setMsgType('error'); setMessage('Completion notes are required'); return }
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/technician/jobs/${selectedJob.id}/complete`, {
        method: 'POST',
        body: JSON.stringify({
          issueSeverity:        completionSev,
          completionNotes:      completionNotes.trim(),
          remainingIssues:      remainingIssues.trim() || undefined,
          customerAdvisoryNotes:advisoryNotes.trim()   || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to complete job'); return }
      setSelectedJob(p => ({ ...p, status: 'Completed', progress: 100 }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'Completed', progress: 100 } : j))
      setCompleting(false)
      setMsgType('success'); setMessage(`Job completed with ${completionSev} severity.`)
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function submitAdditionalWork() {
    if (!awDesc.trim()) { setMsgType('error'); setMessage('Description is required'); return }
    setAwSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/technician/jobs/${selectedJob.id}/additional-work`, {
        method: 'POST',
        body: JSON.stringify({
          description:          awDesc.trim(),
          reason:               awReason.trim()  || undefined,
          severity:             awSeverity,
          estimatedLabourHours: awLabourHours.trim() || undefined,
          estimatedPartsCost:   awPartsCost || undefined,
          estimatedTotalCost:   awTotalCost || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to submit additional work'); return }
      setAdditionalWork(p => [data.data.request, ...p])
      setSelectedJob(p => ({ ...p, status: 'AdditionalWorkIdentified' }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'AdditionalWorkIdentified' } : j))
      setAwDesc(''); setAwReason(''); setAwSeverity('Medium'); setAwLabourHours(''); setAwPartsCost(''); setAwTotalCost('')
      setShowAWForm(false)
      setMsgType('success'); setMessage('Additional work request sent to Front Desk.')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setAwSaving(false) }
  }

  async function addIssue() {
    if (!selectedJob) return
    const title = newIssue.title.trim() || 'Technician observation'
    setIssueSaving(true)
    try {
      const res  = await apiFetch(`/jobs/${selectedJob.id}/issues`, {
        method: 'POST',
        body: JSON.stringify({ title, severity: newIssue.severity, note: newIssue.note.trim() || activeIssueSev.helper }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to add issue'); return }
      setIssues(p => [data.data.issue, ...p])
      setNewIssue({ title: '', severity: 'High', note: '' })
      setMsgType('success'); setMessage('Issue added.')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setIssueSaving(false) }
  }

  async function updateChecklistItem(item, newState) {
    const color = newState === 'Done' ? 'Green' : newState === 'Failed' ? 'Red' : 'Amber'
    try {
      const res  = await apiFetch(`/jobs/${selectedJob.id}/checklist`, {
        method: 'POST',
        body: JSON.stringify({ itemId: item.id, state: newState, color }),
      })
      const data = await res.json()
      if (data.success) setChecklist(p => p.map(c => c.id === item.id ? data.data.item : c))
    } catch { /* ignore */ }
  }

  async function addChecklistItem() {
    if (!newCheckLabel.trim() || !selectedJob) return
    try {
      const res  = await apiFetch(`/jobs/${selectedJob.id}/checklist`, {
        method: 'POST',
        body: JSON.stringify({ label: newCheckLabel.trim() }),
      })
      const data = await res.json()
      if (data.success) { setChecklist(p => [...p, data.data.item]); setNewCheckLabel('') }
    } catch { /* ignore */ }
  }

  async function handleMediaUpload(e) {
    if (!selectedJob) return
    const files = Array.from(e.target.files || [])
    if (!files.length) return
    const fd = new FormData()
    files.forEach(f => fd.append('files', f))
    const base = (import.meta.env.VITE_API_URL || 'http://localhost:8007').replace(/\/api$/, '')
    try {
      await fetch(`${base}/api/jobs/${selectedJob.id}/media`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd,
      })
      setMsgType('success'); setMessage('Completion media uploaded.')
    } catch { /* ignore */ }
  }

  const today           = new Date().toDateString()
  const todayCount      = jobs.filter(j => new Date(j.createdAt).toDateString() === today).length
  const inProgressCount = jobs.filter(j => j.status === 'InProgress').length
  const waitingCount    = jobs.filter(j => ['WaitingParts', 'WaitingApproval', 'AdditionalWorkIdentified'].includes(j.status)).length
  const completedCount  = jobs.filter(j => ['Completed', 'TechnicianCompleted'].includes(j.status)).length

  const canStart       = selectedJob && ['Accepted', 'AssignedToTechnician', 'AdditionalWorkApproved', 'New'].includes(selectedJob.status)
  const canProgress    = selectedJob && selectedJob.status === 'InProgress'
  const canComplete    = selectedJob && ['InProgress', 'WaitingApproval', 'WaitingParts', 'AdditionalWorkApproved'].includes(selectedJob.status)
  const canAddWork     = selectedJob && ['InProgress', 'WaitingApproval', 'WaitingParts'].includes(selectedJob.status)
  const canWaitParts   = selectedJob && selectedJob.status === 'InProgress'
  const canMarkReady   = selectedJob && ['InProgress', 'WaitingParts'].includes(selectedJob.status)
  const canAssignParts = selectedJob && !['Completed', 'Closed', 'Cancelled', 'Ready'].includes(selectedJob.status)

  return (
    <div className="pageStack">
      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: tab === t ? 'var(--brand, #1a3c5e)' : '#f2f4f7',
            color: tab === t ? '#fff' : '#344054', transition: 'background .15s',
          }}>
            {t}{t === 'Quotation Requests' && quoteCount > 0 ? ` (${quoteCount})` : ''}
          </button>
        ))}
        <Link className="softBtn" to="/technician/quotation-update" style={{ marginLeft: 'auto' }}>
          <FileText size={15} /> Repair Items
        </Link>
      </div>

      <div className="metricGrid">
        <Card title="Assigned today"  value={loading ? '…' : String(todayCount)}      note="New today"        onClick={() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth' })} />
        <Card title="In progress"     value={loading ? '…' : String(inProgressCount)} note="Active jobs"      onClick={() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth' })} />
        <Card title="Waiting"         value={loading ? '…' : String(waitingCount)}    note="Parts / approval" onClick={() => workspaceRef.current?.scrollIntoView({ behavior: 'smooth' })} />
        <Card title="Pending quotes"  value={String(quoteCount)}                      note="Awaiting input"   onClick={() => setTab('Quotation Requests')} />
      </div>

      {/* ─── QUOTATION REQUESTS TAB ──────────────────────────────── */}
      {tab === 'Quotation Requests' && (
        <section className="panel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">From Front Desk</p>
              <h3>Quotations needing your technician input</h3>
              <p>Review each line item, add your technician notes, then send back to Front Desk.</p>
            </div>
          </div>
          {loadingQuotes ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
          ) : (
            <QuotationReviewPanel
              quotations={quotations}
              roleCode={(getUser()?.roleCode) || 'TECHNICIAN'}
              onRefresh={() => { loadQuotations(); loadQuoteCount() }}
            />
          )}
        </section>
      )}

      {/* ─── JOB WORKSPACE TAB ───────────────────────────────────── */}
      {tab === 'Job Workspace' && <>

      <section className="panel heroPanel">
        <p className="eyebrow">Technician workspace</p>
        <h2>Job progress, additional work &amp; completion</h2>
        <p>Start work, add progress notes, flag additional work for approval, and complete jobs with severity grading.</p>
        <div className="rowActions">
          <Link className="primaryBtn" to="/technician/quotation-update">
            <FileText size={16} /> Open repair items screen
          </Link>
        </div>
      </section>

      {message && (
        <section className="panel" style={{
          background: msgType === 'success' ? '#ecfdf3' : '#fee4e2',
          color: msgType === 'success' ? '#027a48' : '#d92d20',
          border: `1px solid ${msgType === 'success' ? '#abefc6' : '#fecdca'}`,
          fontWeight: 700,
        }}>
          {message}
        </section>
      )}

      {jobs.length > 1 && (
        <section className="panel" ref={workspaceRef}>
          <div className="sectionHeader compact">
            <div><p className="eyebrow">Assigned jobs</p><h3>Select a job to work on</h3></div>
          </div>
          <div className="tableWrap compactTable">
            <table>
              <thead>
                <tr><th>Job #</th><th>Customer</th><th>Repair</th><th>Status</th><th>Progress</th><th></th></tr>
              </thead>
              <tbody>
                {jobs.map(j => (
                  <tr key={j.id} style={{ background: selectedJob?.id === j.id ? '#f0f9ff' : undefined }}>
                    <td><strong>{j.jobNumber}</strong></td>
                    <td>{j.quotation?.customer?.name}</td>
                    <td>{j.quotation?.repairType}</td>
                    <td>
                      <span className={`pill ${j.status === 'Completed' ? 'green' : j.status === 'InProgress' ? 'blue' : 'amber'}`}>
                        {j.status}
                      </span>
                    </td>
                    <td>{j.progress}%</td>
                    <td><button className="softBtn" onClick={() => selectJob(j.id)}>Open</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {loading ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          Loading your jobs…
        </div>
      ) : jobs.length === 0 ? (
        <div className="panel">
          <div className="infoStrip">No jobs are currently assigned to you.</div>
        </div>
      ) : loadingDetail ? (
        <div className="panel" style={{ textAlign: 'center', padding: 40, color: 'var(--muted)' }}>
          Loading job details…
        </div>
      ) : selectedJob ? (
        <div className="techWorkspaceGrid">
          {/* Left column — phone workspace */}
          <div className="techPhone">
            <div className="phoneHeader">
              <Wrench />
              <div>
                <p>Job {selectedJob.jobNumber}</p>
                <h2>{selectedJob.quotation?.repairType || 'Service'}</h2>
              </div>
            </div>

            <div className={`bigStatus ${overallStatus.color}`}>{overallStatus.label}</div>

            <div className="techField">
              <span>Customer</span>
              <p style={{ fontSize: 13, marginTop: 4, color: 'var(--muted)' }}>
                {selectedJob.quotation?.customer?.name}
                {selectedJob.vehicle?.registrationNo ? ` · ${selectedJob.vehicle.registrationNo}` : ''}
                {selectedJob.vehicle?.makeModel ? ` — ${selectedJob.vehicle.makeModel}` : ''}
              </p>
            </div>

            <div className="techField">
              <span>Current status</span>
              <span className={`pill ${selectedJob.status === 'InProgress' ? 'blue' : selectedJob.status === 'Completed' ? 'green' : 'amber'}`} style={{ marginTop: 4, display: 'inline-block' }}>
                {selectedJob.status}
              </span>
            </div>

            {/* Start job button */}
            {canStart && (
              <div className="mobileActions">
                <button type="button" onClick={startJob} disabled={saving} style={{ background: '#039855', color: '#fff' }}>
                  <Check /> {saving ? 'Starting…' : 'Start Job'}
                </button>
              </div>
            )}

            {/* Progress notes */}
            {canProgress && (
              <>
                <label className="techField">
                  <span>Progress — {progress}%</span>
                  <input
                    type="range" min="0" max="100" step="5" value={progress}
                    onChange={e => setProgress(parseInt(e.target.value))}
                    style={{ width: '100%', margin: '8px 0' }}
                  />
                </label>
                <label className="techField">
                  <span>Progress notes</span>
                  <textarea
                    value={progressNotes}
                    onChange={e => setProgressNotes(e.target.value)}
                    placeholder="Describe current work status, what was done, what remains…"
                    rows={3}
                  />
                </label>
                <div className="mobileActions">
                  <button type="button" onClick={saveProgressNotes} disabled={saving}>
                    <Save /> {saving ? 'Saving…' : 'Save Progress Notes'}
                  </button>
                </div>
              </>
            )}

            {/* Waiting Parts action */}
            {canWaitParts && (
              <div className="techField">
                <span style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>Waiting for Parts</span>
                <textarea
                  value={waitingPartsNotes}
                  onChange={e => setWaitingPartsNotes(e.target.value)}
                  placeholder="Which parts are needed and why? (optional)"
                  rows={2}
                  style={{ width: '100%', fontSize: 12, borderRadius: 6, border: '1px solid #d0d5dd', padding: '6px 8px' }}
                />
                <button type="button" className="softBtn" onClick={markWaitingParts} disabled={saving}
                  style={{ marginTop: 6, borderColor: 'var(--amber)', color: '#b54708', width: '100%' }}>
                  Waiting for Parts
                </button>
              </div>
            )}

            {/* Mark Ready action */}
            {canMarkReady && (
              <div className="techField">
                <span style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>Mark as Ready</span>
                <textarea
                  value={readyNotes}
                  onChange={e => setReadyNotes(e.target.value)}
                  placeholder="Final notes / what was completed (optional)"
                  rows={2}
                  style={{ width: '100%', fontSize: 12, borderRadius: 6, border: '1px solid #d0d5dd', padding: '6px 8px' }}
                />
                <button type="button" className="primaryBtn" onClick={markReady} disabled={saving}
                  style={{ marginTop: 6, background: '#039855', color: '#fff', width: '100%' }}>
                  Mark as Ready
                </button>
              </div>
            )}

            {/* Assign Parts Interpreter */}
            {canAssignParts && (
              <div className="techField">
                <span style={{ fontWeight: 600, fontSize: 13, marginBottom: 6, display: 'block' }}>Assign Parts Interpreter</span>
                {selectedJob.assignedPartsInterpreterId && (
                  <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 4 }}>Currently assigned</p>
                )}
                <select
                  value={assignPiId}
                  onChange={e => setAssignPiId(e.target.value)}
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 12, marginBottom: 6 }}
                >
                  <option value="">— Select Parts Interpreter —</option>
                  {partsInterpreters.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <input
                  value={assignPiNotes}
                  onChange={e => setAssignPiNotes(e.target.value)}
                  placeholder="Notes (optional)"
                  style={{ width: '100%', padding: '6px 8px', borderRadius: 6, border: '1px solid #d0d5dd', fontSize: 12, marginBottom: 6, boxSizing: 'border-box' }}
                />
                <button type="button" className="softBtn" onClick={assignPartsInterpreterFn} disabled={assignPiBusy || !assignPiId}
                  style={{ width: '100%' }}>
                  {assignPiBusy ? 'Assigning…' : 'Assign Parts Interpreter'}
                </button>
              </div>
            )}

            {/* Checklist */}
            {checklist.map(item => (
              <div className="checkRow" key={item.id}>
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.state || 'Pending'}</span>
                </div>
                <select
                  value={item.state || ''}
                  onChange={e => updateChecklistItem(item, e.target.value)}
                  style={{ fontSize: 11, padding: '2px 6px', borderRadius: 6, border: '1px solid #d0d5dd' }}
                >
                  <option value="">Pending</option>
                  <option value="Done">Done</option>
                  <option value="Attention">Attention</option>
                  <option value="Failed">Failed</option>
                  <option value="NA">N/A</option>
                </select>
              </div>
            ))}

            {/* Complete job form */}
            {canComplete && !completing && (
              <div className="mobileActions" style={{ marginTop: 16 }}>
                <button type="button" onClick={() => setCompleting(true)} style={{ background: '#175cd3', color: '#fff' }}>
                  <ClipboardCheck /> Complete Job
                </button>
              </div>
            )}

            {completing && (
              <div className="completionCard">
                <div className="mediaPanelHead">
                  <ClipboardCheck size={18} />
                  <strong>Complete job — rate severity</strong>
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                  {COMPLETION_SEVERITY.map(s => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setCompletionSev(s.value)}
                      className={`softBtn ${completionSev === s.value ? s.color : ''}`}
                      style={{
                        flex: 1, minWidth: 90,
                        fontWeight: completionSev === s.value ? 700 : 400,
                        border: completionSev === s.value ? `2px solid currentColor` : undefined,
                      }}
                    >
                      {s.value}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                  {COMPLETION_SEVERITY.find(s => s.value === completionSev)?.helper}
                </p>
                <label className="techField">
                  <span>Completion notes <em style={{ color: 'var(--danger)' }}>*</em></span>
                  <textarea
                    value={completionNotes}
                    onChange={e => setCompletionNotes(e.target.value)}
                    placeholder="Describe what was done and the final state of the vehicle…"
                    rows={3}
                  />
                </label>
                <label className="techField">
                  <span>Remaining issues (optional)</span>
                  <textarea
                    value={remainingIssues}
                    onChange={e => setRemainingIssues(e.target.value)}
                    placeholder="Any issues that could not be resolved this visit…"
                    rows={2}
                  />
                </label>
                <label className="techField">
                  <span>Customer advisory notes (optional)</span>
                  <textarea
                    value={advisoryNotes}
                    onChange={e => setAdvisoryNotes(e.target.value)}
                    placeholder="Recommendations for the customer (e.g. change tyres at next visit)…"
                    rows={2}
                  />
                </label>
                <div className="uploadBox">
                  <Camera />
                  <p>Upload completion photo/video</p>
                  <input type="file" accept="image/*,video/*" multiple onChange={handleMediaUpload} />
                </div>
                <div className="mobileActions">
                  <button type="button" onClick={() => setCompleting(false)} className="softBtn">Cancel</button>
                  <button type="button" onClick={completeJob} disabled={saving} style={{ background: '#039855', color: '#fff' }}>
                    <Check /> {saving ? 'Submitting…' : 'Submit Completion'}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right column — issues + additional work */}
          <section className="panel issuePanel">

            {/* Additional work requests */}
            <div className="sectionHeader compact" style={{ marginBottom: 8 }}>
              <div>
                <p className="eyebrow">Additional work</p>
                <h3>Request additional repairs</h3>
              </div>
              {canAddWork && (
                <button className="softBtn" onClick={() => setShowAWForm(v => !v)}>
                  <Plus size={14} /> {showAWForm ? 'Cancel' : 'Request'}
                </button>
              )}
            </div>

            {showAWForm && (
              <div className="formGrid" style={{ marginBottom: 16 }}>
                <label className="wide">
                  Description <em style={{ color: 'var(--danger)' }}>*</em>
                  <textarea
                    value={awDesc}
                    onChange={e => setAwDesc(e.target.value)}
                    placeholder="Describe the additional work needed…"
                    rows={2}
                  />
                </label>
                <label>
                  Reason
                  <input value={awReason} onChange={e => setAwReason(e.target.value)} placeholder="Why is this needed?" />
                </label>
                <label>
                  Severity
                  <select value={awSeverity} onChange={e => setAwSeverity(e.target.value)}>
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </label>
                <label>
                  Est. labour hours
                  <input value={awLabourHours} onChange={e => setAwLabourHours(e.target.value)} placeholder="e.g. 2h" />
                </label>
                <label>
                  Est. parts cost
                  <input type="number" value={awPartsCost} onChange={e => setAwPartsCost(e.target.value)} placeholder="0.00" />
                </label>
                <label>
                  Est. total cost
                  <input type="number" value={awTotalCost} onChange={e => setAwTotalCost(e.target.value)} placeholder="0.00" />
                </label>
                <div className="wide" style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                  <button className="primaryBtn" onClick={submitAdditionalWork} disabled={awSaving}>
                    {awSaving ? 'Sending…' : 'Send to Front Desk'}
                  </button>
                </div>
              </div>
            )}

            {additionalWork.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                {additionalWork.map(aw => (
                  <article key={aw.id} style={{
                    background: aw.status === 'APPROVED' ? '#ecfdf3' : aw.status === 'REJECTED' ? '#fee4e2' : '#fffaeb',
                    borderRadius: 10, padding: '10px 14px', marginBottom: 8,
                    border: `1px solid ${aw.status === 'APPROVED' ? '#abefc6' : aw.status === 'REJECTED' ? '#fecdca' : '#fde68a'}`,
                  }}>
                    <strong style={{ fontSize: 13 }}>{aw.description}</strong>
                    <span className={`pill ${aw.status === 'APPROVED' ? 'green' : aw.status === 'REJECTED' ? 'red' : 'amber'}`} style={{ marginLeft: 8, fontSize: 11 }}>
                      {aw.status}
                    </span>
                    {aw.customerDecision && (
                      <p style={{ fontSize: 11, marginTop: 4, color: 'var(--muted)' }}>
                        Customer: {aw.customerDecision}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}

            {/* Issue log */}
            <div className="sectionHeader compact" style={{ marginTop: 8, marginBottom: 8 }}>
              <div>
                <p className="eyebrow">Issue severity</p>
                <h3>Add issue or observation</h3>
              </div>
              <span className={`pill ${activeIssueSev.color}`}>{activeIssueSev.value}</span>
            </div>

            <div className="formGrid twoCols">
              <label>
                Issue title
                <input
                  value={newIssue.title}
                  onChange={e => setNewIssue(p => ({ ...p, title: e.target.value }))}
                  placeholder="e.g. Oil leak found"
                />
              </label>
              <label>
                Severity
                <select
                  value={newIssue.severity}
                  onChange={e => setNewIssue(p => ({ ...p, severity: e.target.value }))}
                >
                  {ISSUE_SEVERITY.map(s => <option key={s.value}>{s.value}</option>)}
                </select>
              </label>
              <label className="wide">
                Technician note
                <textarea
                  value={newIssue.note}
                  onChange={e => setNewIssue(p => ({ ...p, note: e.target.value }))}
                  placeholder={activeIssueSev.helper}
                />
              </label>
            </div>

            <button className="primaryBtn" type="button" onClick={addIssue} disabled={issueSaving}>
              {issueSaving ? 'Saving…' : 'Add issue'}
            </button>

            <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
              <input
                style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13 }}
                value={newCheckLabel}
                onChange={e => setNewCheckLabel(e.target.value)}
                placeholder="Add checklist item (e.g. Road test completed)"
                onKeyDown={e => e.key === 'Enter' && addChecklistItem()}
              />
              <button className="softBtn" onClick={addChecklistItem}>
                <CheckSquare size={14} /> Add
              </button>
            </div>

            <div className="issueList" style={{ marginTop: 12 }}>
              {issues.map((issue, idx) => {
                const sev = ISSUE_SEVERITY.find(s => s.value === issue.severity) || ISSUE_SEVERITY[2]
                return (
                  <article className={`issueCard ${sev.color}`} key={issue.id || idx}>
                    <div>
                      <AlertTriangle size={18} />
                      <strong>{issue.title}</strong>
                      {issue.status === 'Resolved' && (
                        <span style={{ marginLeft: 8, fontSize: 11, color: '#027a48' }}>(resolved)</span>
                      )}
                    </div>
                    <p>{issue.note}</p>
                    <span className={`pill ${sev.color}`}>{issue.severity}</span>
                  </article>
                )
              })}
            </div>
          </section>
        </div>
      ) : null}

      </>}
    </div>
  )
}

function Card({ title, value, note, onClick, to }) {
  if (to) {
    return (
      <Link to={to} className="metricCard metricCardLink" style={{ textDecoration: 'none', color: 'inherit' }}>
        <ChevronRight size={13} style={{ position: 'absolute', top: 10, right: 10, color: 'var(--muted)', opacity: 0.5 }} />
        <p>{title}</p>
        <h2>{value}</h2>
        <span>{note}</span>
      </Link>
    )
  }
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

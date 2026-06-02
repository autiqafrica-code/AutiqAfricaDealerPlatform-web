'use strict'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw, X } from 'lucide-react'
import { apiFetch, getUser } from '../../utils/api'

const COLUMNS = [
  { key: 'New',          label: 'New',           statuses: ['New', 'SentToWorkshopController'] },
  { key: 'Accepted',     label: 'Accepted',       statuses: ['Accepted', 'AssignedToTechnician'] },
  { key: 'InProgress',   label: 'In Progress',    statuses: ['InProgress', 'AdditionalWorkIdentified', 'AdditionalWorkApproved', 'AdditionalWorkRejected'] },
  { key: 'WaitingParts', label: 'Waiting Parts',  statuses: ['WaitingParts'] },
  { key: 'Ready',        label: 'Ready',          statuses: ['Ready', 'TechnicianCompleted', 'QCReview'] },
  { key: 'Payment',      label: 'Payment',        statuses: ['Payment', 'WaitingApproval', 'ReadyForInvoice', 'InvoiceGenerated', 'PaymentCleared'] },
  { key: 'Completed',    label: 'Completed',      statuses: ['Completed', 'ReadyForDelivery', 'CustomerContactedForDelivery', 'VehicleDelivered', 'Closed'] },
]

// Role-constrained transitions: which target column keys each role is allowed to drop into
const ROLE_ALLOWED = {
  FRONT_DESK:          ['Accepted', 'Payment', 'Completed'],
  MANAGER:             ['New', 'Accepted', 'InProgress', 'WaitingParts', 'Ready', 'Payment', 'Completed'],
  WORKSHOP_CONTROLLER: ['Accepted', 'InProgress', 'WaitingParts', 'Ready'],
  TECHNICIAN:          ['InProgress', 'WaitingParts', 'Ready'],
  PARTS_INTERPRETER:   ['InProgress', 'WaitingParts', 'Ready'],
}

// The target status to set when dropping onto a column
const COLUMN_TARGET_STATUS = {
  New:          'New',
  Accepted:     'Accepted',
  InProgress:   'InProgress',
  WaitingParts: 'WaitingParts',
  Ready:        'Ready',
  Payment:      'Payment',
  Completed:    'Completed',
}

const PRIORITY_BG = { Red: '#ef4444', Amber: '#f59e0b', Green: '#22c55e' }

function NotesModal({ fromStatus, toStatus, onConfirm, onCancel, busy }) {
  const [notes, setNotes] = useState('')

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={onCancel}
    >
      <div
        style={{ background: '#fff', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 8px 32px rgba(0,0,0,.18)' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
            Move to <span style={{ color: 'var(--teal)' }}>{toStatus}</span>
          </h3>
          <button onClick={onCancel} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
            <X size={18} />
          </button>
        </div>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          From: <strong>{fromStatus}</strong> → <strong>{toStatus}</strong>
        </p>
        <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
          Notes <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(optional)</span>
        </label>
        <textarea
          autoFocus
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Add notes about this status change…"
          rows={3}
          style={{ width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
        />
        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button
            onClick={onCancel}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d0d5dd', background: '#fff', cursor: 'pointer', fontSize: 13 }}
          >
            Cancel
          </button>
          <button
            onClick={() => onConfirm(notes)}
            disabled={busy}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--teal)', color: '#fff', cursor: busy ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}
          >
            {busy ? 'Updating…' : 'Confirm move'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Kanban() {
  const user               = getUser()
  const roleCode           = user?.roleCode || 'FRONT_DESK'
  const allowedCols        = ROLE_ALLOWED[roleCode] || Object.keys(COLUMN_TARGET_STATUS)

  const [jobs,      setJobs]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [lastPoll,  setLastPoll]  = useState(null)
  const [dragOver,  setDragOver]  = useState(null)

  // Notes modal state
  const [pendingDrop, setPendingDrop] = useState(null) // { jobId, fromStatus, toColKey }
  const [moveBusy,    setMoveBusy]    = useState(false)
  const [moveErr,     setMoveErr]     = useState('')

  const dragJobId = useRef(null)

  const loadJobs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    setError('')
    try {
      const res  = await apiFetch('/jobs?limit=200')
      const data = await res.json()
      if (data.success) {
        setJobs(data.data?.data || data.data || [])
        setLastPoll(new Date())
      } else {
        setError(data.message || 'Failed to load jobs')
      }
    } catch {
      setError('Network error — could not load job board')
    } finally {
      if (!silent) setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadJobs()
    const timer = setInterval(() => loadJobs(true), 30_000)
    return () => clearInterval(timer)
  }, [loadJobs])

  function handleDragStart(e, jobId) {
    dragJobId.current = jobId
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, colKey) {
    if (!allowedCols.includes(colKey)) return
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOver(colKey)
  }

  function handleDragLeave() {
    setDragOver(null)
  }

  function handleDrop(e, colKey) {
    e.preventDefault()
    setDragOver(null)
    if (!allowedCols.includes(colKey)) return
    const jobId = dragJobId.current
    if (!jobId) return
    const job = jobs.find(j => j.id === jobId)
    if (!job) return
    const targetStatus = COLUMN_TARGET_STATUS[colKey]
    if (COLUMNS.find(c => c.statuses.includes(job.status))?.key === colKey) return // same column
    setPendingDrop({ jobId, fromStatus: job.status, toColKey: colKey, targetStatus })
    dragJobId.current = null
  }

  async function confirmMove(notes) {
    if (!pendingDrop) return
    setMoveBusy(true); setMoveErr('')
    try {
      const res  = await apiFetch(`/jobs/${pendingDrop.jobId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: pendingDrop.targetStatus, notes: notes || undefined }),
      })
      const data = await res.json()
      if (!data.success) { setMoveErr(data.message || 'Failed to update status'); setMoveBusy(false); return }
      setJobs(prev => prev.map(j => j.id === pendingDrop.jobId ? { ...j, status: pendingDrop.targetStatus } : j))
      setPendingDrop(null)
    } catch {
      setMoveErr('Network error')
    } finally {
      setMoveBusy(false)
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--teal)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 0 12px', flexShrink: 0, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          {lastPoll && ` · updated ${lastPoll.toLocaleTimeString()}`}
        </span>
        <span style={{ fontSize: 12, color: 'var(--muted)', background: '#f2f4f7', padding: '3px 10px', borderRadius: 12 }}>
          Drag cards to move status
        </span>
        <button
          onClick={() => loadJobs()}
          style={{ marginLeft: 'auto', background: 'none', border: '1px solid #e4e7ec', borderRadius: 8, padding: '4px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}
      {moveErr && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 13 }}>
          <AlertCircle size={16} /> {moveErr}
        </div>
      )}

      <div className="kanbanScroller">
        {COLUMNS.map(col => {
          const colJobs    = jobs.filter(j => col.statuses.includes(j.status))
          const canDrop    = allowedCols.includes(col.key)
          const isOver     = dragOver === col.key

          return (
            <section
              className="kanbanCol"
              key={col.key}
              onDragOver={e => handleDragOver(e, col.key)}
              onDragLeave={handleDragLeave}
              onDrop={e => handleDrop(e, col.key)}
              style={{
                outline: isOver && canDrop ? '2px dashed var(--teal)' : isOver && !canDrop ? '2px dashed #fca5a5' : 'none',
                background: isOver && canDrop ? '#f0fdfa' : isOver && !canDrop ? '#fef2f2' : undefined,
                transition: 'outline .1s, background .1s',
              }}
            >
              <h3>
                {col.label}
                <span style={{ marginLeft: 8, background: '#e4e7ec', color: '#667085', borderRadius: 12, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>
                  {colJobs.length}
                </span>
                {!canDrop && (
                  <span style={{ marginLeft: 6, fontSize: 10, color: '#94a3b8', fontWeight: 400 }}>locked</span>
                )}
              </h3>

              {colJobs.length === 0 ? (
                <p style={{ padding: '12px 0', fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0 }}>—</p>
              ) : (
                colJobs.map(job => (
                  <article
                    className="jobCard"
                    key={job.id}
                    draggable
                    onDragStart={e => handleDragStart(e, job.id)}
                    style={{ cursor: 'grab', userSelect: 'none' }}
                  >
                    <div className="jobTop">
                      <strong style={{ fontSize: 12 }}>{job.jobNumber}</strong>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%', flexShrink: 0,
                        background: PRIORITY_BG[job.priority] || '#94a3b8',
                        display: 'inline-block',
                      }} />
                    </div>

                    <h4 style={{ margin: '4px 0 2px', fontSize: 13, fontWeight: 700 }}>
                      {job.quotation?.customer?.name || '—'}
                    </h4>

                    <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--muted)' }}>
                      {job.vehicle?.makeModel || '—'}
                      {job.vehicle?.registrationNo ? ` · ${job.vehicle.registrationNo}` : ''}
                    </p>

                    {job.quotation?.repairType && (
                      <p style={{ margin: '0 0 6px', fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>
                        {job.quotation.repairType}
                      </p>
                    )}

                    <div className="progress">
                      <span style={{ width: `${job.progress || 0}%` }} />
                    </div>

                    <small style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 11, color: 'var(--muted)' }}>
                      <span>{job.assignedTechnician?.name || job.assignedPartsInterpreter?.name || 'Unassigned'}</span>
                      {job.quotation?.totalEstimate
                        ? <span>{job.quotation.currency || 'ZAR'} {Number(job.quotation.totalEstimate).toLocaleString()}</span>
                        : null}
                    </small>
                  </article>
                ))
              )}
            </section>
          )
        })}
      </div>

      {pendingDrop && (
        <NotesModal
          fromStatus={pendingDrop.fromStatus}
          toStatus={pendingDrop.targetStatus}
          onConfirm={confirmMove}
          onCancel={() => { setPendingDrop(null); setMoveErr('') }}
          busy={moveBusy}
        />
      )}
    </div>
  )
}

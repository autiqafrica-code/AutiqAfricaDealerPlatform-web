import { useCallback, useEffect, useState } from 'react'
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react'
import { apiFetch } from '../../utils/api'

const COLUMNS = [
  { key: 'New',          label: 'New',           statuses: ['New', 'SentToWorkshopController'] },
  { key: 'Accepted',     label: 'Accepted',       statuses: ['Accepted', 'AssignedToTechnician'] },
  { key: 'InProgress',   label: 'In Progress',    statuses: ['InProgress', 'AdditionalWorkIdentified', 'AdditionalWorkApproved', 'AdditionalWorkRejected'] },
  { key: 'WaitingParts', label: 'Waiting Parts',  statuses: ['WaitingParts'] },
  { key: 'Payment',      label: 'Payment',        statuses: ['Payment', 'WaitingApproval', 'ReadyForInvoice', 'InvoiceGenerated', 'PaymentCleared', 'TechnicianCompleted', 'QCReview'] },
  { key: 'Ready',        label: 'Ready',          statuses: ['Ready', 'ReadyForDelivery', 'CustomerContactedForDelivery'] },
  { key: 'Completed',    label: 'Completed',      statuses: ['Completed', 'VehicleDelivered', 'Closed'] },
]

const PRIORITY_BG = { Red: '#ef4444', Amber: '#f59e0b', Green: '#22c55e' }

export default function Kanban() {
  const [jobs,     setJobs]     = useState([])
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState('')
  const [lastPoll, setLastPoll] = useState(null)

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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '60px 0' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--teal)' }} />
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '0 0 12px', flexShrink: 0 }}>
        <span style={{ fontSize: 13, color: 'var(--muted)' }}>
          {jobs.length} job{jobs.length !== 1 ? 's' : ''}
          {lastPoll && ` · updated ${lastPoll.toLocaleTimeString()}`}
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

      <div className="kanbanScroller">
        {COLUMNS.map(col => {
          const colJobs = jobs.filter(j => col.statuses.includes(j.status))
          return (
            <section className="kanbanCol" key={col.key}>
              <h3>
                {col.label}
                <span style={{ marginLeft: 8, background: '#e4e7ec', color: '#667085', borderRadius: 12, padding: '1px 8px', fontSize: 12, fontWeight: 600 }}>
                  {colJobs.length}
                </span>
              </h3>

              {colJobs.length === 0 ? (
                <p style={{ padding: '12px 0', fontSize: 12, color: '#94a3b8', textAlign: 'center', margin: 0 }}>—</p>
              ) : (
                colJobs.map(job => (
                  <article className="jobCard" key={job.id}>
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
                      <span>{job.assignedTechnician?.name || 'Unassigned'}</span>
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
    </div>
  )
}

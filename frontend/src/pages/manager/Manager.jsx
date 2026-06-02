import { useCallback, useEffect, useState } from 'react'
import {
  AlertCircle, AlertTriangle, BarChart2, CalendarDays, CheckCircle2,
  ChevronDown, ChevronLeft, ChevronRight, ClipboardList, Clock, Menu,
  RefreshCw, Search, ShieldCheck, Users, Wrench, X,
} from 'lucide-react'
import { apiFetch, getToken } from '../../utils/api'

// ─── helpers ─────────────────────────────────────────────────────────────────

function fmt(val) {
  if (val === null || val === undefined) return '—'
  return String(val)
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

function addDays(date, n) {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function toIsoDate(date) {
  return date.toISOString().split('T')[0]
}

function getPriorityClass(p) {
  const v = (p || '').toLowerCase()
  if (v === 'red' || v === 'high' || v === 'critical') return 'red'
  if (v === 'amber' || v === 'medium') return 'amber'
  return 'green'
}

function statusLabel(s) {
  const map = {
    New: 'New', Accepted: 'Accepted', InProgress: 'In Progress',
    WaitingApproval: 'Waiting Approval', WaitingParts: 'Waiting Parts',
    Payment: 'Payment', Completed: 'Completed', QCReview: 'QC Review',
    Critical: 'Critical', Ready: 'Ready',
    Draft: 'Draft', InternalReview: 'Under Review',
    InternalUpdatesReceived: 'Updates Received', SentToCustomer: 'Sent to Customer',
    CustomerApproved: 'Approved', CustomerRejected: 'Rejected',
    Confirmed: 'Confirmed', Cancelled: 'Cancelled',
    WaitingApproval2: 'Waiting Approval',
  }
  return map[s] || s
}

function statusClass(s) {
  if (['New', 'Draft', 'Confirmed'].includes(s)) return 'blue'
  if (['InProgress', 'Accepted', 'InternalReview'].includes(s)) return 'amber'
  if (['WaitingParts', 'WaitingApproval', 'SentToCustomer', 'InternalUpdatesReceived'].includes(s)) return 'amber'
  if (['QCReview', 'Critical', 'Payment'].includes(s)) return 'red'
  if (['Completed', 'Ready', 'CustomerApproved'].includes(s)) return 'green'
  if (['CustomerRejected', 'Cancelled'].includes(s)) return 'red'
  return 'green'
}

function roleLabel(r) {
  const m = {
    Technician: 'Technician', WorkshopController: 'Workshop Controller',
    Manager: 'Manager', FrontDesk: 'Front Desk', Accounts: 'Accounts',
    PartsInterpreter: 'Parts Interpreter', CEO: 'CEO',
  }
  return m[r] || r
}

const DAY_NAMES  = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
const MONTHS     = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTH_ABBR = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']

function getMondayOfWeek(date) {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// ─── MetricCard ──────────────────────────────────────────────────────────────

function MetricCard({ title, value, note, accent }) {
  return (
    <article className="metricCard" style={accent ? { borderTop: `3px solid ${accent}` } : {}}>
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </article>
  )
}

// ─── LoadingState / EmptyState ────────────────────────────────────────────────

function Loading() {
  return <div className="infoStrip" style={{ textAlign: 'center' }}>Loading…</div>
}

function Empty({ text = 'No records found.' }) {
  return <div className="infoStrip">{text}</div>
}

function Err({ text }) {
  return <div className="infoStrip" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }}>{text}</div>
}

// ─── Tab bar ─────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'dashboard',   label: 'Dashboard',   Icon: BarChart2 },
  { id: 'calendar',    label: 'Calendar',    Icon: CalendarDays },
  { id: 'jobs',        label: 'Jobs',        Icon: Wrench },
  { id: 'quotations',  label: 'Quotations',  Icon: ClipboardList },
  { id: 'staff',       label: 'Staff',       Icon: Users },
]

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ═══════════════════════════════════════════════════════════════════════════

function DashboardTab() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    setLoading(true)
    apiFetch('/manager/dashboard')
      .then(r => r.json())
      .then(j => {
        if (j.success) setData(j.data)
        else setErr(j.message || 'Failed to load dashboard')
      })
      .catch(() => setErr('Network error loading dashboard'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (err) return <Err text={err} />
  if (!data) return <Empty />

  const limitPct = Math.min(Math.round((data.todayJobCount / data.dailyJobLimit) * 100), 100)
  const limitColor = data.todayJobCount > data.dailyJobLimit ? '#ef4444'
    : data.todayJobCount >= data.dailyJobLimit * 0.9 ? '#f59e0b' : '#22c55e'

  return (
    <div className="pageStack">
      {/* Workshop info strip */}
      <div className="infoStrip" style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        <span><Clock size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Hours: {data.openingTime} – {data.closingTime}
        </span>
        <span><Wrench size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Daily limit: {data.dailyJobLimit} jobs
        </span>
        <span><Users size={15} style={{ verticalAlign: 'middle', marginRight: 6 }} />
          Active staff: {data.staffCount} &nbsp;|&nbsp; Technicians: {data.technicianCount}
        </span>
      </div>

      {/* Daily limit bar */}
      <section className="panel">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Today's job limit</p>
            <h3>{data.todayJobCount} / {data.dailyJobLimit} jobs created today</h3>
          </div>
          {data.todayJobCount > data.dailyJobLimit && (
            <span className="pill red"><AlertTriangle size={14} /> Over capacity</span>
          )}
          {data.todayJobCount >= data.dailyJobLimit * 0.9 && data.todayJobCount <= data.dailyJobLimit && (
            <span className="pill amber"><AlertCircle size={14} /> Near limit</span>
          )}
        </div>
        <div className="capacityTrack">
          <span style={{ width: `${limitPct}%`, background: limitColor }} />
        </div>
        <p className="capacityText">
          {data.todayJobCount > data.dailyJobLimit
            ? 'Daily capacity exceeded — manager action may be needed.'
            : `${data.dailyJobLimit - data.todayJobCount} slots remaining today.`}
        </p>
      </section>

      {/* Appointments */}
      <div className="metricGrid">
        <MetricCard title="Today's appointments" value={fmt(data.todayAppointments)} note="Booked for today" />
        <MetricCard title="Active jobs" value={fmt(data.activeJobs)} note="Open (excl. completed)" />
        <MetricCard title="In progress" value={fmt(data.inProgressJobs)} note="Currently being worked" accent="#f59e0b" />
        <MetricCard title="Completed today" value={fmt(data.completedTodayJobs)} note="Finished today" accent="#22c55e" />
      </div>

      {/* Job status breakdown */}
      <div className="metricGrid">
        <MetricCard title="New jobs" value={fmt(data.newJobs)} note="Awaiting assignment" />
        <MetricCard title="Waiting parts" value={fmt(data.waitingPartsJobs)} note="Parts outstanding" accent="#f59e0b" />
        <MetricCard title="QC review" value={fmt(data.qcReviewJobs)} note="Awaiting manager check" accent="#3b82f6" />
        <MetricCard title="Critical jobs" value={fmt(data.criticalJobs)} note="Red priority" accent="#ef4444" />
      </div>

      {/* Quotation summary */}
      <div className="metricGrid">
        <MetricCard title="Total quotations" value={fmt(data.totalQuotations)} note="All time" />
        <MetricCard title="Open quotations" value={fmt(data.pendingQuotations)} note="Not yet approved/rejected" />
        <MetricCard title="Approved quotations" value={fmt(data.approvedQuotations)} note="Customer approved" accent="#22c55e" />
        <MetricCard title="Failed component reviews" value={fmt(data.pendingComponents)} note="Pending parts review" accent="#f59e0b" />
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// CALENDAR TAB
// ═══════════════════════════════════════════════════════════════════════════

function CalendarTab() {
  const [monday, setMonday] = useState(() => getMondayOfWeek(new Date()))
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [selected, setSelected] = useState(null)

  const startStr = toIsoDate(monday)
  const endStr   = toIsoDate(addDays(monday, 7))

  const load = useCallback(() => {
    setLoading(true)
    setErr('')
    apiFetch(`/manager/calendar?startDate=${startStr}&endDate=${endStr}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setData(j.data)
        else setErr(j.message || 'Failed to load calendar')
      })
      .catch(() => setErr('Network error loading calendar'))
      .finally(() => setLoading(false))
  }, [startStr, endStr])

  useEffect(() => { load() }, [load])

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const weekEnd  = addDays(monday, 6)
  const todayStr = toIsoDate(new Date())

  const weekLabel = (() => {
    const s = `${MONTH_ABBR[monday.getMonth()]} ${monday.getDate()}`
    const e = monday.getMonth() === weekEnd.getMonth()
      ? String(weekEnd.getDate())
      : `${MONTH_ABBR[weekEnd.getMonth()]} ${weekEnd.getDate()}`
    return `${s} – ${e}`
  })()

  return (
    <div className="pageStack">
      <section className="panel">

        {/* ── Mobile header (≤680px only) ──────────────────────────────── */}
        <div className="mobileCalendarHeader">
          <button className="mobileCalMenuBtn" type="button" aria-label="Menu"><Menu size={22} /></button>
          <button className="mobileCalMonth" type="button">
            <span>{MONTHS[monday.getMonth()]} {monday.getFullYear()}</span>
            <ChevronDown size={16} />
          </button>
          <div className="mobileCalHeaderRight">
            <button type="button" aria-label="Search"><Search size={22} /></button>
            <div className="mobileCalDateBadge">{new Date().getDate()}</div>
            <div className="mobileCalAvatar">M</div>
          </div>
        </div>

        {/* ── Mobile week navigation (≤680px only) ─────────────────────── */}
        <div className="mgrMobileCalNav">
          <button className="softBtn" type="button" onClick={() => setMonday(m => addDays(m, -7))}>
            <ChevronLeft size={15} /> Prev
          </button>
          <button className="softBtn" type="button" onClick={() => setMonday(getMondayOfWeek(new Date()))}>
            Today
          </button>
          <button className="softBtn" type="button" onClick={() => setMonday(m => addDays(m, 7))}>
            Next <ChevronRight size={15} />
          </button>
        </div>

        {/* ── Desktop header (hidden ≤680px) ───────────────────────────── */}
        <div className="sectionHead managerCalendarHead desktopCalHead">
          <div>
            <p className="eyebrow">Manager calendar</p>
            <h2>Workshop appointments and daily capacity</h2>
            <span>View appointments, QC slots, and daily job limit across the week.</span>
          </div>
          <div className="managerCalendarActions">
            <button className="softBtn" type="button" onClick={() => setMonday(m => addDays(m, -7))}>
              <ChevronLeft size={17} /> Prev week
            </button>
            <button className="softBtn" type="button" onClick={() => setMonday(getMondayOfWeek(new Date()))}>
              Today
            </button>
            <button className="softBtn" type="button" onClick={() => setMonday(m => addDays(m, 7))}>
              Next week <ChevronRight size={17} />
            </button>
          </div>
        </div>

        {/* ── Desktop summary chips (hidden ≤680px) ────────────────────── */}
        {data && (
          <div className="managerCalendarSummary mgrDesktopOnly">
            <div><CalendarDays size={19} /><span>Week of {fmtDate(startStr)}</span></div>
            <div><Clock size={19} /><span>Workshop hours: {data.openingTime} – {data.closingTime}</span></div>
            <div><Wrench size={19} /><span>Daily limit: {data.dailyJobLimit} jobs</span></div>
          </div>
        )}

        {loading && <Loading />}
        {err && <Err text={err} />}

        {!loading && !err && data && (
          <>
            {/* ── Desktop grid (hidden ≤680px) ─────────────────────────── */}
            <div className="managerCalendarGrid mgrDesktopGrid">
              {weekDays.map((day, idx) => {
                const key   = toIsoDate(day)
                const appts = data.grouped?.[key] || []
                const jobs  = data.jobCountMap?.[key] ?? 0
                const limit = data.dailyJobLimit || 30
                const over  = jobs > limit
                const near  = !over && jobs >= limit * 0.85

                return (
                  <article className={`managerDayCard ${over ? 'overLimit' : ''}`} key={key}>
                    <div className="managerDayTop">
                      <div>
                        <strong>{DAY_NAMES[idx]}</strong>
                        <span>{day.getDate()} {MONTHS[day.getMonth()]}</span>
                      </div>
                      <span className={`pill ${over ? 'red' : near ? 'amber' : 'green'}`}>
                        {jobs}/{limit}
                      </span>
                    </div>

                    <div className="capacityTrack">
                      <span style={{ width: `${Math.min((jobs / limit) * 100, 100)}%`,
                        background: over ? '#ef4444' : near ? '#f59e0b' : '#22c55e' }} />
                    </div>

                    <p className="capacityText">
                      {over ? 'Capacity exceeded.' : near ? 'Near daily limit.' : 'Within capacity.'}
                    </p>

                    {appts.length === 0 ? (
                      <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>No appointments</p>
                    ) : (
                      <div className="appointmentList">
                        {appts.map(a => (
                          <div className="appointmentItem" key={a.id}
                            style={{ cursor: 'pointer' }} onClick={() => setSelected(a)}>
                            <strong>{a.appointmentTime}</strong>
                            <div>
                              <span>{a.customer?.name}</span>
                              <small>{a.vehicle?.makeModel} • {a.serviceType}</small>
                            </div>
                            <em className={`pill ${statusClass(a.status)}`} style={{ fontSize: 11 }}>
                              {statusLabel(a.status)}
                            </em>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                )
              })}
            </div>

            {/* ── Mobile schedule / agenda view (≤680px only) ──────────── */}
            <div className="mgrMobileSchedule">
              <div className="scheduleWeekHeader">{weekLabel}</div>
              {weekDays.map((day, idx) => {
                const key   = toIsoDate(day)
                const appts = data.grouped?.[key] || []
                const jobs  = data.jobCountMap?.[key] ?? 0
                const limit = data.dailyJobLimit || 30
                const over  = jobs > limit
                const near  = !over && jobs >= limit * 0.85
                const isToday = key === todayStr

                return (
                  <div key={key} className="scheduleDayRow">
                    <div className="scheduleDayLabel">
                      <span className="scheduleDayName">{DAY_NAMES[idx]}</span>
                      <span className={`scheduleDayNum${isToday ? ' scheduleToday' : ''}`}>
                        {day.getDate()}
                      </span>
                      <span className={`mgrCapBadge ${over ? 'red' : near ? 'amber' : 'green'}`}>
                        {jobs}/{limit}
                      </span>
                    </div>
                    <div className="scheduleDayEvents">
                      {appts.length > 0
                        ? appts.map(a => (
                            <div key={a.id} className="scheduleEventCard" onClick={() => setSelected(a)}>
                              <span>{a.customer?.name || 'Appointment'}</span>
                              <small>{a.appointmentTime}</small>
                            </div>
                          ))
                        : <span className="scheduleNothingPlanned">No appointments</span>
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </section>

      {/* Appointment detail modal */}
      {selected && (
        <div className="modalBackdrop" onClick={() => setSelected(null)}>
          <div className="modalBox" onClick={e => e.stopPropagation()}>
            <div className="modalHead">
              <h3>Appointment Detail</h3>
              <button className="iconBtn" onClick={() => setSelected(null)}><X size={18} /></button>
            </div>
            <div className="formGrid">
              <label>Customer<input readOnly value={selected.customer?.name || '—'} /></label>
              <label>Phone<input readOnly value={selected.customer?.phone || '—'} /></label>
              <label>Vehicle<input readOnly value={`${selected.vehicle?.makeModel} (${selected.vehicle?.registrationNo})`} /></label>
              <label>Date<input readOnly value={fmtDate(selected.appointmentDate)} /></label>
              <label>Time<input readOnly value={selected.appointmentTime || '—'} /></label>
              <label>Service type<input readOnly value={selected.serviceType || '—'} /></label>
              <label>Status<input readOnly value={statusLabel(selected.status)} /></label>
              <label className="wide">Notes<textarea readOnly value={selected.notes || '—'} rows={3} /></label>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// JOBS TAB
// ═══════════════════════════════════════════════════════════════════════════

function JobsTab() {
  const [jobs, setJobs] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [qcNote, setQcNote] = useState('')
  const [qcMsg, setQcMsg] = useState('')
  const [qcBusy, setQcBusy] = useState(false)

  const loadJobs = useCallback(() => {
    setLoading(true)
    setErr('')
    const params = new URLSearchParams({ page, limit: 20 })
    if (filterStatus)   params.set('status', filterStatus)
    if (filterPriority) params.set('priority', filterPriority)
    apiFetch(`/manager/jobs?${params}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) { setJobs(j.data.data || []); setTotal(j.data.total || 0) }
        else setErr(j.message || 'Failed to load jobs')
      })
      .catch(() => setErr('Network error'))
      .finally(() => setLoading(false))
  }, [page, filterStatus, filterPriority])

  useEffect(() => { loadJobs() }, [loadJobs])

  function openDetail(job) {
    setSelected(null)
    setQcMsg('')
    setQcNote('Reviewed by manager. QC approved.')
    setDetailLoading(true)
    apiFetch(`/manager/jobs/${job.id}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setSelected(j.data.job)
        else setQcMsg(j.message || 'Failed to load job detail')
      })
      .catch(() => setQcMsg('Network error'))
      .finally(() => setDetailLoading(false))
  }

  async function handleQcApprove() {
    if (!selected) return
    setQcBusy(true)
    setQcMsg('')
    const r = await apiFetch(`/jobs/${selected.id}/qc-approve`, { method: 'PATCH' })
    const j = await r.json()
    if (j.success) {
      setQcMsg('QC approved — job status set to Ready.')
      loadJobs()
    } else {
      setQcMsg(j.message || 'QC approval failed.')
    }
    setQcBusy(false)
  }

  const totalPages = Math.ceil(total / 20)

  return (
    <div className="pageStack">
      {/* Filters */}
      <section className="panel">
        <div className="formGrid adminForm twoCols" style={{ marginBottom: 0 }}>
          <label>
            Status
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
              <option value="">All statuses</option>
              {['New','Accepted','InProgress','WaitingApproval','WaitingParts','Payment','QCReview','Critical','Ready','Completed'].map(s => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1) }}>
              <option value="">All priorities</option>
              <option value="Red">Red</option>
              <option value="Amber">Amber</option>
              <option value="Green">Green</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        {loading && <Loading />}
        {err && <Err text={err} />}
        {!loading && !err && jobs.length === 0 && <Empty text="No jobs match current filters." />}
        {!loading && !err && jobs.length > 0 && (
          <>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Job #</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Technician</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Progress</th>
                    <th>Open issues</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map(j => (
                    <tr key={j.id}>
                      <td>{j.jobNumber}</td>
                      <td>{j.quotation?.customer?.name || '—'}</td>
                      <td>{j.vehicle?.makeModel || j.quotation?.vehicle?.makeModel || '—'}</td>
                      <td>{j.assignedTechnician?.name || '—'}</td>
                      <td><span className={`pill ${statusClass(j.status)}`}>{statusLabel(j.status)}</span></td>
                      <td><span className={`pill ${getPriorityClass(j.priority)}`}>{j.priority}</span></td>
                      <td>{j.progress}%</td>
                      <td>{j._count?.issues ?? j.issues?.length ?? 0}</td>
                      <td>
                        <button className="softBtn" style={{ padding: '4px 10px' }} onClick={() => openDetail(j)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="paginationRow">
                <button className="softBtn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={16} /> Prev
                </button>
                <span>Page {page} of {totalPages} &nbsp;({total} jobs)</span>
                <button className="softBtn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Job detail / QC modal */}
      {(selected || detailLoading) && (
        <div className="modalBackdrop" onClick={() => { setSelected(null); setQcMsg('') }}>
          <div className="modalBox wide" onClick={e => e.stopPropagation()}>
            <div className="modalHead">
              <h3>{selected ? `Job ${selected.jobNumber}` : 'Loading…'}</h3>
              <button className="iconBtn" onClick={() => { setSelected(null); setQcMsg('') }}><X size={18} /></button>
            </div>

            {detailLoading && <Loading />}
            {qcMsg && <div className="infoStrip" style={{ background: qcMsg.includes('approved') ? '#ecfdf3' : '#fef2f2',
              color: qcMsg.includes('approved') ? '#027a48' : '#b91c1c' }}>{qcMsg}</div>}

            {selected && !detailLoading && (
              <div className="pageStack" style={{ gap: 14, maxHeight: '72vh', overflowY: 'auto', padding: '0 2px' }}>
                {/* Overview */}
                <div className="formGrid twoCols">
                  <label>Customer<input readOnly value={selected.quotation?.customer?.name || '—'} /></label>
                  <label>Vehicle<input readOnly value={`${selected.vehicle?.makeModel || '—'} (${selected.vehicle?.registrationNo || '—'})`} /></label>
                  <label>Status<input readOnly value={statusLabel(selected.status)} /></label>
                  <label>Priority
                    <input readOnly value={selected.priority}
                      style={{ color: getPriorityClass(selected.priority) === 'red' ? '#ef4444' : getPriorityClass(selected.priority) === 'amber' ? '#f59e0b' : '#22c55e' }} />
                  </label>
                  <label>Technician<input readOnly value={selected.assignedTechnician?.name || '—'} /></label>
                  <label>Controller<input readOnly value={selected.assignedController?.name || '—'} /></label>
                  <label>Progress<input readOnly value={`${selected.progress}%`} /></label>
                  <label>Repair type<input readOnly value={selected.quotation?.repairType || '—'} /></label>
                  <label className="wide">Completion note<textarea readOnly value={selected.completionNote || '—'} rows={2} /></label>
                </div>

                {/* Open issues */}
                {selected.issues?.filter(i => i.status === 'Open').length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 8 }}>Open issues</h4>
                    <div className="issueList">
                      {selected.issues.filter(i => i.status === 'Open').map(issue => (
                        <article className={`issueCard ${getPriorityClass(issue.severity)}`} key={issue.id}>
                          <div><strong>{issue.title}</strong></div>
                          {issue.note && <p>{issue.note}</p>}
                          <span className={`pill ${getPriorityClass(issue.severity)}`}>{issue.severity}</span>
                        </article>
                      ))}
                    </div>
                  </div>
                )}

                {/* Checklist */}
                {selected.checklistItems?.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 8 }}>Checklist ({selected.checklistItems.filter(c => c.state === 'Checked').length}/{selected.checklistItems.length})</h4>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {selected.checklistItems.map(c => (
                        <span key={c.id} className={`pill ${c.state === 'Checked' ? 'green' : c.state === 'Failed' ? 'red' : 'amber'}`}
                          style={{ fontSize: 12 }}>{c.label}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Failed components */}
                {selected.failedComponents?.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 8 }}>Failed components ({selected.failedComponents.length})</h4>
                    <div className="tableWrap compactTable">
                      <table>
                        <thead>
                          <tr><th>Component</th><th>Severity</th><th>Parts review</th><th>Decision</th></tr>
                        </thead>
                        <tbody>
                          {selected.failedComponents.map(fc => (
                            <tr key={fc.id}>
                              <td>{fc.componentName}</td>
                              <td><span className={`pill ${getPriorityClass(fc.severity)}`}>{fc.severity}</span></td>
                              <td>{fc.status}</td>
                              <td>{fc.review?.replacementDecision || '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Quotation updates timeline */}
                {selected.quotation?.updates?.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 8 }}>Quotation update history</h4>
                    {selected.quotation.updates.map(u => (
                      <div className="quoteUpdateCard" key={u.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong>{roleLabel(u.role || u.updatedBy?.role)} — {u.updatedBy?.name}</strong>
                          <small>{fmtDateTime(u.createdAt)}</small>
                        </div>
                        {u.notes && <p style={{ marginTop: 6 }}>{u.notes}</p>}
                        <span className={`pill ${u.status === 'Completed' ? 'green' : 'amber'}`} style={{ fontSize: 11 }}>{u.status}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* QC Approve section */}
                {selected.status === 'QCReview' && (
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                    <h4 style={{ marginBottom: 8 }}><ShieldCheck size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />QC Approval</h4>
                    <label className="wide" style={{ display: 'block', marginBottom: 12 }}>
                      Manager note
                      <textarea value={qcNote} onChange={e => setQcNote(e.target.value)}
                        placeholder="Add manager review note" rows={3} />
                    </label>
                    <button className="primaryBtn" onClick={handleQcApprove} disabled={qcBusy}>
                      <CheckCircle2 size={16} /> {qcBusy ? 'Approving…' : 'Approve QC'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// QUOTATIONS TAB
// ═══════════════════════════════════════════════════════════════════════════

function QuotationsTab() {
  const [quotations, setQuotations] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')
  const [page, setPage] = useState(1)
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [selected, setSelected] = useState(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [detailErr, setDetailErr] = useState('')

  const loadQuotations = useCallback(() => {
    setLoading(true)
    setErr('')
    const params = new URLSearchParams({ page, limit: 20 })
    if (filterStatus)   params.set('status', filterStatus)
    if (filterPriority) params.set('priority', filterPriority)
    apiFetch(`/manager/quotations?${params}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) { setQuotations(j.data.data || []); setTotal(j.data.total || 0) }
        else setErr(j.message || 'Failed to load quotations')
      })
      .catch(() => setErr('Network error'))
      .finally(() => setLoading(false))
  }, [page, filterStatus, filterPriority])

  useEffect(() => { loadQuotations() }, [loadQuotations])

  function openDetail(q) {
    setSelected(null)
    setDetailErr('')
    setDetailLoading(true)
    apiFetch(`/manager/quotations/${q.id}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setSelected(j.data.quotation)
        else setDetailErr(j.message || 'Failed to load detail')
      })
      .catch(() => setDetailErr('Network error'))
      .finally(() => setDetailLoading(false))
  }

  const totalPages = Math.ceil(total / 20)

  const QUOTATION_STATUSES = [
    'Draft','InternalReview','InternalUpdatesReceived','SentToCustomer','CustomerApproved','CustomerRejected',
  ]

  return (
    <div className="pageStack">
      <section className="panel">
        <div className="formGrid adminForm twoCols" style={{ marginBottom: 0 }}>
          <label>
            Status
            <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1) }}>
              <option value="">All statuses</option>
              {QUOTATION_STATUSES.map(s => <option key={s} value={s}>{statusLabel(s)}</option>)}
            </select>
          </label>
          <label>
            Priority
            <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value); setPage(1) }}>
              <option value="">All priorities</option>
              <option value="Red">Red</option>
              <option value="Amber">Amber</option>
              <option value="Green">Green</option>
            </select>
          </label>
        </div>
      </section>

      <section className="panel">
        {loading && <Loading />}
        {err && <Err text={err} />}
        {!loading && !err && quotations.length === 0 && <Empty text="No quotations match filters." />}
        {!loading && !err && quotations.length > 0 && (
          <>
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Quote #</th>
                    <th>Customer</th>
                    <th>Vehicle</th>
                    <th>Repair type</th>
                    <th>Status</th>
                    <th>Priority</th>
                    <th>Updates</th>
                    <th>Created</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {quotations.map(q => (
                    <tr key={q.id}>
                      <td>{q.quoteNumber}</td>
                      <td>{q.customer?.name || '—'}</td>
                      <td>{q.vehicle?.makeModel || '—'}</td>
                      <td>{q.repairType}</td>
                      <td><span className={`pill ${statusClass(q.status)}`}>{statusLabel(q.status)}</span></td>
                      <td><span className={`pill ${getPriorityClass(q.priority)}`}>{q.priority}</span></td>
                      <td>{q._count?.updates ?? 0}</td>
                      <td>{fmtDate(q.createdAt)}</td>
                      <td>
                        <button className="softBtn" style={{ padding: '4px 10px' }} onClick={() => openDetail(q)}>
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {totalPages > 1 && (
              <div className="paginationRow">
                <button className="softBtn" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                  <ChevronLeft size={16} /> Prev
                </button>
                <span>Page {page} of {totalPages} &nbsp;({total} quotations)</span>
                <button className="softBtn" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}
          </>
        )}
      </section>

      {/* Quotation detail modal */}
      {(selected || detailLoading) && (
        <div className="modalBackdrop" onClick={() => { setSelected(null); setDetailErr('') }}>
          <div className="modalBox wide" onClick={e => e.stopPropagation()}>
            <div className="modalHead">
              <h3>{selected ? `Quotation ${selected.quoteNumber}` : 'Loading…'}</h3>
              <button className="iconBtn" onClick={() => { setSelected(null); setDetailErr('') }}><X size={18} /></button>
            </div>

            {detailLoading && <Loading />}
            {detailErr && <Err text={detailErr} />}

            {selected && !detailLoading && (
              <div className="pageStack" style={{ gap: 14, maxHeight: '72vh', overflowY: 'auto', padding: '0 2px' }}>
                <div className="formGrid twoCols">
                  <label>Customer<input readOnly value={selected.customer?.name || '—'} /></label>
                  <label>Phone<input readOnly value={selected.customer?.phone || '—'} /></label>
                  <label>Vehicle<input readOnly value={`${selected.vehicle?.makeModel || '—'} (${selected.vehicle?.registrationNo || '—'})`} /></label>
                  <label>Repair type<input readOnly value={selected.repairType || '—'} /></label>
                  <label>Status<input readOnly value={statusLabel(selected.status)} /></label>
                  <label>Priority<input readOnly value={selected.priority} /></label>
                  <label>Total estimate<input readOnly value={selected.totalEstimate ? `${selected.currency} ${Number(selected.totalEstimate).toLocaleString()}` : '—'} /></label>
                  <label>Created<input readOnly value={fmtDate(selected.createdAt)} /></label>
                  {selected.approvedAt && <label>Approved<input readOnly value={fmtDateTime(selected.approvedAt)} /></label>}
                  {selected.rejectedAt && <label>Rejected<input readOnly value={fmtDateTime(selected.rejectedAt)} /></label>}
                  {selected.jobCard && <label>Job card<input readOnly value={`${selected.jobCard.jobNumber} — ${statusLabel(selected.jobCard.status)}`} /></label>}
                  {selected.customerComplaint && <label className="wide">Customer complaint<textarea readOnly value={selected.customerComplaint} rows={2} /></label>}
                </div>

                {/* Line items */}
                {selected.lineItems?.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 8 }}>Line items</h4>
                    <div className="tableWrap compactTable">
                      <table>
                        <thead><tr><th>Item</th><th>Role</th><th>Cost</th><th>Status</th></tr></thead>
                        <tbody>
                          {selected.lineItems.map(li => (
                            <tr key={li.id}>
                              <td>{li.item}</td>
                              <td>{roleLabel(li.addedByRole)}</td>
                              <td>{li.cost ? `${li.currency} ${Number(li.cost).toLocaleString()}` : '—'}</td>
                              <td>{li.status}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Update timeline */}
                {selected.updates?.length > 0 && (
                  <div>
                    <h4 style={{ marginBottom: 8 }}>Workflow updates</h4>
                    {selected.updates.map(u => (
                      <div className="quoteUpdateCard" key={u.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <strong>{roleLabel(u.role || u.updatedBy?.role)} — {u.updatedBy?.name}</strong>
                          <small>{fmtDateTime(u.createdAt)}</small>
                        </div>
                        {u.focusNote && <p style={{ marginTop: 4 }}><em>Focus: </em>{u.focusNote}</p>}
                        {u.notes && <p style={{ marginTop: 4 }}>{u.notes}</p>}
                        {u.costImpact && <p style={{ marginTop: 4 }}>Cost impact: {u.currency} {Number(u.costImpact).toLocaleString()}</p>}
                        <span className={`pill ${u.status === 'Completed' ? 'green' : 'amber'}`} style={{ fontSize: 11 }}>{u.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// STAFF TAB
// ═══════════════════════════════════════════════════════════════════════════

function StaffTab() {
  const [staff, setStaff] = useState([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState('')

  useEffect(() => {
    setLoading(true)
    apiFetch('/manager/staff')
      .then(r => r.json())
      .then(j => {
        if (j.success) setStaff(j.data.staff || [])
        else setErr(j.message || 'Failed to load staff')
      })
      .catch(() => setErr('Network error'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading />
  if (err) return <Err text={err} />
  if (staff.length === 0) return <Empty text="No active staff found for this workshop." />

  // Group by role
  const byRole = {}
  for (const s of staff) {
    const r = s.role || 'Unknown'
    if (!byRole[r]) byRole[r] = []
    byRole[r].push(s)
  }

  return (
    <div className="pageStack">
      {Object.entries(byRole).map(([role, members]) => (
        <section className="panel" key={role}>
          <h3 style={{ marginBottom: 14 }}>{roleLabel(role)} <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: 14 }}>({members.length})</span></h3>
          <div className="metricGrid">
            {members.map(m => {
              const active = m.assignedJobCards?.length || 0
              const critical = m.assignedJobCards?.filter(j => j.priority === 'Red').length || 0
              return (
                <article className="metricCard" key={m.id} style={{ padding: '16px 18px' }}>
                  <p style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>{m.name}</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                    <span className={`pill ${active > 0 ? 'amber' : 'green'}`} style={{ fontSize: 12 }}>
                      {active} active job{active !== 1 ? 's' : ''}
                    </span>
                    {critical > 0 && (
                      <span className="pill red" style={{ fontSize: 12 }}>
                        {critical} critical
                      </span>
                    )}
                  </div>
                  {m.assignedJobCards?.length > 0 && (
                    <div style={{ marginTop: 10, fontSize: 12, color: 'var(--text-muted)' }}>
                      {m.assignedJobCards.slice(0, 5).map(j => (
                        <div key={j.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '2px 0' }}>
                          <span>{j.jobNumber}</span>
                          <span className={`pill ${statusClass(j.status)}`} style={{ fontSize: 11 }}>{statusLabel(j.status)}</span>
                        </div>
                      ))}
                      {m.assignedJobCards.length > 5 && (
                        <div style={{ marginTop: 4 }}>+{m.assignedJobCards.length - 5} more</div>
                      )}
                    </div>
                  )}
                </article>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
// ROOT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export default function Manager() {
  const [tab, setTab] = useState('dashboard')

  return (
    <div className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Manager Workspace</p>
        <h2>Workshop operations overview</h2>
        <p>Read-only monitoring, job oversight and QC approvals.</p>
      </div>

      {/* Tab bar — same pill-button pattern used across all workspace pages */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: '9px 18px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              display: 'inline-flex', alignItems: 'center', gap: 6,
              background: tab === id ? 'var(--navy)' : '#f2f4f7',
              color: tab === id ? '#fff' : '#344054',
              transition: 'background .15s',
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {tab === 'dashboard'  && <DashboardTab />}
      {tab === 'calendar'   && <CalendarTab />}
      {tab === 'jobs'       && <JobsTab />}
      {tab === 'quotations' && <QuotationsTab />}
      {tab === 'staff'      && <StaffTab />}
    </div>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, ChevronsUpDown,
  CreditCard, FileSpreadsheet, FileText, TrendingUp, Wrench,
} from 'lucide-react'
import { apiFetch } from '../../utils/api'

// ─── helpers ─────────────────────────────────────────────────────────────────

function money(value, currency = 'ZAR') {
  if (!value) return `${currency} 0`
  if (value >= 1_000_000) return `${currency} ${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000)     return `${currency} ${Math.round(value / 1000)}k`
  return `${currency} ${Number(value).toLocaleString()}`
}

function csvEscape(v) { return `"${String(v ?? '').replace(/"/g, '""')}"` }

function downloadCSV(filename, rows) {
  const csv  = rows.map(r => r.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a'); a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); a.remove()
  URL.revokeObjectURL(url)
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('autiq_user') || 'null') } catch { return null }
}

function Loading() { return <div className="infoStrip" style={{ textAlign: 'center' }}>Loading…</div> }
function Err({ text }) { return <div className="infoStrip" style={{ background: '#fef2f2', color: '#b91c1c' }}>{text}</div> }
function Empty()      { return <div className="infoStrip">No data for the selected period.</div> }

// ─── SortTh ──────────────────────────────────────────────────────────────────

function SortTh({ col, label, active, dir, onSort }) {
  const isActive = active === col
  return (
    <th className={`sortTh${isActive ? ' sortTh--active' : ''}`} onClick={() => onSort(col)}>
      <span className="sortThInner">
        {label}
        <span className="sortThIcon">
          {isActive ? dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} /> : <ChevronsUpDown size={13} />}
        </span>
      </span>
    </th>
  )
}

// ─── Tab list ────────────────────────────────────────────────────────────────

const reportTabs = [
  { to: '/reports/jobs',                       type: 'jobs',       label: 'Jobs Created & Completed' },
  { to: '/reports/revenue',                    type: 'revenue',    label: 'Revenue' },
  { to: '/reports/technician-performance',     type: 'technician', label: 'Technician Performance' },
  { to: '/reports/pending-approvals-payments', type: 'pending',    label: 'Pending Approvals & Payments' },
]

const PERIOD_OPTIONS = [
  { value: 'month',      label: 'Month to date' },
  { value: 'last_month', label: 'Last month' },
  { value: 'quarter',    label: 'Quarter to date' },
  { value: 'year',       label: 'Year to date' },
  { value: 'custom',     label: 'Custom range' },
]

// ─── Root ────────────────────────────────────────────────────────────────────

export default function Reports({ reportType = 'jobs' }) {
  const [period,      setPeriod]      = useState('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd,   setCustomEnd]   = useState('')
  const [clientId,    setClientId]    = useState('')
  const [clients,     setClients]     = useState([])
  const [data,        setData]        = useState(null)
  const [loading,     setLoading]     = useState(true)
  const [err,         setErr]         = useState('')

  const storedUser   = useMemo(getStoredUser, [])
  const isAdmin      = storedUser?.roleCode === 'ENTERPRISE_ADMIN' || storedUser?.type === 'enterprise_admin'
  const title        = reportTabs.find(t => t.type === reportType)?.label || 'Reports'

  // Load clients for enterprise admin dealer filter
  useEffect(() => {
    if (!isAdmin) return
    apiFetch('/clients?limit=200').then(r => r.json())
      .then(d => { if (d.success) setClients(d.data?.clients || []) })
      .catch(() => {})
  }, [isAdmin])

  const apiPath = useMemo(() => {
    if (period === 'custom' && (!customStart || !customEnd)) return null
    const qs = new URLSearchParams({ period })
    if (period === 'custom') { qs.set('startDate', customStart); qs.set('endDate', customEnd) }
    if (isAdmin && clientId) qs.set('clientId', clientId)
    const base = {
      jobs:       '/reports/jobs',
      revenue:    '/reports/revenue',
      technician: '/reports/technician-performance',
      pending:    '/reports/pending-approvals-payments',
    }[reportType]
    return `${base}?${qs}`
  }, [reportType, period, customStart, customEnd, clientId, isAdmin])

  useEffect(() => {
    if (!apiPath) { setLoading(false); setData(null); setErr(''); return }
    setLoading(true); setErr(''); setData(null)
    apiFetch(apiPath)
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data); else setErr(j.message || 'Failed to load report') })
      .catch(() => setErr('Network error loading report'))
      .finally(() => setLoading(false))
  }, [apiPath])

  function handleExcel() {
    if (!data) return
    const periodLabel = period === 'custom' ? `${customStart} to ${customEnd}` : period
    let rows = [['Report type', title], ['Period', periodLabel], []]
    if (reportType === 'jobs' && data.monthly) {
      rows.push(['Month', 'Created', 'Completed'])
      rows.push(...data.monthly.map(r => [r.month, r.created, r.completed]))
      rows.push([], ['Period created', data.periodCreated], ['Period completed', data.periodCompleted])
    } else if (reportType === 'revenue' && data.monthly) {
      rows.push(['Month', 'Revenue'])
      rows.push(...data.monthly.map(r => [r.month, r.revenue]))
      rows.push([], ['Period revenue', data.periodRevenue])
    } else if (reportType === 'technician' && data.rows) {
      rows.push(['Technician', ...(isAdmin ? ['Client', 'Workshop'] : []), 'Assigned', 'Completed', 'Open Issues', 'Rating'])
      rows.push(...data.rows.map(r => [r.name, ...(isAdmin ? [r.client, r.workshop] : []), r.assigned, r.completed, r.openIssues, r.rating]))
    } else if (reportType === 'pending') {
      rows.push(['Customer Approval Pending'])
      rows.push(['Quote', 'Customer', 'Vehicle', ...(isAdmin ? ['Client', 'Workshop'] : []), 'Age', 'Amount'])
      rows.push(...(data.approvalRows || []).map(r => [r.quoteNumber, r.customer, r.vehicle, ...(isAdmin ? [r.client, r.workshop] : []), r.age, r.amount]))
    }
    downloadCSV(`autiq-${reportType}-report.csv`, rows)
  }

  return (
    <div className="pageStack reportsPage">
      <section className="panel reportsHeroPanel printArea">
        <div className="sectionHead reportsHeaderStack">
          <div>
            <p className="eyebrow">Reports &amp; Analytics</p>
            <h2>{title}</h2>
            <p className="mutedText">
              {isAdmin ? 'Enterprise Admin — all dealers and workshops.' : 'Visible to Accounts, CEO, and Manager users.'}
            </p>
          </div>
          <div className="rowActions noPrint" style={{ flexWrap: 'wrap', gap: 8 }}>
            {isAdmin && (
              <select value={clientId} onChange={e => setClientId(e.target.value)} style={{ minWidth: 160 }}>
                <option value="">All dealers</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            )}
            <select value={period} onChange={e => setPeriod(e.target.value)}>
              {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            {period === 'custom' && (
              <>
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} max={customEnd || undefined} />
                <span className="customRangeSep">to</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} min={customStart || undefined} />
              </>
            )}
            <button className="softBtn"    onClick={() => window.print()}><FileText size={16} /> Export PDF</button>
            <button className="primaryBtn" onClick={handleExcel}><FileSpreadsheet size={16} /> Export Excel</button>
          </div>
        </div>
        <div className="reportTabs noPrint">
          {reportTabs.map(tab => (
            <Link key={tab.to} className={tab.type === reportType ? 'active' : ''} to={tab.to}>
              {tab.label}
            </Link>
          ))}
        </div>
      </section>

      {loading && <Loading />}
      {err     && <Err text={err} />}
      {!loading && !err && !data && (
        period === 'custom' && (!customStart || !customEnd)
          ? <div className="infoStrip">Select a start and end date above to view this report.</div>
          : <Empty />
      )}

      {!loading && !err && data && reportType === 'jobs'       && <JobsReport data={data} />}
      {!loading && !err && data && reportType === 'revenue'    && <RevenueReport data={data} />}
      {!loading && !err && data && reportType === 'technician' && <TechnicianReport data={data} isAdmin={isAdmin} />}
      {!loading && !err && data && reportType === 'pending'    && <PendingReport data={data} isAdmin={isAdmin} />}
    </div>
  )
}

// ─── Jobs report ─────────────────────────────────────────────────────────────

function JobsReport({ data }) {
  const { monthly = [], periodCreated = 0, periodCompleted = 0, waitingParts = 0, qcReview = 0, inProgress = 0 } = data
  const rate   = periodCreated > 0 ? `${Math.round((periodCompleted / periodCreated) * 100)}%` : 'N/A'
  const maxVal = Math.max(...monthly.map(m => Math.max(m.created, m.completed)), 1)

  return (
    <>
      <div className="metricGrid">
        <ReportCard icon={Wrench}        title="Jobs created"    value={periodCreated}  note="New in selected period" />
        <ReportCard icon={CheckCircle2}  title="Jobs completed"  value={periodCompleted} note="Completed in period" />
        <ReportCard icon={TrendingUp}    title="Completion rate" value={rate}            note="Completed vs created" />
        <ReportCard icon={AlertTriangle} title="Open jobs"       value={periodCreated - periodCompleted} note="Still in workflow" danger />
      </div>

      <section className="panel printArea">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Jobs created and completed</p>
            <h2>Monthly job movement</h2>
          </div>
          <span className="pill green">Completion rate {rate}</span>
        </div>

        {monthly.length === 0
          ? <div className="infoStrip">No job data for this period.</div>
          : (
            <div className="reportBars">
              {monthly.map((row, i) => (
                <div className="reportBarGroup" key={i}>
                  <div className="dualBars">
                    <span title={`Created: ${row.created}`}   style={{ height: `${Math.max(4, (row.created / maxVal) * 100)}%` }} />
                    <span title={`Completed: ${row.completed}`} style={{ height: `${Math.max(4, (row.completed / maxVal) * 100)}%`, background: '#22c55e' }} />
                  </div>
                  <strong>{row.month}</strong>
                  <small>{row.completed}/{row.created}</small>
                </div>
              ))}
            </div>
          )
        }

        <div className="metricGrid" style={{ marginTop: 16 }}>
          <ReportCard icon={Wrench} title="In progress"   value={inProgress}   note="Currently being worked" />
          <ReportCard icon={Wrench} title="Waiting parts" value={waitingParts} note="Parts outstanding" />
          <ReportCard icon={Wrench} title="QC review"     value={qcReview}     note="Awaiting manager check" />
        </div>
      </section>
    </>
  )
}

// ─── Revenue report ───────────────────────────────────────────────────────────

function RevenueReport({ data }) {
  const { monthly = [], periodRevenue = 0, totalRevenue = 0, pendingCustomer = 0, currency = 'ZAR' } = data
  const maxVal = Math.max(...monthly.map(m => m.revenue), 1)

  return (
    <>
      <div className="metricGrid">
        <ReportCard icon={TrendingUp} title="Period revenue"   value={money(periodRevenue, currency)} note="Approved quotes this period" />
        <ReportCard icon={TrendingUp} title="Total revenue"    value={money(totalRevenue,  currency)} note="All approved quotations" />
        <ReportCard icon={CreditCard} title="Pending approval" value={pendingCustomer}                 note="Sent, awaiting customer" danger />
      </div>

      <section className="panel printArea">
        <div className="sectionHead">
          <div><p className="eyebrow">Revenue</p><h2>Approved quotation value by month</h2></div>
          <span className="pill green">{money(periodRevenue, currency)}</span>
        </div>

        {monthly.length === 0
          ? <div className="infoStrip">No revenue data for this period.</div>
          : (
            <div className="chartMock reportRevenueChart">
              {monthly.map((row, i) => (
                <span key={i}
                  style={{ height: `${Math.max(8, (row.revenue / maxVal) * 100)}%` }}
                  title={`${row.month}: ${money(row.revenue, currency)}`}
                />
              ))}
            </div>
          )
        }
        <div className="reportLegend">
          {monthly.map((row, i) => <span key={i}>{row.month}</span>)}
        </div>
      </section>
    </>
  )
}

// ─── Technician performance report ───────────────────────────────────────────

function TechnicianReport({ data, isAdmin }) {
  const { rows = [], avgRating = 'N/A' } = data
  const [sortBy,  setSortBy]  = useState('name')
  const [sortDir, setSortDir] = useState('asc')

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const sorted = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const numCols = ['assigned', 'completed', 'openIssues']
      if (numCols.includes(sortBy)) return (Number(a[sortBy]) - Number(b[sortBy])) * dir
      if (sortBy === 'rating') {
        const ra = a.rating === 'N/A' ? -1 : parseInt(a.rating)
        const rb = b.rating === 'N/A' ? -1 : parseInt(b.rating)
        return (ra - rb) * dir
      }
      return String(a[sortBy] ?? '').localeCompare(String(b[sortBy] ?? '')) * dir
    })
  }, [rows, sortBy, sortDir])

  return (
    <section className="panel printArea">
      <div className="sectionHead">
        <div><p className="eyebrow">Technician performance</p><h2>Productivity and quality</h2></div>
        <span className="pill amber">Avg rating {avgRating}</span>
      </div>

      {sorted.length === 0
        ? <div className="infoStrip">No technician data for this period.</div>
        : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  {isAdmin && <SortTh col="client"     label="Client"      active={sortBy} dir={sortDir} onSort={handleSort} />}
                  {isAdmin && <SortTh col="workshop"   label="Workshop"    active={sortBy} dir={sortDir} onSort={handleSort} />}
                  <SortTh col="name"       label="Technician"  active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="assigned"   label="Assigned"    active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="completed"  label="Completed"   active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="openIssues" label="Open issues" active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="rating"     label="Rating"      active={sortBy} dir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((row, i) => (
                  <tr key={i}>
                    {isAdmin && <td>{row.client || '—'}</td>}
                    {isAdmin && <td>{row.workshop || '—'}</td>}
                    <td><strong>{row.name}</strong></td>
                    <td>{row.assigned}</td>
                    <td>{row.completed}</td>
                    <td>{row.openIssues}</td>
                    <td>
                      <span className={`pill ${row.rating === 'N/A' ? 'amber' : parseInt(row.rating) >= 80 ? 'green' : 'red'}`}>
                        {row.rating}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </section>
  )
}

// ─── Pending approvals & payments ─────────────────────────────────────────────

function PendingReport({ data, isAdmin }) {
  const { approvalRows = [], internalRows = [], totalPendingApprovals = 0, totalInternal = 0 } = data

  const [aSortBy,  setAsortBy]  = useState('age')
  const [aSortDir, setAsortDir] = useState('desc')
  const [iSortBy,  setIsortBy]  = useState('age')
  const [iSortDir, setIsortDir] = useState('desc')

  function handleASort(col) {
    if (aSortBy === col) setAsortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setAsortBy(col); setAsortDir('asc') }
  }
  function handleISort(col) {
    if (iSortBy === col) setIsortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setIsortBy(col); setIsortDir('asc') }
  }

  function sortRows(rows, by, dir) {
    const d = dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (by === 'amountRaw') return (Number(a.amountRaw || 0) - Number(b.amountRaw || 0)) * d
      return String(a[by] ?? '').localeCompare(String(b[by] ?? '')) * d
    })
  }

  const sortedApprovals = useMemo(() => sortRows(approvalRows, aSortBy, aSortDir), [approvalRows, aSortBy, aSortDir])
  const sortedInternal  = useMemo(() => sortRows(internalRows,  iSortBy, iSortDir), [internalRows,  iSortBy, iSortDir])

  return (
    <section className="reportTwoCol">
      {/* Customer approval pending */}
      <div className="panel printArea">
        <div className="sectionHead">
          <div><p className="eyebrow">Customer approval pending</p><h2>Sent to customer, awaiting response</h2></div>
          <span className="pill amber">{totalPendingApprovals} open</span>
        </div>

        {sortedApprovals.length === 0
          ? <div className="infoStrip">No pending customer approvals.</div>
          : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <SortTh col="quoteNumber" label="Quote"    active={aSortBy} dir={aSortDir} onSort={handleASort} />
                    <SortTh col="customer"    label="Customer" active={aSortBy} dir={aSortDir} onSort={handleASort} />
                    <SortTh col="vehicle"     label="Vehicle"  active={aSortBy} dir={aSortDir} onSort={handleASort} />
                    {isAdmin && <SortTh col="client"   label="Client"   active={aSortBy} dir={aSortDir} onSort={handleASort} />}
                    {isAdmin && <SortTh col="workshop" label="Workshop" active={aSortBy} dir={aSortDir} onSort={handleASort} />}
                    <SortTh col="age"         label="Age"      active={aSortBy} dir={aSortDir} onSort={handleASort} />
                    <SortTh col="amountRaw"   label="Amount"   active={aSortBy} dir={aSortDir} onSort={handleASort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedApprovals.map(row => (
                    <tr key={row.quoteNumber}>
                      <td><strong>{row.quoteNumber}</strong></td>
                      <td>{row.customer}</td>
                      <td>{row.vehicle}</td>
                      {isAdmin && <td>{row.client || '—'}</td>}
                      {isAdmin && <td>{row.workshop || '—'}</td>}
                      <td><span className={`pill ${parseInt(row.age) > 0 ? 'amber' : 'green'}`}>{row.age}</span></td>
                      <td>{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>

      {/* Internal review backlog */}
      <div className="panel printArea">
        <div className="sectionHead">
          <div><p className="eyebrow">Internal review backlog</p><h2>Quotations awaiting internal update</h2></div>
          <span className="pill red">{totalInternal} pending</span>
        </div>

        {sortedInternal.length === 0
          ? <div className="infoStrip">No internal quotations pending.</div>
          : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <SortTh col="quoteNumber" label="Quote"    active={iSortBy} dir={iSortDir} onSort={handleISort} />
                    <SortTh col="customer"    label="Customer" active={iSortBy} dir={iSortDir} onSort={handleISort} />
                    {isAdmin && <SortTh col="client"   label="Client"   active={iSortBy} dir={iSortDir} onSort={handleISort} />}
                    {isAdmin && <SortTh col="workshop" label="Workshop" active={iSortBy} dir={iSortDir} onSort={handleISort} />}
                    <SortTh col="status"      label="Stage"    active={iSortBy} dir={iSortDir} onSort={handleISort} />
                    <SortTh col="age"         label="Age"      active={iSortBy} dir={iSortDir} onSort={handleISort} />
                    <SortTh col="amountRaw"   label="Amount"   active={iSortBy} dir={iSortDir} onSort={handleISort} />
                  </tr>
                </thead>
                <tbody>
                  {sortedInternal.map(row => (
                    <tr key={row.quoteNumber}>
                      <td><strong>{row.quoteNumber}</strong></td>
                      <td>{row.customer}</td>
                      {isAdmin && <td>{row.client || '—'}</td>}
                      {isAdmin && <td>{row.workshop || '—'}</td>}
                      <td>{row.status}</td>
                      <td>{row.age}</td>
                      <td>{row.amount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        }
      </div>
    </section>
  )
}

// ─── Shared metric card ───────────────────────────────────────────────────────

function ReportCard({ icon: Icon, title, value, note, danger }) {
  return (
    <article className={`metricCard reportMetric ${danger ? 'dangerCard' : ''}`}>
      <div className="metricIcon"><Icon size={24} /></div>
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </article>
  )
}

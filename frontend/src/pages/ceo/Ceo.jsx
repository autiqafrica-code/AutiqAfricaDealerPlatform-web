import { useEffect, useState } from 'react'
import { FileSpreadsheet } from 'lucide-react'
import { apiFetch } from '../../utils/api'
import AppointmentCalendar from '../../components/AppointmentCalendar.jsx'

// ─── helpers ─────────────────────────────────────────────────────────────────

function Loading() {
  return <div className="infoStrip" style={{ textAlign: 'center' }}>Loading…</div>
}
function Err({ text }) {
  return (
    <div className="infoStrip" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fca5a5' }}>
      {text}
    </div>
  )
}

function Card({ title, value, note }) {
  return (
    <article className="metricCard">
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </article>
  )
}

// ─── CEO component ────────────────────────────────────────────────────────────

export default function Ceo() {
  const [dashboard, setDashboard]     = useState(null)
  const [dashLoading, setDashLoading] = useState(true)
  const [dashErr, setDashErr]         = useState('')

  const [calData, setCalData]         = useState(null)
  const [calLoading, setCalLoading]   = useState(true)

  const [savingLimit, setSavingLimit] = useState(false)
  const [limitMsg, setLimitMsg]       = useState('')

  // Load dashboard
  useEffect(() => {
    apiFetch('/ceo/dashboard')
      .then(r => r.json())
      .then(j => {
        if (j.success) setDashboard(j.data)
        else setDashErr(j.message || 'Failed to load dashboard')
      })
      .catch(() => setDashErr('Network error loading dashboard'))
      .finally(() => setDashLoading(false))
  }, [])

  // Load calendar appointments for current month
  useEffect(() => {
    const now   = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const end   = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString().split('T')[0]
    apiFetch(`/ceo/calendar?startDate=${start}&endDate=${end}`)
      .then(r => r.json())
      .then(j => { if (j.success) setCalData(j.data) })
      .catch(() => {})
      .finally(() => setCalLoading(false))
  }, [])

  async function handleSaveDailyLimit(limit) {
    setSavingLimit(true)
    setLimitMsg('')
    const r = await apiFetch('/ceo/daily-limit', {
      method: 'PATCH',
      body: JSON.stringify({ dailyJobLimit: limit }),
    })
    const j = await r.json()
    if (j.success) {
      setLimitMsg('Daily job limit saved.')
      setDashboard(prev => prev ? { ...prev, dailyJobLimit: limit } : prev)
    } else {
      setLimitMsg(j.message || 'Failed to save limit.')
    }
    setSavingLimit(false)
    setTimeout(() => setLimitMsg(''), 4000)
  }

  // Build monthly chart data from dashboard if available
  // For the bar chart we just use a placeholder visual for now
  // (real monthly chart data comes from the reports endpoints)

  const calSettings = calData
    ? { dailyJobLimit: calData.dailyJobLimit, openingTime: calData.openingTime, closingTime: calData.closingTime }
    : dashboard
    ? { dailyJobLimit: dashboard.dailyJobLimit, openingTime: dashboard.openingTime, closingTime: dashboard.closingTime }
    : null

  return (
    <div className="pageStack">
      {/* Dashboard metrics */}
      {dashLoading && <Loading />}
      {dashErr && <Err text={dashErr} />}

      {!dashLoading && !dashErr && dashboard && (
        <div className="metricGrid">
          <Card
            title="Monthly revenue"
            value={dashboard.monthlyRevenueDisplay || `${dashboard.currency} 0`}
            note="Approved quotations this month"
          />
          <Card
            title="Jobs completed"
            value={String(dashboard.jobsCompletedMonth)}
            note="Month to date"
          />
          <Card
            title="Approval delays"
            value={String(dashboard.approvalDelays)}
            note="Waiting >24h for customer"
          />
          <Card
            title="Daily job limit"
            value={String(dashboard.dailyJobLimit)}
            note="CEO controlled"
          />
        </div>
      )}

      {/* Dealership overview chart */}
      <section className="panel">
        <div className="sectionHead">
          <div>
            <h2>CEO: dealership overview</h2>
            {!dashLoading && dashboard && (
              <p style={{ color: 'var(--text-muted)', fontSize: 13, marginTop: 4 }}>
                {dashboard.activeJobs} active jobs &nbsp;|&nbsp; {dashboard.totalStaff} staff &nbsp;|&nbsp;
                {dashboard.technicianCount} technicians
              </p>
            )}
          </div>
          <button className="softBtn" onClick={() => window.print()}>
            <FileSpreadsheet size={16} /> Export Excel
          </button>
        </div>
        <CeoOverviewChart workshopId={dashboard?.workshopId} />
      </section>

      {/* Calendar with real data */}
      <AppointmentCalendar
        title="CEO calendar and capacity limit"
        viewerRole="CEO"
        canSetDailyLimit
        bookings={calData?.appointments || []}
        settings={calSettings}
        onSaveDailyLimit={handleSaveDailyLimit}
        savingLimit={savingLimit}
        limitSaveMsg={limitMsg}
      />
    </div>
  )
}

// ─── Monthly jobs/revenue bar chart ──────────────────────────────────────────

function CeoOverviewChart() {
  const [monthly, setMonthly] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch('/reports/jobs?period=year')
      .then(r => r.json())
      .then(j => { if (j.success) setMonthly(j.data.monthly || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="chartMock"><span style={{ height: '40%' }} /><span style={{ height: '60%' }} /></div>
  if (monthly.length === 0) return <div className="chartMock"><span style={{ height: '40%' }} /></div>

  const maxVal = Math.max(...monthly.map(m => Math.max(m.created, m.completed)), 1)

  return (
    <>
      <div className="reportBars">
        {monthly.map((row, i) => (
          <div className="reportBarGroup" key={i}>
            <div className="dualBars">
              <span title={`Created: ${row.created}`} style={{ height: `${Math.max(4, (row.created / maxVal) * 100)}%` }} />
              <span title={`Completed: ${row.completed}`} style={{ height: `${Math.max(4, (row.completed / maxVal) * 100)}%` }} />
            </div>
            <strong>{row.month}</strong>
            <small>{row.completed}/{row.created}</small>
          </div>
        ))}
      </div>
      <div className="reportLegend" style={{ marginTop: 8, fontSize: 12 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 12, height: 12, background: 'var(--primary)', display: 'inline-block', borderRadius: 2 }} />
          Created
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 16 }}>
          <span style={{ width: 12, height: 12, background: '#22c55e', display: 'inline-block', borderRadius: 2 }} />
          Completed
        </span>
      </div>
    </>
  )
}

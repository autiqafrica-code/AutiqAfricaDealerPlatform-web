import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  AlertTriangle, Building2, CheckCircle2, ChevronRight, Clock,
  Download, KeyRound, LogIn, Settings2, TrendingUp, UserPlus, Users,
  Wrench, Zap,
} from 'lucide-react'
import { apiFetch } from '../../utils/api'

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function todayLabel() {
  return new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

function getStoredUser() {
  try { return JSON.parse(localStorage.getItem('autiq_user') || 'null') } catch { return null }
}

const quickActions = [
  { to: '/enterprise/onboard-client',  icon: UserPlus,   label: 'Onboard Client',   desc: 'Add new dealer or workshop' },
  { to: '/enterprise/user-credentials', icon: KeyRound,  label: 'Manage Users',     desc: 'Credential slots and roles' },
  { to: '/enterprise/revenue',         icon: TrendingUp, label: 'Revenue Analytics', desc: 'Per-client revenue breakdown' },
  { to: '/enterprise/login-activity',  icon: LogIn,      label: 'Login Activity',   desc: 'Audit logins and access' },
  { to: '/enterprise/data-export',     icon: Download,   label: 'Export Data',      desc: 'CSV and full platform export' },
  { to: '/enterprise/service-pricing', icon: Settings2,  label: 'Service Config',   desc: 'Pricing and checklists' },
]

export default function EnterpriseDashboard() {
  const [stats, setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState('')
  const user = useMemo(getStoredUser, [])
  const name = user?.name || 'Admin'

  useEffect(() => {
    apiFetch('/enterprise/dashboard')
      .then(r => r.json())
      .then(d => {
        if (d.success) setStats(d.data)
        else setError(d.message || 'Could not load dashboard stats')
      })
      .catch(() => setError('Could not reach server — stats unavailable'))
      .finally(() => setLoading(false))
  }, [])

  const s = stats || {}

  return (
    <div className="pageStack">

      {/* Hero */}
      <div className="dashHero panel">
        <div>
          <p className="eyebrow">{todayLabel()}</p>
          <h2 style={{ margin: '6px 0 8px', fontSize: 28 }}>{greeting()}, {name}</h2>
          <p style={{ margin: 0, color: 'var(--muted)', maxWidth: 520, lineHeight: 1.55 }}>
            Enterprise platform overview — clients, workshops and live activity across the network.
          </p>
        </div>
        <div className="dashHeroActions">
          <Link className="primaryBtn" to="/enterprise/onboard-client"><UserPlus size={16} /> Onboard Client</Link>
          <Link className="softBtn secondaryBtn" to="/enterprise/revenue"><TrendingUp size={15} /> Revenue</Link>
        </div>
      </div>

      {/* Failed-login alert */}
      {!loading && s.failedLogins > 0 && (
        <div className="dashAlert">
          <AlertTriangle size={18} />
          <div>
            <strong>{s.failedLogins} failed login{s.failedLogins !== 1 ? 's' : ''} in the last 7 days</strong>
            <span>Review login activity for suspicious access patterns.</span>
          </div>
          <Link className="softBtn secondaryBtn" to="/enterprise/login-activity">View Activity</Link>
        </div>
      )}

      {/* Primary metrics */}
      <div className="metricGrid">
        <MetricCard loading={loading} icon={<Building2 size={22} />}
          label="Clients on Platform" value={s.activeClients}
          note={`${s.totalClients ?? 0} total registered`} color="teal"
          to="/enterprise/clients" />
        <MetricCard loading={loading} icon={<Wrench size={22} />}
          label="Active Workshops" value={s.activeWorkshops}
          note="Operational locations" color="blue"
          to="/enterprise/revenue" />
        <MetricCard loading={loading} icon={<Users size={22} />}
          label="Active Users" value={s.activeUsers}
          note="Across all workshops" color="navy"
          to="/enterprise/login-activity?status=Active" />
        <MetricCard loading={loading} icon={<LogIn size={22} />}
          label="Logins (30 days)" value={s.totalLogins}
          note="Platform-wide sessions" color="teal"
          to="/enterprise/login-activity" />
      </div>

      {/* Secondary metrics */}
      <div className="metricGrid">
        <MetricCard loading={loading} icon={<Clock size={22} />}
          label="Pending Approvals" value={s.pendingApprovals}
          note="Awaiting customer sign-off" color={s.pendingApprovals > 0 ? 'amber' : 'teal'}
          highlight={s.pendingApprovals > 0}
          to="/reports/pending-approvals-payments" />
        <MetricCard loading={loading} icon={<Zap size={22} />}
          label="Active Jobs" value={s.activeJobs}
          note="In progress across network" color="blue"
          to="/reports/jobs" />
        <MetricCard loading={loading} icon={<CheckCircle2 size={22} />}
          label="Completed This Month" value={s.completedThisMonth}
          note="Jobs closed this month" color="green"
          to="/reports/jobs" />
        <MetricCard loading={loading} icon={<UserPlus size={22} />}
          label="New Clients This Month" value={s.newClientsThisMonth}
          note={`${s.paymentsThisMonth ?? 0} payment${s.paymentsThisMonth !== 1 ? 's' : ''} this month`} color="navy"
          to="/enterprise/clients" />
      </div>

      {/* Recent clients + Quick actions */}
      <div className="dashMainGrid">

        <section className="panel">
          <div className="sectionHead">
            <div>
              <h3 style={{ margin: '0 0 4px' }}>Recent Clients</h3>
              <p className="mutedText">Latest onboarded to the platform</p>
            </div>
            <Link className="softBtn secondaryBtn" to="/enterprise/clients?status=Draft" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
              View Drafts <ChevronRight size={14} />
            </Link>
          </div>

          {loading && <p style={{ color: 'var(--muted)', padding: '16px 0' }}>Loading…</p>}
          {!loading && error && <p style={{ color: 'var(--red)' }}>{error}</p>}
          {!loading && !error && !s.recentClients?.length && (
            <p style={{ color: 'var(--muted)' }}>No clients onboarded yet.</p>
          )}
          {!loading && !error && !!s.recentClients?.length && (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>Client</th>
                    <th>Country</th>
                    <th>Currency</th>
                    <th>Workshops</th>
                    <th>Status</th>
                    <th>Added</th>
                  </tr>
                </thead>
                <tbody>
                  {s.recentClients.map(c => (
                    <tr key={c.id}>
                      <td><strong>{c.name}</strong></td>
                      <td>{c.country || '—'}</td>
                      <td>
                        <span className="dashCurrencyTag">{c.defaultCurrency}</span>
                      </td>
                      <td style={{ textAlign: 'center' }}>{c._count?.workshops ?? 0}</td>
                      <td>
                        <span className={`statusPill ${c.status === 'Active' ? 'active' : 'inactive'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDate(c.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="panel">
          <h3 style={{ margin: '0 0 14px' }}>Quick Actions</h3>
          <div className="dashQuickGrid">
            {quickActions.map(a => (
              <Link key={a.to} to={a.to} className="dashQuickTile">
                <a.icon size={20} />
                <div>
                  <strong>{a.label}</strong>
                  <span>{a.desc}</span>
                </div>
              </Link>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}

function MetricCard({ loading, icon, label, value, note, color = 'teal', highlight = false, to }) {
  const cls = `metricCard${highlight ? ' dashMetricHighlight' : ''}${to ? ' dashMetricClickable' : ''}`
  const inner = (
    <>
      <div className={`dashMetricIcon dashMetricIcon--${color}`}>{icon}</div>
      <p>{label}</p>
      <h2>{loading ? <span className="dashSkeleton" /> : (value ?? 0)}</h2>
      <span>{note}</span>
      {to && <span className="dashMetricArrow">→</span>}
    </>
  )
  return to
    ? <Link to={to} className={cls}>{inner}</Link>
    : <article className={cls}>{inner}</article>
}

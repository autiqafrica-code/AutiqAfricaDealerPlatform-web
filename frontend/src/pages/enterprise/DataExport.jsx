import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2, ClipboardCopy, DatabaseBackup, Download,
  FileDown, Loader2, RefreshCcw, Users, Briefcase, FileText,
  CreditCard, Building2,
} from 'lucide-react'
import { apiFetch } from '../../utils/api'

/* ─── helpers ─────────────────────────────────────────────────────────────── */

function ts() { return Date.now() }

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function downloadCsv(rows, filename) {
  if (!rows || rows.length === 0) return false
  const headers = Object.keys(rows[0])
  const csv = [
    headers.join(','),
    ...rows.map(r => headers.map(h => csvEscape(r[h])).join(',')),
  ].join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  URL.revokeObjectURL(url)
  return true
}

function fmtDate(dt) {
  if (!dt) return ''
  return new Date(dt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function fmtAmt(val, cur) {
  if (val == null || val === '') return ''
  return `${Number(val).toFixed(2)} ${cur || ''}`
}

/* ─── section card ───────────────────────────────────────────────────────── */

function SectionCard({ icon: Icon, title, count, color, description, onDownload, busy, disabled }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #e4e7ec', borderRadius: 22,
      padding: 18, display: 'flex', flexDirection: 'column', gap: 12,
      boxShadow: '0 4px 16px rgba(16,32,51,.04)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 12,
          background: `${color}18`, display: 'grid', placeItems: 'center', flexShrink: 0,
        }}>
          <Icon size={18} style={{ color }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <strong style={{ fontSize: 14 }}>{title}</strong>
          <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{description}</span>
        </div>
        <span style={{
          borderRadius: 999, padding: '3px 10px', fontSize: 12, fontWeight: 900,
          background: count > 0 ? '#dcfae6' : '#f2f4f7',
          color:      count > 0 ? '#039855' : 'var(--muted)',
        }}>
          {count} rows
        </span>
      </div>
      <button
        onClick={onDownload}
        disabled={busy || disabled || count === 0}
        style={{
          border: 0, borderRadius: 12, padding: '9px 14px',
          background: count > 0 && !disabled ? color : '#f2f4f7',
          color:      count > 0 && !disabled ? '#fff' : 'var(--muted)',
          fontWeight: 800, fontSize: 13, cursor: count > 0 ? 'pointer' : 'not-allowed',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          opacity: busy ? 0.7 : 1, transition: 'opacity .15s',
        }}
      >
        {busy
          ? <><Loader2 size={14} className="spin" /> Downloading…</>
          : <><FileDown size={14} /> Download CSV</>}
      </button>
    </div>
  )
}

/* ─── main component ─────────────────────────────────────────────────────── */

export default function DataExport() {
  const [clients,          setClients]          = useState([])
  const [workshops,        setWorkshops]        = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [scope,            setScope]            = useState('all')
  const [exportReason,     setExportReason]     = useState('Client exit')
  const [recipientEmail,   setRecipientEmail]   = useState('')

  const [exportData,  setExportData]  = useState(null)
  const [fetching,    setFetching]    = useState(false)
  const [fetchError,  setFetchError]  = useState('')
  const [busySect,    setBusySect]    = useState(null)  // which section is downloading
  const [copied,      setCopied]      = useState(false)

  const emailRef = useRef(null)

  /* load client list once */
  useEffect(() => {
    apiFetch('/clients?limit=200').then(r => r.json()).then(d => {
      if (d.success) setClients(d.data?.clients || [])
    }).catch(() => {})
  }, [])

  /* load workshop list when client changes */
  useEffect(() => {
    if (!selectedClientId) { setWorkshops([]); setScope('all'); return }
    apiFetch(`/workshops?clientId=${selectedClientId}&limit=100`).then(r => r.json()).then(d => {
      if (d.success) setWorkshops(d.data?.workshops || [])
    }).catch(() => {})
    setScope('all')
  }, [selectedClientId])

  /* load export data whenever client or scope changes */
  useEffect(() => {
    loadExportData()
  }, [selectedClientId, scope]) // eslint-disable-line

  async function loadExportData() {
    setFetching(true)
    setFetchError('')
    try {
      const params = new URLSearchParams()
      if (selectedClientId)  params.set('clientId',   selectedClientId)
      if (scope !== 'all')   params.set('workshopId', scope)
      const qs  = params.toString() ? `?${params}` : ''
      const res = await apiFetch(`/enterprise/export${qs}`)
      const d   = await res.json()
      if (!d.success) { setFetchError(d.message || 'Failed to load export data'); return }
      setExportData(d.data)
    } catch {
      setFetchError('Network error — could not load export data')
    } finally {
      setFetching(false)
    }
  }

  /* ── csv builders ── */

  function buildWorkshopsRows() {
    return (exportData?.workshops || []).map(w => ({
      'Workshop Name':  w.name,
      'Client':         w.client,
      'Country':        w.country,
      'Type':           w.type,
      'Currency':       w.currency,
      'Phone':          w.phone,
      'Email':          w.email,
      'Status':         w.status,
      'Users':          w.users,
      'Customers':      w.customers,
      'Created':        fmtDate(w.createdAt),
    }))
  }

  function buildUsersRows() {
    return (exportData?.users || []).map(u => ({
      'Full Name':    u.name,
      'Login Email':  u.loginEmail,
      'Role':         u.role,
      'Phone':        u.phone || '',
      'Status':       u.status,
      'Workshop':     u.workshop?.name || '',
      'Client':       u.workshop?.client?.name || '',
      'Last Login':   fmtDate(u.lastLoginAt),
      'Created':      fmtDate(u.createdAt),
    }))
  }

  function buildCustomersRows() {
    return (exportData?.customers || []).map(c => ({
      'Customer Name': c.name,
      'Phone':         c.phone || '',
      'Email':         c.email || '',
      'Status':        c.status,
      'Vehicles':      c._count?.vehicles ?? 0,
      'Workshop':      c.workshop?.name || '',
      'Client':        c.workshop?.client?.name || '',
      'Created':       fmtDate(c.createdAt),
    }))
  }

  function buildJobsRows() {
    return (exportData?.jobs || []).map(j => ({
      'Job Number':    j.jobNumber,
      'Status':        j.status,
      'Priority':      j.priority,
      'Quote Number':  j.quotation?.quoteNumber || '',
      'Repair Type':   j.quotation?.repairType  || '',
      'Customer':      j.quotation?.customer?.name  || '',
      'Phone':         j.quotation?.customer?.phone || '',
      'Vehicle Reg':   j.quotation?.vehicle?.registrationNo || '',
      'Make & Model':  j.quotation?.vehicle?.makeModel      || '',
      'Total Estimate':fmtAmt(j.quotation?.totalEstimate, j.quotation?.currency),
      'Workshop':      j.workshop?.name || '',
      'Client':        j.workshop?.client?.name || '',
      'Created':       fmtDate(j.createdAt),
      'Completed':     fmtDate(j.completedAt),
    }))
  }

  function buildQuotationsRows() {
    return (exportData?.quotations || []).map(q => ({
      'Quote Number':   q.quoteNumber,
      'Status':         q.status,
      'Priority':       q.priority,
      'Repair Type':    q.repairType || '',
      'Total Estimate': fmtAmt(q.totalEstimate, q.currency),
      'Currency':       q.currency,
      'Customer':       q.customer?.name  || '',
      'Phone':          q.customer?.phone || '',
      'Vehicle Reg':    q.vehicle?.registrationNo || '',
      'Make & Model':   q.vehicle?.makeModel      || '',
      'Created By':     q.createdBy?.name || '',
      'Workshop':       q.workshop?.name || '',
      'Client':         q.workshop?.client?.name || '',
      'Created':        fmtDate(q.createdAt),
      'Approved':       fmtDate(q.approvedAt),
    }))
  }

  function buildPaymentsRows() {
    return (exportData?.payments || []).map(p => ({
      'Payment Code':    p.paymentCode,
      'Method':          p.method,
      'Amount':          fmtAmt(p.amountReceived, p.currency),
      'Currency':        p.currency,
      'Reference':       p.referenceNumber || '',
      'Status':          p.status,
      'Quote Number':    p.invoice?.quotation?.quoteNumber || '',
      'Customer':        p.invoice?.quotation?.customer?.name || '',
      'Workshop':        p.invoice?.quotation?.workshop?.name || '',
      'Client':          p.invoice?.quotation?.workshop?.client?.name || '',
      'Paid At':         fmtDate(p.paidAt),
      'Recorded At':     fmtDate(p.createdAt),
    }))
  }

  function scopeLabel() {
    if (scope !== 'all') return workshops.find(w => w.id === scope)?.name || scope
    if (selectedClientId) return clients.find(c => c.id === selectedClientId)?.name || 'all'
    return 'all-workshops'
  }

  function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]/g, '-') }

  async function downloadSection(section) {
    if (!exportData) return
    setBusySect(section)
    await new Promise(r => setTimeout(r, 80)) // small tick so state repaints
    try {
      const label = slug(scopeLabel())
      const ok = {
        workshops:  () => downloadCsv(buildWorkshopsRows(),  `autiq-workshops-${label}-${ts()}.csv`),
        users:      () => downloadCsv(buildUsersRows(),      `autiq-users-${label}-${ts()}.csv`),
        customers:  () => downloadCsv(buildCustomersRows(),  `autiq-customers-${label}-${ts()}.csv`),
        jobs:       () => downloadCsv(buildJobsRows(),       `autiq-jobs-${label}-${ts()}.csv`),
        quotations: () => downloadCsv(buildQuotationsRows(), `autiq-quotations-${label}-${ts()}.csv`),
        payments:   () => downloadCsv(buildPaymentsRows(),   `autiq-payments-${label}-${ts()}.csv`),
      }[section]?.()
      if (!ok) alert(`No ${section} data to export for the selected scope.`)
    } finally {
      setBusySect(null)
    }
  }

  async function downloadAll() {
    if (!exportData) return
    setBusySect('all')
    await new Promise(r => setTimeout(r, 80))
    const label = slug(scopeLabel())
    const stamp = ts()
    const sections = [
      ['workshops',  buildWorkshopsRows(),  `autiq-workshops-${label}-${stamp}.csv`],
      ['users',      buildUsersRows(),      `autiq-users-${label}-${stamp}.csv`],
      ['customers',  buildCustomersRows(),  `autiq-customers-${label}-${stamp}.csv`],
      ['jobs',       buildJobsRows(),       `autiq-jobs-${label}-${stamp}.csv`],
      ['quotations', buildQuotationsRows(), `autiq-quotations-${label}-${stamp}.csv`],
      ['payments',   buildPaymentsRows(),   `autiq-payments-${label}-${stamp}.csv`],
    ]
    let downloaded = 0
    for (const [, rows, filename] of sections) {
      if (rows.length > 0) {
        // stagger downloads so browser doesn't block them
        await new Promise(r => setTimeout(r, 200))
        downloadCsv(rows, filename)
        downloaded++
      }
    }
    setBusySect(null)
    if (downloaded === 0) alert('No data found for the selected scope.')
  }

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(emailText)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      emailRef.current?.select()
      document.execCommand('copy')
    }
  }

  const totals  = exportData?.totals || { workshops: 0, users: 0, customers: 0, jobs: 0, quotations: 0, payments: 0 }
  const scopeW  = scope !== 'all' ? workshops.find(w => w.id === scope)?.name || 'Selected Workshop' : 'All Workshops'
  const clientN = clients.find(c => c.id === selectedClientId)?.name || ''

  const emailText =
    `Subject: Autiq Africa data export — ${scopeW}${clientN ? ` (${clientN})` : ''}\n\n` +
    `Hello,\n\n` +
    `Please find the data export package${clientN ? ` for ${clientN}` : ''}.\n\n` +
    `Export reason: ${exportReason}\n` +
    `Scope: ${scopeW}\n\n` +
    `── Record counts ──────────────────\n` +
    `Workshops:  ${totals.workshops}\n` +
    `Users:      ${totals.users}\n` +
    `Customers:  ${totals.customers}\n` +
    `Jobs:       ${totals.jobs}\n` +
    `Quotations: ${totals.quotations}\n` +
    `Payments:   ${totals.payments}\n` +
    `───────────────────────────────────\n\n` +
    `The attached CSV files contain structured records for all workshops, users, customers, jobs, quotations and payments in the selected scope.\n\n` +
    `Regards,\nAutiq Africa Enterprise Admin`

  const totalRows = Object.values(totals).reduce((s, n) => s + n, 0)

  return (
    <div className="pageStack">

      {/* Hero */}
      <section className="panel heroPanel">
        <p className="eyebrow">Enterprise Admin</p>
        <h2>Data export</h2>
        <p>Export structured CSV data for one workshop, all workshops of a client, or the entire platform. Each data category downloads as a separate file.</p>
      </section>

      {/* Controls */}
      <section className="panel">
        <div className="sectionHeader compact">
          <div>
            <h3>Export scope</h3>
            <p>Select a client and/or workshop to scope the export.</p>
          </div>
          <span className="accessBadge"><DatabaseBackup size={16} /> Enterprise Admin only</span>
        </div>

        <div className="formGrid adminForm">
          <label>
            Client
            <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
              <option value="">All clients (platform-wide)</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            Workshop scope
            <select value={scope} onChange={e => setScope(e.target.value)} disabled={!selectedClientId}>
              <option value="all">All workshops{clientN ? ` of ${clientN}` : ''}</option>
              {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label>
            Export reason
            <select value={exportReason} onChange={e => setExportReason(e.target.value)}>
              <option>Client exit</option>
              <option>Monthly compliance backup</option>
              <option>Enterprise audit</option>
              <option>Data migration</option>
            </select>
          </label>
          <label>
            Recipient email
            <input
              value={recipientEmail}
              onChange={e => setRecipientEmail(e.target.value)}
              placeholder="recipient@example.com"
            />
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
          <button
            className="softBtn"
            onClick={loadExportData}
            disabled={fetching}
            style={{ margin: 0 }}
          >
            {fetching
              ? <><Loader2 size={15} className="spin" /> Loading…</>
              : <><RefreshCcw size={15} /> Refresh data</>}
          </button>
          {!fetching && exportData && (
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>
              {totalRows.toLocaleString()} total records loaded
            </span>
          )}
        </div>

        {fetchError && (
          <div style={{
            marginTop: 12, padding: '10px 14px', borderRadius: 14,
            background: '#fff8f7', border: '1px solid #fda29b',
            color: '#b91c1c', fontWeight: 700, fontSize: 13,
          }}>
            ⚠ {fetchError} —{' '}
            <button
              onClick={loadExportData}
              style={{ border: 0, background: 'none', color: '#b91c1c', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}
            >
              retry
            </button>
          </div>
        )}
      </section>

      {/* Metrics */}
      <div className="metricGrid">
        {[
          { label: 'Workshops',  val: totals.workshops  },
          { label: 'Users',      val: totals.users      },
          { label: 'Customers',  val: totals.customers  },
          { label: 'Jobs',       val: totals.jobs       },
          { label: 'Quotations', val: totals.quotations },
          { label: 'Payments',   val: totals.payments   },
        ].map(({ label, val }) => (
          <article key={label} className="metricCard">
            <p>{label}</p>
            <h2 style={{ color: fetching ? 'var(--muted)' : undefined }}>
              {fetching ? '…' : val.toLocaleString()}
            </h2>
            <span>export rows</span>
          </article>
        ))}
      </div>

      {/* Section download cards */}
      <section className="panel">
        <div className="sectionHeader compact" style={{ marginBottom: 18 }}>
          <div>
            <h3>Download by category</h3>
            <p>Each section generates a separate CSV file with rich column data.</p>
          </div>
          <button
            className="primaryBtn"
            onClick={downloadAll}
            disabled={fetching || busySect !== null || !exportData || totalRows === 0}
          >
            {busySect === 'all'
              ? <><Loader2 size={15} className="spin" /> Downloading all…</>
              : <><Download size={15} /> Download all CSVs</>}
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 14 }}>
          <SectionCard
            icon={Building2}   title="Workshops"
            count={totals.workshops}   color="#0d5b7d"
            description="Name, client, country, type, currency, status"
            onDownload={() => downloadSection('workshops')}
            busy={busySect === 'workshops'} disabled={fetching || !exportData}
          />
          <SectionCard
            icon={Users}       title="Users"
            count={totals.users}       color="#00a389"
            description="Name, login email, role, status, last login"
            onDownload={() => downloadSection('users')}
            busy={busySect === 'users'} disabled={fetching || !exportData}
          />
          <SectionCard
            icon={Users}       title="Customers"
            count={totals.customers}   color="#f79009"
            description="Name, phone, email, status, vehicle count"
            onDownload={() => downloadSection('customers')}
            busy={busySect === 'customers'} disabled={fetching || !exportData}
          />
          <SectionCard
            icon={Briefcase}   title="Jobs"
            count={totals.jobs}        color="#6941c6"
            description="Job number, status, customer, vehicle, quote amount"
            onDownload={() => downloadSection('jobs')}
            busy={busySect === 'jobs'} disabled={fetching || !exportData}
          />
          <SectionCard
            icon={FileText}    title="Quotations"
            count={totals.quotations}  color="#e07000"
            description="Quote number, status, total estimate, customer, vehicle"
            onDownload={() => downloadSection('quotations')}
            busy={busySect === 'quotations'} disabled={fetching || !exportData}
          />
          <SectionCard
            icon={CreditCard}  title="Payments"
            count={totals.payments}    color="#039855"
            description="Payment code, method, amount, reference, status"
            onDownload={() => downloadSection('payments')}
            busy={busySect === 'payments'} disabled={fetching || !exportData}
          />
        </div>

        {exportData && totalRows === 0 && (
          <p style={{ marginTop: 16, color: 'var(--muted)', fontSize: 14, textAlign: 'center' }}>
            No records found for the selected scope. Try selecting a different client or workshop.
          </p>
        )}
      </section>

      {/* Email summary */}
      <section className="panel">
        <div className="sectionHeader compact">
          <div>
            <h3>Email-ready handover summary</h3>
            <p>Copy this text and paste into an email to the client or compliance officer.</p>
          </div>
          <button className="softBtn" style={{ margin: 0 }} onClick={copyEmail}>
            {copied
              ? <><CheckCircle2 size={15} style={{ color: '#039855' }} /> Copied!</>
              : <><ClipboardCopy size={15} /> Copy to clipboard</>}
          </button>
        </div>
        <textarea
          ref={emailRef}
          className="emailTextArea"
          value={emailText}
          readOnly
          style={{ minHeight: 260 }}
        />
      </section>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        .spin { animation: spin .8s linear infinite; display: inline-block }
      `}</style>
    </div>
  )
}

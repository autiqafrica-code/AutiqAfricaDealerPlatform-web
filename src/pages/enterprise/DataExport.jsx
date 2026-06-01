import { useMemo, useState } from 'react'
import { DatabaseBackup, Download, Mail, Send } from 'lucide-react'

const clients = []
const workshops = []
const jobs = []
const quotationWorkItems = []
const paymentRecords = []

function csvEscape(value) {
  return `"${String(value ?? '').replaceAll('"', '""')}"`
}

function buildRows(scope) {
  const selectedWorkshops = scope === 'All Workshops' ? workshops : workshops.filter((w) => w.workshop === scope)
  return selectedWorkshops.flatMap((w) => jobs.map((job, index) => ({
    client: w.client,
    workshop: w.workshop,
    country: clients.find((c) => c.name === w.client)?.country || '',
    currency: w.currency,
    jobId: job.id,
    customer: job.customer,
    vehicle: job.vehicle,
    status: job.status,
    amount: job.amount,
    quotation: quotationWorkItems[index % quotationWorkItems.length]?.id,
    paymentStatus: paymentRecords[index % paymentRecords.length]?.status,
    paymentMethod: paymentRecords[index % paymentRecords.length]?.method
  })))
}

function downloadCsv(scope) {
  const rows = buildRows(scope)
  const headers = Object.keys(rows[0] || {})
  const csv = [headers.join(','), ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `autiq-africa-${scope.toLowerCase().replaceAll(' ', '-')}-data-export.csv`
  link.click()
  URL.revokeObjectURL(url)
}

export default function DataExport() {
  const [scope, setScope] = useState('All Workshops')
  const rows = useMemo(() => buildRows(scope), [scope])
  const totals = useMemo(() => ({
    workshops: scope === 'All Workshops' ? workshops.length : 1,
    jobs: rows.length,
    quotes: quotationWorkItems.length,
    payments: paymentRecords.length
  }), [rows, scope])

  const emailReady = `Subject: Autiq Africa data export - ${scope}\n\nHello,\n\nPlease find the client exit data package summary for ${scope}.\n\nWorkshops included: ${totals.workshops}\nJobs included: ${totals.jobs}\nQuotations included: ${totals.quotes}\nPayments included: ${totals.payments}\n\nExport package contains structured CSV data for workshops, customers, vehicles, jobs, quotations, payments and media references.\n\nRegards,\nAutiq Africa Enterprise Admin`

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Enterprise Admin Data Exit</p>
        <h2>Export full workshop data</h2>
        <p>Export structured CSV data or copy an email-ready handover summary for one workshop or all workshops when a client exits.</p>
      </section>

      <div className="metricGrid">
        <Card title="Workshops" value={totals.workshops} note="Included in export" />
        <Card title="Jobs" value={totals.jobs} note="Current data rows" />
        <Card title="Quotations" value={totals.quotes} note="Quote records" />
        <Card title="Payments" value={totals.payments} note="Payment records" />
      </div>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Export scope</p>
            <h3>Choose workshop data</h3>
          </div>
          <span className="accessBadge"><DatabaseBackup size={16} /> CSV + Email-ready</span>
        </div>
        <div className="formGrid adminForm">
          <label>Workshop scope
            <select value={scope} onChange={(e) => setScope(e.target.value)}>
              <option>All Workshops</option>
              {workshops.map((w) => <option key={w.workshop}>{w.workshop}</option>)}
            </select>
          </label>
          <label>Export reason
            <select defaultValue="Client exit">
              <option>Client exit</option>
              <option>Monthly compliance backup</option>
              <option>Enterprise audit</option>
            </select>
          </label>
          <label>Data package
            <select defaultValue="Full data">
              <option>Full data</option>
              <option>Jobs + payments only</option>
              <option>Quotations + media references only</option>
            </select>
          </label>
          <label>Recipient email
            <input defaultValue="client-owner@example.com" />
          </label>
        </div>
        <div className="rowActions">
          <button className="primaryBtn" onClick={() => downloadCsv(scope)}><Download size={16} /> Export CSV</button>
          <button className="softBtn"><Send size={16} /> Mock send email package</button>
        </div>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Email-ready format</p>
            <h3>Copy client exit email summary</h3>
          </div>
          <span className="accessBadge"><Mail size={16} /> Ready to paste</span>
        </div>
        <textarea className="emailTextArea" value={emailReady} readOnly />
      </section>
    </div>
  )
}

function Card({ title, value, note }) {
  return <article className="metricCard"><p>{title}</p><h2>{value}</h2><span>{note}</span></article>
}

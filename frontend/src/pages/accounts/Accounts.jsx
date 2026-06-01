import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CreditCard, Plus, Printer, ReceiptText, RefreshCw } from 'lucide-react'
import { apiFetch } from '../../utils/api'

function money(val, cur = 'ZAR') {
  if (!val) return `${cur} 0`
  if (val >= 1_000_000) return `${cur} ${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000)     return `${cur} ${Math.round(val / 1000)}k`
  return `${cur} ${Number(val).toLocaleString()}`
}

function Loading() { return <div className="infoStrip" style={{ textAlign: 'center' }}>Loading…</div> }
function Err({ text }) {
  return <div className="infoStrip" style={{ background: '#fef2f2', color: '#b91c1c' }}>{text}</div>
}

function Card({ title, value, note, danger }) {
  return (
    <article className={`metricCard ${danger ? 'dangerCard' : ''}`}>
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </article>
  )
}

// ── Generate invoice modal ────────────────────────────────────────────────────

function GenerateInvoiceModal({ sources, onGenerate, onClose, generating, msg }) {
  const [selected, setSelected] = useState(sources[0]?.quotationId || '')

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div className="modalBox" onClick={e => e.stopPropagation()}>
        <div className="sectionHead">
          <h3>Generate invoice</h3>
          <button className="softBtn" onClick={onClose}>Close</button>
        </div>
        {sources.length === 0
          ? <div className="infoStrip">No approved quotations pending invoice generation.</div>
          : (
            <>
              <label style={{ display: 'block', marginBottom: 12 }}>
                Select approved quotation
                <select value={selected} onChange={e => setSelected(e.target.value)} style={{ display: 'block', marginTop: 4, width: '100%' }}>
                  {sources.map(s => (
                    <option key={s.quotationId} value={s.quotationId}>
                      {s.quoteNumber} — {s.customer} — {s.amountDisplay}
                    </option>
                  ))}
                </select>
              </label>
              {msg && (
                <div className="infoStrip" style={{ background: msg.includes('error') || msg.includes('fail') ? '#fef2f2' : '#f0fdf4', color: msg.includes('error') || msg.includes('fail') ? '#b91c1c' : '#15803d' }}>
                  {msg}
                </div>
              )}
              <div className="rowActions" style={{ marginTop: 12 }}>
                <button className="primaryBtn" onClick={() => onGenerate(selected)} disabled={generating || !selected}>
                  <Plus size={16} /> {generating ? 'Generating…' : 'Generate invoice'}
                </button>
              </div>
            </>
          )
        }
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Accounts() {
  const [dashboard,  setDashboard]  = useState(null)
  const [dashLoad,   setDashLoad]   = useState(true)
  const [dashErr,    setDashErr]    = useState('')

  const [invoices,   setInvoices]   = useState([])
  const [invLoad,    setInvLoad]    = useState(true)
  const [invErr,     setInvErr]     = useState('')

  const [sources,    setSources]    = useState([])
  const [showModal,  setShowModal]  = useState(false)
  const [generating, setGenerating] = useState(false)
  const [genMsg,     setGenMsg]     = useState('')

  // Send to front desk / payment clearance
  const [actionMsg,  setActionMsg]  = useState('')
  const [actionErr,  setActionErr]  = useState('')
  const [actioning,  setActioning]  = useState('')

  function loadDashboard() {
    setDashLoad(true); setDashErr('')
    apiFetch('/accounts/dashboard')
      .then(r => r.json())
      .then(j => { if (j.success) setDashboard(j.data); else setDashErr(j.message || 'Failed') })
      .catch(() => setDashErr('Network error'))
      .finally(() => setDashLoad(false))
  }

  function loadInvoices() {
    setInvLoad(true); setInvErr('')
    apiFetch('/accounts/invoices?limit=50')
      .then(r => r.json())
      .then(j => { if (j.success) setInvoices(j.data?.data || []); else setInvErr(j.message || 'Failed') })
      .catch(() => setInvErr('Network error'))
      .finally(() => setInvLoad(false))
  }

  function loadSources() {
    apiFetch('/accounts/invoice-sources')
      .then(r => r.json())
      .then(j => { if (j.success) setSources(j.data || []) })
      .catch(() => {})
  }

  useEffect(() => { loadDashboard(); loadInvoices(); loadSources() }, [])

  async function handleGenerate(quotationId) {
    setGenerating(true); setGenMsg('')
    const r = await apiFetch('/accounts/invoices', {
      method: 'POST',
      body: JSON.stringify({ quotationId }),
    })
    const j = await r.json()
    if (j.success) {
      setGenMsg(`Invoice ${j.data.invoiceNumber} generated.`)
      loadDashboard(); loadInvoices(); loadSources()
      setTimeout(() => { setShowModal(false); setGenMsg('') }, 1800)
    } else {
      setGenMsg(j.message || 'Failed to generate invoice')
    }
    setGenerating(false)
  }

  async function sendInvoiceToFrontDesk(invoiceId) {
    setActioning(invoiceId); setActionMsg(''); setActionErr('')
    try {
      const res  = await apiFetch(`/accounts/invoices/${invoiceId}/send-to-front-desk`, { method: 'POST', body: JSON.stringify({}) })
      const data = await res.json()
      if (!data.success) { setActionErr(data.message || 'Failed'); return }
      setActionMsg('Invoice sent to Front Desk.')
      loadInvoices()
    } catch { setActionErr('Network error') }
    finally { setActioning('') }
  }

  async function clearPayment(invoiceId) {
    setActioning(invoiceId); setActionMsg(''); setActionErr('')
    try {
      const res  = await apiFetch(`/accounts/invoices/${invoiceId}/clear-payment`, { method: 'POST', body: JSON.stringify({}) })
      const data = await res.json()
      if (!data.success) { setActionErr(data.message || 'Failed'); return }
      setActionMsg('Payment cleared — job marked ready for delivery.')
      loadInvoices(); loadDashboard()
    } catch { setActionErr('Network error') }
    finally { setActioning('') }
  }

  const db  = dashboard
  const cur = db?.currency || 'ZAR'

  return (
    <div className="pageStack">
      {dashLoad && <Loading />}
      {dashErr  && <Err text={dashErr} />}

      {!dashLoad && !dashErr && db && (
        <div className="metricGrid">
          <Card
            title="Due today"
            value={money(db.byStatus.DueToday.total, cur)}
            note={`${db.byStatus.DueToday.count} invoice${db.byStatus.DueToday.count !== 1 ? 's' : ''}`}
          />
          <Card
            title="Overdue"
            value={money(db.byStatus.Overdue.total, cur)}
            note={`${db.byStatus.Overdue.count} overdue`}
            danger
          />
          <Card
            title="Paid this cycle"
            value={money(db.byStatus.Paid.total, cur)}
            note={`${db.byStatus.Paid.count} fully paid`}
          />
          <Card
            title="Pending generation"
            value={String(db.pendingGeneration)}
            note="Approved quotes, no invoice"
          />
        </div>
      )}

      <section className="panel">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Accounts</p>
            <h2>Approved quotation payments</h2>
          </div>
          <div className="rowActions">
            <button className="softBtn" onClick={() => { loadDashboard(); loadInvoices(); loadSources() }}>
              <RefreshCw size={16} /> Refresh
            </button>
            <button className="primaryBtn" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Generate invoice
            </button>
            <Link className="softBtn" to="/accounts/invoices"><Printer size={16} /> View invoices</Link>
            <Link className="softBtn" to="/accounts/record-payment"><CreditCard size={16} /> Record payment</Link>
          </div>
        </div>

        {invLoad && <Loading />}
        {invErr  && <Err text={invErr} />}
        {actionMsg && <div className="infoStrip" style={{ background: '#f0fdf4', color: '#15803d', fontWeight: 700 }}>{actionMsg}</div>}
        {actionErr && <Err text={actionErr} />}
        {!invLoad && !invErr && (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Job</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan="6"><div className="infoStrip">No invoices found. Generate one from an approved quotation.</div></td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <strong>{inv.invoiceNumber}</strong>
                      <br /><small>{inv.quoteNumber}</small>
                    </td>
                    <td>{inv.jobNumber || '—'}</td>
                    <td>
                      {inv.customer}
                      <br /><small style={{ color: 'var(--muted)' }}>{inv.vehicle}</small>
                    </td>
                    <td>{inv.amountDisplay}</td>
                    <td><span className={`pill ${inv.statusColor}`}>{inv.paymentStatus}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <Link className="softBtn" to="/accounts/invoices" state={{ invoiceId: inv.id }} style={{ fontSize: 11 }}>
                          <ReceiptText size={13} /> Open
                        </Link>
                        {inv.jobNumber && !inv.sentToFrontDeskAt && (
                          <button className="softBtn" style={{ fontSize: 11 }}
                            onClick={() => sendInvoiceToFrontDesk(inv.id)}
                            disabled={actioning === inv.id}>
                            {actioning === inv.id ? '…' : 'Send to Front Desk'}
                          </button>
                        )}
                        {inv.paymentStatus === 'Paid' && inv.jobNumber && (
                          <button className="softBtn" style={{ fontSize: 11, color: '#039855', borderColor: '#039855' }}
                            onClick={() => clearPayment(inv.id)}
                            disabled={actioning === inv.id}>
                            {actioning === inv.id ? '…' : 'Clear Payment'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel paymentMethodPanel">
        <p className="eyebrow">Available payment methods</p>
        <h3>Cash, Bank, Mobile Money and Card</h3>
        <div className="methodChips">
          <span>Cash</span>
          <span>Bank</span>
          <span>Mobile Money</span>
          <span>Card</span>
        </div>
      </section>

      {showModal && (
        <GenerateInvoiceModal
          sources={sources}
          onGenerate={handleGenerate}
          onClose={() => { setShowModal(false); setGenMsg('') }}
          generating={generating}
          msg={genMsg}
        />
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { CreditCard, Landmark, ReceiptText, Smartphone, WalletCards } from 'lucide-react'
import { apiFetch } from '../../utils/api'

const METHOD_ICONS = {
  Cash:        WalletCards,
  Bank:        Landmark,
  MobileMoney: Smartphone,
  Card:        CreditCard,
}

const METHOD_LABELS = {
  Cash:        'Cash',
  Bank:        'Bank Transfer',
  MobileMoney: 'Mobile Money',
  Card:        'Card',
}

function Loading() { return <div className="infoStrip" style={{ textAlign: 'center' }}>Loading…</div> }

function Card({ title, value, note }) {
  return (
    <article className="metricCard">
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </article>
  )
}

function fmtMoney(amount, currency = 'ZAR') {
  return `${currency} ${Number(amount || 0).toLocaleString()}`
}

function statusColor(s) {
  if (s === 'Paid')     return 'green'
  if (s === 'Overdue')  return 'red'
  if (s === 'PartPaid') return 'amber'
  return 'amber'
}

export default function RecordPayment() {
  const [invoices,   setInvoices]   = useState([])
  const [payments,   setPayments]   = useState([])
  const [loading,    setLoading]    = useState(true)

  const [selectedId, setSelectedId] = useState('')
  const [method,     setMethod]     = useState('Cash')
  const [amount,     setAmount]     = useState('')
  const [reference,  setReference]  = useState('')
  const [notes,      setNotes]      = useState('')
  const [saving,     setSaving]     = useState(false)
  const [msg,        setMsg]        = useState('')
  const [msgOk,      setMsgOk]      = useState(true)

  function loadData() {
    setLoading(true)
    Promise.all([
      apiFetch('/accounts/invoices?limit=100').then(r => r.json()),
      apiFetch('/accounts/payments?limit=20').then(r => r.json()),
    ]).then(([invJ, payJ]) => {
      const invList = (invJ.success ? invJ.data?.data || [] : []).filter(i => i.paymentStatus !== 'Paid')
      setInvoices(invList)
      if (payJ.success) setPayments(payJ.data?.data || [])
      if (invList.length > 0) {
        setSelectedId(invList[0].id)
        setAmount(String(invList[0].total))
      }
    }).catch(() => {}).finally(() => setLoading(false))
  }

  useEffect(() => { loadData() }, [])

  const selected = invoices.find(i => i.id === selectedId)

  function handleInvoiceChange(id) {
    const inv = invoices.find(i => i.id === id)
    setSelectedId(id)
    setMsg('')
    if (inv) {
      setAmount(String(inv.total))
      setReference(`PAY-${inv.invoiceNumber}-${Date.now().toString().slice(-4)}`)
    }
  }

  async function handleSave() {
    if (!selectedId) { setMsgOk(false); setMsg('Select an invoice.'); return }
    const num = Number(amount)
    if (!num || num <= 0) { setMsgOk(false); setMsg('Enter a valid amount.'); return }

    setSaving(true); setMsg('')
    const r = await apiFetch('/accounts/payments', {
      method: 'POST',
      body: JSON.stringify({ invoiceId: selectedId, method, amountReceived: num, referenceNumber: reference, notes }),
    })
    const j = await r.json()
    if (j.success) {
      setMsgOk(true)
      setMsg(`Payment recorded. Invoice status: ${j.data.invoiceStatus}.`)
      loadData()
      setTimeout(() => setMsg(''), 5000)
    } else {
      setMsgOk(false)
      setMsg(j.message || 'Failed to record payment')
    }
    setSaving(false)
  }

  const MethodIcon = METHOD_ICONS[method] || WalletCards

  const dueTodayCount = invoices.filter(i => i.paymentStatus === 'DueToday').length
  const overdueCount  = invoices.filter(i => i.paymentStatus === 'Overdue').length
  const partPaidCount = invoices.filter(i => i.paymentStatus === 'PartPaid').length
  const totalPaid     = payments.reduce((s, p) => s + p.amountReceived, 0)
  const payCurrency   = payments[0]?.currency || 'ZAR'

  return (
    <div className="pageStack">
      <div className="metricGrid">
        <Card title="Due today"    value={String(dueTodayCount)} note="Invoices due today" />
        <Card title="Overdue"      value={String(overdueCount)}  note="Past due date" />
        <Card title="Part paid"    value={String(partPaidCount)} note="Partial payment received" />
        <Card title="Payments recorded" value={fmtMoney(totalPaid, payCurrency)} note="Total received (this page)" />
      </div>

      {msg && (
        <div className="infoStrip" style={{ background: msgOk ? '#f0fdf4' : '#fef2f2', color: msgOk ? '#15803d' : '#b91c1c', fontWeight: 600 }}>
          {msg}
        </div>
      )}

      <section className="panel heroPanel">
        <p className="eyebrow">Accounts Payment Desk</p>
        <h2>Record payment by payment type</h2>
        <p>Select an unpaid invoice, log the payment method, enter the amount received, and save the record.</p>
      </section>

      {loading ? <Loading /> : (
        <>
          <section className="panel">
            <div className="sectionHead">
              <div>
                <p className="eyebrow">Unpaid invoices</p>
                <h3>Payment status tracker</h3>
              </div>
              <span className="accessBadge"><ReceiptText size={16} /> Unpaid &amp; part-paid only</span>
            </div>

            <div className="tableWrap">
              <table>
                <thead>
                  <tr><th>Invoice</th><th>Quote</th><th>Customer</th><th>Vehicle</th><th>Total</th><th>Status</th></tr>
                </thead>
                <tbody>
                  {invoices.length === 0 ? (
                    <tr><td colSpan="6"><small>All invoices have been paid, or no invoices exist yet.</small></td></tr>
                  ) : invoices.map(inv => (
                    <tr key={inv.id}>
                      <td><strong>{inv.invoiceNumber}</strong></td>
                      <td>{inv.quoteNumber}</td>
                      <td>{inv.customer}</td>
                      <td>{inv.vehicle}</td>
                      <td>{inv.amountDisplay}</td>
                      <td><span className={`pill ${inv.statusColor}`}>{inv.paymentStatus}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="grid two">
            <section className="panel">
              <div className="sectionHead compact">
                <div>
                  <p className="eyebrow">Record payment</p>
                  <h3>Payment entry</h3>
                </div>
                <MethodIcon size={24} />
              </div>

              <div className="formGrid adminForm twoCols">
                <label>
                  Invoice
                  <select value={selectedId} onChange={e => handleInvoiceChange(e.target.value)}>
                    {invoices.length === 0
                      ? <option value="">No unpaid invoices</option>
                      : invoices.map(inv => (
                        <option key={inv.id} value={inv.id}>
                          {inv.invoiceNumber} — {inv.customer} — {inv.amountDisplay}
                        </option>
                      ))
                    }
                  </select>
                </label>

                <label>
                  Payment method
                  <select value={method} onChange={e => setMethod(e.target.value)}>
                    {Object.entries(METHOD_LABELS).map(([val, lbl]) => (
                      <option key={val} value={val}>{lbl}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Amount received
                  <input
                    type="number"
                    min="0"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    placeholder="0.00"
                  />
                </label>

                <label>
                  Reference number
                  <input
                    value={reference}
                    onChange={e => setReference(e.target.value)}
                    placeholder="PAY-REF-001"
                  />
                </label>

                <label className="wide">
                  Payment note
                  <textarea
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Optional note"
                  />
                </label>
              </div>

              {selected && (
                <div className="infoStrip">
                  Invoice <strong>{selected.invoiceNumber}</strong> for <strong>{selected.customer}</strong>.
                  Total: <strong>{selected.amountDisplay}</strong> — Status: <strong>{selected.paymentStatus}</strong>
                </div>
              )}

              <div className="paymentActionRow">
                <button className="primaryBtn paymentSaveBtn" onClick={handleSave} disabled={saving || invoices.length === 0}>
                  {saving ? 'Saving…' : 'Save Payment Record'}
                </button>
              </div>
            </section>

            <section className="panel">
              <p className="eyebrow">Recent payments</p>
              <h3>Payment history</h3>

              <div className="tableWrap compactTable">
                <table>
                  <thead>
                    <tr><th>Payment</th><th>Invoice</th><th>Method</th><th>Amount</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {payments.length === 0 ? (
                      <tr><td colSpan="5"><small>No payments recorded yet.</small></td></tr>
                    ) : payments.map(p => (
                      <tr key={p.id}>
                        <td>
                          <strong>{p.paymentCode}</strong>
                          <br />
                          <small>{p.paidAt ? new Date(p.paidAt).toLocaleDateString() : '—'}</small>
                        </td>
                        <td>{p.invoiceNumber}</td>
                        <td>{METHOD_LABELS[p.method] || p.method}</td>
                        <td>{p.amountDisplay}</td>
                        <td><span className={`pill ${statusColor(p.status)}`}>{p.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  )
}

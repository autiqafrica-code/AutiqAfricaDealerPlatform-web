import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Download, Eye, Printer, ReceiptText } from 'lucide-react'
import { apiFetch } from '../../utils/api'

function Loading() { return <div className="infoStrip" style={{ textAlign: 'center' }}>Loading…</div> }
function Err({ text }) {
  return <div className="infoStrip" style={{ background: '#fef2f2', color: '#b91c1c' }}>{text}</div>
}

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZA', { year: 'numeric', month: 'short', day: 'numeric' })
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

const METHOD_LABELS = {
  Cash: 'Cash', Bank: 'Bank Transfer', MobileMoney: 'Mobile Money', Card: 'Card',
}

// ── Invoice preview (printable) ───────────────────────────────────────────────

function InvoicePreview({ invoice }) {
  if (!invoice) {
    return (
      <section className="panel invoicePreview printArea">
        <div className="invoiceHeader">
          <div>
            <p className="eyebrow">Autiq Africa Invoice</p>
            <h2>No invoice selected</h2>
            <p>Select an invoice from the list to preview it here.</p>
          </div>
          <div className="invoiceLogo">AA</div>
        </div>
      </section>
    )
  }

  return (
    <section className="panel invoicePreview printArea">
      <div className="invoiceHeader">
        <div>
          <p className="eyebrow">Autiq Africa Invoice</p>
          <h2>{invoice.invoiceNumber}</h2>
          <p>Generated from approved quotation {invoice.quoteNumber}</p>
        </div>
        <div className="invoiceLogo">AA</div>
      </div>

      <div className="invoiceMetaGrid">
        <span><small>Customer</small><strong>{invoice.customer?.name}</strong></span>
        <span><small>Phone</small><strong>{invoice.customer?.phone}</strong></span>
        <span><small>Vehicle</small><strong>{invoice.vehicle?.makeModel} ({invoice.vehicle?.registrationNo})</strong></span>
        <span><small>Job number</small><strong>{invoice.jobNumber || '—'}</strong></span>
        <span><small>Issue date</small><strong>{fmtDate(invoice.issueDate)}</strong></span>
        <span><small>Due date</small><strong>{fmtDate(invoice.dueDate)}</strong></span>
        <span>
          <small>Payment status</small>
          <strong>
            <span className={`pill ${statusColor(invoice.paymentStatus)}`}>{invoice.paymentStatus}</span>
          </strong>
        </span>
        <span><small>Balance due</small><strong>{fmtMoney(invoice.balance, invoice.currency)}</strong></span>
      </div>

      <div className="tableWrap invoiceTable">
        <table>
          <thead>
            <tr><th>Description</th><th>Qty</th><th>Unit price</th><th>Total</th></tr>
          </thead>
          <tbody>
            {(invoice.lineItems || []).length === 0 ? (
              <tr><td colSpan="4">No line items.</td></tr>
            ) : (invoice.lineItems || []).map(li => (
              <tr key={li.id}>
                <td>{li.description}</td>
                <td>{li.qty}</td>
                <td>{fmtMoney(li.unitPrice, li.currency)}</td>
                <td>{fmtMoney(li.total, li.currency)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="invoiceTotalBox">
        <span><small>Subtotal</small><strong>{fmtMoney(invoice.subtotal, invoice.currency)}</strong></span>
        <span><small>Tax (15%)</small><strong>{fmtMoney(invoice.tax, invoice.currency)}</strong></span>
        <span><small>Total</small><strong>{fmtMoney(invoice.total, invoice.currency)}</strong></span>
        <span><small>Amount paid</small><strong>{fmtMoney(invoice.totalPaid, invoice.currency)}</strong></span>
        <span><small>Balance due</small><strong>{fmtMoney(invoice.balance, invoice.currency)}</strong></span>
      </div>

      {(invoice.payments || []).length > 0 && (
        <div className="tableWrap invoiceTable" style={{ marginTop: 16 }}>
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>Payment history</p>
          <table>
            <thead>
              <tr><th>Code</th><th>Method</th><th>Amount</th><th>Reference</th><th>Date</th><th>Recorded by</th></tr>
            </thead>
            <tbody>
              {invoice.payments.map(p => (
                <tr key={p.id}>
                  <td>{p.paymentCode}</td>
                  <td>{METHOD_LABELS[p.method] || p.method}</td>
                  <td>{p.amountDisplay}</td>
                  <td>{p.referenceNumber || '—'}</td>
                  <td>{fmtDate(p.paidAt)}</td>
                  <td>{p.recordedBy}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="rowActions noPrint" style={{ marginTop: 16 }}>
        <button className="primaryBtn" onClick={() => window.print()}><Printer size={16} /> Print invoice</button>
        <button className="softBtn" onClick={() => window.print()}><Download size={16} /> Download PDF</button>
        <button className="softBtn"><ReceiptText size={16} /> Email-ready invoice</button>
      </div>
    </section>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Invoices() {
  const location = useLocation()

  const [invoices,  setInvoices]  = useState([])
  const [listLoad,  setListLoad]  = useState(true)
  const [listErr,   setListErr]   = useState('')

  const [selected,  setSelected]  = useState(null)
  const [detailLoad, setDetailLoad] = useState(false)
  const [detailErr,  setDetailErr]  = useState('')

  useEffect(() => {
    setListLoad(true); setListErr('')
    apiFetch('/accounts/invoices?limit=100')
      .then(r => r.json())
      .then(j => {
        if (j.success) {
          const rows = j.data?.data || []
          setInvoices(rows)
          // Auto-select if navigated here with a specific invoiceId
          const preselect = location.state?.invoiceId
          if (preselect) {
            const found = rows.find(i => i.id === preselect)
            if (found) loadDetail(found.id)
          } else if (rows.length > 0) {
            loadDetail(rows[0].id)
          }
        } else {
          setListErr(j.message || 'Failed to load invoices')
        }
      })
      .catch(() => setListErr('Network error'))
      .finally(() => setListLoad(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function loadDetail(id) {
    setDetailLoad(true); setDetailErr('')
    apiFetch(`/accounts/invoices/${id}`)
      .then(r => r.json())
      .then(j => { if (j.success) setSelected(j.data); else setDetailErr(j.message || 'Failed') })
      .catch(() => setDetailErr('Network error'))
      .finally(() => setDetailLoad(false))
  }

  return (
    <div className="pageStack">
      <section className="panel heroPanel noPrint">
        <p className="eyebrow">Accounts invoice desk</p>
        <h2>View and print invoices</h2>
        <p>Open any invoice to preview, print, or download a copy. Payment history is shown per invoice.</p>
      </section>

      <section className="panel noPrint">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Invoice register</p>
            <h3>All invoices</h3>
          </div>
          <button className="softBtn" onClick={() => window.print()}><Printer size={16} /> Print selected</button>
        </div>

        {listLoad && <Loading />}
        {listErr  && <Err text={listErr} />}
        {!listLoad && !listErr && (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Quote</th>
                  <th>Job</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {invoices.length === 0 ? (
                  <tr><td colSpan="8"><div className="infoStrip">No invoices found.</div></td></tr>
                ) : invoices.map(inv => (
                  <tr key={inv.id}>
                    <td>
                      <strong>{inv.invoiceNumber}</strong>
                      <br />
                      <small>{fmtDate(inv.issueDate)}</small>
                    </td>
                    <td>{inv.quoteNumber}</td>
                    <td>{inv.jobNumber || '—'}</td>
                    <td>{inv.customer}</td>
                    <td>{inv.vehicle}</td>
                    <td>{inv.amountDisplay}</td>
                    <td><span className={`pill ${inv.statusColor}`}>{inv.paymentStatus}</span></td>
                    <td>
                      <button className="softBtn" onClick={() => loadDetail(inv.id)}>
                        <Eye size={16} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {detailLoad && <Loading />}
      {detailErr  && <Err text={detailErr} />}
      {!detailLoad && !detailErr && <InvoicePreview invoice={selected} />}
    </div>
  )
}

import { Link } from 'react-router-dom'
import { CreditCard, Printer, ReceiptText } from 'lucide-react'

const approvedQuotations = []

export default function Accounts() {
  return (
    <div className="pageStack">
      <div className="metricGrid">
        <Card title="Due today" value="ZAR 21k" note="Orange status" />
        <Card title="Overdue" value="ZAR 12k" note="Red status" danger />
        <Card title="Paid" value="ZAR 49k" note="Green status" />
        <Card title="Approved quotes" value={approvedQuotations.length} note="Payment tracking" />
      </div>

      <section className="panel">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Accounts</p>
            <h2>Approved quotation payments</h2>
          </div>
          <div className="rowActions">
            <Link className="primaryBtn" to="/accounts/invoices"><Printer size={16} /> View / print invoices</Link>
            <Link className="softBtn" to="/accounts/record-payment"><CreditCard size={16} /> Record payment</Link>
          </div>
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Quote</th><th>Job</th><th>Customer</th><th>Amount</th><th>Method</th><th>Payment Status</th><th>Invoice</th></tr></thead>
            <tbody>{approvedQuotations.map((q) => (
              <tr key={q.id}>
                <td><strong>{q.id}</strong></td>
                <td>{q.jobId}</td>
                <td>{q.customer}</td>
                <td>{q.amount}</td>
                <td>{q.method}</td>
                <td><span className={`pill ${q.paymentColor}`}>{q.paymentStatus}</span></td>
                <td><Link className="softBtn" to="/accounts/invoices"><ReceiptText size={16} /> Open</Link></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="panel paymentMethodPanel">
        <p className="eyebrow">Available payment methods</p>
        <h3>Cash, Bank, Mobile Money and Card</h3>
        <div className="methodChips">
          <span>Cash</span><span>Bank</span><span>Mobile Money</span><span>Card</span>
        </div>
      </section>
    </div>
  )
}

function Card({ title, value, note, danger }) {
  return <article className={`metricCard ${danger ? 'dangerCard' : ''}`}><p>{title}</p><h2>{value}</h2><span>{note}</span></article>
}

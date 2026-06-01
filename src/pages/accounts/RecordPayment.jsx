import { useState } from 'react'
import { CreditCard, Landmark, ReceiptText, Smartphone, WalletCards } from 'lucide-react'

const approvedQuotations = []
const paymentRecords = []

const methodIcons = { Cash: WalletCards, Bank: Landmark, 'Mobile Money': Smartphone, Card: CreditCard }

export default function RecordPayment() {
  const [method, setMethod] = useState('Mobile Money')
  const [gatewayStatus, setGatewayStatus] = useState('Ready')
  const MethodIcon = methodIcons[method]

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Accounts Payment Desk</p>
        <h2>Record payment by payment type</h2>
        <p>Track every approved quotation, log payment method, and simulate a payment gateway response before marking the quotation paid.</p>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Approved quotations</p>
            <h3>Payment status tracker</h3>
          </div>
          <span className="accessBadge"><ReceiptText size={16} /> Approved quotes only</span>
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Quote</th><th>Customer</th><th>Vehicle</th><th>Amount</th><th>Status</th><th>Method</th></tr></thead>
            <tbody>{approvedQuotations.map((q) => <tr key={q.id}><td><strong>{q.id}</strong><br /><small>{q.jobId}</small></td><td>{q.customer}</td><td>{q.vehicle}</td><td>{q.amount}</td><td><span className={`pill ${q.paymentColor}`}>{q.paymentStatus}</span></td><td>{q.method}</td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <div className="grid two">
        <section className="panel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Record payment</p>
              <h3>Payment entry</h3>
            </div>
            <MethodIcon />
          </div>
          <div className="formGrid adminForm twoCols">
            <label>Approved quote
              <select defaultValue="AA-Q-2048">{approvedQuotations.map((q) => <option key={q.id}>{q.id} - {q.customer}</option>)}</select>
            </label>
            <label>Payment method
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                <option>Cash</option><option>Bank</option><option>Mobile Money</option><option>Card</option>
              </select>
            </label>
            <label>Amount received<input defaultValue="ZAR 3,080" /></label>
            <label>Reference number<input defaultValue="PAY-MOCK-120526" /></label>
            <label className="wide">Payment note<textarea defaultValue="Customer paid deposit and approved collection after final wash." /></label>
          </div>
          <div className="rowActions">
            <button className="primaryBtn">Save payment record</button>
            <button className="softBtn" onClick={() => setGatewayStatus('Gateway test authorized payment successfully')}><CreditCard size={16} /> Run gateway test</button>
          </div>
        </section>

        <section className="panel gatewayMock">
          <p className="eyebrow">Payment gateway test</p>
          <h3>AutiqPay test terminal</h3>
          <div className="gatewayScreen">
            <CreditCard size={34} />
            <strong>{gatewayStatus}</strong>
            <span>Method: {method}</span>
            <span>Provider: Mock Card / Mobile Money Gateway</span>
            <span>Status callback: /api/payments/mock-webhook</span>
          </div>
          <div className="tableWrap compactTable">
            <table>
              <thead><tr><th>Payment</th><th>Method</th><th>Status</th></tr></thead>
              <tbody>{paymentRecords.map((p) => <tr key={p.id}><td>{p.id}</td><td>{p.method}</td><td><span className={`pill ${p.color}`}>{p.status}</span></td></tr>)}</tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  )
}

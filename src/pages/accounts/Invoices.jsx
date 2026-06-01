import { useMemo, useState } from 'react'
import { CreditCard, Download, Eye, Printer, ReceiptText } from 'lucide-react'

const invoiceRows = []

export default function Invoices() {
  const [selectedInvoice, setSelectedInvoice] = useState(invoiceRows[0] || {})
  const invoiceTotal = useMemo(() => selectedInvoice.amount, [selectedInvoice])

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Accounts invoice desk</p>
        <h2>View and print invoices</h2>
        <p>Accounts users can open approved quotation invoices, check payment status, print, and download an email-ready invoice copy.</p>
      </section>

      <section className="panel noPrint">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Invoice register</p>
            <h3>Approved quotation invoices</h3>
          </div>
          <button className="softBtn" onClick={() => window.print()}><Printer size={16} /> Print selected invoice</button>
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Invoice</th><th>Quote</th><th>Customer</th><th>Vehicle</th><th>Amount</th><th>Payment</th><th>Action</th></tr></thead>
            <tbody>{invoiceRows.map((invoice) => (
              <tr key={invoice.invoiceNo}>
                <td><strong>{invoice.invoiceNo}</strong><br /><small>{invoice.issueDate}</small></td>
                <td>{invoice.id}<br /><small>{invoice.jobId}</small></td>
                <td>{invoice.customer}</td>
                <td>{invoice.vehicle}</td>
                <td>{invoice.amount}</td>
                <td><span className={`pill ${invoice.paymentColor}`}>{invoice.paymentStatus}</span></td>
                <td><button className="softBtn" onClick={() => setSelectedInvoice(invoice)}><Eye size={16} /> View</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </section>

      <section className="panel invoicePreview printArea">
        <div className="invoiceHeader">
          <div>
            <p className="eyebrow">Autiq Africa Invoice</p>
            <h2>{selectedInvoice.invoiceNo}</h2>
            <p>Generated from approved quotation {selectedInvoice.id}</p>
          </div>
          <div className="invoiceLogo">AA</div>
        </div>

        <div className="invoiceMetaGrid">
          <span><small>Customer</small><strong>{selectedInvoice.customer}</strong></span>
          <span><small>Vehicle</small><strong>{selectedInvoice.vehicle}</strong></span>
          <span><small>Job Number</small><strong>{selectedInvoice.jobId}</strong></span>
          <span><small>Payment Status</small><strong className={selectedInvoice.paymentColor === 'green' ? 'greenText' : 'redText'}>{selectedInvoice.paymentStatus}</strong></span>
          <span><small>Payment Method</small><strong>{selectedInvoice.method}</strong></span>
          <span><small>Issue Date</small><strong>{selectedInvoice.issueDate}</strong></span>
        </div>

        <div className="tableWrap invoiceTable">
          <table>
            <thead><tr><th>Description</th><th>Qty</th><th>Price</th></tr></thead>
            <tbody>{(selectedInvoice.lineItems || []).map((item) => (
              <tr key={item.description}><td>{item.description}</td><td>{item.qty}</td><td>{item.price}</td></tr>
            ))}</tbody>
          </table>
        </div>

        <div className="invoiceTotalBox">
          <span><small>Tax estimate</small><strong>{selectedInvoice.tax}</strong></span>
          <span><small>Total due</small><strong>{invoiceTotal}</strong></span>
        </div>

        <div className="rowActions noPrint">
          <button className="primaryBtn" onClick={() => window.print()}><Printer size={16} /> Print invoice</button>
          <button className="softBtn"><Download size={16} /> Download PDF</button>
          <button className="softBtn"><ReceiptText size={16} /> Email-ready invoice</button>
          <button className="softBtn"><CreditCard size={16} /> Send payment link</button>
        </div>
      </section>
    </div>
  )
}

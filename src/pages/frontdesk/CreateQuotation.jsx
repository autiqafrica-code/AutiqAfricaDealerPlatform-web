import { ClipboardList, Mail, MessageCircle, Send, Wrench } from 'lucide-react'

const quoteRows = [
  { item: 'Brake pad replacement', source: 'Technician', time: '2.5 hrs', cost: 'ZAR 1,450', status: 'Added' },
  { item: 'Front disc skim', source: 'Workshop Controller', time: '1 hr', cost: 'ZAR 650', status: 'Review' },
  { item: 'Brake pads set', source: 'Parts Interpreter', time: 'Available today', cost: 'ZAR 980', status: 'Parts confirmed' }
]

export default function CreateQuotation() {
  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Quotation Workflow</p>
        <h2>Create Repair Quotation</h2>
        <p>Build the requested repair quotation, request inputs from workshop controller, technician and parts interpreter, then send for customer approval by WhatsApp or email.</p>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <h3>Customer Repair Request</h3>
            <p>Initial quote can be created by service consultant and enriched by other roles.</p>
          </div>
          <span className="accessBadge">Draft Quote AA-Q-2048</span>
        </div>
        <div className="formGrid adminForm">
          <label>Customer<select><option>Amina Okafor</option><option>Musa Dlamini</option></select></label>
          <label>Vehicle<select><option>CA 245 889 - Toyota Hilux</option><option>GP 887 120 - BMW X3</option></select></label>
          <label>Repair Type<select><option>Brake Repair</option><option>Service</option><option>Paint & Panel</option><option>Electrical</option><option>Suspension</option></select></label>
          <label>Priority<select><option>Amber - Should be done soon</option><option>Red - Critical</option><option>Green - Good to go</option></select></label>
          <label className="wide">Customer Complaint / Repair Requested<textarea placeholder="Customer reports brake noise and vibration while stopping." /></label>
        </div>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div><h3>Request Internal Quote Inputs</h3><p>Send quote task to operational users to add time, labour, repair cost and parts details.</p></div>
          <button className="primaryBtn"><Send size={16} /> Send Internal Requests</button>
        </div>
        <div className="quoteRoutingGrid">
          <label><input type="checkbox" defaultChecked /> Workshop Controller <span>Assign repair route and estimated bay time</span></label>
          <label><input type="checkbox" defaultChecked /> Technician <span>Add diagnosis, repair time and media notes</span></label>
          <label><input type="checkbox" defaultChecked /> Parts Interpreter <span>Add parts to replace or repair with availability</span></label>
        </div>
      </section>

      <section className="panel">
        <div className="sectionHeader"><h3>Quotation Line Items</h3><button className="softBtn"><ClipboardList size={16} /> Add Manual Line</button></div>
        <div className="tableWrap"><table><thead><tr><th>Item</th><th>Added By</th><th>Repair Time</th><th>Cost</th><th>Status</th></tr></thead><tbody>{quoteRows.map(row => <tr key={row.item}><td>{row.item}</td><td>{row.source}</td><td>{row.time}</td><td>{row.cost}</td><td><span className="pill green">{row.status}</span></td></tr>)}</tbody></table></div>
        <div className="quoteTotal"><span>Total Estimate</span><strong>ZAR 3,080</strong></div>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div><h3>Send for Customer Approval</h3><p>Approval link can be shared through WhatsApp and email.</p></div>
          <div className="rowActions notificationActions">
            <button className="primaryBtn"><MessageCircle size={16} /> Send WhatsApp</button>
            <button className="softBtn"><Mail size={16} /> Send Email</button>
          </div>
        </div>
        <div className="infoStrip">Customer receives secure approval link with quote details, line items, photos, approve/reject buttons and digital signature.</div>
      </section>
    </div>
  )
}

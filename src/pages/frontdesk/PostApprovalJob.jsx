import { Bell, CheckCircle2, Factory, Send, Wrench } from 'lucide-react'

export default function PostApprovalJob() {
  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Approved Quotations</p>
        <h2>Create Job After Customer Approval</h2>
        <p>Once the quote is approved, the service consultant creates the job card, assigns it to the workshop controller and notifies the parts interpreter.</p>
      </section>

      <div className="metricGrid">
        <article className="metricCard"><p>Approved Quotes</p><h2>6</h2><span>Ready for job creation</span></article>
        <article className="metricCard"><p>Assigned Today</p><h2>14</h2><span>Workshop controller queue</span></article>
        <article className="metricCard"><p>Parts Notifications</p><h2>9</h2><span>Sent to parts interpreter</span></article>
        <article className="metricCard"><p>Pending Approval</p><h2>5</h2><span>Customer reminders active</span></article>
      </div>

      <section className="panel">
        <div className="sectionHeader">
          <div><h3>Approved Quotation</h3><p>Convert quote AA-Q-2048 into job AA-1031.</p></div>
          <span className="pill green"><CheckCircle2 size={14} /> Customer Approved</span>
        </div>
        <div className="formGrid adminForm">
          <label>Quote Number<input defaultValue="AA-Q-2048" /></label>
          <label>New Job Number<input defaultValue="AA-1031" /></label>
          <label>Customer<input defaultValue="Amina Okafor" /></label>
          <label>Vehicle<input defaultValue="CA 245 889 - Toyota Hilux" /></label>
          <label>Assign Workshop Controller<select><option>Controller 01 - Ikeja Workshop</option><option>Kabo Molefe - Main Fleet Workshop</option></select></label>
          <label>Notify Parts Interpreter<select><option>Parts Interpreter 01</option><option>Parts Team Queue</option></select></label>
          <label>Department<select><option>Service</option><option>Paint & Panel</option><option>Parts</option></select></label>
          <label>Expected Start Date<input type="date" /></label>
        </div>
        <div className="jobFlowPreview">
          <div><CheckCircle2 /> Quote approved</div>
          <div><Factory /> Job assigned to workshop controller</div>
          <div><Wrench /> Parts interpreter notified</div>
          <div><Bell /> Customer progress notification enabled</div>
        </div>
        <div className="stickyActions">
          <button className="primaryBtn"><Send size={16} /> Create Job & Notify Teams</button>
          <button className="softBtn">Save as Draft</button>
        </div>
      </section>
    </div>
  )
}

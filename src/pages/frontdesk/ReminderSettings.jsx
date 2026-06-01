import { BellRing, Save, Send } from 'lucide-react'

const approvalReminderRules = []
const quotationWorkItems = []
const workshops = []

export default function ReminderSettings() {
  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Front Desk / Pending quotation approval</p>
        <h2>Configure auto reminders to customers</h2>
        <p>Set reminder timing, channel, repeat frequency and maximum attempts for customers who have not approved or rejected a quotation.</p>
      </div>

      <div className="panel formPanel">
        <div className="sectionHeader compact">
          <div>
            <p className="eyebrow">Reminder automation</p>
            <h3>Create approval reminder rule</h3>
          </div>
          <span className="accessBadge"><BellRing size={16} /> WhatsApp / Email</span>
        </div>
        <div className="formGrid adminForm twoCols">
          <label>Workshop<select defaultValue="Ikeja Workshop">{workshops.map((w) => <option key={w.workshop}>{w.workshop}</option>)}</select></label>
          <label>Pending quotation<select defaultValue="AA-Q-2049">{quotationWorkItems.map((quote) => <option key={quote.id}>{quote.id} - {quote.customer}</option>)}</select></label>
          <label>Customer channel<select defaultValue="WhatsApp + Email"><option>WhatsApp</option><option>Email</option><option>WhatsApp + Email</option></select></label>
          <label>First reminder<select defaultValue="2 hours after quote sent"><option>1 hour after quote sent</option><option>2 hours after quote sent</option><option>4 hours after quote sent</option><option>Next morning 09:00</option></select></label>
          <label>Repeat frequency<select defaultValue="Every 24 hours"><option>Every 12 hours</option><option>Every 24 hours</option><option>Every 48 hours</option><option>Daily at 10:00</option></select></label>
          <label>Maximum attempts<select defaultValue="3"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label>
          <label>Stop reminders when<select defaultValue="Approved or rejected"><option>Approved or rejected</option><option>Approved only</option><option>Payment received</option></select></label>
          <label>Status<select defaultValue="Active"><option>Active</option><option>Paused</option></select></label>
          <label className="wide">Reminder message template<textarea defaultValue="Your Autiq Africa quotation is waiting for approval. Please open the secure approval link to approve, reject, or request changes." /></label>
        </div>
        <div className="rowActions">
          <button className="primaryBtn"><Save size={16} /> Save reminder rule</button>
          <button className="softBtn"><Send size={16} /> Send test reminder</button>
        </div>
      </div>

      <section className="panel">
        <div className="sectionHead">
          <h2>Active quotation approval reminder rules</h2>
          <button className="softBtn">View reminder log</button>
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Rule</th><th>Workshop</th><th>Quote</th><th>Customer</th><th>Channel</th><th>First Reminder</th><th>Repeat</th><th>Attempts</th><th>Status</th></tr></thead>
            <tbody>
              {approvalReminderRules.map((rule) => (
                <tr key={rule.id}>
                  <td>{rule.id}</td>
                  <td>{rule.workshop}</td>
                  <td>{rule.quoteId}</td>
                  <td>{rule.customer}</td>
                  <td>{rule.channel}</td>
                  <td>{rule.firstReminder}</td>
                  <td>{rule.repeat}</td>
                  <td>{rule.maxAttempts}</td>
                  <td><span className={`pill ${rule.status === 'Active' ? 'green' : 'amber'}`}>{rule.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}

import { Link } from 'react-router-dom'
import { BellRing, Car, FileCheck2, FilePlus2, Search, Send, UserPlus } from 'lucide-react'

const completedJobNotifications = []
const jobs = []

export default function FrontDesk() {
  return (
    <div className="pageStack">
      <div className="metricGrid">
        <Card title="Jobs today" value="28" note="Limit: 30" />
        <Card title="New customers" value="7" note="Created today" />
        <Card title="Waiting customer" value="6" note="Approvals pending" />
        <Card title="Collections" value="9" note="Ready for delivery" />
      </div>

      <section className="panel heroPanel">
        <p className="eyebrow">Front Desk / Service Consultant</p>
        <h2>Customer Intake, Quotation and Job Handoff</h2>
        <p>Use this workspace to create customers, manage customer vehicles, prepare quotations, send approvals, and convert approved quotations into jobs.</p>
        <div className="serviceConsultantGrid">
          <Link to="/front-desk/add-customer"><UserPlus /> <strong>Add New Customer</strong><span>Create customer profile and communication preferences</span></Link>
          <Link to="/front-desk/add-vehicle"><Car /> <strong>Add Customer Vehicle</strong><span>Attach multiple vehicles to one customer</span></Link>
          <Link to="/front-desk/create-quotation"><FilePlus2 /> <strong>Create Quotation</strong><span>Request repair time, cost and parts details</span></Link>
          <Link to="/front-desk/post-approval-job"><FileCheck2 /> <strong>Approved Quotations</strong><span>Create job and notify workshop and parts teams</span></Link>
          <Link to="/front-desk/reminder-settings"><BellRing /> <strong>Approval Reminders</strong><span>Configure auto reminders for pending quotation approval</span></Link>
        </div>
      </section>

      <section className="panel">
        <div className="sectionHead">
          <h2>Front Desk: customer, intake and appointment desk</h2>
          <Link className="primaryBtn" to="/front-desk/add-customer"><UserPlus size={16} /> Create customer</Link>
        </div>
        <div className="searchBar"><Search size={18} /><input placeholder="Search by name, phone, registration number, vehicle or job" /></div>
        <div className="tableWrap"><table><thead><tr><th>Job</th><th>Customer</th><th>Vehicle</th><th>Status</th><th>Next Action</th></tr></thead><tbody>{jobs.slice(0,5).map(j=><tr key={j.id}><td>{j.id}</td><td>{j.customer}</td><td>{j.vehicle}</td><td><span className={`pill ${j.priority.toLowerCase()}`}>{j.status}</span></td><td>Update client / assign department</td></tr>)}</tbody></table></div>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Job completed trigger</p>
            <h3>Notify customer for delivery or collection</h3>
            <p>When workshop marks a job completed, Front Desk can send the customer notification based on the delivery or collection choice captured during job creation.</p>
          </div>
          <span className="accessBadge"><BellRing size={16} /> WhatsApp / Email</span>
        </div>
        <div className="notificationGrid">
          <div className="quoteUpdateCard">
            <div className="formGrid adminForm twoCols">
              <label>Completed job<select defaultValue="AA-1030">{completedJobNotifications.map((n) => <option key={n.jobId}>{n.jobId} - {n.customer}</option>)}</select></label>
              <label>Customer choice<select defaultValue="Collection"><option>Collection</option><option>Delivery</option></select></label>
              <label>Notification channel<select defaultValue="WhatsApp"><option>WhatsApp</option><option>Email</option></select></label>
              <label>Send timing<select defaultValue="Send now"><option>Send now</option><option>Schedule later today</option></select></label>
              <label className="wide">Message<textarea defaultValue="Your vehicle service is complete. Please collect your vehicle from the service desk today, or reply if you need delivery support." /></label>
            </div>
            <button className="primaryBtn"><Send size={16} /> Send customer completion notification</button>
          </div>
          <div className="quoteUpdateCard mutedCard">
            <h4>Recent completion notifications</h4>
            {completedJobNotifications.map((n) => <div className="handoffStep" key={n.jobId}><BellRing size={17} /><span><strong>{n.jobId}</strong> {n.customer}<br /><small>{n.preference} via {n.channel}</small></span></div>)}
          </div>
        </div>
      </section>
    </div>
  )
}
function Card({title,value,note}){return <article className="metricCard"><p>{title}</p><h2>{value}</h2><span>{note}</span></article>}

import { AlertTriangle, BadgeDollarSign, CheckCircle2, Clock3 } from 'lucide-react'

const jobs = []

export default function Dashboard({ role }) {
  return (
    <div className="pageStack">
      <div className="metricGrid">
        <Card icon={<Clock3 />} title="Jobs Today" value="28" note="Daily limit: 30" />
        <Card icon={<AlertTriangle />} title="Pending Approvals" value="6" note="2 overdue" danger />
        <Card icon={<BadgeDollarSign />} title="Revenue" value="ZAR 84.2k" note="Multi-currency enabled" />
        <Card icon={<CheckCircle2 />} title="Completed" value="17" note="61% completion" />
      </div>
      <section className="panel">
        <div className="sectionHead"><h2>{role} quick view</h2><button className="softBtn">Export CSV</button></div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Job</th><th>Customer</th><th>Vehicle</th><th>Status</th><th>Technician</th><th>Amount</th></tr></thead>
            <tbody>{jobs.slice(0,5).map(job => <tr key={job.id}><td>{job.id}</td><td>{job.customer}</td><td>{job.vehicle}</td><td><span className={`pill ${job.priority.toLowerCase()}`}>{job.status}</span></td><td>{job.tech}</td><td>{job.amount}</td></tr>)}</tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
function Card({ icon, title, value, note, danger }) { return <article className={`metricCard ${danger ? 'dangerCard' : ''}`}><div className="metricIcon">{icon}</div><p>{title}</p><h2>{value}</h2><span>{note}</span></article> }

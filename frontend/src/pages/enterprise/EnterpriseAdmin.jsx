import { Archive, Download, Mail, Power, Shield, Trash2, UserPlus } from 'lucide-react'

const accessRows = []
const clients = []

export default function EnterpriseAdmin() {
  return (
    <div className="pageStack">
      <div className="metricGrid">
        <Card title="Clients on platform" value="—" note="Dealers configured" />
        <Card title="Active clients" value="—" note="Active on platform" />
        <Card title="Total users" value="—" note="Across all dealers" />
        <Card title="Exports this month" value="—" note="CSV and email-ready" />
      </div>

      <section className="panel">
        <div className="sectionHead">
          <div><h2>Create & onboard new client</h2><p>Dealer setup, module configuration, currency, and onboarding email.</p></div>
          <button className="primaryBtn"><UserPlus size={16} /> Create Dealer</button>
        </div>
        <div className="formGrid adminForm">
          <input placeholder="Dealer / client name" />
          <input placeholder="Country" />
          <select><option value="">Select currency</option><option>KES</option><option>ZAR</option><option>USD</option><option>BWP</option><option>ZMW</option><option>NGN</option></select>
          <select><option value="">Select package</option><option>Service + Paint & Panel</option><option>Service only</option><option>Paint & Panel only</option></select>
          <input placeholder="Primary admin name" />
          <input placeholder="Primary email" />
          <input placeholder="Phone / WhatsApp" />
          <label>Workshop opening time<input type="time" /></label>
          <label>Workshop closing time<input type="time" /></label>
          <select><option value="">Select status</option><option>Active</option><option>Inactive</option></select>
        </div>
        <button className="softBtn"><Mail size={16} /> Save setup and send onboarding email</button>
      </section>

      <section className="panel">
        <div className="sectionHead"><h2>Role based access management</h2><span className="accessBadge">Dealer user types</span></div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>User Role</th><th>Allowed Access</th><th>Control</th></tr></thead>
            <tbody>{accessRows.map(row => <tr key={row.role}><td><strong>{row.role}</strong></td><td>{row.access}</td><td><button className="softBtn"><Shield size={15} /> Edit Access</button></td></tr>)}</tbody>
          </table>
        </div>
      </section>

      <section className="clientGrid">
        {clients.map(c => <article className="clientCard" key={c.name}>
          <div className="sectionHead"><h3>{c.name}</h3><span className={`pill ${c.status === 'Active' ? 'green' : 'amber'}`}>{c.status}</span></div>
          <p><strong>{c.country}</strong> • {c.currency}</p>
          <p>{c.modules}</p>
          <small>{c.users} users • Last login: {c.lastLogin} • Account age: {c.accountAge}</small>
          <div className="rowActions">
            <button><Power size={15}/> Activate</button>
            <button><Archive size={15}/> Archive</button>
            <button><Trash2 size={15}/> Delete</button>
          </div>
          <div className="rowActions">
            <button><Download size={15}/> Export CSV</button>
            <button><Mail size={15}/> Email-ready Export</button>
          </div>
        </article>)}
      </section>
    </div>
  )
}
function Card({ title, value, note }) { return <article className="metricCard"><p>{title}</p><h2>{value}</h2><span>{note}</span></article> }

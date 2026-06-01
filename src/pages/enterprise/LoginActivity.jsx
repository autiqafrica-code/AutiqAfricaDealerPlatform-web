import { useMemo, useState } from 'react'

const clients = []
const workshopUsers = []

export default function LoginActivity() {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('lastLogin')

  const rows = useMemo(() => workshopUsers
    .filter((user) => `${user.client} ${user.workshop} ${user.role} ${user.name} ${user.login} ${user.status} ${user.lastLogin} ${user.accountAge}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => String(a[sortBy]).localeCompare(String(b[sortBy]))), [query, sortBy])

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Login monitoring</p>
        <h2>Workshop user login activity</h2>
        <p>View each workshop, every user type, last login time, account age and status. Enterprise Admin can deactivate or block a specific user directly from this screen.</p>
      </div>

      <div className="panel">
        <div className="sectionHeader">
          <div>
            <h3>User-level activity</h3>
            <p>Filter by client, workshop, role, user name, login email or status.</p>
          </div>
          <button className="secondaryBtn">Export CSV</button>
        </div>
        <div className="filterBar">
          <label>Search users<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client, workshop, role, user, login date" /></label>
          <label>Client<select><option>All clients</option>{clients.map((client) => <option key={client.name}>{client.name}</option>)}</select></label>
          <label>Sort by<select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="client">Client</option><option value="workshop">Workshop</option><option value="role">Role</option><option value="name">User name</option><option value="lastLogin">Last login</option><option value="accountAge">Account age</option><option value="status">Status</option></select></label>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Client</th>
                <th>Workshop</th>
                <th>User type</th>
                <th>User name</th>
                <th>Login email / name</th>
                <th>Last login date/time</th>
                <th>Account age</th>
                <th>Status</th>
                <th>User action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((user, index) => (
                <tr key={`${user.login}-${index}`}>
                  <td>{user.client}</td>
                  <td>{user.workshop}</td>
                  <td>{user.role}</td>
                  <td>{user.name}</td>
                  <td>{user.login}</td>
                  <td>{user.lastLogin}</td>
                  <td>{user.accountAge}</td>
                  <td><span className={`statusPill ${user.status.toLowerCase()}`}>{user.status}</span></td>
                  <td>
                    <div className="actionRow">
                      <button>Deactivate</button>
                      <button>Block</button>
                      <button>Reset Password</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

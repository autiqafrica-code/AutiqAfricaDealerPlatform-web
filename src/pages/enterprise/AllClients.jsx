import { useMemo, useState } from 'react'

const clients = []

export default function AllClients() {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('name')

  const rows = useMemo(() => {
    return clients
      .filter((client) => `${client.name} ${client.country} ${client.currency} ${client.modules} ${client.status}`.toLowerCase().includes(query.toLowerCase()))
      .sort((a, b) => {
        if (sortBy === 'users') return b.users - a.users
        if (sortBy === 'revenue') return b.revenue - a.revenue
        return String(a[sortBy]).localeCompare(String(b[sortBy]))
      })
  }, [query, sortBy])

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Client management</p>
        <h2>View all clients on platform</h2>
        <p>Search, sort and manage dealer status, modules, users and exit actions from one screen.</p>
      </div>
      <div className="panel">
        <div className="sectionHeader">
          <div>
            <h3>Dealer clients</h3>
            <p>{rows.length} clients match current filters.</p>
          </div>
          <button className="primaryBtn">+ New Client</button>
        </div>
        <div className="filterBar">
          <label>Search client<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by client, country, module, status" /></label>
          <label>Sort by<select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="name">Client name</option><option value="country">Country</option><option value="currency">Currency</option><option value="users">Users</option><option value="revenue">Revenue</option><option value="status">Status</option></select></label>
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Client</th><th>Country</th><th>Currency</th><th>Modules</th><th>Users</th><th>Revenue</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{rows.map((client) => (
              <tr key={client.name}>
                <td>{client.name}</td><td>{client.country}</td><td>{client.currency}</td><td>{client.modules}</td><td>{client.users}</td><td>{client.revenueText}</td><td><span className={`statusPill ${client.status.toLowerCase()}`}>{client.status}</span></td>
                <td className="actionRow"><button>Activate</button><button>Deactivate</button><button>Archive</button><button className="danger">Delete</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

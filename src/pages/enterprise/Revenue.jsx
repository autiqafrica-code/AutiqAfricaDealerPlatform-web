import { useMemo, useState } from 'react'

const clients = []
const workshops = []

export default function Revenue() {
  const [query, setQuery] = useState('')
  const [sortBy, setSortBy] = useState('revenue')

  const clientRows = useMemo(() => clients
    .filter((client) => `${client.name} ${client.country} ${client.currency} ${client.modules}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sortBy === 'revenue' ? b.revenue - a.revenue : String(a[sortBy]).localeCompare(String(b[sortBy]))), [query, sortBy])

  const workshopRows = useMemo(() => workshops
    .filter((workshop) => `${workshop.client} ${workshop.workshop} ${workshop.ceo} ${workshop.currency}`.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => sortBy === 'revenue' ? b.revenue - a.revenue : String(a[sortBy] || '').localeCompare(String(b[sortBy] || ''))), [query, sortBy])

  return (
    <section className="pageStack">
      <div className="panel heroPanel"><p className="eyebrow">Revenue analytics</p><h2>Revenue by client and workshop location</h2><p>Search and sort revenue data across dealer clients and individual workshop locations.</p></div>
      <div className="statsGrid"><div className="statCard"><span>Total clients</span><strong>{clients.length}</strong><small>Enterprise portfolio</small></div><div className="statCard"><span>Workshop locations</span><strong>{workshops.length}</strong><small>Active and inactive</small></div><div className="statCard"><span>Top location</span><strong>Ikeja</strong><small>NGN 11.2M</small></div></div>
      <div className="panel">
        <div className="sectionHeader"><h3>Client revenue</h3><button className="secondaryBtn">Export Excel</button></div>
        <div className="filterBar">
          <label>Search revenue<input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search client, workshop, country, currency" /></label>
          <label>Sort by<select value={sortBy} onChange={(e) => setSortBy(e.target.value)}><option value="revenue">Revenue high to low</option><option value="name">Client name</option><option value="country">Country</option><option value="currency">Currency</option></select></label>
        </div>
        <div className="tableWrap"><table><thead><tr><th>Client</th><th>Country</th><th>Currency</th><th>Modules</th><th>Revenue</th></tr></thead><tbody>{clientRows.map((client) => <tr key={client.name}><td>{client.name}</td><td>{client.country}</td><td>{client.currency}</td><td>{client.modules}</td><td>{client.revenueText}</td></tr>)}</tbody></table></div>
      </div>
      <div className="panel">
        <h3>Workshop location revenue</h3>
        <div className="tableWrap"><table><thead><tr><th>Client</th><th>Workshop location</th><th>CEO</th><th>Users</th><th>Phone</th><th>Revenue</th></tr></thead><tbody>{workshopRows.map((workshop) => <tr key={`${workshop.client}-${workshop.workshop}`}><td>{workshop.client}</td><td>{workshop.workshop}</td><td>{workshop.ceo}</td><td>{workshop.users}</td><td>{workshop.phone}</td><td>{workshop.revenueText}</td></tr>)}</tbody></table></div>
      </div>
    </section>
  )
}

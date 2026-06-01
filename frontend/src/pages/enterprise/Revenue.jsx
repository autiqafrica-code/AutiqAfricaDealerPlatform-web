import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import { apiFetch } from '../../utils/api'

function csvEscape(v) {
  return `"${String(v ?? '').replaceAll('"', '""')}"`
}

function exportCsv(rows, filename) {
  if (!rows.length) return
  const headers = Object.keys(rows[0])
  const csv = [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function sortRows(rows, sortBy, sortDir, numericCols = []) {
  const dir = sortDir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    if (numericCols.includes(sortBy)) return (Number(a[sortBy] ?? 0) - Number(b[sortBy] ?? 0)) * dir
    return String(a[sortBy] ?? '').localeCompare(String(b[sortBy] ?? '')) * dir
  })
}

export default function Revenue() {
  const [clients,  setClients]  = useState([])
  const [loading,  setLoading]  = useState(true)
  const [query,    setQuery]    = useState('')

  const [cSortBy,  setCsortBy]  = useState('revenue')
  const [cSortDir, setCsortDir] = useState('desc')
  const [wSortBy,  setWsortBy]  = useState('revenue')
  const [wSortDir, setWsortDir] = useState('desc')

  useEffect(() => {
    apiFetch('/enterprise/revenue')
      .then(r => r.json())
      .then(d => { if (d.success) setClients(d.data.clients || []) })
      .finally(() => setLoading(false))
  }, [])

  const workshops = useMemo(() => clients.flatMap(c => c.workshops || []), [clients])

  const clientRows = useMemo(() => {
    const filtered = clients.filter(c =>
      `${c.name} ${c.country} ${c.currency} ${c.modules}`.toLowerCase().includes(query.toLowerCase())
    )
    return sortRows(filtered, cSortBy, cSortDir, ['revenue'])
  }, [clients, query, cSortBy, cSortDir])

  const workshopRows = useMemo(() => {
    const filtered = workshops.filter(w =>
      `${w.client} ${w.workshop} ${w.ceo} ${w.currency}`.toLowerCase().includes(query.toLowerCase())
    )
    return sortRows(filtered, wSortBy, wSortDir, ['revenue', 'users'])
  }, [workshops, query, wSortBy, wSortDir])

  const topLocation = workshopRows.length ? workshopRows[0] : null

  function handleClientSort(col) {
    if (cSortBy === col) setCsortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setCsortBy(col); setCsortDir(col === 'revenue' ? 'desc' : 'asc') }
  }

  function handleWorkshopSort(col) {
    if (wSortBy === col) setWsortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setWsortBy(col); setWsortDir(col === 'revenue' ? 'desc' : 'asc') }
  }

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Revenue analytics</p>
        <h2>Revenue by client and workshop location</h2>
        <p>Search and sort revenue data across dealer clients and individual workshop locations.</p>
      </div>

      <div className="statsGrid">
        <div className="statCard"><span>Total clients</span><strong>{clients.length}</strong><small>Enterprise portfolio</small></div>
        <div className="statCard"><span>Workshop locations</span><strong>{workshops.length}</strong><small>Active and inactive</small></div>
        <div className="statCard">
          <span>Top location</span>
          <strong>{topLocation ? topLocation.workshop : '—'}</strong>
          <small>{topLocation ? topLocation.revenueText : 'No data yet'}</small>
        </div>
      </div>

      {/* Client revenue */}
      <div className="panel">
        <div className="sectionHeader">
          <div>
            <h3>Client revenue</h3>
            <p>{loading ? 'Loading…' : `${clientRows.length} client${clientRows.length !== 1 ? 's' : ''}`}</p>
          </div>
          <button className="secondaryBtn" onClick={() => exportCsv(clientRows.map(c => ({
            Client: c.name, Country: c.country, Currency: c.currency, Modules: c.modules, Revenue: c.revenue,
          })), 'client-revenue.csv')}>Export Excel</button>
        </div>
        <div className="filterBar" style={{ gridTemplateColumns: '1fr' }}>
          <label>Search revenue
            <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search client, workshop, country, currency" />
          </label>
        </div>
        {loading
          ? <p className="muted">Loading revenue data…</p>
          : clients.length === 0
            ? <p className="muted">No clients found.</p>
            : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <SortTh col="name"     label="Client"   active={cSortBy} dir={cSortDir} onSort={handleClientSort} />
                      <SortTh col="country"  label="Country"  active={cSortBy} dir={cSortDir} onSort={handleClientSort} />
                      <SortTh col="currency" label="Currency" active={cSortBy} dir={cSortDir} onSort={handleClientSort} />
                      <SortTh col="modules"  label="Modules"  active={cSortBy} dir={cSortDir} onSort={handleClientSort} />
                      <SortTh col="revenue"  label="Revenue"  active={cSortBy} dir={cSortDir} onSort={handleClientSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {clientRows.map(c => (
                      <tr key={c.id}>
                        <td>{c.name}</td>
                        <td>{c.country}</td>
                        <td>{c.currency}</td>
                        <td>{c.modules}</td>
                        <td><strong>{c.revenueText}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>

      {/* Workshop location revenue */}
      <div className="panel">
        <div className="sectionHeader">
          <h3>Workshop location revenue</h3>
          <button className="secondaryBtn" onClick={() => exportCsv(workshopRows.map(w => ({
            Client: w.client, Workshop: w.workshop, CEO: w.ceo, Users: w.users, Phone: w.phone, Revenue: w.revenue,
          })), 'workshop-revenue.csv')}>Export Excel</button>
        </div>
        {loading
          ? <p className="muted">Loading…</p>
          : workshops.length === 0
            ? <p className="muted">No workshops found.</p>
            : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <SortTh col="client"   label="Client"            active={wSortBy} dir={wSortDir} onSort={handleWorkshopSort} />
                      <SortTh col="workshop" label="Workshop location"  active={wSortBy} dir={wSortDir} onSort={handleWorkshopSort} />
                      <SortTh col="ceo"      label="CEO"               active={wSortBy} dir={wSortDir} onSort={handleWorkshopSort} />
                      <SortTh col="users"    label="Users"             active={wSortBy} dir={wSortDir} onSort={handleWorkshopSort} />
                      <SortTh col="phone"    label="Phone"             active={wSortBy} dir={wSortDir} onSort={handleWorkshopSort} />
                      <SortTh col="revenue"  label="Revenue"           active={wSortBy} dir={wSortDir} onSort={handleWorkshopSort} />
                    </tr>
                  </thead>
                  <tbody>
                    {workshopRows.map(w => (
                      <tr key={w.id}>
                        <td>{w.client}</td>
                        <td>{w.workshop}</td>
                        <td>{w.ceo || '—'}</td>
                        <td>{w.users}</td>
                        <td>{w.phone || '—'}</td>
                        <td><strong>{w.revenueText}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
        }
      </div>
    </section>
  )
}

function SortTh({ col, label, active, dir, onSort }) {
  const isActive = active === col
  return (
    <th className={`sortTh${isActive ? ' sortTh--active' : ''}`} onClick={() => onSort(col)}>
      <span className="sortThInner">
        {label}
        <span className="sortThIcon">
          {isActive
            ? dir === 'asc' ? <ChevronUp size={14} /> : <ChevronDown size={14} />
            : <ChevronsUpDown size={13} />}
        </span>
      </span>
    </th>
  )
}

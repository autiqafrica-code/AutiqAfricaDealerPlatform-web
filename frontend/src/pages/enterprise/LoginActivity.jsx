import { useEffect, useMemo, useState } from 'react'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { apiFetch } from '../../utils/api.js'

const ROLE_DISPLAY = {
  Technician: 'Technician',
  WorkshopController: 'Workshop Controller',
  Accounts: 'Accounts',
  FrontDesk: 'Front Desk',
  Manager: 'Manager',
  PartsInterpreter: 'Parts Interpreter',
  CEO: 'CEO',
}

function fmtDate(dt) {
  if (!dt) return 'Never'
  return new Date(dt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function accountAge(createdAt) {
  if (!createdAt) return '—'
  const days = Math.floor((Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24))
  if (days < 1)   return 'Today'
  if (days < 30)  return `${days} day${days !== 1 ? 's' : ''}`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months} month${months !== 1 ? 's' : ''}`
  const years = Math.floor(months / 12)
  return `${years} year${years !== 1 ? 's' : ''}`
}

export default function LoginActivity() {
  const [searchParams]                       = useSearchParams()
  const [users,          setUsers]          = useState([])
  const [clients,        setClients]        = useState([])
  const [loading,        setLoading]        = useState(true)
  const [fetchError,     setFetchError]     = useState('')
  const [query,          setQuery]          = useState('')
  const [filterClient,   setFilterClient]   = useState('')
  const [filterStatus,   setFilterStatus]   = useState(() => searchParams.get('status') || '')
  const [sortBy,         setSortBy]         = useState('lastLoginAt')
  const [sortDir,        setSortDir]        = useState('desc')
  const [actionMsg,      setActionMsg]      = useState({})
  const [selected,       setSelected]       = useState(new Set())
  const [bulkBusy,       setBulkBusy]       = useState(false)

  useEffect(() => {
    loadData()
    apiFetch('/clients?limit=200')
      .then(r => r.json())
      .then(d => { if (d.success) setClients(d.data?.clients || []) })
      .catch(() => {})
  }, [])

  async function loadData() {
    setLoading(true)
    setFetchError('')
    try {
      const res  = await apiFetch('/enterprise/users?limit=500')
      const data = await res.json()
      if (data.success) setUsers(data.data?.data || [])
      else setFetchError(data.message || 'Failed to load users')
    } catch { setFetchError('Network error — check backend connection') }
    finally { setLoading(false) }
  }

  async function changeStatus(id, status) {
    try {
      const res  = await apiFetch(`/users/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setActionMsg(p => ({ ...p, [id]: data.message || 'Failed' })); return }
      setUsers(prev => prev.map(u => u.id === id ? { ...u, status } : u))
      setActionMsg(p => ({ ...p, [id]: `→ ${status}` }))
    } catch { setActionMsg(p => ({ ...p, [id]: 'Network error' })) }
  }

  async function resetPassword(id) {
    try {
      const res  = await apiFetch(`/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({}) })
      const data = await res.json()
      if (!res.ok || !data.success) { setActionMsg(p => ({ ...p, [id]: data.message || 'Failed' })); return }
      setActionMsg(p => ({ ...p, [id]: `Temp pwd: ${data.data?.tempPassword}` }))
    } catch { setActionMsg(p => ({ ...p, [id]: 'Network error' })) }
  }

  async function bulkChangeStatus(status) {
    setBulkBusy(true)
    await Promise.all([...selected].map(id => changeStatus(id, status)))
    setSelected(new Set())
    setBulkBusy(false)
  }

  function toggleSelect(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function toggleAll() {
    setSelected(selected.size === filtered.length ? new Set() : new Set(filtered.map(u => u.id)))
  }

  async function exportCSV() {
    const rows = [
      ['Client', 'Workshop', 'Role', 'Name', 'Login Email', 'Last Login', 'Account Age', 'Status'],
      ...filtered.map(u => [
        u.workshop?.client?.name || '—',
        u.workshop?.name || '—',
        ROLE_DISPLAY[u.role] || u.role,
        u.name,
        u.loginEmail,
        fmtDate(u.lastLoginAt),
        accountAge(u.createdAt),
        u.status,
      ]),
    ]
    const csv  = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `login-activity-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let rows = users
    if (filterClient) rows = rows.filter(u => u.workshop?.client?.id === filterClient)
    if (filterStatus) rows = rows.filter(u => u.status === filterStatus)
    if (query) {
      const q = query.toLowerCase()
      rows = rows.filter(u =>
        `${u.workshop?.client?.name || ''} ${u.workshop?.name || ''} ${ROLE_DISPLAY[u.role] || u.role} ${u.name} ${u.loginEmail} ${u.status}`.toLowerCase().includes(q)
      )
    }
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => { // eslint-disable-line
      if (sortBy === 'lastLoginAt' || sortBy === 'createdAt') {
        const da = a[sortBy] ? new Date(a[sortBy]) : new Date(0)
        const db = b[sortBy] ? new Date(b[sortBy]) : new Date(0)
        return (da - db) * dir
      }
      const va = (sortBy === 'client' ? a.workshop?.client?.name : sortBy === 'workshop' ? a.workshop?.name : a[sortBy]) || ''
      const vb = (sortBy === 'client' ? b.workshop?.client?.name : sortBy === 'workshop' ? b.workshop?.name : b[sortBy]) || ''
      return String(va).localeCompare(String(vb)) * dir
    })
  }, [users, filterClient, filterStatus, query, sortBy, sortDir])

  const allSelected = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0 && selected.size < filtered.length

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Login monitoring</p>
        <h2>Workshop user login activity</h2>
        <p>View each workshop, every user type, last login time, account age and status. Deactivate or block a specific user directly from this screen.</p>
      </div>

      <div className="panel">
        <div className="sectionHeader">
          <div>
            <h3>User-level activity</h3>
            <p>
              {loading
                ? 'Loading…'
                : `${filtered.length} user${filtered.length !== 1 ? 's' : ''} match current filters.`
              }
            </p>
          </div>
          <button className="secondaryBtn" onClick={exportCSV} disabled={loading}>Export CSV</button>
        </div>

        {fetchError && <p className="errorText" style={{ marginBottom: 8 }}>{fetchError}</p>}

        <div className="filterBar loginActivityFilterBar">
          <label>
            Search users
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search client, workshop, role, user, email…"
            />
          </label>
          <label>
            Client
            <select value={filterClient} onChange={e => setFilterClient(e.target.value)}>
              <option value="">All clients</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            Status
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="Active">Active</option>
              <option value="Inactive">Inactive</option>
              <option value="Blocked">Blocked</option>
            </select>
          </label>
        </div>

        {selected.size > 0 && (
          <div className="bulkBar">
            <span className="bulkBarCount">{selected.size} user{selected.size !== 1 ? 's' : ''} selected</span>
            <div className="bulkBarActions">
              <button onClick={() => bulkChangeStatus('Inactive')} disabled={bulkBusy}>Deactivate</button>
              <button onClick={() => bulkChangeStatus('Blocked')}  disabled={bulkBusy}>Block</button>
              <button onClick={() => bulkChangeStatus('Active')}   disabled={bulkBusy}>Activate</button>
            </div>
            <button className="bulkBarClear" onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
        )}

        <div className="tableWrap">
          {loading ? (
            <p style={{ padding: '24px', textAlign: 'center' }}>Loading…</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="checkCell">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected }}
                      onChange={toggleAll}
                    />
                  </th>
                  <SortTh col="client"      label="Client"       active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="workshop"    label="Workshop"     active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="role"        label="User type"    active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="name"        label="User name"    active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="loginEmail"  label="Login email"  active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="lastLoginAt" label="Last login"   active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="createdAt"   label="Account age"  active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="status"      label="Status"       active={sortBy} dir={sortDir} onSort={handleSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No users found.
                    </td>
                  </tr>
                ) : filtered.map(user => {
                  const msg = actionMsg[user.id]
                  const isSelected = selected.has(user.id)
                  return (
                    <tr key={user.id} className={isSelected ? 'rowSelected' : ''}>
                      <td className="checkCell">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(user.id)} />
                      </td>
                      <td>{user.workshop?.client?.name || '—'}</td>
                      <td>{user.workshop?.name || '—'}</td>
                      <td>{ROLE_DISPLAY[user.role] || user.role}</td>
                      <td>{user.name}</td>
                      <td style={{ fontSize: 13 }}>{user.loginEmail}</td>
                      <td style={{ fontSize: 13 }}>{fmtDate(user.lastLoginAt)}</td>
                      <td style={{ fontSize: 13 }}>{accountAge(user.createdAt)}</td>
                      <td>
                        <span className={`statusPill ${(user.status || '').toLowerCase()}`}>{user.status}</span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div className="actionRow">
                            <button onClick={() => changeStatus(user.id, 'Inactive')}>Deactivate</button>
                            <button onClick={() => changeStatus(user.id, 'Blocked')}>Block</button>
                            <button onClick={() => resetPassword(user.id)}>Reset Pwd</button>
                          </div>
                          {msg && (
                            <small style={{ color: msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('error') ? '#d92d20' : '#00a389' }}>
                              {msg}
                            </small>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
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

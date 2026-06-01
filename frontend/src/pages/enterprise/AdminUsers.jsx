import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ChevronsUpDown, KeyRound, Mail, RefreshCcw, Save, Search, ShieldCheck, Trash2, UserPlus } from 'lucide-react'
import { apiFetch } from '../../utils/api.js'

const BLANK_FORM = { name: '', email: '', loginEmail: '', role: 'Enterprise Admin', password: '', status: 'Active' }

function fmt(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export default function AdminUsers() {
  const [admins,       setAdmins]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [fetchError,   setFetchError]   = useState('')
  const [query,        setQuery]        = useState('')
  const [sortBy,       setSortBy]       = useState('name')
  const [sortDir,      setSortDir]      = useState('asc')
  const [selected,     setSelected]     = useState(new Set())
  const [bulkBusy,     setBulkBusy]     = useState(false)
  const [form,         setForm]         = useState(BLANK_FORM)
  const [formError,    setFormError]    = useState('')
  const [formSuccess,  setFormSuccess]  = useState('')
  const [saving,       setSaving]       = useState(false)
  const [editMap,      setEditMap]      = useState({})
  const [actionMsg,    setActionMsg]    = useState({})

  useEffect(() => { loadAdmins() }, [])

  async function loadAdmins() {
    setLoading(true)
    setFetchError('')
    try {
      const res  = await apiFetch('/enterprise/admins?limit=100')
      const data = await res.json()
      if (data.success) setAdmins(data.data?.data || [])
      else setFetchError(data.message || 'Failed to load admin users')
    } catch { setFetchError('Network error — check backend connection') }
    finally { setLoading(false) }
  }

  async function handleCreate() {
    setFormError('')
    setFormSuccess('')
    if (!form.name.trim() || !form.email.trim() || !form.loginEmail.trim()) {
      setFormError('Name, email and login email are required')
      return
    }
    setSaving(true)
    try {
      const res  = await apiFetch('/enterprise/admins', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok || !data.success) { setFormError(data.message || 'Failed to create admin'); return }
      setFormSuccess(`Admin created. Temp password: ${data.data?.tempPassword || '—'}`)
      setForm(BLANK_FORM)
      setAdmins(prev => [data.data.admin, ...prev])
    } catch { setFormError('Network error') }
    finally { setSaving(false) }
  }

  function startEdit(admin) {
    setEditMap(prev => ({
      ...prev,
      [admin.id]: { name: admin.name, email: admin.email, loginEmail: admin.loginEmail, role: admin.role },
    }))
  }

  async function saveEdit(id) {
    const payload = editMap[id]
    if (!payload) return
    try {
      const res  = await apiFetch(`/enterprise/admins/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
      const data = await res.json()
      if (!res.ok || !data.success) { setActionMsg(p => ({ ...p, [id]: data.message || 'Update failed' })); return }
      setAdmins(prev => prev.map(a => a.id === id ? data.data.admin : a))
      setEditMap(prev => { const n = { ...prev }; delete n[id]; return n })
      setActionMsg(p => ({ ...p, [id]: 'Saved' }))
    } catch { setActionMsg(p => ({ ...p, [id]: 'Network error' })) }
  }

  async function changeStatus(id, status) {
    try {
      const res  = await apiFetch(`/enterprise/admins/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      const data = await res.json()
      if (!res.ok || !data.success) { setActionMsg(p => ({ ...p, [id]: data.message || 'Status update failed' })); return }
      setAdmins(prev => prev.map(a => a.id === id ? { ...a, status } : a))
      setActionMsg(p => ({ ...p, [id]: `Status → ${status}` }))
    } catch { setActionMsg(p => ({ ...p, [id]: 'Network error' })) }
  }

  async function resetPassword(id) {
    try {
      const res  = await apiFetch(`/enterprise/admins/${id}/password`, { method: 'PATCH', body: JSON.stringify({}) })
      const data = await res.json()
      if (!res.ok || !data.success) { setActionMsg(p => ({ ...p, [id]: data.message || 'Reset failed' })); return }
      setActionMsg(p => ({ ...p, [id]: `New temp password: ${data.data?.tempPassword}` }))
    } catch { setActionMsg(p => ({ ...p, [id]: 'Network error' })) }
  }

  async function deleteAdmin(id) {
    if (!window.confirm('Delete this admin? This cannot be undone.')) return
    try {
      const res  = await apiFetch(`/enterprise/admins/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.success) { setActionMsg(p => ({ ...p, [id]: data.message || 'Delete failed' })); return }
      setAdmins(prev => prev.filter(a => a.id !== id))
      setSelected(prev => { const n = new Set(prev); n.delete(id); return n })
    } catch { setActionMsg(p => ({ ...p, [id]: 'Network error' })) }
  }

  async function bulkChangeStatus(status) {
    setBulkBusy(true)
    await Promise.all([...selected].map(id => changeStatus(id, status)))
    setSelected(new Set())
    setBulkBusy(false)
  }

  async function bulkDelete() {
    if (!window.confirm(`Delete ${selected.size} admin${selected.size !== 1 ? 's' : ''}? This cannot be undone.`)) return
    setBulkBusy(true)
    await Promise.all([...selected].map(id => apiFetch(`/enterprise/admins/${id}`, { method: 'DELETE' })))
    setAdmins(prev => prev.filter(a => !selected.has(a.id)))
    setSelected(new Set())
    setBulkBusy(false)
  }

  function toggleSelect(id) {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  function handleSort(col) {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(col); setSortDir('asc') }
  }

  const filtered = useMemo(() => {
    let rows = admins.filter(a =>
      `${a.name} ${a.email} ${a.loginEmail} ${a.adminCode} ${a.role} ${a.status}`.toLowerCase().includes(query.toLowerCase())
    )
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sortBy === 'lastLoginAt') {
        const da = a.lastLoginAt ? new Date(a.lastLoginAt) : new Date(0)
        const db = b.lastLoginAt ? new Date(b.lastLoginAt) : new Date(0)
        return (da - db) * dir
      }
      return String(a[sortBy] ?? '').localeCompare(String(b[sortBy] ?? '')) * dir
    })
  }, [admins, query, sortBy, sortDir])

  const allSelected  = filtered.length > 0 && selected.size === filtered.length
  const someSelected = selected.size > 0 && selected.size < filtered.length

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Enterprise Admin Login Management</p>
        <h2>Maintain Autiq Africa admin users</h2>
        <p>Create and maintain Enterprise Super Admin users. Update profile details, modify the login email, reset passwords, and control access status from one secure screen.</p>
      </div>

      {/* Create new admin */}
      <div className="panel">
        <div className="sectionHeader compact">
          <div>
            <h3>Add new enterprise super admin user</h3>
            <p>This user can log in to the Enterprise Admin workspace with Super Admin access only.</p>
          </div>
          <span className="accessBadge"><ShieldCheck size={16} /> Super Admin only</span>
        </div>

        <div className="formGrid adminForm">
          <label>
            Full name
            <input
              placeholder="Admin full name"
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            />
          </label>
          <label>
            Role
            <select value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option>Enterprise Admin</option>
              <option>Support Admin</option>
            </select>
          </label>
          <label>
            Email address
            <input
              type="email"
              placeholder="name@autiqafrica.com"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            />
          </label>
          <label>
            Login email ID
            <input
              type="email"
              placeholder="Login email used for sign in"
              value={form.loginEmail}
              onChange={e => setForm(p => ({ ...p, loginEmail: e.target.value }))}
            />
          </label>
          <label>
            Temporary password
            <input
              type="text"
              placeholder="Leave blank to auto-generate"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            />
          </label>
          <label>
            Status
            <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>
        </div>

        {formError   && <p className="errorText"  style={{ marginTop: 8 }}>{formError}</p>}
        {formSuccess && <p className="successText" style={{ marginTop: 8 }}>{formSuccess}</p>}

        <div className="rowActions">
          <button className="primaryBtn" onClick={handleCreate} disabled={saving}>
            <UserPlus size={16} /> {saving ? 'Creating…' : 'Create super admin user'}
          </button>
        </div>
      </div>

      {/* Admin users table */}
      <div className="panel">
        <div className="sectionHeader">
          <div>
            <h3>Admin users</h3>
            <p>
              {loading ? 'Loading…' : `${filtered.length} admin${filtered.length !== 1 ? 's' : ''} found.`}
            </p>
          </div>
          <div className="searchBar compactSearch">
            <Search size={18} />
            <input
              placeholder="Search name or email"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>
        </div>

        {fetchError && <p className="errorText" style={{ marginBottom: 8 }}>{fetchError}</p>}

        {selected.size > 0 && (
          <div className="bulkBar">
            <span className="bulkBarCount">{selected.size} admin{selected.size !== 1 ? 's' : ''} selected</span>
            <div className="bulkBarActions">
              <button onClick={() => bulkChangeStatus('Active')}   disabled={bulkBusy}>Activate</button>
              <button onClick={() => bulkChangeStatus('Inactive')} disabled={bulkBusy}>Deactivate</button>
              <button onClick={() => bulkChangeStatus('Blocked')}  disabled={bulkBusy}>Block</button>
              <button className="danger" onClick={bulkDelete}      disabled={bulkBusy}>Delete selected</button>
            </div>
            <button className="bulkBarClear" onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
        )}

        <div className="tableWrap">
          {loading ? (
            <p style={{ padding: '24px', textAlign: 'center' }}>Loading admin users…</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="checkCell">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected }}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(filtered.map(a => a.id)))}
                    />
                  </th>
                  <SortTh col="adminCode"    label="Admin ID"       active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="name"         label="Name"           active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="role"         label="Role"           active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="email"        label="Email"          active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="loginEmail"   label="Login email ID" active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="status"       label="Status"         active={sortBy} dir={sortDir} onSort={handleSort} />
                  <th>Password</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>No admin users found.</td></tr>
                ) : filtered.map(admin => {
                  const editing    = editMap[admin.id]
                  const msg        = actionMsg[admin.id]
                  const isSelected = selected.has(admin.id)
                  return (
                    <tr key={admin.id} className={isSelected ? 'rowSelected' : ''}>
                      <td className="checkCell">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(admin.id)} />
                      </td>
                      <td>
                        <strong>{admin.adminCode}</strong><br />
                        <small style={{ color: 'var(--muted)' }}>Last login: {fmt(admin.lastLoginAt)}</small>
                      </td>
                      <td>
                        <input
                          className="tableInput"
                          value={editing ? editing.name : admin.name}
                          onChange={e => {
                            if (!editing) startEdit(admin)
                            setEditMap(p => ({ ...p, [admin.id]: { ...(p[admin.id] || { name: admin.name, email: admin.email, loginEmail: admin.loginEmail, role: admin.role }), name: e.target.value } }))
                          }}
                        />
                      </td>
                      <td>
                        <select
                          className="tableInput"
                          value={editing ? editing.role : admin.role}
                          onChange={e => {
                            if (!editing) startEdit(admin)
                            setEditMap(p => ({ ...p, [admin.id]: { ...(p[admin.id] || { name: admin.name, email: admin.email, loginEmail: admin.loginEmail, role: admin.role }), role: e.target.value } }))
                          }}
                        >
                          <option>Enterprise Admin</option>
                          <option>Support Admin</option>
                        </select>
                      </td>
                      <td>
                        <input
                          className="tableInput"
                          type="email"
                          value={editing ? editing.email : admin.email}
                          onChange={e => {
                            if (!editing) startEdit(admin)
                            setEditMap(p => ({ ...p, [admin.id]: { ...(p[admin.id] || { name: admin.name, email: admin.email, loginEmail: admin.loginEmail, role: admin.role }), email: e.target.value } }))
                          }}
                        />
                      </td>
                      <td>
                        <input
                          className="tableInput"
                          type="email"
                          value={editing ? editing.loginEmail : admin.loginEmail}
                          onChange={e => {
                            if (!editing) startEdit(admin)
                            setEditMap(p => ({ ...p, [admin.id]: { ...(p[admin.id] || { name: admin.name, email: admin.email, loginEmail: admin.loginEmail, role: admin.role }), loginEmail: e.target.value } }))
                          }}
                        />
                      </td>
                      <td>
                        <span className={`statusPill ${(admin.status || '').toLowerCase()}`}>{admin.status}</span>
                      </td>
                      <td>
                        <button className="softBtn" onClick={() => resetPassword(admin.id)}>
                          <RefreshCcw size={14} /> Reset
                        </button>
                      </td>
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                          <div className="actionRow">
                            {editing && (
                              <button onClick={() => saveEdit(admin.id)}><Save size={14} /> Save</button>
                            )}
                            <button onClick={() => changeStatus(admin.id, 'Active')}>Activate</button>
                            <button onClick={() => changeStatus(admin.id, 'Inactive')}>Deactivate</button>
                            <button onClick={() => changeStatus(admin.id, 'Blocked')}>Block</button>
                            <button className="danger" onClick={() => deleteAdmin(admin.id)}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                          {msg && <small style={{ color: msg.includes('failed') || msg.includes('error') ? '#d92d20' : '#00a389' }}>{msg}</small>}
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

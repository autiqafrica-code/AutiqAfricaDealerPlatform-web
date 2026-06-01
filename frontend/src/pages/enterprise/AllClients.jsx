import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, ChevronsUpDown, FileEdit, Pencil, X } from 'lucide-react'
import { fetchCountries } from '../../utils/countriesCache.js'

function getApiBase() {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:5000'
  return raw.endsWith('/api') ? raw : `${raw.replace(/\/$/, '')}/api`
}

function getToken() {
  return localStorage.getItem('autiq_token') || ''
}

const INPUT_STYLE = {
  padding: '11px', border: '1px solid #d0d5dd', borderRadius: 14,
  background: '#f8fafc', width: '100%', fontSize: 14,
}

const LABEL_STYLE = {
  display: 'flex', flexDirection: 'column', gap: 6,
  fontWeight: 800, fontSize: 13, color: 'var(--navy)',
}

export default function AllClients() {
  const navigate = useNavigate()

  const [clients,      setClients]      = useState([])
  const [drafts,       setDrafts]       = useState([])
  const [loading,      setLoading]      = useState(true)
  const [fetchError,   setFetchError]   = useState('')
  const [query,        setQuery]        = useState('')
  const [sortBy,       setSortBy]       = useState('name')
  const [sortDir,      setSortDir]      = useState('asc')
  const [selected,     setSelected]     = useState(new Set())
  const [bulkBusy,     setBulkBusy]     = useState(false)
  const [deletingId,   setDeletingId]   = useState(null)

  const [countries,     setCountries]     = useState([])
  const [editingClient, setEditingClient] = useState(null)
  const [editForm,      setEditForm]      = useState({})
  const [editLoading,   setEditLoading]   = useState(false)
  const [editError,     setEditError]     = useState('')

  useEffect(() => { fetchCountries().then(setCountries) }, [])

  useEffect(() => {
    const token   = getToken()
    const headers = { Authorization: `Bearer ${token}` }
    const base    = getApiBase()

    Promise.all([
      fetch(`${base}/clients`,       { headers }).then(r => r.json()),
      fetch(`${base}/client-drafts`, { headers }).then(r => r.json()),
    ])
      .then(([clientsData, draftsData]) => {
        if (clientsData.success) setClients(clientsData.data?.clients || [])
        else setFetchError(clientsData.message || 'Failed to load clients')
        if (draftsData.success) setDrafts(draftsData.data?.drafts || [])
      })
      .catch(() => setFetchError('Network error — could not reach server'))
      .finally(() => setLoading(false))
  }, [])

  const filteredClients = useMemo(() => {
    const rows = clients.filter(c =>
      `${c.name} ${c.country} ${c.defaultCurrency} ${c.status}`
        .toLowerCase()
        .includes(query.toLowerCase())
    )
    const dir = sortDir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      if (sortBy === 'workshops') return ((a._count?.workshops ?? 0) - (b._count?.workshops ?? 0)) * dir
      return String(a[sortBy] ?? '').localeCompare(String(b[sortBy] ?? '')) * dir
    })
  }, [clients, query, sortBy, sortDir])

  const filteredDrafts = useMemo(() => {
    if (!query) return drafts
    return drafts.filter(d => d.draftName.toLowerCase().includes(query.toLowerCase()))
  }, [drafts, query])

  async function deleteDraft(id) {
    if (!window.confirm('Delete this draft? This cannot be undone.')) return
    setDeletingId(id)
    try {
      const res = await fetch(`${getApiBase()}/client-drafts/${id}`, {
        method:  'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
      if (res.ok) setDrafts(prev => prev.filter(d => d.id !== id))
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  async function updateClientStatus(id, status) {
    try {
      const res = await fetch(`${getApiBase()}/clients/${id}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify({ status }),
      })
      const data = await res.json()
      if (data.success) setClients(prev => prev.map(c => c.id === id ? { ...c, status } : c))
    } catch { /* ignore */ }
  }

  async function bulkUpdateStatus(status) {
    setBulkBusy(true)
    await Promise.all([...selected].map(id => updateClientStatus(id, status)))
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

  function openEdit(client) {
    setEditingClient(client)
    setEditForm({
      name:                client.name                || '',
      country:             client.country             || '',
      defaultCurrency:     client.defaultCurrency     || '',
      dealerLicenceNumber: client.dealerLicenceNumber || '',
      website:             client.website             || '',
    })
    setEditError('')
  }

  function closeEdit() {
    setEditingClient(null)
    setEditForm({})
    setEditError('')
  }

  async function submitEdit() {
    if (!editForm.name?.trim())            { setEditError('Dealer name is required');  return }
    if (!editForm.country?.trim())         { setEditError('Country is required');       return }
    if (!editForm.defaultCurrency?.trim()) { setEditError('Currency is required');      return }
    if (editForm.website && !/^https?:\/\/.+/.test(editForm.website.trim())) {
      setEditError('Website must start with https://')
      return
    }

    setEditLoading(true)
    setEditError('')
    try {
      const res = await fetch(`${getApiBase()}/clients/${editingClient.id}`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body:    JSON.stringify(editForm),
      })
      const data = await res.json()
      if (!data.success) { setEditError(data.message || 'Update failed'); return }
      setClients(prev => prev.map(c => c.id === editingClient.id ? { ...c, ...data.data?.client } : c))
      closeEdit()
    } catch {
      setEditError('Network error — could not save changes')
    } finally {
      setEditLoading(false)
    }
  }

  const allSelected  = filteredClients.length > 0 && selected.size === filteredClients.length
  const someSelected = selected.size > 0 && selected.size < filteredClients.length

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
            <p>
              {loading
                ? 'Loading…'
                : `${filteredClients.length} client${filteredClients.length !== 1 ? 's' : ''}${filteredDrafts.length > 0 ? ` · ${filteredDrafts.length} draft${filteredDrafts.length !== 1 ? 's' : ''}` : ''} match current filters.`
              }
            </p>
          </div>
          <button className="primaryBtn" onClick={() => navigate('/enterprise/onboard-client')}>
            + New Client
          </button>
        </div>

        {fetchError && <p className="errorMsg">{fetchError}</p>}

        <div className="filterBar">
          <label>
            Search client
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by client, country, status or draft name"
            />
          </label>
        </div>

        {selected.size > 0 && (
          <div className="bulkBar">
            <span className="bulkBarCount">{selected.size} client{selected.size !== 1 ? 's' : ''} selected</span>
            <div className="bulkBarActions">
              <button onClick={() => bulkUpdateStatus('Active')}   disabled={bulkBusy}>Activate</button>
              <button onClick={() => bulkUpdateStatus('Inactive')} disabled={bulkBusy}>Deactivate</button>
              <button onClick={() => bulkUpdateStatus('Archived')} disabled={bulkBusy}>Archive</button>
            </div>
            <button className="bulkBarClear" onClick={() => setSelected(new Set())}>Clear selection</button>
          </div>
        )}

        <div className="tableWrap">
          {loading ? (
            <p style={{ padding: '24px', textAlign: 'center' }}>Loading clients…</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th className="checkCell">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={el => { if (el) el.indeterminate = someSelected }}
                      onChange={() => setSelected(allSelected ? new Set() : new Set(filteredClients.map(c => c.id)))}
                    />
                  </th>
                  <SortTh col="name"            label="Client / Draft" active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="country"         label="Country"        active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="defaultCurrency" label="Currency"       active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="workshops"       label="Workshops"      active={sortBy} dir={sortDir} onSort={handleSort} />
                  <SortTh col="status"          label="Status"         active={sortBy} dir={sortDir} onSort={handleSort} />
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Drafts — shown first, not selectable */}
                {filteredDrafts.map(draft => {
                  const cf       = draft.data?.clientForm || {}
                  const country  = cf.country         || '—'
                  const currency = cf.defaultCurrency || '—'
                  return (
                    <tr key={`draft-${draft.id}`} className="draftRow">
                      <td className="checkCell" />
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FileEdit size={15} style={{ color: '#f79009', flexShrink: 0 }} />
                          <div>
                            <strong>{draft.draftName}</strong><br />
                            <small style={{ color: 'var(--muted)' }}>
                              Last saved {new Date(draft.updatedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </small>
                          </div>
                        </div>
                      </td>
                      <td>{country}</td>
                      <td>{currency}</td>
                      <td>—</td>
                      <td><span className="statusPill draft">Draft</span></td>
                      <td className="actionRow">
                        <button
                          className="draftContinueBtn"
                          onClick={() => navigate(`/enterprise/onboard-client?draftId=${draft.id}`)}
                        >
                          Continue
                        </button>
                        <button
                          className="danger"
                          disabled={deletingId === draft.id}
                          onClick={() => deleteDraft(draft.id)}
                        >
                          {deletingId === draft.id ? '…' : 'Delete'}
                        </button>
                      </td>
                    </tr>
                  )
                })}

                {filteredClients.length === 0 && filteredDrafts.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)' }}>
                      No clients or drafts found.
                    </td>
                  </tr>
                ) : filteredClients.map(client => {
                  const isSelected = selected.has(client.id)
                  return (
                    <tr key={client.id} className={isSelected ? 'rowSelected' : ''}>
                      <td className="checkCell">
                        <input type="checkbox" checked={isSelected} onChange={() => toggleSelect(client.id)} />
                      </td>
                      <td>
                        <div>
                          <strong>{client.name}</strong>
                          {client.website && (
                            <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{client.website}</span>
                          )}
                        </div>
                      </td>
                      <td>{client.country}</td>
                      <td>{client.defaultCurrency}</td>
                      <td>{client._count?.workshops ?? 0}</td>
                      <td>
                        <span className={`statusPill ${(client.status || '').toLowerCase()}`}>
                          {client.status}
                        </span>
                      </td>
                      <td className="actionRow">
                        <button
                          title="Edit client details"
                          onClick={() => openEdit(client)}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                        >
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => updateClientStatus(client.id, 'Active')}>Activate</button>
                        <button onClick={() => updateClientStatus(client.id, 'Inactive')}>Deactivate</button>
                        <button onClick={() => updateClientStatus(client.id, 'Archived')}>Archive</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Edit client modal */}
      {editingClient && (
        <div
          style={{
            position:       'fixed',
            inset:          0,
            background:     'rgba(16,32,51,.55)',
            backdropFilter: 'blur(4px)',
            display:        'flex',
            alignItems:     'center',
            justifyContent: 'center',
            zIndex:         1000,
            padding:        20,
          }}
          onClick={e => { if (e.target === e.currentTarget) closeEdit() }}
        >
          <div style={{
            background:   'white',
            borderRadius: 28,
            padding:      28,
            width:        '100%',
            maxWidth:     560,
            boxShadow:    '0 24px 64px rgba(16,32,51,.22)',
            maxHeight:    '90vh',
            overflowY:    'auto',
          }}>
            <div className="sectionHeader" style={{ marginBottom: 20 }}>
              <div>
                <h3 style={{ margin: 0 }}>Edit client details</h3>
                <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>{editingClient.name}</p>
              </div>
              <button
                onClick={closeEdit}
                style={{ border: 0, background: '#f2f4f7', borderRadius: 10, padding: 8, cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            {editError && (
              <div style={{
                background:   '#fff8f7',
                border:       '1px solid #fda29b',
                borderRadius: 14,
                padding:      '10px 14px',
                color:        '#b91c1c',
                fontWeight:   700,
                fontSize:     13,
                marginBottom: 16,
              }}>
                ⚠ {editError}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <label style={{ ...LABEL_STYLE, gridColumn: '1/-1' }}>
                Dealer / Client name *
                <input
                  style={INPUT_STYLE}
                  value={editForm.name || ''}
                  onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                />
              </label>
              <label style={LABEL_STYLE}>
                Country *
                <select
                  style={INPUT_STYLE}
                  value={editForm.country || ''}
                  onChange={e => {
                    const name = e.target.value
                    const found = countries.find(c => c.name === name)
                    setEditForm(p => ({
                      ...p,
                      country: name,
                      ...(found?.currencyCode ? { defaultCurrency: found.currencyCode } : {}),
                    }))
                  }}
                >
                  <option value="">— Select country —</option>
                  {countries.map(c => <option key={c.iso2} value={c.name}>{c.name}</option>)}
                </select>
              </label>
              <label style={LABEL_STYLE}>
                Currency *
                <select
                  style={INPUT_STYLE}
                  value={editForm.defaultCurrency || ''}
                  onChange={e => setEditForm(p => ({ ...p, defaultCurrency: e.target.value }))}
                >
                  <option value="">Select currency</option>
                  {Array.from(new Map(countries.map(c => [c.currencyCode, c])).values()).map(c => (
                    <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode} — {c.currencyName}</option>
                  ))}
                </select>
              </label>
              <label style={LABEL_STYLE}>
                Dealer licence number
                <input
                  style={INPUT_STYLE}
                  value={editForm.dealerLicenceNumber || ''}
                  onChange={e => setEditForm(p => ({ ...p, dealerLicenceNumber: e.target.value }))}
                />
              </label>
              <label style={{ ...LABEL_STYLE, gridColumn: '1/-1' }}>
                Website
                <input
                  style={INPUT_STYLE}
                  placeholder="https://…"
                  value={editForm.website || ''}
                  onChange={e => setEditForm(p => ({ ...p, website: e.target.value }))}
                />
              </label>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 22, justifyContent: 'flex-end' }}>
              <button className="secondaryBtn" onClick={closeEdit} disabled={editLoading}>
                Cancel
              </button>
              <button className="primaryBtn" onClick={submitEdit} disabled={editLoading}>
                {editLoading ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}
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

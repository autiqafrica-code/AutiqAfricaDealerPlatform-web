import { useEffect, useState } from 'react'
import { Edit2, RefreshCcw, Save, ShieldCheck, Trash2, UserPlus, X } from 'lucide-react'
import { apiFetch } from '../../utils/api.js'

const ROLE_OPTIONS = [
  { code: 'FRONT_DESK',          label: 'Front Desk / Service Consultant' },
  { code: 'TECHNICIAN',          label: 'Technician' },
  { code: 'WORKSHOP_CONTROLLER', label: 'Workshop Controller' },
  { code: 'MANAGER',             label: 'Manager' },
  { code: 'ACCOUNTS',            label: 'Accounts' },
  { code: 'PARTS_INTERPRETER',   label: 'Parts Interpreter' },
  { code: 'CEO',                 label: 'CEO' },
]

function fmt(dt) {
  if (!dt) return 'Never'
  return new Date(dt).toLocaleString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function slotKey(wsId, roleCode, slotNumber) {
  return `${wsId}::${roleCode}::${slotNumber}`
}

export default function UserCredentials() {
  const [clients,          setClients]          = useState([])
  const [selectedClient,   setSelectedClient]   = useState('')
  const [selectedWorkshop, setSelectedWorkshop] = useState('')
  const [credentialData,   setCredentialData]   = useState(null)
  const [loading,          setLoading]          = useState(false)
  const [fetchError,       setFetchError]       = useState('')

  const [inputs,    setInputs]    = useState({})
  const [msgs,      setMsgs]      = useState({})
  const [busySet,   setBusySet]   = useState(new Set())
  const [activeTab, setActiveTab] = useState({})   // { [wsId]: roleCode }
  const [editMode,  setEditMode]  = useState(new Set()) // slot keys in edit mode

  const [addForm, setAddForm] = useState({ workshopId: '', roleCode: '', name: '', email: '', password: '' })
  const [addMsg,  setAddMsg]  = useState(null)
  const [addBusy, setAddBusy] = useState(false)

  useEffect(() => {
    apiFetch('/clients?limit=200').then(r => r.json()).then(d => {
      if (d.success) setClients(d.data?.clients || [])
    }).catch(() => {})
  }, [])

  useEffect(() => {
    setSelectedWorkshop('')
    setCredentialData(null)
    setInputs({})
    setMsgs({})
    setActiveTab({})
    setEditMode(new Set())
    if (!selectedClient) return
    loadSlots(selectedClient, '')
  }, [selectedClient]) // eslint-disable-line

  useEffect(() => {
    if (!selectedClient) return
    loadSlots(selectedClient, selectedWorkshop)
  }, [selectedWorkshop]) // eslint-disable-line

  // Keep addForm.workshopId in sync with the workshop filter
  useEffect(() => {
    setAddForm(p => ({ ...p, workshopId: selectedWorkshop }))
  }, [selectedWorkshop])

  async function loadSlots(clientId, workshopId) {
    setLoading(true)
    setFetchError('')
    setMsgs({})
    setEditMode(new Set())
    try {
      const qs  = workshopId ? `?workshopId=${workshopId}` : ''
      const res = await apiFetch(`/enterprise/clients/${clientId}/credential-slots${qs}`)
      const d   = await res.json()
      if (!d.success) { setFetchError(d.message || 'Failed to load credential slots'); return }
      setCredentialData(d.data)

      const initInputs = {}
      for (const ws of (d.data.workshops || [])) {
        for (const role of (ws.roles || [])) {
          for (const slot of (role.slots || [])) {
            if (slot.status === 'EMPTY') {
              const k = slotKey(ws.id, role.roleCode, slot.slotNumber)
              initInputs[k] = {
                name:     '',
                email:    '',
                password: `Autiq@${role.roleCode.slice(0, 8)}${slot.slotNumber}`,
              }
            }
          }
        }
      }
      setInputs(initInputs)

      // Default each workshop tab to first incomplete role
      setActiveTab(prev => {
        const next = { ...prev }
        for (const ws of (d.data.workshops || [])) {
          if (!next[ws.id]) {
            const first = ws.roles?.find(r => r.remainingCount > 0) || ws.roles?.[0]
            next[ws.id] = first?.roleCode
          }
        }
        return next
      })
    } catch {
      setFetchError('Network error loading credential slots')
    } finally {
      setLoading(false)
    }
  }

  function setInput(key, field, value) {
    setInputs(p => ({ ...p, [key]: { ...p[key], [field]: value } }))
  }

  function setMsg(key, ok, text) {
    setMsgs(p => ({ ...p, [key]: { ok, text } }))
    if (ok) setTimeout(() => setMsgs(p => { const n = { ...p }; delete n[key]; return n }), 6000)
  }

  function clearMsg(key) {
    setMsgs(p => { const n = { ...p }; delete n[key]; return n })
  }

  function setBusy(key, busy) {
    setBusySet(prev => {
      const next = new Set(prev)
      busy ? next.add(key) : next.delete(key)
      return next
    })
  }

  function toggleEdit(key, user) {
    setEditMode(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
        setInputs(p => ({ ...p, [key]: { name: user.name || '', email: user.loginEmail || '' } }))
      }
      return next
    })
    clearMsg(key)
  }

  async function createSlotUser(ws, role, slot) {
    const key = slotKey(ws.id, role.roleCode, slot.slotNumber)
    const inp = inputs[key] || {}
    if (!inp.name?.trim())  { setMsg(key, false, 'Name is required'); return }
    if (!inp.email?.trim()) { setMsg(key, false, 'Email is required'); return }

    setBusy(key, true)
    try {
      const res = await apiFetch('/enterprise/users/create-from-slot', {
        method: 'POST',
        body: JSON.stringify({
          clientId:   credentialData.client.id,
          workshopId: ws.id,
          roleCode:   role.roleCode,
          roleId:     role.roleId,
          name:       inp.name.trim(),
          email:      inp.email.trim(),
          password:   inp.password?.trim() || undefined,
        }),
      })
      const d = await res.json()
      if (!d.success) {
        // Surface duplicate-email error clearly
        setMsg(key, false, d.message || 'Failed to create user')
        return
      }
      const tempPwd = d.data?.tempPassword
      setMsg(key, true, tempPwd ? `Created — temp password: ${tempPwd}` : 'Created successfully')
      await loadSlots(selectedClient, selectedWorkshop)
    } catch {
      setMsg(key, false, 'Network error')
    } finally {
      setBusy(key, false)
    }
  }

  async function saveExistingUser(ws, role, slot) {
    const key = slotKey(ws.id, role.roleCode, slot.slotNumber)
    const inp = inputs[key] || {}
    const u   = slot.user
    setBusy(key, true)
    try {
      const res = await apiFetch(`/users/${u.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name:       inp.name  !== undefined ? inp.name  : u.name,
          loginEmail: inp.email !== undefined ? inp.email : u.loginEmail,
        }),
      })
      const d = await res.json()
      if (!d.success) { setMsg(key, false, d.message || 'Update failed'); return }
      setMsg(key, true, 'Changes saved')
      setEditMode(prev => { const next = new Set(prev); next.delete(key); return next })
      await loadSlots(selectedClient, selectedWorkshop)
    } catch {
      setMsg(key, false, 'Network error')
    } finally {
      setBusy(key, false)
    }
  }

  async function resetPassword(ws, role, slot) {
    const key = slotKey(ws.id, role.roleCode, slot.slotNumber)
    setBusy(key, true)
    try {
      const res = await apiFetch(`/users/${slot.user.id}/password`, { method: 'PATCH', body: JSON.stringify({}) })
      const d   = await res.json()
      if (!d.success) { setMsg(key, false, d.message || 'Reset failed'); return }
      setMsg(key, true, `New temp password: ${d.data?.tempPassword}`)
    } catch {
      setMsg(key, false, 'Network error')
    } finally {
      setBusy(key, false)
    }
  }

  async function changeStatus(ws, role, slot, status) {
    const key = slotKey(ws.id, role.roleCode, slot.slotNumber)
    setBusy(key, true)
    try {
      const res = await apiFetch(`/users/${slot.user.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
      const d   = await res.json()
      if (!d.success) { setMsg(key, false, d.message || 'Failed'); return }
      setMsg(key, true, `Status → ${status}`)
      await loadSlots(selectedClient, selectedWorkshop)
    } catch {
      setMsg(key, false, 'Network error')
    } finally {
      setBusy(key, false)
    }
  }

  async function deleteUser(ws, role, slot) {
    if (!window.confirm(`Delete ${slot.user.name}? This cannot be undone.`)) return
    const key = slotKey(ws.id, role.roleCode, slot.slotNumber)
    setBusy(key, true)
    try {
      const res = await apiFetch(`/users/${slot.user.id}`, { method: 'DELETE' })
      const d   = await res.json()
      if (!d.success) { setMsg(key, false, d.message || 'Failed'); return }
      await loadSlots(selectedClient, selectedWorkshop)
    } catch {
      setMsg(key, false, 'Network error')
    } finally {
      setBusy(key, false)
    }
  }

  async function handleAddUser() {
    setAddBusy(true)
    setAddMsg(null)
    try {
      const res = await apiFetch('/enterprise/users/add', {
        method: 'POST',
        body: JSON.stringify({
          clientId:   credentialData.client.id,
          workshopId: addForm.workshopId,
          roleCode:   addForm.roleCode,
          name:       addForm.name.trim(),
          email:      addForm.email.trim(),
          password:   addForm.password.trim() || undefined,
        }),
      })
      const d = await res.json()
      if (!d.success) { setAddMsg({ ok: false, text: d.message || 'Failed to create user' }); return }
      const tempPwd = d.data?.tempPassword
      setAddMsg({ ok: true, text: tempPwd ? `Created — temp password: ${tempPwd}` : 'User created successfully' })
      setAddForm(p => ({ ...p, name: '', email: '', password: '' }))
      await loadSlots(selectedClient, selectedWorkshop)
    } catch {
      setAddMsg({ ok: false, text: 'Network error' })
    } finally {
      setAddBusy(false)
    }
  }

  async function createAllPending() {
    if (!credentialData) return
    const workshopsToScan = selectedWorkshop
      ? credentialData.workshops.filter(w => w.id === selectedWorkshop)
      : credentialData.workshops

    for (const ws of workshopsToScan) {
      for (const role of (ws.roles || [])) {
        for (const slot of (role.slots || [])) {
          if (slot.status !== 'EMPTY') continue
          const key = slotKey(ws.id, role.roleCode, slot.slotNumber)
          const inp = inputs[key] || {}
          if (inp.name?.trim() && inp.email?.trim()) {
            await createSlotUser(ws, role, slot)
          }
        }
      }
    }
  }

  const displayWorkshops = credentialData?.workshops
    ? (selectedWorkshop
        ? credentialData.workshops.filter(w => w.id === selectedWorkshop)
        : credentialData.workshops)
    : []

  let pendingCount = 0
  for (const ws of displayWorkshops) {
    for (const role of (ws.roles || [])) {
      for (const slot of (role.slots || [])) {
        if (slot.status === 'EMPTY') {
          const k = slotKey(ws.id, role.roleCode, slot.slotNumber)
          const inp = inputs[k] || {}
          if (inp.name?.trim() && inp.email?.trim()) pendingCount++
        }
      }
    }
  }

  const workshopOptions = credentialData?.workshops || []

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">User login setup</p>
        <h2>Set user credentials by workshop</h2>
        <p>
          Select a client and workshop. User slots are pre-filled from the counts entered during onboarding.
          Fill in each person's name and login email, set a password, then create accounts individually or all at once.
        </p>
      </div>

      {/* Selector panel */}
      <div className="panel">
        <div className="sectionHeader compact">
          <div>
            <h3>Credential management controls</h3>
            <p>Select client and workshop to manage their user accounts.</p>
          </div>
          <span className="accessBadge"><ShieldCheck size={16} /> Enterprise Admin only</span>
        </div>
        <div className="formGrid adminForm">
          <label>
            Client
            <select value={selectedClient} onChange={e => setSelectedClient(e.target.value)}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>
            Workshop
            <select
              value={selectedWorkshop}
              onChange={e => setSelectedWorkshop(e.target.value)}
              disabled={!credentialData}
            >
              <option value="">All workshops</option>
              {workshopOptions.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
        </div>

        {credentialData && (() => {
          const allRoles      = credentialData.workshops.flatMap(w => w.roles || [])
          const totalRequired = allRoles.reduce((s, r) => s + r.requiredCount, 0)
          const totalCreated  = allRoles.reduce((s, r) => s + r.createdCount,  0)
          const totalPending  = allRoles.reduce((s, r) => s + r.remainingCount, 0)
          return totalRequired > 0 ? (
            <div style={{ marginTop: 14, display: 'flex', gap: 24, fontSize: 13, flexWrap: 'wrap' }}>
              <span><strong>{totalRequired}</strong> <span style={{ color: 'var(--muted)' }}>planned</span></span>
              <span><strong style={{ color: '#00a389' }}>{totalCreated}</strong> <span style={{ color: 'var(--muted)' }}>created</span></span>
              <span><strong style={{ color: totalPending > 0 ? '#e07000' : '#00a389' }}>{totalPending}</strong> <span style={{ color: 'var(--muted)' }}>remaining</span></span>
            </div>
          ) : null
        })()}
      </div>

      {loading    && <div className="panel"><p className="muted">Loading credential slots…</p></div>}
      {fetchError && <div className="panel"><p style={{ color: 'var(--red)', fontWeight: 700 }}>{fetchError}</p></div>}

      {!loading && credentialData && displayWorkshops.length === 0 && (
        <div className="panel">
          <p className="muted">
            No user count slots found.
            {workshopOptions.length === 0
              ? ' Add workshops with role counts during client onboarding.'
              : ' Select a different workshop or add role counts during onboarding.'}
          </p>
        </div>
      )}

      {/* Per-workshop tabbed panels */}
      {!loading && displayWorkshops.map(ws => {
        const currentTab = activeTab[ws.id] || ws.roles?.[0]?.roleCode
        const activeRole = ws.roles?.find(r => r.roleCode === currentTab) || ws.roles?.[0]

        return (
          <div key={ws.id} className="panel">
            {!selectedWorkshop && displayWorkshops.length > 1 && (
              <div style={{ marginBottom: 16 }}>
                <strong style={{ fontSize: 16 }}>{ws.name}</strong>
                {ws.city && <span style={{ marginLeft: 8, color: 'var(--muted)', fontSize: 13 }}>{ws.city}</span>}
              </div>
            )}

            {/* Role tab bar */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
              {(ws.roles || []).map(role => {
                const isActive   = role.roleCode === currentTab
                const isComplete = role.remainingCount === 0
                return (
                  <button
                    key={role.roleCode}
                    onClick={() => setActiveTab(prev => ({ ...prev, [ws.id]: role.roleCode }))}
                    style={{
                      border:      isActive ? '2px solid var(--teal)' : '1px solid #e4e7ec',
                      borderRadius: 14,
                      padding:     '9px 14px',
                      background:  isActive ? '#f0fdfa' : '#fff',
                      color:       isActive ? '#075c50' : 'var(--navy)',
                      fontWeight:  800,
                      fontSize:    13,
                      display:     'inline-flex',
                      alignItems:  'center',
                      gap:         7,
                      cursor:      'pointer',
                      boxShadow:   isActive ? '0 0 0 3px rgba(0,163,137,.12)' : 'none',
                      transition:  'all .15s',
                    }}
                  >
                    {role.roleName}
                    <span style={{
                      borderRadius: 999,
                      padding:      '2px 7px',
                      fontSize:     11,
                      fontWeight:   900,
                      background:   isComplete ? '#dcfae6' : '#fef0c7',
                      color:        isComplete ? '#039855' : '#b54708',
                    }}>
                      {role.createdCount}/{role.requiredCount}
                    </span>
                  </button>
                )
              })}
            </div>

            {/* Active role slots */}
            {activeRole && (
              <>
                <div className="sectionHeader compact" style={{ marginBottom: 14 }}>
                  <div>
                    <h3 style={{ margin: 0 }}>{activeRole.roleName}</h3>
                    <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: 13 }}>
                      {activeRole.createdCount} of {activeRole.requiredCount} accounts created
                      {activeRole.remainingCount > 0 &&
                        ` · ${activeRole.remainingCount} slot${activeRole.remainingCount !== 1 ? 's' : ''} remaining`}
                    </p>
                  </div>
                  <span className={`pill ${activeRole.remainingCount === 0 ? 'green' : 'amber'}`}>
                    {activeRole.remainingCount === 0 ? 'Complete' : `${activeRole.remainingCount} pending`}
                  </span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(activeRole.slots || []).map(slot => {
                    const key      = slotKey(ws.id, activeRole.roleCode, slot.slotNumber)
                    const inp      = inputs[key] || {}
                    const msg      = msgs[key]
                    const busy     = busySet.has(key)
                    const u        = slot.user
                    const isFilled = slot.status === 'FILLED'
                    const isEdit   = editMode.has(key)

                    return (
                      <div
                        key={key}
                        style={{
                          border:       '1px solid',
                          borderColor:  isFilled ? '#e4e7ec' : 'rgba(0,163,137,.25)',
                          borderRadius: 18,
                          padding:      '14px 16px',
                          background:   isFilled ? '#fff' : 'rgba(0,163,137,.025)',
                        }}
                      >
                        {/* Top row: slot number + user info / status */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{
                              width: 28, height: 28, borderRadius: '50%',
                              background: isFilled ? '#dcfae6' : '#f0fdfa',
                              color:      isFilled ? '#039855' : '#00a389',
                              display: 'grid', placeItems: 'center',
                              fontSize: 12, fontWeight: 900, flexShrink: 0,
                            }}>
                              {slot.slotNumber}
                            </span>
                            {isFilled && !isEdit ? (
                              <div>
                                <strong style={{ fontSize: 14 }}>{u.name}</strong>
                                <span style={{ display: 'block', fontSize: 12, color: 'var(--muted)' }}>{u.loginEmail}</span>
                              </div>
                            ) : !isFilled ? (
                              <span style={{ fontSize: 13, color: 'var(--muted)' }}>Empty slot — fill in details to create account</span>
                            ) : null}
                          </div>
                          {isFilled && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                              <span className={`statusPill ${(u.status || '').toLowerCase()}`}>{u.status}</span>
                              <span style={{ fontSize: 12, color: 'var(--muted)' }}>Last login: {fmt(u.lastLoginAt)}</span>
                            </div>
                          )}
                        </div>

                        {/* Error / success banner */}
                        {msg && (
                          <div style={{
                            marginTop:  10,
                            padding:    '10px 14px',
                            borderRadius: 12,
                            background: msg.ok ? '#f0fdf4' : '#fff8f7',
                            border:     `1px solid ${msg.ok ? '#abefc6' : '#fda29b'}`,
                            color:      msg.ok ? '#039855' : '#b91c1c',
                            fontSize:   13,
                            fontWeight: 700,
                            display:    'flex',
                            alignItems: 'flex-start',
                            justifyContent: 'space-between',
                            gap: 8,
                          }}>
                            <span>{msg.ok ? '✓ ' : '⚠ '}{msg.text}</span>
                            <button
                              onClick={() => clearMsg(key)}
                              style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit', padding: 0, flexShrink: 0 }}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        )}

                        {/* Create form — empty slot */}
                        {!isFilled && (
                          <div style={{
                            marginTop: 12,
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr auto',
                            gap: 10,
                            alignItems: 'end',
                          }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700 }}>
                              Full name
                              <input
                                className="tableInput"
                                style={{ minWidth: 0, width: '100%' }}
                                placeholder={`${activeRole.roleName} ${slot.slotNumber}`}
                                value={inp.name || ''}
                                onChange={e => setInput(key, 'name', e.target.value)}
                              />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700 }}>
                              Login email
                              <input
                                className="tableInput"
                                style={{ minWidth: 0, width: '100%' }}
                                type="email"
                                placeholder="user@company.com"
                                value={inp.email || ''}
                                onChange={e => setInput(key, 'email', e.target.value)}
                              />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700 }}>
                              Password
                              <input
                                className="tableInput"
                                style={{ minWidth: 0, width: '100%' }}
                                value={inp.password || ''}
                                placeholder="Auto-generated"
                                onChange={e => setInput(key, 'password', e.target.value)}
                              />
                            </label>
                            <button
                              className="primaryBtn"
                              onClick={() => createSlotUser(ws, activeRole, slot)}
                              disabled={busy || !inp.name?.trim() || !inp.email?.trim()}
                              style={{ whiteSpace: 'nowrap', padding: '10px 14px' }}
                            >
                              <UserPlus size={14} /> {busy ? 'Creating…' : 'Create'}
                            </button>
                          </div>
                        )}

                        {/* Edit form — filled slot in edit mode */}
                        {isFilled && isEdit && (
                          <div style={{
                            marginTop: 12,
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr auto auto',
                            gap: 10,
                            alignItems: 'end',
                          }}>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700 }}>
                              Full name
                              <input
                                className="tableInput"
                                style={{ minWidth: 0, width: '100%' }}
                                value={inp.name !== undefined ? inp.name : u.name}
                                onChange={e => setInput(key, 'name', e.target.value)}
                              />
                            </label>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 12, fontWeight: 700 }}>
                              Login email
                              <input
                                className="tableInput"
                                style={{ minWidth: 0, width: '100%' }}
                                type="email"
                                value={inp.email !== undefined ? inp.email : u.loginEmail}
                                onChange={e => setInput(key, 'email', e.target.value)}
                              />
                            </label>
                            <button
                              className="primaryBtn"
                              onClick={() => saveExistingUser(ws, activeRole, slot)}
                              disabled={busy}
                              style={{ padding: '10px 14px' }}
                            >
                              <Save size={14} /> {busy ? 'Saving…' : 'Save'}
                            </button>
                            <button
                              className="secondaryBtn"
                              onClick={() => toggleEdit(key, u)}
                              disabled={busy}
                              style={{ padding: '10px 14px' }}
                            >
                              <X size={14} /> Cancel
                            </button>
                          </div>
                        )}

                        {/* Action bar — filled, not editing */}
                        {isFilled && !isEdit && (
                          <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <button
                              className="softBtn"
                              onClick={() => toggleEdit(key, u)}
                              disabled={busy}
                              style={{ margin: 0, padding: '7px 12px', fontSize: 13 }}
                            >
                              <Edit2 size={13} /> Edit
                            </button>
                            <button
                              className="softBtn"
                              onClick={() => resetPassword(ws, activeRole, slot)}
                              disabled={busy}
                              style={{ margin: 0, padding: '7px 12px', fontSize: 13 }}
                            >
                              <RefreshCcw size={13} /> Reset password
                            </button>
                            <button
                              onClick={() => changeStatus(ws, activeRole, slot, u.status === 'Active' ? 'Inactive' : 'Active')}
                              disabled={busy}
                              style={{ border: '1px solid #e4e7ec', borderRadius: 10, background: '#f8fafc', padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                            >
                              {u.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => changeStatus(ws, activeRole, slot, 'Blocked')}
                              disabled={busy}
                              style={{ border: '1px solid #e4e7ec', borderRadius: 10, background: '#f8fafc', padding: '7px 12px', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                            >
                              Block
                            </button>
                            <button
                              onClick={() => deleteUser(ws, activeRole, slot)}
                              disabled={busy}
                              style={{ border: 0, borderRadius: 10, background: '#fee4e2', color: 'var(--red)', padding: '7px 12px', fontSize: 13, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5, cursor: 'pointer' }}
                            >
                              <Trash2 size={13} /> Delete
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </div>
        )
      })}

      {/* Add User panel */}
      {!loading && credentialData && (
        <div className="panel">
          <div className="sectionHeader compact">
            <div>
              <h3>Add user to workshop</h3>
              <p>Create an additional user of any role for this client. Slot counts update automatically.</p>
            </div>
            <UserPlus size={18} />
          </div>

          <div className="formGrid adminForm" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' }}>
            <label>
              Workshop
              <select
                value={addForm.workshopId}
                onChange={e => setAddForm(p => ({ ...p, workshopId: e.target.value }))}
              >
                <option value="">— Select workshop —</option>
                {(credentialData.workshops || []).map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>
            </label>
            <label>
              Role
              <select
                value={addForm.roleCode}
                onChange={e => setAddForm(p => ({ ...p, roleCode: e.target.value }))}
              >
                <option value="">— Select role —</option>
                {ROLE_OPTIONS.map(r => (
                  <option key={r.code} value={r.code}>{r.label}</option>
                ))}
              </select>
            </label>
            <label>
              Full name
              <input
                className="tableInput"
                value={addForm.name}
                onChange={e => setAddForm(p => ({ ...p, name: e.target.value }))}
                placeholder="Jane Smith"
              />
            </label>
            <label>
              Login email
              <input
                className="tableInput"
                type="email"
                value={addForm.email}
                onChange={e => setAddForm(p => ({ ...p, email: e.target.value }))}
                placeholder="user@company.com"
              />
            </label>
            <label>
              Password
              <input
                className="tableInput"
                value={addForm.password}
                onChange={e => setAddForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Auto-generated"
              />
            </label>
          </div>

          {addMsg && (
            <div style={{
              marginTop: 12, padding: '10px 14px', borderRadius: 12,
              background: addMsg.ok ? '#f0fdf4' : '#fff8f7',
              border:     `1px solid ${addMsg.ok ? '#abefc6' : '#fda29b'}`,
              color:      addMsg.ok ? '#039855' : '#b91c1c',
              fontSize: 13, fontWeight: 700,
              display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8,
            }}>
              <span>{addMsg.ok ? '✓ ' : '⚠ '}{addMsg.text}</span>
              <button
                onClick={() => setAddMsg(null)}
                style={{ border: 0, background: 'transparent', cursor: 'pointer', color: 'inherit', padding: 0, flexShrink: 0 }}
              >
                <X size={14} />
              </button>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <button
              className="primaryBtn"
              onClick={handleAddUser}
              disabled={addBusy || !addForm.workshopId || !addForm.roleCode || !addForm.name.trim() || !addForm.email.trim()}
            >
              <UserPlus size={15} /> {addBusy ? 'Creating…' : 'Add user'}
            </button>
          </div>
        </div>
      )}

      {/* Sticky bulk-create bar */}
      {!loading && pendingCount > 0 && (
        <div className="stickyActions">
          <span style={{ fontSize: 13, color: 'var(--muted)' }}>
            {pendingCount} user{pendingCount !== 1 ? 's' : ''} ready to create
          </span>
          <button className="primaryBtn" onClick={createAllPending}>
            <UserPlus size={15} /> Create all {pendingCount} users
          </button>
        </div>
      )}
    </section>
  )
}

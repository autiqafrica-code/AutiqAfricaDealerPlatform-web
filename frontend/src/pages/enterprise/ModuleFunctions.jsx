import { useEffect, useState } from 'react'
import { apiFetch } from '../../utils/api'

export default function ModuleFunctions() {
  const [clients, setClients] = useState([])
  const [allModules, setAllModules] = useState([])
  const [enabledIds, setEnabledIds] = useState(new Set())
  const [selectedClientId, setSelectedClientId] = useState('')
  const [configVersion, setConfigVersion] = useState('Initial onboarding setup')
  const [approvalStatus, setApprovalStatus] = useState('Draft')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    Promise.all([
      apiFetch('/clients?limit=200').then(r => r.json()),
      apiFetch('/enterprise/modules').then(r => r.json()),
    ]).then(([clientData, moduleData]) => {
      if (clientData.success) setClients(clientData.data.clients || [])
      if (moduleData.success) setAllModules(moduleData.data.modules || [])
    })
  }, [])

  useEffect(() => {
    if (!selectedClientId) { setEnabledIds(new Set()); return }
    apiFetch(`/clients/${selectedClientId}/modules`).then(r => r.json()).then(d => {
      if (d.success) {
        const enabled = (d.data.modules || []).filter(m => m.isEnabled).map(m => m.moduleId)
        setEnabledIds(new Set(enabled))
      }
    })
  }, [selectedClientId])

  function toggleModule(id) {
    setEnabledIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function saveFunctions() {
    if (!selectedClientId) { setMsg('Select a client first'); return }
    setSaving(true)
    const res = await apiFetch(`/clients/${selectedClientId}/modules`, {
      method: 'POST',
      body: JSON.stringify({ moduleIds: Array.from(enabledIds) }),
    })
    const data = await res.json()
    setSaving(false)
    setMsg(data.success ? 'Module configuration saved' : (data.message || 'Save failed'))
    setTimeout(() => setMsg(''), 3000)
  }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Module functionality setup</p>
        <h2>Configure what each client module should cover</h2>
        <p>Define the exact functionality included inside every enabled module for a selected dealer client.</p>
      </div>

      <div className="panel formPanel">
        <div className="formGrid">
          <label>Choose client
            <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
              <option value="">— Select client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Configuration version
            <select value={configVersion} onChange={e => setConfigVersion(e.target.value)}>
              <option>Initial onboarding setup</option>
              <option>Phase 2 change request</option>
              <option>Renewal configuration</option>
            </select>
          </label>
          <label>Approval status
            <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)}>
              <option>Draft</option>
              <option>Ready for client confirmation</option>
              <option>Approved</option>
            </select>
          </label>
        </div>
      </div>

      {allModules.length === 0 && (
        <p className="muted">No platform modules found. Run the database seed to populate modules.</p>
      )}

      {allModules.length > 0 && (
        <div className="moduleFunctionGrid">
          {allModules.map(mod => (
            <div className="panel moduleFunctionCard" key={mod.id}>
              <div className="sectionHeader compact">
                <div>
                  <h3>{mod.name}</h3>
                  <p>{selectedClient ? `Included functionality for ${selectedClient.name}` : 'Select a client to configure'}</p>
                </div>
                <label className="switchLine">
                  <input
                    type="checkbox"
                    checked={enabledIds.has(mod.id)}
                    onChange={() => toggleModule(mod.id)}
                    disabled={!selectedClientId}
                  /> Enabled
                </label>
              </div>
              <div className="functionList">
                {(mod.description || '').split(',').map(fn => fn.trim()).filter(Boolean).map(fn => (
                  <label key={fn}>
                    <input type="checkbox" checked={enabledIds.has(mod.id)} readOnly /> {fn}
                  </label>
                ))}
              </div>
              <textarea placeholder={`Add custom notes for ${mod.name}`} />
            </div>
          ))}
        </div>
      )}

      {msg && <p className={msg.includes('saved') ? 'successMsg' : 'errorMsg'}>{msg}</p>}

      <div className="stickyActions">
        <button className="secondaryBtn" onClick={() => setMsg('Draft saved')}>Save Draft</button>
        <button className="primaryBtn" onClick={saveFunctions} disabled={saving || !selectedClientId}>
          {saving ? 'Saving…' : 'Save Functionality Configuration'}
        </button>
      </div>
    </section>
  )
}

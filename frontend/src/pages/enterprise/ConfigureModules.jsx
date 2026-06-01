import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { apiFetch } from '../../utils/api.js'

export default function ConfigureModules() {
  const [clients,       setClients]       = useState([])
  const [modules,       setModules]       = useState([])
  const [selectedClient, setSelectedClient] = useState('')
  const [enabledIds,    setEnabledIds]    = useState(new Set())
  const [loading,       setLoading]       = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [fetchError,    setFetchError]    = useState('')
  const [saveMsg,       setSaveMsg]       = useState('')

  // Load clients and platform modules on mount
  useEffect(() => {
    Promise.all([
      apiFetch('/clients?limit=200').then(r => r.json()),
      apiFetch('/enterprise/modules').then(r => r.json()),
    ]).then(([clientsData, modulesData]) => {
      if (clientsData.success) setClients(clientsData.data?.clients || [])
      if (modulesData.success) setModules(modulesData.data?.modules || [])
    }).catch(() => setFetchError('Failed to load data'))
  }, [])

  // Load this client's current module assignments when client changes
  useEffect(() => {
    if (!selectedClient) { setEnabledIds(new Set()); return }
    setLoading(true)
    setFetchError('')
    setSaveMsg('')
    apiFetch(`/clients/${selectedClient}/modules`)
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          const ids = (data.data?.modules || [])
            .filter(m => m.isEnabled)
            .map(m => m.moduleId)
          setEnabledIds(new Set(ids))
        } else {
          setFetchError(data.message || 'Failed to load module config')
        }
      })
      .catch(() => setFetchError('Network error'))
      .finally(() => setLoading(false))
  }, [selectedClient])

  function toggleModule(moduleId) {
    setEnabledIds(prev => {
      const next = new Set(prev)
      if (next.has(moduleId)) next.delete(moduleId)
      else next.add(moduleId)
      return next
    })
    setSaveMsg('')
  }

  async function saveConfig() {
    if (!selectedClient) return
    setSaving(true)
    setSaveMsg('')
    try {
      const res  = await apiFetch(`/clients/${selectedClient}/modules`, {
        method: 'POST',
        body: JSON.stringify({ moduleIds: Array.from(enabledIds) }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setSaveMsg(data.message || 'Failed to save')
      } else {
        setSaveMsg('Module configuration saved successfully.')
      }
    } catch { setSaveMsg('Network error — could not save') }
    finally { setSaving(false) }
  }

  const selectedClientName = clients.find(c => c.id === selectedClient)?.name || ''

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Module enablement</p>
        <h2>Configure modules per client</h2>
        <p>Select which product modules are enabled for each dealer. Use Module Functions to define what each enabled module covers.</p>
      </div>

      <div className="panel formPanel">
        <div className="sectionHeader compact">
          <div>
            <h3>Client selection</h3>
            <p>Choose a client to view and update their module configuration.</p>
          </div>
        </div>
        <div className="formGrid">
          <label>
            Choose client
            <select
              value={selectedClient}
              onChange={e => setSelectedClient(e.target.value)}
            >
              <option value="">— Select a client —</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.country})</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {selectedClient && (
        <>
          <div className="panel">
            <div className="sectionHeader compact">
              <div>
                <h3>
                  {selectedClientName
                    ? `Modules for ${selectedClientName}`
                    : 'Platform modules'
                  }
                </h3>
                <p>
                  {loading
                    ? 'Loading current configuration…'
                    : `${enabledIds.size} of ${modules.length} modules enabled. Toggle to update.`
                  }
                </p>
              </div>
            </div>

            {fetchError && <p className="errorText" style={{ marginBottom: 8 }}>{fetchError}</p>}

            {loading ? (
              <p style={{ padding: '16px 0', color: 'var(--muted)' }}>Loading…</p>
            ) : (
              <div className="moduleGrid">
                {modules.map(mod => (
                  <label
                    key={mod.id}
                    className={`moduleCard ${enabledIds.has(mod.id) ? 'active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <input
                      type="checkbox"
                      checked={enabledIds.has(mod.id)}
                      onChange={() => toggleModule(mod.id)}
                    />
                    <strong>{mod.name}</strong>
                    {mod.description && <span style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{mod.description}</span>}
                    {mod.isOptional && <span style={{ fontSize: 11, color: 'var(--amber)', marginTop: 2 }}>Optional</span>}
                  </label>
                ))}
                {modules.length === 0 && (
                  <p style={{ color: 'var(--muted)', gridColumn: '1/-1' }}>No platform modules found. Seed the database with module records first.</p>
                )}
              </div>
            )}
          </div>

          <div className="stickyActions">
            {saveMsg && (
              <span style={{ fontSize: 14, color: saveMsg.includes('success') ? '#00a389' : '#d92d20', display: 'flex', alignItems: 'center', gap: 6 }}>
                {saveMsg.includes('success') && <CheckCircle2 size={15} />}
                {saveMsg}
              </span>
            )}
            <button
              className="primaryBtn"
              onClick={saveConfig}
              disabled={saving || loading}
            >
              {saving ? 'Saving…' : 'Save Module Configuration'}
            </button>
          </div>
        </>
      )}
    </section>
  )
}

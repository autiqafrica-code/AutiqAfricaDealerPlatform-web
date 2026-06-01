import { useEffect, useState } from 'react'
import { Save, Tags } from 'lucide-react'
import { apiFetch } from '../../utils/api'

function csvEscape(v) { return `"${String(v ?? '').replaceAll('"', '""')}"` }

export default function ServicePricing() {
  const [templates, setTemplates] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const [form, setForm] = useState({
    serviceTemplateId: '',
    workshopId: '',
    currency: 'ZAR',
    standardPrice: '',
    customPrice: '',
    allowCustomOverride: 'Yes',
    effectiveFrom: new Date().toISOString().split('T')[0],
    approvalRequired: 'Manager',
    taxIncluded: 'Yes',
  })

  useEffect(() => {
    Promise.all([
      apiFetch('/service-templates').then(r => r.json()),
      apiFetch('/workshops?limit=200').then(r => r.json()),
    ]).then(([svcData, wsData]) => {
      if (svcData.success) setTemplates(svcData.data.templates || [])
      if (wsData.success) setWorkshops(wsData.data.workshops || [])
      if (svcData.data?.templates?.length) {
        setForm(f => ({ ...f, serviceTemplateId: svcData.data.templates[0].id }))
      }
    }).finally(() => setLoading(false))
  }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function save() {
    if (!form.serviceTemplateId) { setMsg('Select a service template'); return }
    const body = {
      workshopId: form.workshopId || undefined,
      currency: form.currency,
      standardPrice: parseFloat(form.standardPrice) || undefined,
      customPrice: parseFloat(form.customPrice) || undefined,
      allowCustomOverride: form.allowCustomOverride === 'Yes',
      effectiveFrom: form.effectiveFrom || undefined,
      approvalRequired: form.approvalRequired,
      taxIncluded: form.taxIncluded === 'Yes',
    }
    const res = await apiFetch(`/service-templates/${form.serviceTemplateId}/pricing`, {
      method: 'POST',
      body: JSON.stringify(body),
    })
    const data = await res.json()
    if (data.success) {
      setMsg('Price saved successfully')
      const refresh = await apiFetch('/service-templates').then(r => r.json())
      if (refresh.success) setTemplates(refresh.data.templates || [])
    } else {
      setMsg(data.message || 'Save failed')
    }
    setTimeout(() => setMsg(''), 3000)
  }

  function exportCsv() {
    const rows = templates.flatMap(t =>
      (t.servicePricing || []).map(p => ({
        Service: t.name, Module: t.module,
        Currency: p.currency,
        StandardPrice: p.standardPrice || '',
        CustomPrice: p.customPrice || '',
        Duration: t.duration || '',
        Override: p.allowCustomOverride ? 'Yes' : 'No',
        TaxIncluded: p.taxIncluded ? 'Yes' : 'No',
      }))
    )
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const csv = [headers.join(','), ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'service-pricing.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Enterprise Admin / Pricing</p>
        <h2>Service-wise module standard price configuration</h2>
        <p>Maintain standard service prices in a separate pricing screen. Dealer or workshop level custom pricing can override the standard price when required.</p>
      </div>

      <div className="panel formPanel">
        <div className="sectionHeader compact">
          <div>
            <p className="eyebrow">Pricing rule</p>
            <h3>Create or update standard price</h3>
          </div>
          <span className="accessBadge"><Tags size={16} /> Multi-currency ready</span>
        </div>
        <div className="formGrid adminForm">
          <label>Workshop scope
            <select value={form.workshopId} onChange={e => set('workshopId', e.target.value)}>
              <option value="">All workshops</option>
              {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
          </label>
          <label>Service template
            <select value={form.serviceTemplateId} onChange={e => set('serviceTemplateId', e.target.value)}>
              <option value="">— Select template —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label>Currency
            <select value={form.currency} onChange={e => set('currency', e.target.value)}>
              <option>ZAR</option><option>NGN</option><option>BWP</option><option>KES</option><option>USD</option>
            </select>
          </label>
          <label>Standard price
            <input type="number" value={form.standardPrice} onChange={e => set('standardPrice', e.target.value)} placeholder="e.g. 3080" />
          </label>
          <label>Custom price
            <input type="number" value={form.customPrice} onChange={e => set('customPrice', e.target.value)} placeholder="e.g. 3450" />
          </label>
          <label>Allow custom override
            <select value={form.allowCustomOverride} onChange={e => set('allowCustomOverride', e.target.value)}>
              <option>Yes</option><option>No</option>
            </select>
          </label>
          <label>Effective from
            <input type="date" value={form.effectiveFrom} onChange={e => set('effectiveFrom', e.target.value)} />
          </label>
          <label>Approval required
            <select value={form.approvalRequired} onChange={e => set('approvalRequired', e.target.value)}>
              <option>Manager</option><option>CEO</option><option>Enterprise Admin</option>
            </select>
          </label>
          <label>Tax included
            <select value={form.taxIncluded} onChange={e => set('taxIncluded', e.target.value)}>
              <option>Yes</option><option>No</option>
            </select>
          </label>
        </div>
        {msg && <p className={msg.includes('success') ? 'successMsg' : 'errorMsg'}>{msg}</p>}
        <button className="primaryBtn" onClick={save}><Save size={16} /> Save standard price</button>
      </div>

      <section className="panel">
        <div className="sectionHeader">
          <h3>Configured service prices</h3>
          <button className="softBtn" onClick={exportCsv}>Export pricing CSV</button>
        </div>
        {loading
          ? <p className="muted">Loading service templates…</p>
          : templates.length === 0
            ? <p className="muted">No service templates found. Run the database seed to populate templates.</p>
            : (
              <div className="tableWrap">
                <table>
                  <thead><tr><th>Service</th><th>Module</th><th>Standard Price</th><th>Custom Price</th><th>Duration</th><th>Override</th></tr></thead>
                  <tbody>
                    {templates.map(t => {
                      const p = t.servicePricing?.[0]
                      return (
                        <tr key={t.id}>
                          <td>{t.name}</td>
                          <td>{t.module}</td>
                          <td><strong>{p ? `${p.currency} ${Number(p.standardPrice || 0).toLocaleString()}` : '—'}</strong></td>
                          <td>{p ? `${p.currency} ${Number(p.customPrice || 0).toLocaleString()}` : '—'}</td>
                          <td>{t.duration || '—'}</td>
                          <td><span className={`pill ${t.defaultPricingMode === 'CustomPrice' ? 'amber' : 'green'}`}>{t.defaultPricingMode === 'CustomPrice' ? 'Custom price' : 'Standard price'}</span></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )
        }
      </section>
    </section>
  )
}

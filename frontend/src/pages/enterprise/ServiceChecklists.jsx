import { useEffect, useState } from 'react'
import { CheckCircle2, ListPlus, Save, Trash2, Wrench } from 'lucide-react'
import { apiFetch } from '../../utils/api'

export default function ServiceChecklists() {
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')
  const [editItemId, setEditItemId] = useState(null)

  const [form, setForm] = useState({
    serviceTemplateId: '',
    item: '',
    isRequired: 'Yes',
    priceMode: 'StandardPrice',
    standardPrice: '',
    customPrice: '',
    currency: 'ZAR',
    technicianInstruction: '',
  })

  async function loadTemplates() {
    const data = await apiFetch('/service-templates').then(r => r.json())
    if (data.success) {
      const tpls = data.data.templates || []
      setTemplates(tpls)
      if (tpls.length && !form.serviceTemplateId) {
        setForm(f => ({ ...f, serviceTemplateId: tpls[0].id }))
      }
    }
    setLoading(false)
  }

  useEffect(() => { loadTemplates() }, [])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  function startEdit(templateId, item) {
    setEditItemId(item.id)
    setForm({
      serviceTemplateId: templateId,
      item: item.item,
      isRequired: item.isRequired ? 'Yes' : 'No',
      priceMode: item.priceMode,
      standardPrice: item.standardPrice || '',
      customPrice: item.customPrice || '',
      currency: item.currency,
      technicianInstruction: item.technicianInstruction || '',
    })
  }

  function clearForm() {
    setEditItemId(null)
    setForm(f => ({ ...f, item: '', isRequired: 'Yes', priceMode: 'StandardPrice', standardPrice: '', customPrice: '', technicianInstruction: '' }))
  }

  async function saveItem() {
    if (!form.serviceTemplateId) { setMsg('Select a service template'); return }
    if (!form.item.trim()) { setMsg('Checklist item description is required'); return }

    const body = {
      item: form.item,
      isRequired: form.isRequired === 'Yes',
      priceMode: form.priceMode,
      standardPrice: parseFloat(form.standardPrice) || undefined,
      customPrice: parseFloat(form.customPrice) || undefined,
      currency: form.currency,
      technicianInstruction: form.technicianInstruction || undefined,
    }

    const url = editItemId
      ? `/service-templates/${form.serviceTemplateId}/checklist/${editItemId}`
      : `/service-templates/${form.serviceTemplateId}/checklist`
    const method = editItemId ? 'PUT' : 'POST'

    const res = await apiFetch(url, { method, body: JSON.stringify(body) })
    const data = await res.json()
    if (data.success) {
      setMsg(editItemId ? 'Checklist item updated' : 'Checklist item added')
      clearForm()
      loadTemplates()
    } else {
      setMsg(data.message || 'Save failed')
    }
    setTimeout(() => setMsg(''), 3000)
  }

  async function deleteItem(templateId, itemId) {
    if (!window.confirm('Delete this checklist item?')) return
    const res = await apiFetch(`/service-templates/${templateId}/checklist/${itemId}`, { method: 'DELETE' })
    const data = await res.json()
    if (data.success) { setMsg('Item deleted'); loadTemplates() }
    setTimeout(() => setMsg(''), 2000)
  }

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Enterprise Admin / Service setup</p>
        <h2>Configure checklist items against each service module</h2>
        <p>Define the checklist that technicians and workshop teams follow for every service module. Each checklist line can use the module standard price or a custom price.</p>
      </div>

      <div className="panel formPanel">
        <div className="sectionHeader compact">
          <div>
            <p className="eyebrow">{editItemId ? 'Edit checklist item' : 'New checklist item'}</p>
            <h3>Add or edit service checklist rules</h3>
          </div>
          <span className="accessBadge"><ListPlus size={16} /> Standard or custom price</span>
        </div>
        <div className="formGrid adminForm twoCols">
          <label>Service module
            <select value={form.serviceTemplateId} onChange={e => set('serviceTemplateId', e.target.value)}>
              <option value="">— Select template —</option>
              {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label>Checklist item
            <input value={form.item} onChange={e => set('item', e.target.value)} placeholder="e.g. Battery health check" />
          </label>
          <label>Required item
            <select value={form.isRequired} onChange={e => set('isRequired', e.target.value)}>
              <option>Yes</option><option>No</option>
            </select>
          </label>
          <label>Price type
            <select value={form.priceMode} onChange={e => set('priceMode', e.target.value)}>
              <option value="StandardPrice">Standard price</option>
              <option value="CustomPrice">Custom price</option>
            </select>
          </label>
          <label>Standard price
            <input type="number" value={form.standardPrice} onChange={e => set('standardPrice', e.target.value)} placeholder="e.g. 320" />
          </label>
          <label>Custom price
            <input type="number" value={form.customPrice} onChange={e => set('customPrice', e.target.value)} placeholder="Only when custom price selected" />
          </label>
          <label>Currency
            <select value={form.currency} onChange={e => set('currency', e.target.value)}>
              <option>ZAR</option><option>NGN</option><option>BWP</option><option>KES</option><option>USD</option>
            </select>
          </label>
          <label className="wide">Technician instruction
            <textarea value={form.technicianInstruction} onChange={e => set('technicianInstruction', e.target.value)} placeholder="Capture checklist result and attach media if the component fails inspection." />
          </label>
        </div>
        {msg && <p className={msg.toLowerCase().includes('fail') || msg.toLowerCase().includes('required') || msg.toLowerCase().includes('select') ? 'errorMsg' : 'successMsg'}>{msg}</p>}
        <div className="rowActions">
          <button className="primaryBtn" onClick={saveItem}><Save size={16} /> {editItemId ? 'Update checklist item' : 'Save checklist item'}</button>
          {editItemId && <button className="softBtn" onClick={clearForm}>Cancel edit</button>}
        </div>
      </div>

      {loading
        ? <p className="muted">Loading service templates…</p>
        : templates.length === 0
          ? <p className="muted">No service templates found. Run the database seed to populate templates.</p>
          : (
            <div className="serviceConfigGrid">
              {templates.map(t => {
                const pricing = t.servicePricing?.[0]
                return (
                  <article className="serviceConfigCard" key={t.id}>
                    <div className="serviceConfigHead">
                      <span className="logoMark"><Wrench size={20} /></span>
                      <div>
                        <p className="eyebrow">{t.module}</p>
                        <h3>{t.name}</h3>
                        <small>{t.duration || 'Duration TBD'} • Default: {t.defaultPricingMode === 'CustomPrice' ? 'Custom price' : 'Standard price'}</small>
                      </div>
                    </div>
                    {pricing && (
                      <div className="priceStrip">
                        <span><strong>{pricing.currency} {Number(pricing.standardPrice || 0).toLocaleString()}</strong><small>Standard price</small></span>
                        <span><strong>{pricing.currency} {Number(pricing.customPrice || 0).toLocaleString()}</strong><small>Custom example</small></span>
                      </div>
                    )}
                    <div className="checklistStack">
                      {(t.checklistTemplates || []).map(row => (
                        <div className="checklistConfigRow" key={row.id}>
                          <CheckCircle2 size={18} />
                          <span>
                            <strong>{row.item}</strong>
                            <small>{row.isRequired ? 'Required' : 'Optional'} • {row.priceMode === 'CustomPrice' ? 'Custom price' : 'Standard price'} • {row.currency} {Number(row.standardPrice || 0).toLocaleString()}</small>
                          </span>
                          <button className="softBtn" onClick={() => startEdit(t.id, row)}>Edit</button>
                          <button className="iconBtn danger" onClick={() => deleteItem(t.id, row.id)}><Trash2 size={14} /></button>
                        </div>
                      ))}
                      {!(t.checklistTemplates?.length) && <p className="muted">No checklist items yet.</p>}
                    </div>
                  </article>
                )
              })}
            </div>
          )
      }
    </section>
  )
}

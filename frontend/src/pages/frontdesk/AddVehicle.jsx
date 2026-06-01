import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Car, FilePlus2, Save, Search } from 'lucide-react'
import { apiFetch } from '../../utils/api'

export default function AddVehicle() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const prefillCustomerId = searchParams.get('customerId') || ''

  const [customerSearch, setCustomerSearch] = useState('')
  const [customers,      setCustomers]      = useState([])
  const [searching,      setSearching]      = useState(false)

  const [selectedCustomer, setSelectedCustomer] = useState(null)
  const [vehicles,         setVehicles]         = useState([])
  const [loadingVehicles,  setLoadingVehicles]  = useState(false)

  const [form, setForm] = useState({
    registrationNo: '', vin: '', makeModel: '', mileage: '', vehicleType: 'Private', notes: '',
  })
  const [errors,   setErrors]   = useState({})
  const [saving,   setSaving]   = useState(false)
  const [apiError, setApiError] = useState('')
  const [success,  setSuccess]  = useState('')

  useEffect(() => {
    if (prefillCustomerId) loadCustomer(prefillCustomerId)
  }, [prefillCustomerId])

  useEffect(() => {
    if (!customerSearch.trim() || customerSearch.length < 2) { setCustomers([]); return }
    const t = setTimeout(searchCustomers, 300)
    return () => clearTimeout(t)
  }, [customerSearch])

  async function searchCustomers() {
    setSearching(true)
    try {
      const res  = await apiFetch(`/customers?q=${encodeURIComponent(customerSearch)}&limit=10`)
      const data = await res.json()
      if (data.success) setCustomers(data.data.data || [])
    } catch { /* ignore */ }
    finally { setSearching(false) }
  }

  async function loadCustomer(id) {
    try {
      const res  = await apiFetch(`/customers/${id}`)
      const data = await res.json()
      if (data.success) {
        setSelectedCustomer(data.data.customer)
        setVehicles(data.data.customer.vehicles || [])
      }
    } catch { /* ignore */ }
  }

  async function selectCustomer(c) {
    setSelectedCustomer(c)
    setCustomers([])
    setCustomerSearch('')
    setLoadingVehicles(true)
    try {
      const res  = await apiFetch(`/customers/${c.id}/vehicles`)
      const data = await res.json()
      if (data.success) setVehicles(data.data.vehicles || [])
    } catch { /* ignore */ }
    finally { setLoadingVehicles(false) }
  }

  function validate() {
    const e = {}
    if (!form.registrationNo.trim()) e.registrationNo = 'Registration number is required'
    if (!form.makeModel.trim())      e.makeModel      = 'Make & model is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function saveVehicle() {
    if (!selectedCustomer) { setApiError('Please select a customer first'); return }
    if (!validate()) return
    setSaving(true)
    setApiError('')
    setSuccess('')
    try {
      const res  = await apiFetch('/vehicles', {
        method: 'POST',
        body: JSON.stringify({
          customerId:     selectedCustomer.id,
          registrationNo: form.registrationNo.trim(),
          vin:            form.vin.trim() || undefined,
          makeModel:      form.makeModel.trim(),
          mileage:        form.mileage ? parseInt(form.mileage) : undefined,
          vehicleType:    form.vehicleType,
          notes:          form.notes.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setApiError(data.message || 'Failed to save vehicle'); return }
      setVehicles(prev => [data.data.vehicle, ...prev])
      setForm({ registrationNo: '', vin: '', makeModel: '', mileage: '', vehicleType: 'Private', notes: '' })
      setSuccess('Vehicle saved successfully.')
    } catch {
      setApiError('Network error — could not reach server')
    } finally {
      setSaving(false)
    }
  }

  const errStyle = { borderColor: '#d92d20', background: '#fff8f8' }
  const errMsg   = { color: '#d92d20', fontSize: 12, marginTop: 4, display: 'block' }

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Customer Vehicle Management</p>
        <h2>Add Vehicle for Existing Customer</h2>
        <p>Select a customer, then add one or more vehicle records. Each vehicle can later be linked to a quotation, job card, and payment history.</p>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <h3>Vehicle Details</h3>
            <p>Capture vehicle registration, mileage and vehicle type for this customer.</p>
          </div>
          <button className="primaryBtn" onClick={saveVehicle} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save Vehicle'}
          </button>
        </div>

        {/* Customer search */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <div className="searchBar">
            <Search size={18} />
            <input
              placeholder="Search customer by name or phone…"
              value={customerSearch}
              onChange={e => setCustomerSearch(e.target.value)}
            />
          </div>
          {customers.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, background: 'white',
              border: '1px solid #e4e7ec', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,.1)',
              zIndex: 50, maxHeight: 240, overflowY: 'auto',
            }}>
              {customers.map(c => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 16px', border: 0, background: 'transparent', cursor: 'pointer',
                    borderBottom: '1px solid #f2f4f7',
                  }}
                >
                  <strong>{c.name}</strong>
                  <span style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 8 }}>{c.phone}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedCustomer && (
          <div style={{ background: '#f0fdf4', border: '1px solid #abefc6', borderRadius: 12, padding: '10px 16px', marginBottom: 16 }}>
            <strong>{selectedCustomer.name}</strong>
            <span style={{ color: 'var(--muted)', fontSize: 13, marginLeft: 10 }}>{selectedCustomer.phone}</span>
          </div>
        )}

        {(apiError || success) && (
          <div style={{
            background: success ? '#f0fdf4' : '#fff8f7',
            border: `1px solid ${success ? '#abefc6' : '#fda29b'}`,
            borderRadius: 12, padding: '10px 14px',
            color: success ? '#027a48' : '#b91c1c',
            fontWeight: 700, fontSize: 13, marginBottom: 16,
          }}>
            {success || `⚠ ${apiError}`}
          </div>
        )}

        <div className="formGrid adminForm">
          <label>
            Vehicle Registration Number *
            <input
              placeholder="CA 245 889"
              value={form.registrationNo}
              onChange={e => setForm(p => ({ ...p, registrationNo: e.target.value }))}
              style={errors.registrationNo ? errStyle : undefined}
            />
            {errors.registrationNo && <span style={errMsg}>{errors.registrationNo}</span>}
          </label>
          <label>
            Vehicle Number / VIN
            <input
              placeholder="VIN or internal vehicle number"
              value={form.vin}
              onChange={e => setForm(p => ({ ...p, vin: e.target.value }))}
            />
          </label>
          <label>
            Make &amp; Model *
            <input
              placeholder="Toyota Hilux 2.8 GD-6"
              value={form.makeModel}
              onChange={e => setForm(p => ({ ...p, makeModel: e.target.value }))}
              style={errors.makeModel ? errStyle : undefined}
            />
            {errors.makeModel && <span style={errMsg}>{errors.makeModel}</span>}
          </label>
          <label>
            Mileage
            <input
              type="number"
              placeholder="82400"
              value={form.mileage}
              onChange={e => setForm(p => ({ ...p, mileage: e.target.value }))}
            />
          </label>
          <label>
            Type of Vehicle
            <select value={form.vehicleType} onChange={e => setForm(p => ({ ...p, vehicleType: e.target.value }))}>
              <option value="Private">Private</option>
              <option value="Fleet">Fleet</option>
              <option value="Insurance">Insurance</option>
              <option value="Warranty">Warranty</option>
            </select>
          </label>
          <label className="wide">
            Vehicle Notes
            <textarea
              placeholder="Condition, customer concern, visible damage or intake notes"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <h3>Vehicles Linked to Customer</h3>
          <span className="accessBadge">Multiple vehicles supported</span>
        </div>
        {loadingVehicles ? (
          <p style={{ padding: '20px', textAlign: 'center', color: 'var(--muted)' }}>Loading vehicles…</p>
        ) : vehicles.length === 0 ? (
          <div className="infoStrip">
            {selectedCustomer ? 'No vehicles found for this customer.' : 'Select a customer to see their vehicles.'}
          </div>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Registration</th>
                  <th>Customer</th>
                  <th>Vehicle</th>
                  <th>Mileage</th>
                  <th>Type</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {vehicles.map(v => (
                  <tr key={v.id}>
                    <td><Car size={14} style={{ verticalAlign: 'middle', marginRight: 6 }} />{v.registrationNo}</td>
                    <td>{selectedCustomer?.name}</td>
                    <td>{v.makeModel}</td>
                    <td>{v.mileage ? `${v.mileage.toLocaleString()} km` : '—'}</td>
                    <td>{v.vehicleType}</td>
                    <td>
                      <button
                        className="softBtn"
                        onClick={() => navigate(`/front-desk/create-quotation?customerId=${selectedCustomer?.id}&vehicleId=${v.id}`)}
                      >
                        <FilePlus2 size={14} /> Create Quote
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

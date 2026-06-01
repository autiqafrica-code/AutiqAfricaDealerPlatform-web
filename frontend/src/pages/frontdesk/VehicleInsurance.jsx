import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Shield, Plus, CheckCircle2 } from 'lucide-react'
import { apiFetch } from '../../utils/api'

const STATUSES = ['Active', 'Expired', 'ClaimInProgress', 'Approved', 'Rejected']
const STATUS_COLOR = { Active: 'green', Expired: 'soft', ClaimInProgress: 'amber', Approved: 'green', Rejected: 'red' }

export default function VehicleInsurance() {
  const [params] = useSearchParams()
  const vehicleId = params.get('vehicleId')
  const jobId     = params.get('jobId')

  const [records, setRecords] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [editId, setEditId] = useState(null)

  const emptyForm = {
    providerName: '', policyNumber: '', claimNumber: '', jobCardId: jobId || '',
    insuranceContactName: '', insuranceContactPhone: '', insuranceContactEmail: '',
    coverageType: '', coverageLimit: '', deductibleAmount: '', currency: 'ZAR',
    expiryDate: '', status: 'Active', notes: '',
  }
  const [form, setForm] = useState(emptyForm)
  const [formErr, setFormErr] = useState({})

  async function load() {
    if (!vehicleId) return
    setLoading(true)
    try {
      const res  = await apiFetch(`/front-desk/vehicles/${vehicleId}/insurance`)
      const data = await res.json()
      if (data.success) setRecords(data.data?.records || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [vehicleId])

  function validate() {
    const e = {}
    if (!form.providerName.trim()) e.providerName = 'Provider name required'
    if (!form.policyNumber.trim()) e.policyNumber = 'Policy number required'
    setFormErr(e)
    return Object.keys(e).length === 0
  }

  async function handleSave() {
    if (!validate()) return
    setSaving(true); setErr(''); setMsg('')
    try {
      const path = editId
        ? `/front-desk/vehicles/${vehicleId}/insurance/${editId}`
        : `/front-desk/vehicles/${vehicleId}/insurance`
      const method = editId ? 'PUT' : 'POST'
      const payload = { ...form, jobCardId: jobId || form.jobCardId || undefined }
      const res  = await apiFetch(path, { method, body: JSON.stringify(payload) })
      const data = await res.json()
      if (data.success) {
        setMsg(editId ? 'Insurance updated.' : 'Insurance details saved.')
        setShowForm(false); setEditId(null); setForm(emptyForm)
        load()
      } else {
        setErr(data.message || 'Failed to save.')
      }
    } catch { setErr('Network error.') }
    finally { setSaving(false) }
  }

  function startEdit(r) {
    setForm({
      providerName: r.providerName, policyNumber: r.policyNumber, claimNumber: r.claimNumber || '',
      insuranceContactName: r.insuranceContactName || '', insuranceContactPhone: r.insuranceContactPhone || '',
      insuranceContactEmail: r.insuranceContactEmail || '', coverageType: r.coverageType || '',
      coverageLimit: r.coverageLimit ? String(r.coverageLimit) : '', deductibleAmount: r.deductibleAmount ? String(r.deductibleAmount) : '',
      currency: r.currency || 'ZAR', expiryDate: r.expiryDate ? r.expiryDate.split('T')[0] : '',
      status: r.status, notes: r.notes || '', jobCardId: r.jobCardId || '',
    })
    setEditId(r.id); setShowForm(true)
  }

  if (!vehicleId) return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Front Desk / Insurance</p>
        <h2>Vehicle Insurance</h2>
        <p>No vehicle selected. Open from the vehicle management screen.</p>
      </section>
    </div>
  )

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Front Desk / Insurance</p>
        <h2>Vehicle Insurance Details</h2>
        <p>Record insurance details for this vehicle. Accounts will see these details when processing payments.</p>
      </section>

      {(msg || err) && (
        <div style={{ background: err ? '#fff8f7' : '#f0fdf4', border: `1px solid ${err ? '#fda29b' : '#abefc6'}`, borderRadius: 12, padding: '10px 16px', color: err ? '#b91c1c' : '#027a48', fontWeight: 700, fontSize: 13 }}>
          {err || msg}
        </div>
      )}

      <div className="rowActions">
        <button className="primaryBtn" onClick={() => { setShowForm(s => !s); setEditId(null); setForm(emptyForm); setFormErr({}) }}>
          <Plus size={16} /> {showForm && !editId ? 'Cancel' : 'Add Insurance'}
        </button>
      </div>

      {showForm && (
        <section className="panel">
          <h3 style={{ margin: '0 0 16px' }}>{editId ? 'Edit Insurance' : 'New Insurance Record'}</h3>
          <div className="formGrid adminForm">
            <label>
              Insurance Provider *
              <input value={form.providerName} onChange={e => setForm(p => ({ ...p, providerName: e.target.value }))} placeholder="e.g. OUTsurance, Discovery" style={formErr.providerName ? { borderColor: '#d92d20' } : undefined} />
              {formErr.providerName && <span style={{ color: '#d92d20', fontSize: 12 }}>{formErr.providerName}</span>}
            </label>
            <label>
              Policy Number *
              <input value={form.policyNumber} onChange={e => setForm(p => ({ ...p, policyNumber: e.target.value }))} placeholder="POL-12345" style={formErr.policyNumber ? { borderColor: '#d92d20' } : undefined} />
              {formErr.policyNumber && <span style={{ color: '#d92d20', fontSize: 12 }}>{formErr.policyNumber}</span>}
            </label>
            <label>
              Claim Number
              <input value={form.claimNumber} onChange={e => setForm(p => ({ ...p, claimNumber: e.target.value }))} placeholder="CLM-9876" />
            </label>
            <label>
              Status
              <select value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label>
              Contact Name
              <input value={form.insuranceContactName} onChange={e => setForm(p => ({ ...p, insuranceContactName: e.target.value }))} />
            </label>
            <label>
              Contact Phone
              <input value={form.insuranceContactPhone} onChange={e => setForm(p => ({ ...p, insuranceContactPhone: e.target.value }))} />
            </label>
            <label>
              Contact Email
              <input type="email" value={form.insuranceContactEmail} onChange={e => setForm(p => ({ ...p, insuranceContactEmail: e.target.value }))} />
            </label>
            <label>
              Coverage Type
              <input value={form.coverageType} onChange={e => setForm(p => ({ ...p, coverageType: e.target.value }))} placeholder="e.g. Comprehensive, Third Party" />
            </label>
            <label>
              Coverage Limit
              <input type="number" value={form.coverageLimit} onChange={e => setForm(p => ({ ...p, coverageLimit: e.target.value }))} placeholder="0.00" />
            </label>
            <label>
              Deductible Amount
              <input type="number" value={form.deductibleAmount} onChange={e => setForm(p => ({ ...p, deductibleAmount: e.target.value }))} placeholder="0.00" />
            </label>
            <label>
              Currency
              <input value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))} />
            </label>
            <label>
              Expiry Date
              <input type="date" value={form.expiryDate} onChange={e => setForm(p => ({ ...p, expiryDate: e.target.value }))} />
            </label>
            <label className="wide">
              Notes
              <textarea value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} rows={2} />
            </label>
          </div>
          <div className="rowActions" style={{ marginTop: 12 }}>
            <button className="primaryBtn" onClick={handleSave} disabled={saving}>{saving ? 'Saving…' : 'Save Insurance'}</button>
            <button className="softBtn" onClick={() => { setShowForm(false); setEditId(null) }}>Cancel</button>
          </div>
        </section>
      )}

      {loading ? (
        <section className="panel"><p style={{ color: 'var(--muted)' }}>Loading insurance records…</p></section>
      ) : records.length === 0 ? (
        <section className="panel">
          <div className="portalEmptyState">
            <Shield size={40} />
            <p>No insurance records for this vehicle. Add one above if applicable.</p>
          </div>
        </section>
      ) : (
        <section className="panel" style={{ padding: 0 }}>
          {records.map((r, i) => (
            <div key={r.id} style={{ padding: '16px 20px', borderBottom: i < records.length - 1 ? '1px solid #f2f4f7' : 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{r.providerName}</div>
                  <div style={{ color: 'var(--muted)', fontSize: 13 }}>Policy: {r.policyNumber}{r.claimNumber ? ` · Claim: ${r.claimNumber}` : ''}</div>
                  {r.insuranceContactName && <div style={{ color: 'var(--muted)', fontSize: 12 }}>{r.insuranceContactName} {r.insuranceContactPhone ? `· ${r.insuranceContactPhone}` : ''}</div>}
                  {r.coverageLimit && <div style={{ fontSize: 12, marginTop: 4 }}>Coverage: {r.currency} {Number(r.coverageLimit).toLocaleString()}{r.deductibleAmount ? ` · Deductible: ${r.currency} ${Number(r.deductibleAmount).toLocaleString()}` : ''}</div>}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span className={`pill ${STATUS_COLOR[r.status] || 'soft'}`} style={{ fontSize: 11 }}>{r.status}</span>
                  <button className="softBtn" style={{ fontSize: 12 }} onClick={() => startEdit(r)}>Edit</button>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}
    </div>
  )
}

import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Mail, MessageCircle, Save } from 'lucide-react'
import { apiFetch } from '../../utils/api'
import PhoneInput from '../../components/PhoneInput.jsx'
import { fetchCountries } from '../../utils/countriesCache.js'

export default function AddCustomer() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    name: '', phone: '', email: '', whatsapp: '',
    communicationPreference: 'WhatsApp', licenseNumber: '', address: '',
  })
  const [countries,           setCountries]           = useState([])
  const [errors,              setErrors]              = useState({})
  const [saving,              setSaving]              = useState(false)
  const [apiError,            setApiError]            = useState('')
  const [savedCustomer,       setSavedCustomer]       = useState(null)
  const [verifyEmailStatus,   setVerifyEmailStatus]   = useState(null)
  const [verifyWhatsAppStatus,setVerifyWhatsAppStatus] = useState(null)
  const [verifying,           setVerifying]           = useState({ email: false, whatsapp: false })

  useEffect(() => { fetchCountries().then(setCountries) }, [])

  function updateField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n })
  }

  function validate() {
    const e = {}
    if (!form.name.trim())  e.name  = 'Customer name is required'
    if (!form.phone.trim()) e.phone = 'Phone number is required'
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      e.email = 'Enter a valid email address'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function ensureSaved() {
    if (savedCustomer) return savedCustomer
    if (!validate()) return null
    setSaving(true)
    setApiError('')
    try {
      const res  = await apiFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
          name:                    form.name.trim(),
          phone:                   form.phone.trim(),
          email:                   form.email.trim() || undefined,
          whatsapp:                form.whatsapp.trim() || undefined,
          communicationPreference: form.communicationPreference,
          licenseNumber:           form.licenseNumber.trim() || undefined,
          address:                 form.address.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setApiError(data.message || 'Failed to create customer'); return null }
      setSavedCustomer(data.data.customer)
      return data.data.customer
    } catch {
      setApiError('Network error — could not reach server')
      return null
    } finally {
      setSaving(false)
    }
  }

  async function saveCustomer() {
    const customer = await ensureSaved()
    if (!customer) return
    navigate('/front-desk', { state: { customerCreated: true, customer } })
  }

  async function handleVerifyEmail() {
    if (!form.email.trim()) {
      setVerifyEmailStatus({ ok: false, msg: 'Add an email address before verifying' })
      return
    }
    const customer = await ensureSaved()
    if (!customer) return
    setVerifying(v => ({ ...v, email: true }))
    setVerifyEmailStatus(null)
    try {
      const res  = await apiFetch(`/customers/${customer.id}/verify-email`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setVerifyEmailStatus({
          ok:     true,
          msg:    data.message || `Verification sent to ${customer.email}`,
          devOtp: data.data?._devOtp || null,
        })
      } else {
        setVerifyEmailStatus({ ok: false, msg: data.message || 'Verification failed' })
      }
    } catch {
      setVerifyEmailStatus({ ok: false, msg: 'Network error — could not reach server' })
    } finally {
      setVerifying(v => ({ ...v, email: false }))
    }
  }

  async function handleVerifyWhatsApp() {
    if (!form.whatsapp.trim()) {
      setVerifyWhatsAppStatus({ ok: false, msg: 'Add a WhatsApp number before verifying' })
      return
    }
    const customer = await ensureSaved()
    if (!customer) return
    setVerifying(v => ({ ...v, whatsapp: true }))
    setVerifyWhatsAppStatus(null)
    try {
      const res  = await apiFetch(`/customers/${customer.id}/verify-whatsapp`, { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        setVerifyWhatsAppStatus({
          ok:     true,
          msg:    data.message || `WhatsApp verification sent to ${customer.whatsapp}`,
          devOtp: data.data?._devOtp || null,
        })
      } else {
        setVerifyWhatsAppStatus({ ok: false, msg: data.message || 'Verification failed' })
      }
    } catch {
      setVerifyWhatsAppStatus({ ok: false, msg: 'Network error — could not reach server' })
    } finally {
      setVerifying(v => ({ ...v, whatsapp: false }))
    }
  }

  const errStyle  = { borderColor: '#d92d20', background: '#fff8f8' }
  const errMsg    = { color: '#d92d20', fontSize: 12, marginTop: 4, display: 'block' }
  const statusMsg = (ok) => ({
    display: 'block', fontSize: 12, marginTop: 6, fontWeight: 500,
    color: ok ? '#027a48' : '#d92d20',
  })

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Front Desk / Service Consultant</p>
        <h2>Add New Customer</h2>
        <p>
          Capture the customer profile first. Vehicle details are managed on the separate customer
          vehicle screen because one customer can have multiple vehicles.
        </p>
      </section>

      <section className="panel formPanel">
        <div className="sectionHeader">
          <div>
            <h3>Customer Information</h3>
            <p>Used for job intake, quote approval, payment reminders and delivery updates.</p>
          </div>
        </div>

        {apiError && (
          <div style={{ background: '#fff8f7', border: '1px solid #fda29b', borderRadius: 12,
            padding: '10px 14px', color: '#b91c1c', fontWeight: 700, fontSize: 13, marginBottom: 16 }}>
            ⚠ {apiError}
          </div>
        )}

        <div className="formGrid adminForm">
          <label>
            Customer Name *
            <input
              placeholder="Amina Okafor"
              value={form.name}
              onChange={e => updateField('name', e.target.value)}
              style={errors.name ? errStyle : undefined}
            />
            {errors.name && <span style={errMsg}>{errors.name}</span>}
          </label>

          <label>
            Phone Number *
            <PhoneInput
              value={form.phone}
              onChange={v => updateField('phone', v)}
              countries={countries}
              placeholder="Phone number"
              style={errors.phone ? { border: '1px solid #d92d20', borderRadius: 14 } : undefined}
            />
            {errors.phone && <span style={errMsg}>{errors.phone}</span>}
          </label>

          <label>
            Email
            <input
              placeholder="customer@example.com"
              value={form.email}
              onChange={e => updateField('email', e.target.value)}
              style={errors.email ? errStyle : undefined}
            />
            {errors.email && <span style={errMsg}>{errors.email}</span>}
          </label>

          <label>
            WhatsApp Number
            <PhoneInput
              value={form.whatsapp}
              onChange={v => updateField('whatsapp', v)}
              countries={countries}
              placeholder="WhatsApp number"
            />
          </label>

          <label>
            Communication Preference
            <select value={form.communicationPreference} onChange={e => updateField('communicationPreference', e.target.value)}>
              <option value="WhatsApp">WhatsApp</option>
              <option value="Email">Email</option>
              <option value="PhoneCall">Phone Call</option>
            </select>
          </label>

          <label>
            License Number
            <input
              placeholder="DL-DEMO-LAGOS-000001"
              value={form.licenseNumber}
              onChange={e => updateField('licenseNumber', e.target.value)}
            />
          </label>

          <label className="wide">
            Address
            <textarea
              placeholder="24 Demo Crescent, Ikeja GRA, Lagos, Nigeria"
              value={form.address}
              onChange={e => updateField('address', e.target.value)}
            />
          </label>
        </div>

        <div className="quickActionGrid">
          <div>
            <button className="softBtn" type="button" onClick={handleVerifyWhatsApp}
              disabled={verifying.whatsapp || saving} style={{ width: '100%' }}>
              <MessageCircle size={16} /> {verifying.whatsapp ? 'Sending…' : 'Verify WhatsApp'}
            </button>
            {verifyWhatsAppStatus && (
              <>
                <span style={statusMsg(verifyWhatsAppStatus.ok)}>{verifyWhatsAppStatus.msg}</span>
                {verifyWhatsAppStatus.devOtp && (
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, letterSpacing: 8, padding: '10px 12px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, textAlign: 'center', color: '#92400e', marginTop: 8 }}>
                    {verifyWhatsAppStatus.devOtp}
                  </div>
                )}
              </>
            )}
          </div>

          <div>
            <button className="softBtn" type="button" onClick={handleVerifyEmail}
              disabled={verifying.email || saving} style={{ width: '100%' }}>
              <Mail size={16} /> {verifying.email ? 'Sending…' : 'Verify Email'}
            </button>
            {verifyEmailStatus && (
              <>
                <span style={statusMsg(verifyEmailStatus.ok)}>{verifyEmailStatus.msg}</span>
                {verifyEmailStatus.devOtp && (
                  <div style={{ fontFamily: 'monospace', fontSize: 22, fontWeight: 900, letterSpacing: 8, padding: '10px 12px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 10, textAlign: 'center', color: '#92400e', marginTop: 8 }}>
                    {verifyEmailStatus.devOtp}
                  </div>
                )}
              </>
            )}
          </div>

          <button className="primaryBtn" type="button" onClick={saveCustomer} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save Customer'}
          </button>
        </div>
      </section>
    </div>
  )
}

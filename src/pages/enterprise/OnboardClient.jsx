import { useMemo, useState } from 'react'
import { Building2, CheckCircle2, Plus, Trash2, UsersRound } from 'lucide-react'

const currencies = ['ZAR', 'NGN', 'BWP', 'NAD', 'USD', 'KES', 'GHS', 'MZN', 'ZMW', 'AUD']

const userTypes = [
  'Technician',
  'Workshop Controller',
  'Accounts',
  'Front Desk / Service Consultant',
  'Manager',
  'Parts Interpreter',
]

const API_BASE = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api`
  : 'http://localhost:8007/api'

const WORKSHOP_TYPE_MAP = {
  Service:         'Service',
  'Paint & Panel': 'PaintAndPanel',
  'Fleet Service': 'FleetService',
  'Body Shop':     'BodyShop',
}

const defaultCounts = {
  Technician:                       8,
  'Workshop Controller':             2,
  Accounts:                          2,
  'Front Desk / Service Consultant': 4,
  Manager:                           2,
  'Parts Interpreter':               2,
}

const starterWorkshops = [
  {
    id: 1,
    name: 'Ikeja Service Workshop',
    type: 'Service',
    address: '12 Marina Road, Ikeja, Lagos 100271',
    phone: '+234 801 555 0101',
    whatsapp: '+234 801 555 0101',
    email: 'ikeja.workshop@lagospremium.com',
    website: 'https://ikeja.lagospremium.com',
    openingTime: '10:00',
    closingTime: '20:00',
    ceoName: 'Ada Okeke',
    ceoEmail: 'ada.okeke@lagospremium.com',
    ceoPhone: '+234 801 555 0144',
    counts: { ...defaultCounts },
  },
  {
    id: 2,
    name: 'Lekki Paint & Panel',
    type: 'Paint & Panel',
    address: '8 Admiralty Way, Lekki Phase 1, Lagos 105102',
    phone: '+234 802 555 0175',
    whatsapp: '+234 802 555 0175',
    email: 'lekki.panel@lagospremium.com',
    website: 'https://lekki.lagospremium.com',
    openingTime: '10:00',
    closingTime: '20:00',
    ceoName: 'Ada Okeke',
    ceoEmail: 'ada.okeke@lagospremium.com',
    ceoPhone: '+234 801 555 0144',
    counts: { Technician: 4, 'Workshop Controller': 1, Accounts: 1, 'Front Desk / Service Consultant': 2, Manager: 1, 'Parts Interpreter': 1 },
  },
]

const blankWorkshop = (id) => ({
  id,
  name: `Workshop ${id}`,
  type: 'Service',
  address: '', phone: '', whatsapp: '', email: '', website: '',
  openingTime: '10:00', closingTime: '20:00',
  ceoName: '', ceoEmail: '', ceoPhone: '',
  counts: { ...defaultCounts },
})

const URL_RE   = /^https?:\/\/.+/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const errStyle = { borderColor: '#d92d20', background: '#fff8f8' }
const errMsg   = { color: '#d92d20', fontSize: 12, marginTop: 2, display: 'block' }

export default function OnboardClient() {
  const [workshops, setWorkshops] = useState(starterWorkshops)
  const [selectedId, setSelectedId] = useState(starterWorkshops[0].id)

  const [clientForm, setClientForm] = useState({
    name: 'Lagos Premium Motors',
    country: 'Nigeria',
    abn: '',
    dealerLicenceNumber: '',
    website: 'https://www.lagospremium.com',
    defaultCurrency: 'NGN',
  })

  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [createdClient, setCreatedClient] = useState(null)
  const [clientErrors, setClientErrors] = useState({})
  const [workshopErrors, setWorkshopErrors] = useState({})

  const selectedWorkshop = workshops.find((w) => w.id === selectedId) || workshops[0]

  const totalUsers = useMemo(() => workshops.reduce((total, w) => (
    total + userTypes.reduce((rt, type) => rt + Number(w.counts[type] || 0), 0)
  ), 0), [workshops])

  const updateClient = (field, value) => {
    setClientForm((prev) => ({ ...prev, [field]: value }))
    if (clientErrors[field]) setClientErrors((prev) => { const n = { ...prev }; delete n[field]; return n })
  }

  const updateWorkshop = (field, value) => {
    setWorkshops((cur) => cur.map((w) => w.id === selectedId ? { ...w, [field]: value } : w))
    if (workshopErrors[selectedId]?.[field]) {
      setWorkshopErrors((prev) => {
        const n = { ...prev }
        if (n[selectedId]) { n[selectedId] = { ...n[selectedId] }; delete n[selectedId][field] }
        return n
      })
    }
  }

  const updateUserCount = (type, value) => {
    setWorkshops((cur) => cur.map((w) => w.id === selectedId
      ? { ...w, counts: { ...w.counts, [type]: Math.max(0, Number(value || 0)) } }
      : w))
  }

  const addWorkshop = () => {
    const nextId = Math.max(...workshops.map((w) => w.id), 0) + 1
    setWorkshops((cur) => [...cur, blankWorkshop(nextId)])
    setSelectedId(nextId)
  }

  const removeWorkshop = (id) => {
    if (workshops.length === 1) return
    const remaining = workshops.filter((w) => w.id !== id)
    setWorkshops(remaining)
    if (selectedId === id) setSelectedId(remaining[0].id)
    setWorkshopErrors((prev) => { const n = { ...prev }; delete n[id]; return n })
  }

  function validateForm() {
    const cErrs = {}
    if (!clientForm.name.trim()) cErrs.name = 'Dealer name is required'
    if (!clientForm.country.trim()) cErrs.country = 'Country is required'
    if (!clientForm.defaultCurrency) cErrs.defaultCurrency = 'Currency is required'
    if (clientForm.website && !URL_RE.test(clientForm.website.trim())) {
      cErrs.website = 'Must be a valid URL (include https://)'
    }

    const wErrs = {}
    for (const w of workshops) {
      const e = {}
      if (!w.name.trim()) e.name = 'Workshop name is required'
      if (!w.openingTime) e.openingTime = 'Opening time is required'
      if (!w.closingTime) e.closingTime = 'Closing time is required'
      else if (w.closingTime <= w.openingTime) e.closingTime = 'Must be after opening time'
      if (w.email && !EMAIL_RE.test(w.email)) e.email = 'Valid email required'
      if (w.ceoEmail && !EMAIL_RE.test(w.ceoEmail)) e.ceoEmail = 'Valid CEO email required'
      if (w.website && !URL_RE.test(w.website.trim())) e.website = 'Must include https://'
      if (Object.keys(e).length) wErrs[w.id] = e
    }

    setClientErrors(cErrs)
    setWorkshopErrors(wErrs)
    const firstErrId = Object.keys(wErrs).map(Number)[0]
    if (firstErrId) setSelectedId(firstErrId)
    return Object.keys(cErrs).length === 0 && Object.keys(wErrs).length === 0
  }

  async function handleCreate() {
    if (!validateForm()) {
      setSubmitError('Please fix the highlighted errors before continuing.')
      return
    }
    setSubmitting(true)
    setSubmitError('')

    try {
      const token = localStorage.getItem('autiq_token')
      if (!token) {
        setSubmitError('Session token missing. Please log out and log back in as Enterprise Admin.')
        return
      }

      const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

      const clientRes = await fetch(`${API_BASE}/clients`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          name:                clientForm.name.trim(),
          country:             clientForm.country.trim(),
          defaultCurrency:     clientForm.defaultCurrency,
          abn:                 clientForm.abn.trim() || undefined,
          dealerLicenceNumber: clientForm.dealerLicenceNumber.trim() || undefined,
          website:             clientForm.website.trim() || undefined,
        }),
      })
      const clientData = await clientRes.json()
      if (!clientRes.ok || !clientData.success) {
        setSubmitError(clientData.message || 'Failed to create client. Check the details and try again.')
        return
      }

      const clientId = clientData.data?.client?.id || clientData.data?.id
      if (!clientId) {
        setSubmitError('Client was created, but backend did not return client id.')
        return
      }

      for (const w of workshops) {
        const workshopRes = await fetch(`${API_BASE}/workshops`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            clientId,
            name:        w.name.trim(),
            type:        WORKSHOP_TYPE_MAP[w.type] || 'Service',
            address:     w.address.trim()   || undefined,
            phone:       w.phone.trim()     || undefined,
            whatsapp:    w.whatsapp.trim()  || undefined,
            email:       w.email.trim()     || undefined,
            website:     w.website.trim()   || undefined,
            openingTime: w.openingTime,
            closingTime: w.closingTime,
            ceoName:     w.ceoName.trim()   || undefined,
            ceoEmail:    w.ceoEmail.trim()  || undefined,
            ceoPhone:    w.ceoPhone.trim()  || undefined,
          }),
        })
        const workshopData = await workshopRes.json()
        if (!workshopRes.ok || !workshopData.success) {
          setSubmitError(`Workshop "${w.name}": ${workshopData.message || 'Failed to save. Please try again.'}`)
          return
        }
      }

      setCreatedClient({ id: clientId, name: clientForm.name, workshopCount: workshops.length })
    } catch {
      setSubmitError('Network error. Make sure the backend is running and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (createdClient) {
    return (
      <section className="pageStack onboardingFlow">
        <div className="panel heroPanel onboardingHero" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <CheckCircle2 size={52} style={{ color: '#00a389', marginBottom: 16 }} />
          <h2 style={{ marginBottom: 8 }}>Client onboarded successfully</h2>
          <p style={{ color: '#667085', maxWidth: 460, margin: '0 auto 24px' }}>
            <strong>{createdClient.name}</strong> and {createdClient.workshopCount} workshop{createdClient.workshopCount !== 1 ? 's' : ''} have been created in the database.
            Go to <strong>User Credentials</strong> to create staff logins.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <a href="/enterprise/user-credentials" className="primaryBtn" style={{ textDecoration: 'none' }}>
              Go to User Credentials
            </a>
            <button className="secondaryBtn" onClick={() => {
              setCreatedClient(null)
              setClientForm({ name: '', country: '', abn: '', dealerLicenceNumber: '', website: '', defaultCurrency: 'NGN' })
              setWorkshops([blankWorkshop(1)])
              setSelectedId(1)
              setClientErrors({})
              setWorkshopErrors({})
              setSubmitError('')
            }}>
              Onboard another client
            </button>
          </div>
        </div>
      </section>
    )
  }

  const wErr = workshopErrors[selectedId] || {}

  return (
    <section className="pageStack onboardingFlow">
      <div className="panel heroPanel onboardingHero">
        <div>
          <p className="eyebrow">Enterprise Admin</p>
          <h2>Create & onboard new client dealer</h2>
          <p>Complete the client setup in one flow. Add one client, attach multiple workshops, configure workshop operating details, then set user counts per workshop before creating credentials.</p>
        </div>
        <div className="onboardingSummaryCards">
          <span><Building2 size={18} /> {workshops.length} workshops</span>
          <span><UsersRound size={18} /> {totalUsers} users planned</span>
        </div>
      </div>

      <div className="onboardingStepper panel">
        <span className="active"><CheckCircle2 size={17} /> 1. Client details</span>
        <span className="active"><CheckCircle2 size={17} /> 2. Workshops</span>
        <span className="active"><CheckCircle2 size={17} /> 3. User counts</span>
        <span>4. Save &amp; continue to credentials</span>
      </div>

      <div className="panel formPanel">
        <div className="sectionHeader compact">
          <div>
            <h3>Client details</h3>
            <p>These details apply to the dealer group. Each workshop is configured below.</p>
          </div>
        </div>
        <div className="formGrid adminForm">
          <label>
            Dealer / Client name <span style={{ color: '#d92d20' }}>*</span>
            <input value={clientForm.name} onChange={(e) => updateClient('name', e.target.value)} placeholder="Dealer group name" style={clientErrors.name ? errStyle : undefined} />
            {clientErrors.name && <span style={errMsg}>{clientErrors.name}</span>}
          </label>
          <label>
            Primary country <span style={{ color: '#d92d20' }}>*</span>
            <input value={clientForm.country} onChange={(e) => updateClient('country', e.target.value)} placeholder="e.g. Nigeria" style={clientErrors.country ? errStyle : undefined} />
            {clientErrors.country && <span style={errMsg}>{clientErrors.country}</span>}
          </label>
          <label>
            ABN / business tax number
            <input value={clientForm.abn} onChange={(e) => updateClient('abn', e.target.value)} placeholder="TIN / tax number" />
          </label>
          <label>
            LMCT / dealer licence number
            <input value={clientForm.dealerLicenceNumber} onChange={(e) => updateClient('dealerLicenceNumber', e.target.value)} placeholder="Dealer licence number" />
          </label>
          <label>
            Website address
            <input value={clientForm.website} onChange={(e) => updateClient('website', e.target.value)} placeholder="https://www.dealer.com" style={clientErrors.website ? errStyle : undefined} />
            {clientErrors.website && <span style={errMsg}>{clientErrors.website}</span>}
          </label>
          <label>
            Currency used <span style={{ color: '#d92d20' }}>*</span>
            <select value={clientForm.defaultCurrency} onChange={(e) => updateClient('defaultCurrency', e.target.value)} style={clientErrors.defaultCurrency ? errStyle : undefined}>
              {currencies.map((c) => <option key={c}>{c}</option>)}
            </select>
            {clientErrors.defaultCurrency && <span style={errMsg}>{clientErrors.defaultCurrency}</span>}
          </label>
          <label>Upload client logo<input type="file" accept="image/*" /></label>
          <label>Upload invoice format<input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg" /></label>
        </div>
      </div>

      <div className="panel formPanel">
        <div className="sectionHeader compact">
          <div>
            <h3>Workshops under this client</h3>
            <p>Add multiple workshops for the same client. Select a workshop card to edit its details and user counts.</p>
          </div>
          <button className="primaryBtn" type="button" onClick={addWorkshop}><Plus size={17} /> Add workshop</button>
        </div>

        <div className="workshopTabs">
          {workshops.map((w) => {
            const count = userTypes.reduce((total, type) => total + Number(w.counts[type] || 0), 0)
            const hasErr = !!workshopErrors[w.id] && Object.keys(workshopErrors[w.id]).length > 0
            return (
              <button
                className={w.id === selectedId ? 'workshopTab active' : 'workshopTab'}
                key={w.id}
                type="button"
                onClick={() => setSelectedId(w.id)}
                style={hasErr ? { borderColor: '#d92d20' } : undefined}
              >
                <strong style={hasErr ? { color: '#d92d20' } : undefined}>{w.name || `Workshop ${w.id}`}</strong>
                <span>{w.type} • {count} users • {w.openingTime} - {w.closingTime}</span>
              </button>
            )
          })}
        </div>

        {selectedWorkshop && (
          <div className="workshopEditor">
            <div className="sectionHeader compact">
              <div>
                <h3>{selectedWorkshop.name || `Workshop ${selectedWorkshop.id}`} setup</h3>
                <p>Keep all workshop fields, contacts, hours and role counts in one consistent screen.</p>
              </div>
              <button className="secondaryBtn dangerInline" type="button" onClick={() => removeWorkshop(selectedWorkshop.id)} disabled={workshops.length === 1}>
                <Trash2 size={16} /> Remove workshop
              </button>
            </div>

            <div className="formGrid adminForm">
              <label>
                Workshop name <span style={{ color: '#d92d20' }}>*</span>
                <input value={selectedWorkshop.name} onChange={(e) => updateWorkshop('name', e.target.value)} style={wErr.name ? errStyle : undefined} />
                {wErr.name && <span style={errMsg}>{wErr.name}</span>}
              </label>
              <label>
                Workshop type
                <select value={selectedWorkshop.type} onChange={(e) => updateWorkshop('type', e.target.value)}>
                  <option>Service</option><option>Paint &amp; Panel</option><option>Fleet Service</option><option>Body Shop</option>
                </select>
              </label>
              <label>
                Workshop email id
                <input value={selectedWorkshop.email} onChange={(e) => updateWorkshop('email', e.target.value)} placeholder="workshop@dealer.com" style={wErr.email ? errStyle : undefined} />
                {wErr.email && <span style={errMsg}>{wErr.email}</span>}
              </label>
              <label>
                Workshop website
                <input value={selectedWorkshop.website} onChange={(e) => updateWorkshop('website', e.target.value)} placeholder="https://workshop.dealer.com" style={wErr.website ? errStyle : undefined} />
                {wErr.website && <span style={errMsg}>{wErr.website}</span>}
              </label>
              <label className="wide">
                Workshop address with zip code
                <input value={selectedWorkshop.address} onChange={(e) => updateWorkshop('address', e.target.value)} placeholder="Street, suburb, city, zip code" />
              </label>
              <label>
                Workshop phone number
                <input value={selectedWorkshop.phone} onChange={(e) => updateWorkshop('phone', e.target.value)} placeholder="+234 ..." />
              </label>
              <label>
                Workshop WhatsApp number
                <input value={selectedWorkshop.whatsapp} onChange={(e) => updateWorkshop('whatsapp', e.target.value)} placeholder="+234 ..." />
              </label>
              <label>
                Workshop opening time <span style={{ color: '#d92d20' }}>*</span>
                <input type="time" value={selectedWorkshop.openingTime} onChange={(e) => updateWorkshop('openingTime', e.target.value)} style={wErr.openingTime ? errStyle : undefined} />
                {wErr.openingTime && <span style={errMsg}>{wErr.openingTime}</span>}
              </label>
              <label>
                Workshop closing time <span style={{ color: '#d92d20' }}>*</span>
                <input type="time" value={selectedWorkshop.closingTime} onChange={(e) => updateWorkshop('closingTime', e.target.value)} style={wErr.closingTime ? errStyle : undefined} />
                {wErr.closingTime && <span style={errMsg}>{wErr.closingTime}</span>}
              </label>
              <label>
                Name of CEO
                <input value={selectedWorkshop.ceoName} onChange={(e) => updateWorkshop('ceoName', e.target.value)} placeholder="CEO name" />
              </label>
              <label>
                CEO email id
                <input value={selectedWorkshop.ceoEmail} onChange={(e) => updateWorkshop('ceoEmail', e.target.value)} placeholder="ceo@dealer.com" style={wErr.ceoEmail ? errStyle : undefined} />
                {wErr.ceoEmail && <span style={errMsg}>{wErr.ceoEmail}</span>}
              </label>
              <label>
                CEO phone number
                <input value={selectedWorkshop.ceoPhone} onChange={(e) => updateWorkshop('ceoPhone', e.target.value)} placeholder="+234 ..." />
              </label>
              <label>Upload workshop logo<input type="file" accept="image/*" /></label>
            </div>

            <div className="userCountPanel">
              <div className="sectionHeader compact">
                <div>
                  <h3>User count for selected workshop</h3>
                  <p>Enter only the number of users needed per role. Names, login emails and passwords are created later in User Credentials.</p>
                </div>
              </div>
              <div className="roleCountGrid">
                {userTypes.map((type) => (
                  <label key={type}>
                    <span>{type}</span>
                    <input type="number" min="0" value={selectedWorkshop.counts[type] || 0} onChange={(e) => updateUserCount(type, e.target.value)} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="panel">
        <div className="sectionHeader compact">
          <div>
            <h3>Onboarding summary</h3>
            <p>Review all workshops before creating the client and moving to user credentials.</p>
          </div>
        </div>
        <div className="tableWrap compactTable">
          <table>
            <thead>
              <tr>
                <th>Workshop</th><th>Type</th><th>Contact</th><th>Opening hours</th><th>Total users</th>
              </tr>
            </thead>
            <tbody>
              {workshops.map((w) => {
                const count = userTypes.reduce((total, type) => total + Number(w.counts[type] || 0), 0)
                return (
                  <tr key={w.id}>
                    <td><strong>{w.name}</strong><br /><small>{w.address || 'Address pending'}</small></td>
                    <td>{w.type}</td>
                    <td><strong>{w.phone || 'Phone pending'}</strong><br /><small>{w.email || 'Email pending'}</small></td>
                    <td><strong>{w.openingTime} - {w.closingTime}</strong></td>
                    <td><strong>{count}</strong></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <div className="infoStrip">
          <strong>Next step:</strong> After saving onboarding, open Enterprise Admin → User Credentials to create each user name, login email, password, reset password and send credentials by WhatsApp or email.
        </div>
      </div>

      {submitError && (
        <div style={{ background: '#fee4e2', color: '#d92d20', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
          {submitError}
        </div>
      )}

      <div className="stickyActions">
        <button className="secondaryBtn" type="button" disabled={submitting}>Save Draft</button>
        <button className="primaryBtn" type="button" disabled={submitting} onClick={handleCreate}>
          {submitting ? 'Creating…' : 'Create Client & Continue'}
        </button>
      </div>
    </section>
  )
}

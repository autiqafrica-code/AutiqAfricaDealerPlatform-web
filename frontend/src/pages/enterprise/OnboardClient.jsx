import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Plus,
  Save,
  Trash2,
  UsersRound,
} from 'lucide-react'
import PhoneInput from '../../components/PhoneInput.jsx'
import { fetchCountries } from '../../utils/countriesCache.js'

const userTypes = [
  'Technician',
  'Workshop Controller',
  'Accounts',
  'Front Desk / Service Consultant',
  'Manager',
  'Parts Interpreter',
]

const defaultCounts = {
  Technician: 8,
  'Workshop Controller': 2,
  Accounts: 2,
  'Front Desk / Service Consultant': 4,
  Manager: 2,
  'Parts Interpreter': 2,
}

const blankWorkshop = (id) => ({
  id,
  name: `Workshop ${id}`,
  type: 'Service',
  address: '',
  phone: '',
  whatsapp: '',
  email: '',
  website: '',
  openingTime: '10:00',
  closingTime: '20:00',
  ceoName: '',
  ceoEmail: '',
  ceoPhone: '',
  counts: { ...defaultCounts },
})

const WORKSHOP_TYPE_MAP = {
  Service:         'Service',
  'Paint & Panel': 'PaintAndPanel',
  'Fleet Service': 'FleetService',
  'Body Shop':     'BodyShop',
}

const TABS = [
  { id: 'client',     label: '1. Client details',  short: 'Client'    },
  { id: 'workshops',  label: '2. Workshops',        short: 'Workshops' },
  { id: 'usercounts', label: '3. User counts',      short: 'Users'     },
  { id: 'review',     label: '4. Review & create',  short: 'Review'    },
]

const URL_RE   = /^https?:\/\/.+/
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const errStyle = { borderColor: '#d92d20', background: '#fff8f8' }
const errMsg   = { color: '#d92d20', fontSize: 12, marginTop: 2, display: 'block' }

// Label wrapper that keeps asterisk inline on the same row as the label text
function FL({ children, req }) {
  return (
    <span style={{ display: 'block', marginBottom: 2 }}>
      {children}{req && <span style={{ color: '#d92d20', marginLeft: 3 }}>*</span>}
    </span>
  )
}

function getApiBase() {
  const raw = import.meta.env.VITE_API_URL || 'http://localhost:8007'
  return raw.endsWith('/api') ? raw : `${raw}/api`
}

const API_BASE = getApiBase()

function getToken() {
  return (
    localStorage.getItem('autiq_token') ||
    localStorage.getItem('autiqToken')  ||
    localStorage.getItem('token')        ||
    ''
  )
}

function authHeaders() {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` }
}

export default function OnboardClient() {
  const navigate       = useNavigate()
  const [searchParams] = useSearchParams()

  const [activeTab,  setActiveTab]  = useState('client')
  const [draftId,    setDraftId]    = useState(searchParams.get('draftId') || null)
  const [draftMsg,   setDraftMsg]   = useState('')   // 'saving' | 'saved' | 'loaded' | 'error'
  const [draftSaving, setDraftSaving] = useState(false)
  const draftTimerRef = useRef(null)

  const [workshops,  setWorkshops]  = useState([blankWorkshop(1)])
  const [selectedId, setSelectedId] = useState(1)
  const [clientForm, setClientForm] = useState({
    name: '', country: '', dealerLicenceNumber: '', website: '', defaultCurrency: '',
  })

  const [countries,      setCountries]      = useState([])
  const [submitting,     setSubmitting]     = useState(false)
  const [submitError,    setSubmitError]    = useState('')
  const [createdClient,  setCreatedClient]  = useState(null)
  const [clientErrors,   setClientErrors]   = useState({})
  const [workshopErrors, setWorkshopErrors] = useState({})

  useEffect(() => { fetchCountries().then(setCountries) }, [])

  // Load draft from API on mount if draftId is in URL
  useEffect(() => {
    const id = searchParams.get('draftId')
    if (!id) return
    const token = getToken()
    if (!token) return
    fetch(`${API_BASE}/client-drafts/${id}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.data?.draft?.data) {
          const d = res.data.draft.data
          if (d.clientForm)  setClientForm(d.clientForm)
          if (d.workshops?.length) {
            setWorkshops(d.workshops)
            setSelectedId(d.selectedId || d.workshops[0]?.id || 1)
          }
          showDraftMsg('loaded')
        }
      })
      .catch(() => { /* silent — don't block page load */ })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const tabIndex         = TABS.findIndex(t => t.id === activeTab)
  const selectedWorkshop = workshops.find(w => w.id === selectedId) || workshops[0]

  const totalUsers = useMemo(
    () => workshops.reduce(
      (total, w) => total + userTypes.reduce((s, t) => s + Number(w.counts[t] || 0), 0),
      0
    ),
    [workshops]
  )

  // ── Draft helpers ──────────────────────────────────────────────────────────

  function showDraftMsg(msg) {
    setDraftMsg(msg)
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(() => setDraftMsg(''), 3000)
  }

  async function saveDraft() {
    if (draftSaving) return
    const token = getToken()
    if (!token) { setSubmitError('Session token missing — please log back in.'); return }

    setDraftSaving(true)
    try {
      const payload = {
        draftName: clientForm.name.trim() || 'Untitled draft',
        data: { clientForm, workshops, selectedId },
      }

      let res
      if (draftId) {
        res = await fetch(`${API_BASE}/client-drafts/${draftId}`, {
          method: 'PATCH',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        })
      } else {
        res = await fetch(`${API_BASE}/client-drafts`, {
          method: 'POST',
          headers: authHeaders(),
          body: JSON.stringify(payload),
        })
      }

      const data = await res.json()
      if (res.ok && data.success) {
        const id = data.data?.draft?.id
        if (id && !draftId) {
          setDraftId(id)
          navigate(`/enterprise/onboard-client?draftId=${id}`, { replace: true })
        }
        showDraftMsg('saved')
      } else {
        showDraftMsg('error')
      }
    } catch {
      showDraftMsg('error')
    } finally {
      setDraftSaving(false)
    }
  }

  async function deleteCurrentDraft() {
    if (!draftId) return
    try {
      await fetch(`${API_BASE}/client-drafts/${draftId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${getToken()}` },
      })
    } catch { /* ignore — draft cleanup is best-effort */ }
  }

  // ── Form update helpers ────────────────────────────────────────────────────

  const updateClient = (field, value) => {
    setClientForm(prev => ({ ...prev, [field]: value }))
    if (clientErrors[field]) {
      setClientErrors(prev => { const n = { ...prev }; delete n[field]; return n })
    }
  }

  const updateWorkshop = (field, value) => {
    setWorkshops(cur => cur.map(w => w.id === selectedId ? { ...w, [field]: value } : w))
    if (workshopErrors[selectedId]?.[field]) {
      setWorkshopErrors(prev => {
        const n = { ...prev }
        if (n[selectedId]) { n[selectedId] = { ...n[selectedId] }; delete n[selectedId][field] }
        return n
      })
    }
  }

  const updateWorkshopCount = (workshopId, type, value) => {
    setWorkshops(cur => cur.map(w =>
      w.id === workshopId
        ? { ...w, counts: { ...w.counts, [type]: Math.max(0, Number(value || 0)) } }
        : w
    ))
  }

  const addWorkshop = () => {
    const nextId = Math.max(...workshops.map(w => w.id), 0) + 1
    setWorkshops(cur => [...cur, blankWorkshop(nextId)])
    setSelectedId(nextId)
  }

  const removeWorkshop = (id) => {
    if (workshops.length === 1) return
    const remaining = workshops.filter(w => w.id !== id)
    setWorkshops(remaining)
    if (selectedId === id) setSelectedId(remaining[0].id)
    setWorkshopErrors(prev => { const n = { ...prev }; delete n[id]; return n })
  }

  // ── Validation ─────────────────────────────────────────────────────────────

  function validateClientTab() {
    const cErrs = {}
    if (!clientForm.name.trim())     cErrs.name            = 'Dealer name is required'
    if (!clientForm.country.trim())  cErrs.country         = 'Country is required'
    if (!clientForm.defaultCurrency) cErrs.defaultCurrency = 'Currency is required'
    if (clientForm.website && !URL_RE.test(clientForm.website.trim()))
      cErrs.website = 'Must be a valid URL. Include https://'
    setClientErrors(cErrs)
    return Object.keys(cErrs).length === 0
  }

  function validateWorkshopsTab() {
    const wErrs = {}
    for (const w of workshops) {
      const errors = {}
      if (!w.name.trim())                          errors.name        = 'Workshop name is required'
      if (!w.openingTime)                          errors.openingTime = 'Opening time is required'
      if (!w.closingTime)                          errors.closingTime = 'Closing time is required'
      else if (w.closingTime <= w.openingTime)     errors.closingTime = 'Must be after opening time'
      if (w.email    && !EMAIL_RE.test(w.email))   errors.email    = 'Valid email required'
      if (w.ceoEmail && !EMAIL_RE.test(w.ceoEmail)) errors.ceoEmail = 'Valid CEO email required'
      if (w.website  && !URL_RE.test(w.website.trim())) errors.website = 'Must include https://'
      if (Object.keys(errors).length) wErrs[w.id] = errors
    }
    setWorkshopErrors(wErrs)
    const firstErrId = Object.keys(wErrs).map(Number)[0]
    if (firstErrId) setSelectedId(firstErrId)
    return Object.keys(wErrs).length === 0
  }

  function validateAll() {
    const clientOk    = validateClientTab()
    const workshopsOk = validateWorkshopsTab()
    if (!clientOk)         setActiveTab('client')
    else if (!workshopsOk) setActiveTab('workshops')
    return clientOk && workshopsOk
  }

  // ── Tab navigation ─────────────────────────────────────────────────────────

  function goNext() {
    if (activeTab === 'client'     && validateClientTab())    setActiveTab('workshops')
    if (activeTab === 'workshops'  && validateWorkshopsTab()) setActiveTab('usercounts')
    if (activeTab === 'usercounts')                           setActiveTab('review')
  }

  function goBack() {
    if (tabIndex > 0) setActiveTab(TABS[tabIndex - 1].id)
  }

  // ── API helpers ────────────────────────────────────────────────────────────

  async function readJsonResponse(response) {
    const text = await response.text()
    if (!text) return {}
    try { return JSON.parse(text) }
    catch { return { success: false, message: text } }
  }

  async function handleCreate() {
    if (!validateAll()) {
      setSubmitError('Please fix the highlighted errors before continuing.')
      return
    }
    setSubmitting(true)
    setSubmitError('')
    try {
      const token = getToken()
      if (!token) {
        setSubmitError('Session token missing. Please log out and log back in as Enterprise Admin.')
        return
      }

      const headers = authHeaders()

      const clientPayload = {
        name:                clientForm.name.trim(),
        country:             clientForm.country.trim(),
        defaultCurrency:     clientForm.defaultCurrency,
        dealerLicenceNumber: clientForm.dealerLicenceNumber.trim() || undefined,
        website:             clientForm.website.trim()             || undefined,
      }

      const clientRes  = await fetch(`${API_BASE}/clients`, { method: 'POST', headers, body: JSON.stringify(clientPayload) })
      const clientData = await readJsonResponse(clientRes)

      if (!clientRes.ok || !clientData.success) {
        setSubmitError(clientData.message || 'Failed to create client. Check the details and try again.')
        return
      }

      const clientId = clientData.data?.client?.id || clientData.data?.id
      if (!clientId) {
        setSubmitError('Client was created, but backend did not return client id.')
        return
      }

      for (const workshop of workshops) {
        // Filter out roles with 0 count before saving
        const nonZeroCounts = Object.fromEntries(
          Object.entries(workshop.counts).filter(([, v]) => parseInt(v, 10) > 0)
        )

        const workshopPayload = {
          clientId,
          name:        workshop.name.trim(),
          type:        WORKSHOP_TYPE_MAP[workshop.type] || 'Service',
          address:     workshop.address.trim()   || undefined,
          phone:       workshop.phone.trim()     || undefined,
          whatsapp:    workshop.whatsapp.trim()  || undefined,
          email:       workshop.email.trim()     || undefined,
          website:     workshop.website.trim()   || undefined,
          openingTime: workshop.openingTime,
          closingTime: workshop.closingTime,
          ceoName:     workshop.ceoName.trim()   || undefined,
          ceoEmail:    workshop.ceoEmail.trim()  || undefined,
          ceoPhone:    workshop.ceoPhone.trim()  || undefined,
          userCounts:  Object.keys(nonZeroCounts).length > 0 ? nonZeroCounts : undefined,
        }
        const workshopRes  = await fetch(`${API_BASE}/workshops`, { method: 'POST', headers, body: JSON.stringify(workshopPayload) })
        const workshopData = await readJsonResponse(workshopRes)
        if (!workshopRes.ok || !workshopData.success) {
          setSubmitError(`Workshop "${workshop.name}": ${workshopData.message || 'Failed to save.'}`)
          return
        }
      }

      await deleteCurrentDraft()
      setCreatedClient({ id: clientId, name: clientForm.name, workshopCount: workshops.length })
    } catch (error) {
      setSubmitError(error?.message || 'Network error. Make sure the backend is running and try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success screen ─────────────────────────────────────────────────────────

  if (createdClient) {
    return (
      <section className="pageStack onboardingFlow">
        <div className="panel heroPanel onboardingHero" style={{ textAlign: 'center', padding: '48px 32px' }}>
          <CheckCircle2 size={52} style={{ color: '#00a389', marginBottom: 16 }} />
          <h2 style={{ marginBottom: 8 }}>Client onboarded successfully</h2>
          <p style={{ color: '#667085', maxWidth: 460, margin: '0 auto 24px' }}>
            <strong>{createdClient.name}</strong> and {createdClient.workshopCount}{' '}
            workshop{createdClient.workshopCount !== 1 ? 's' : ''} have been created.
            Go to <strong>User Credentials</strong> to create staff logins.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="primaryBtn" type="button" onClick={() => navigate('/enterprise/user-credentials')}>
              Go to User Credentials
            </button>
            <button className="secondaryBtn" type="button" onClick={() => {
              setCreatedClient(null)
              setClientForm({ name: '', country: '', dealerLicenceNumber: '', website: '', defaultCurrency: '' })
              setWorkshops([blankWorkshop(1)])
              setSelectedId(1)
              setClientErrors({})
              setWorkshopErrors({})
              setSubmitError('')
              setDraftId(null)
              setActiveTab('client')
              navigate('/enterprise/onboard-client', { replace: true })
            }}>
              Onboard another client
            </button>
          </div>
        </div>
      </section>
    )
  }

  const wErr = workshopErrors[selectedId] || {}

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <section className="pageStack onboardingFlow">

      {/* Hero */}
      <div className="panel heroPanel onboardingHero">
        <div>
          <p className="eyebrow">Enterprise Admin</p>
          <h2>Create &amp; onboard new client dealer</h2>
          <p>
            Complete the client setup in one flow. Add a client, attach workshops,
            configure operating details, then set user counts before creating credentials.
          </p>
        </div>
        <div className="onboardingSummaryCards">
          <span><Building2 size={18} /> {workshops.length} workshop{workshops.length !== 1 ? 's' : ''}</span>
          <span><UsersRound size={18} /> {totalUsers} users planned</span>
        </div>
      </div>

      {/* Tab navigation */}
      <div className="panel" style={{ padding: '6px' }}>
        <div className="onboardTabNav" role="tablist">
          {TABS.map((tab, i) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              className={[
                'onboardTabBtn',
                activeTab === tab.id ? 'active' : '',
                i < tabIndex        ? 'done'   : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setActiveTab(tab.id)}
              type="button"
            >
              {i < tabIndex && <CheckCircle2 size={14} />}
              <span className="tabLong">{tab.label}</span>
              <span className="tabShort">{tab.short}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Draft loaded banner */}
      {draftMsg === 'loaded' && (
        <div className="draftBanner">
          <CheckCircle2 size={16} />
          <span>Draft loaded — continue from where you left off.</span>
        </div>
      )}

      {/* ── TAB 1: Client Details ── */}
      {activeTab === 'client' && (
        <div className="panel formPanel">
          <div className="sectionHeader compact">
            <div>
              <h3>Client details</h3>
              <p>These details apply to the dealer group. Workshops are configured in the next tab.</p>
            </div>
          </div>

          <div className="formGrid onboardClientForm">

            <label>
              <FL req>Dealer / Client name</FL>
              <input
                value={clientForm.name}
                onChange={e => updateClient('name', e.target.value)}
                placeholder="Dealer group name"
                style={clientErrors.name ? errStyle : undefined}
              />
              {clientErrors.name && <span style={errMsg}>{clientErrors.name}</span>}
            </label>

            <label>
              <FL req>Primary country</FL>
              <select
                value={clientForm.country}
                onChange={e => {
                  const name = e.target.value
                  updateClient('country', name)
                  const found = countries.find(c => c.name === name)
                  if (found?.currencyCode) updateClient('defaultCurrency', found.currencyCode)
                }}
                style={clientErrors.country ? errStyle : undefined}
              >
                <option value="">— Select country —</option>
                {countries.map(c => <option key={c.iso2} value={c.name}>{c.name}</option>)}
              </select>
              {clientErrors.country && <span style={errMsg}>{clientErrors.country}</span>}
            </label>

            <label>
              <FL req>Currency used</FL>
              <select
                value={clientForm.defaultCurrency}
                onChange={e => updateClient('defaultCurrency', e.target.value)}
                style={clientErrors.defaultCurrency ? errStyle : undefined}
              >
                <option value="">Select currency</option>
                {Array.from(new Map(countries.map(c => [c.currencyCode, c])).values()).map(c => (
                  <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode} — {c.currencyName}</option>
                ))}
              </select>
              {clientErrors.defaultCurrency && <span style={errMsg}>{clientErrors.defaultCurrency}</span>}
            </label>

            <label>
              <FL>LMCT / dealer licence number</FL>
              <input
                value={clientForm.dealerLicenceNumber}
                onChange={e => updateClient('dealerLicenceNumber', e.target.value)}
                placeholder="Dealer licence number"
              />
            </label>

            <label>
              <FL>Website address</FL>
              <input
                value={clientForm.website}
                onChange={e => updateClient('website', e.target.value)}
                placeholder="https://www.dealer.com"
                style={clientErrors.website ? errStyle : undefined}
              />
              {clientErrors.website && <span style={errMsg}>{clientErrors.website}</span>}
            </label>

          </div>

          {/* File uploads — separate row so they don't mix with text fields */}
          <div className="onboardFileRow">
            <label className="onboardFileLabel">
              <FL>Upload client logo</FL>
              <input type="file" accept="image/*" />
            </label>
            <label className="onboardFileLabel">
              <FL>Upload invoice format</FL>
              <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg" />
            </label>
          </div>
        </div>
      )}

      {/* ── TAB 2: Workshops ── */}
      {activeTab === 'workshops' && (
        <div className="panel formPanel">
          <div className="sectionHeader compact">
            <div>
              <h3>Workshops under this client</h3>
              <p>Add multiple workshops. Select a card to edit its details and contacts.</p>
            </div>
            <button className="primaryBtn" type="button" onClick={addWorkshop}>
              <Plus size={17} /> Add workshop
            </button>
          </div>

          <div className="workshopTabs">
            {workshops.map(workshop => {
              const count  = userTypes.reduce((s, t) => s + Number(workshop.counts[t] || 0), 0)
              const hasErr = !!workshopErrors[workshop.id] && Object.keys(workshopErrors[workshop.id]).length > 0
              return (
                <button
                  key={workshop.id}
                  className={workshop.id === selectedId ? 'workshopTab active' : 'workshopTab'}
                  type="button"
                  onClick={() => setSelectedId(workshop.id)}
                  style={hasErr ? { borderColor: '#d92d20' } : undefined}
                >
                  <strong style={hasErr ? { color: '#d92d20' } : undefined}>
                    {workshop.name || `Workshop ${workshop.id}`}
                  </strong>
                  <span>{workshop.type} • {count} users • {workshop.openingTime} – {workshop.closingTime}</span>
                </button>
              )
            })}
          </div>

          {selectedWorkshop && (
            <div className="workshopEditor">
              <div className="sectionHeader compact">
                <div>
                  <h3>{selectedWorkshop.name || `Workshop ${selectedWorkshop.id}`} setup</h3>
                  <p>Operating details, contact info and opening hours.</p>
                </div>
                <button
                  className="secondaryBtn dangerInline"
                  type="button"
                  onClick={() => removeWorkshop(selectedWorkshop.id)}
                  disabled={workshops.length === 1}
                >
                  <Trash2 size={16} /> Remove
                </button>
              </div>

              <div className="formGrid onboardClientForm">
                <label>
                  <FL req>Workshop name</FL>
                  <input
                    value={selectedWorkshop.name}
                    onChange={e => updateWorkshop('name', e.target.value)}
                    style={wErr.name ? errStyle : undefined}
                  />
                  {wErr.name && <span style={errMsg}>{wErr.name}</span>}
                </label>

                <label>
                  <FL>Workshop type</FL>
                  <select value={selectedWorkshop.type} onChange={e => updateWorkshop('type', e.target.value)}>
                    <option>Service</option>
                    <option>Paint &amp; Panel</option>
                    <option>Fleet Service</option>
                    <option>Body Shop</option>
                  </select>
                </label>

                <label>
                  <FL>Workshop email id</FL>
                  <input
                    value={selectedWorkshop.email}
                    onChange={e => updateWorkshop('email', e.target.value)}
                    placeholder="workshop@dealer.com"
                    style={wErr.email ? errStyle : undefined}
                  />
                  {wErr.email && <span style={errMsg}>{wErr.email}</span>}
                </label>

                <label>
                  <FL req>Opening time</FL>
                  <input
                    type="time"
                    value={selectedWorkshop.openingTime}
                    onChange={e => updateWorkshop('openingTime', e.target.value)}
                    style={wErr.openingTime ? errStyle : undefined}
                  />
                  {wErr.openingTime && <span style={errMsg}>{wErr.openingTime}</span>}
                </label>

                <label>
                  <FL req>Closing time</FL>
                  <input
                    type="time"
                    value={selectedWorkshop.closingTime}
                    onChange={e => updateWorkshop('closingTime', e.target.value)}
                    style={wErr.closingTime ? errStyle : undefined}
                  />
                  {wErr.closingTime && <span style={errMsg}>{wErr.closingTime}</span>}
                </label>

                <label>
                  <FL>Workshop phone</FL>
                  <PhoneInput
                    value={selectedWorkshop.phone}
                    onChange={v => updateWorkshop('phone', v)}
                    countries={countries}
                    defaultPrefix={countries.find(c => c.name === clientForm.country) ? `+${countries.find(c => c.name === clientForm.country).isdCode}` : '+27'}
                    placeholder="Phone number"
                  />
                </label>

                <label>
                  <FL>WhatsApp number</FL>
                  <PhoneInput
                    value={selectedWorkshop.whatsapp}
                    onChange={v => updateWorkshop('whatsapp', v)}
                    countries={countries}
                    defaultPrefix={countries.find(c => c.name === clientForm.country) ? `+${countries.find(c => c.name === clientForm.country).isdCode}` : '+27'}
                    placeholder="WhatsApp number"
                  />
                </label>

                <label>
                  <FL>Workshop website</FL>
                  <input
                    value={selectedWorkshop.website}
                    onChange={e => updateWorkshop('website', e.target.value)}
                    placeholder="https://workshop.dealer.com"
                    style={wErr.website ? errStyle : undefined}
                  />
                  {wErr.website && <span style={errMsg}>{wErr.website}</span>}
                </label>

                <label className="wide">
                  <FL>Workshop address with zip code</FL>
                  <input
                    value={selectedWorkshop.address}
                    onChange={e => updateWorkshop('address', e.target.value)}
                    placeholder="Street, suburb, city, zip code"
                  />
                </label>

                <label>
                  <FL>CEO name</FL>
                  <input
                    value={selectedWorkshop.ceoName}
                    onChange={e => updateWorkshop('ceoName', e.target.value)}
                    placeholder="CEO name"
                  />
                </label>

                <label>
                  <FL>CEO email</FL>
                  <input
                    value={selectedWorkshop.ceoEmail}
                    onChange={e => updateWorkshop('ceoEmail', e.target.value)}
                    placeholder="ceo@dealer.com"
                    style={wErr.ceoEmail ? errStyle : undefined}
                  />
                  {wErr.ceoEmail && <span style={errMsg}>{wErr.ceoEmail}</span>}
                </label>

                <label>
                  <FL>CEO phone</FL>
                  <PhoneInput
                    value={selectedWorkshop.ceoPhone}
                    onChange={v => updateWorkshop('ceoPhone', v)}
                    countries={countries}
                    defaultPrefix={countries.find(c => c.name === clientForm.country) ? `+${countries.find(c => c.name === clientForm.country).isdCode}` : '+27'}
                    placeholder="CEO phone number"
                  />
                </label>
              </div>

              <div className="onboardFileRow">
                <label className="onboardFileLabel">
                  <FL>Upload workshop logo</FL>
                  <input type="file" accept="image/*" />
                </label>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── TAB 3: User Counts ── */}
      {activeTab === 'usercounts' && workshops.map(workshop => {
        const count = userTypes.reduce((s, t) => s + Number(workshop.counts[t] || 0), 0)
        return (
          <div key={workshop.id} className="panel">
            <div className="sectionHeader compact">
              <div>
                <h3>{workshop.name}</h3>
                <p>
                  Enter the number of users per role.
                  {count > 0 && <strong> {count} users planned.</strong>}
                </p>
              </div>
            </div>
            <div className="roleCountGrid">
              {userTypes.map(type => (
                <label key={type}>
                  <span>{type}</span>
                  <input
                    type="number"
                    min="0"
                    value={workshop.counts[type] || 0}
                    onChange={e => updateWorkshopCount(workshop.id, type, e.target.value)}
                  />
                </label>
              ))}
            </div>
          </div>
        )
      })}

      {/* ── TAB 4: Review & Create ── */}
      {activeTab === 'review' && (
        <div className="panel">
          <div className="sectionHeader compact">
            <div>
              <h3>Onboarding summary</h3>
              <p>Review before creating the client and moving to user credential setup.</p>
            </div>
          </div>

          <div className="reviewClientStrip">
            <div><span>Dealer name</span><strong>{clientForm.name || '—'}</strong></div>
            <div><span>Country</span><strong>{clientForm.country || '—'}</strong></div>
            <div><span>Currency</span><strong>{clientForm.defaultCurrency || '—'}</strong></div>
            <div><span>Website</span><strong>{clientForm.website || '—'}</strong></div>
          </div>

          <div className="tableWrap compactTable">
            <table>
              <thead>
                <tr>
                  <th>Workshop</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Hours</th>
                  <th>Users</th>
                </tr>
              </thead>
              <tbody>
                {workshops.map(workshop => {
                  const count = userTypes.reduce((s, t) => s + Number(workshop.counts[t] || 0), 0)
                  return (
                    <tr key={workshop.id}>
                      <td>
                        <strong>{workshop.name}</strong><br />
                        <small>{workshop.address || 'Address pending'}</small>
                      </td>
                      <td>{workshop.type}</td>
                      <td>
                        <strong>{workshop.phone || 'Phone pending'}</strong><br />
                        <small>{workshop.email || 'Email pending'}</small>
                      </td>
                      <td><strong>{workshop.openingTime} – {workshop.closingTime}</strong></td>
                      <td><strong>{count}</strong></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="infoStrip">
            <strong>Next step:</strong> After creating the client, go to Enterprise Admin → User Credentials
            to create user logins and send credentials by WhatsApp or email.
          </div>
        </div>
      )}

      {/* Error */}
      {submitError && (
        <div style={{ background: '#fee4e2', color: '#d92d20', borderRadius: 12, padding: '12px 16px', fontSize: 14, fontWeight: 600 }}>
          {submitError}
        </div>
      )}

      {/* Sticky footer */}
      <div className="stickyActions onboardActions">
        <button
          className="secondaryBtn"
          type="button"
          onClick={saveDraft}
          disabled={draftSaving}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, opacity: draftSaving ? 0.6 : 1 }}
        >
          <Save size={15} />
          {draftSaving ? 'Saving…' : draftId ? 'Update draft' : 'Save draft'}
        </button>

        <div className="onboardNavBtns">
          {tabIndex > 0 && (
            <button className="secondaryBtn" type="button" onClick={goBack}>
              <ChevronLeft size={16} /> Back
            </button>
          )}
          {activeTab !== 'review' ? (
            <button className="primaryBtn" type="button" onClick={goNext}>
              Next <ChevronRight size={16} />
            </button>
          ) : (
            <button className="primaryBtn" type="button" disabled={submitting} onClick={handleCreate}>
              {submitting ? 'Creating…' : 'Create Client & Continue'}
            </button>
          )}
        </div>
      </div>

      {/* Draft toast */}
      {(draftMsg === 'saved' || draftMsg === 'error') && (
        <div className={`draftToast${draftMsg === 'error' ? ' draftToastError' : ''}`}>
          <CheckCircle2 size={16} />
          {draftMsg === 'saved' ? 'Draft saved to database' : 'Failed to save draft'}
        </div>
      )}
    </section>
  )
}

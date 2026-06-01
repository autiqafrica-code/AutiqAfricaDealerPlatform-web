import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import {
  AlertTriangle, Camera, Car, CheckCircle2, Clock,
  CreditCard, FileSignature, Loader2, Mail, MapPin,
  PackageCheck, Phone, PlayCircle, Search, ShieldCheck,
  Truck, Wrench, XCircle,
} from 'lucide-react'
import { API_BASE } from '../../utils/api'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'

// ── Public fetch (no auth) ────────────────────────────────────────────────────

async function portalFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}/portal${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
  })
  return res
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
}

function fmtMoney(amount, cur = 'ZAR') {
  return `${cur} ${Number(amount || 0).toLocaleString()}`
}

function Spinner() {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
      <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--teal)' }} />
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <article className="trackingPanel">
      <div className="trackingPanelHead">
        {Icon && <Icon size={22} />}
        <h2>{title}</h2>
      </div>
      {children}
    </article>
  )
}

// ── Job number search form ────────────────────────────────────────────────────

function JobSearchForm({ onSearch, searching, searchError, defaultValue = '', noWrap = false }) {
  const [input, setInput] = useState(defaultValue)

  function handleSubmit(e) {
    e.preventDefault()
    const val = input.trim().toUpperCase()
    if (val) onSearch(val)
  }

  const card = (
    <form className="trackingLookupCard" onSubmit={handleSubmit} style={{ flex: '1 1 290px' }}>
      <label>
        Job number
        <input
          value={input}
          onChange={e => setInput(e.target.value.toUpperCase())}
          placeholder="e.g. JB-001"
          autoFocus
          style={{ textTransform: 'uppercase' }}
        />
      </label>
      <button
        className="heroPrimary"
        type="submit"
        disabled={searching || !input.trim()}
        style={{ display: 'flex', alignItems: 'center', gap: 8, height: 52, padding: '0 22px', borderRadius: 14, whiteSpace: 'nowrap' }}
      >
        {searching
          ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          : <Search size={18} />}
        {searching ? 'Searching…' : 'TRACK JOB'}
      </button>
      <small>Enter the job number provided by your workshop to check your vehicle repair status.</small>
      {searchError && (
        <div className="infoStrip" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca', gridColumn: '1 / -1' }}>
          {searchError}
        </div>
      )}
    </form>
  )

  if (noWrap) return card
  return <div className="trackingLookupSection">{card}</div>
}

// ── Progress tracker ──────────────────────────────────────────────────────────

function ProgressTracker({ steps, progressPercent, currentStage }) {
  return (
    <Section icon={Wrench} title="Job progress tracking">
      <div className="portalProgressBar">
        <div style={{ width: `${progressPercent}%` }} />
      </div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
        {progressPercent}% complete — {currentStage}
      </p>
      <div className="customerTimeline">
        {steps.map((step, i) => (
          <div
            key={step.key}
            className={`timelineStep ${step.done ? 'done' : step.active ? 'active' : step.blocked ? 'blocked' : ''}`}
          >
            <span>
              {step.done
                ? <CheckCircle2 size={18} />
                : step.blocked
                ? <XCircle size={18} />
                : step.active
                ? <Clock size={18} />
                : i + 1}
            </span>
            <div>
              <strong>{step.label}</strong>
              <p>{step.detail}</p>
              {step.ts && <small>{fmtDate(step.ts)}</small>}
            </div>
          </div>
        ))}
      </div>
    </Section>
  )
}

// ── Read-only approval status (job-number lookup mode) ────────────────────────

function ApprovalStatusCard({ approvalSummary }) {
  if (!approvalSummary) {
    return (
      <Section icon={FileSignature} title="Approvals">
        <div className="infoStrip">No approvals pending at this time.</div>
        <div className="infoStrip" style={{ marginTop: 8, background: '#f0f9ff', color: '#0369a1' }}>
          To approve or decline a quotation, use the personal tracking link sent by your workshop.
        </div>
      </Section>
    )
  }

  const colorMap = { PENDING: 'amber', APPROVED: 'green', REJECTED: 'red' }

  return (
    <Section icon={FileSignature} title="Approvals">
      <div className="approvalCard" style={{ borderColor: approvalSummary.status === 'PENDING' ? '#fcd34d' : undefined }}>
        <div className="approvalCardHead">
          <div>
            <strong>{approvalSummary.title}</strong>
          </div>
          <span className={`pill ${colorMap[approvalSummary.status] || 'soft'}`}>
            {approvalSummary.label}
          </span>
        </div>
      </div>
      {approvalSummary.status === 'PENDING' && (
        <div className="infoStrip" style={{ marginTop: 8 }}>
          A quotation is waiting for your approval. Contact your workshop or use the personal tracking link to approve or decline.
        </div>
      )}
    </Section>
  )
}

// ── Full approvals section (token mode) ───────────────────────────────────────

function ApprovalsSection({ token, onApprovalResponse }) {
  const [approvals,  setApprovals]  = useState([])
  const [loading,    setLoading]    = useState(true)
  const [responding, setResponding] = useState(null)
  const [comment,    setComment]    = useState('')
  const [confirm,    setConfirm]    = useState(null)
  const [msg,        setMsg]        = useState('')
  const [msgOk,      setMsgOk]      = useState(true)

  function loadApprovals() {
    setLoading(true)
    portalFetch(`/${token}/approvals`)
      .then(r => r.json())
      .then(j => { if (j.success) setApprovals(j.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadApprovals() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  async function handleRespond(approvalId, decision) {
    setResponding(approvalId)
    setMsg('')
    const r = await portalFetch(`/${token}/approvals/${approvalId}/respond`, {
      method: 'POST',
      body:   JSON.stringify({ decision, customerComment: comment }),
    })
    const j = await r.json()
    if (j.success) {
      setMsgOk(true)
      setMsg(j.data?.message || 'Response recorded.')
      setComment(''); setConfirm(null)
      loadApprovals()
      if (onApprovalResponse) onApprovalResponse()
    } else {
      setMsgOk(false)
      setMsg(j.message || 'Failed to submit response.')
    }
    setResponding(null)
  }

  const pending = approvals.filter(a => a.status === 'PENDING')
  const history = approvals.filter(a => a.status !== 'PENDING')

  return (
    <Section icon={FileSignature} title="Approvals">
      {loading ? <Spinner /> : (
        <>
          {msg && (
            <div className="infoStrip" style={{
              background: msgOk ? '#f0fdf4' : '#fef2f2',
              color: msgOk ? '#15803d' : '#b91c1c',
              fontWeight: 600, marginBottom: 12,
            }}>
              {msg}
            </div>
          )}

          {pending.length === 0 && history.length === 0 && (
            <div className="infoStrip">No approvals pending at this time.</div>
          )}

          {pending.map(a => (
            <div key={a.id} className="approvalCard approvalPending">
              <div className="approvalCardHead">
                <div>
                  <strong>{a.title}</strong>
                  <p>{a.description}</p>
                </div>
                <span className="pill amber">Awaiting your approval</span>
              </div>

              {(a.lineItems || []).length > 0 && (
                <div className="tableWrap" style={{ marginTop: 8 }}>
                  <table>
                    <thead><tr><th>Item</th><th>Cost</th></tr></thead>
                    <tbody>
                      {a.lineItems.map((li, idx) => (
                        <tr key={idx}>
                          <td>{li.description}</td>
                          <td>{fmtMoney(li.cost, li.currency)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="approvalTotal">
                Total: <strong>{fmtMoney(a.amount, a.currency)}</strong>
              </div>

              {confirm === a.id + '_approve' ? (
                <div className="approvalConfirm">
                  <p>Are you sure you want to <strong>approve</strong> this quotation?</p>
                  <label style={{ display: 'block', margin: '8px 0' }}>
                    Comment (optional)
                    <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} style={{ width: '100%', marginTop: 4 }} />
                  </label>
                  <div className="approvalConfirmActions">
                    <button className="primaryBtn" onClick={() => handleRespond(a.id, 'APPROVED')} disabled={!!responding}>
                      {responding === a.id ? <Loader2 size={16} /> : <CheckCircle2 size={16} />} Confirm approve
                    </button>
                    <button className="softBtn" onClick={() => { setConfirm(null); setComment('') }}>Cancel</button>
                  </div>
                </div>
              ) : confirm === a.id + '_reject' ? (
                <div className="approvalConfirm" style={{ borderColor: '#ef4444' }}>
                  <p>Are you sure you want to <strong>decline</strong> this quotation?</p>
                  <label style={{ display: 'block', margin: '8px 0' }}>
                    Reason for declining
                    <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} style={{ width: '100%', marginTop: 4 }} placeholder="Please tell us why" />
                  </label>
                  <div className="approvalConfirmActions">
                    <button className="softBtn" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleRespond(a.id, 'REJECTED')} disabled={!!responding}>
                      {responding === a.id ? <Loader2 size={16} /> : <XCircle size={16} />} Confirm decline
                    </button>
                    <button className="softBtn" onClick={() => { setConfirm(null); setComment('') }}>Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="approvalActions">
                  <button className="primaryBtn" onClick={() => setConfirm(a.id + '_approve')} disabled={!!responding}>
                    <CheckCircle2 size={16} /> Approve
                  </button>
                  <button className="softBtn dangerOutline" onClick={() => setConfirm(a.id + '_reject')} disabled={!!responding}>
                    <XCircle size={16} /> Decline
                  </button>
                </div>
              )}
            </div>
          ))}

          {history.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <p className="eyebrow">Approval history</p>
              <div className="approvalStack">
                {history.map(a => (
                  <div className="approvalRow" key={a.id}>
                    <div>
                      <strong>{a.title}</strong>
                      <span>{fmtMoney(a.amount, a.currency)}</span>
                      {a.respondedAt && <small> • {fmtDate(a.respondedAt)}</small>}
                    </div>
                    <span className={`pill ${a.status === 'APPROVED' ? 'green' : 'red'}`}>
                      {a.status === 'APPROVED' ? 'Approved' : 'Declined'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Section>
  )
}

// ── Media gallery ─────────────────────────────────────────────────────────────

function MediaGallery({ token }) {
  const [media,   setMedia]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portalFetch(`/${token}/media`)
      .then(r => r.json())
      .then(j => { if (j.success) setMedia(j.data || []) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  return (
    <Section icon={Camera} title="Photo / video gallery">
      {loading ? <Spinner /> : media.length === 0 ? (
        <div className="infoStrip">No photos or videos have been shared yet.</div>
      ) : (
        <div className="customerGallery">
          {media.map(item => (
            <a key={item.id} href={item.fileUrl} target="_blank" rel="noopener noreferrer" className="galleryTile">
              {item.mediaType === 'Video' ? <PlayCircle size={30} /> : <Camera size={30} />}
              <strong>{item.category}</strong>
              <span>{item.mediaType} • {fmtDate(item.uploadedAt)}</span>
            </a>
          ))}
        </div>
      )}
    </Section>
  )
}

// ── Payment summary ───────────────────────────────────────────────────────────

function PaymentSummary({ token }) {
  const [data,    setData]    = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    portalFetch(`/${token}/payment`)
      .then(r => r.json())
      .then(j => { if (j.success) setData(j.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  return (
    <Section icon={CreditCard} title="Payment summary">
      {loading ? <Spinner /> : !data || !data.hasInvoice ? (
        <div className="infoStrip">{data?.message || 'Payment details will appear here once your repair is complete.'}</div>
      ) : (
        <>
          <div className="paymentSummaryGrid">
            <span><small>Invoice</small><strong>{data.invoiceNumber}</strong></span>
            <span><small>Issue date</small><strong>{fmtDate(data.issueDate)}</strong></span>
            <span><small>Due date</small><strong>{fmtDate(data.dueDate)}</strong></span>
            <span><small>Total</small><strong>{fmtMoney(data.total, data.currency)}</strong></span>
            <span><small>Paid</small><strong>{fmtMoney(data.totalPaid, data.currency)}</strong></span>
            <span><small>Balance due</small><strong>{fmtMoney(data.balance, data.currency)}</strong></span>
            <span><small>Status</small><strong><span className={`pill ${data.statusColor}`}>{data.paymentStatus}</span></strong></span>
          </div>
          {(data.payments || []).length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p className="eyebrow">Payment history</p>
              <div className="approvalStack">
                {data.payments.map((p, i) => (
                  <div className="approvalRow" key={i}>
                    <div>
                      <strong>{p.method}</strong>
                      {p.referenceNumber && <span> • Ref: {p.referenceNumber}</span>}
                      <small> • {fmtDate(p.paymentDate)}</small>
                    </div>
                    <span className="pill green">{fmtMoney(p.amount, data.currency)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="infoStrip" style={{ marginTop: 12 }}>
            To make a payment, please contact the workshop. The service team will update your payment status after it is received.
          </div>
        </>
      )}
    </Section>
  )
}

// ── Delivery / collection preference ─────────────────────────────────────────

function DeliverySection({ token, jobClosed }) {
  const [pref,    setPref]    = useState(null)
  const [loading, setLoading] = useState(true)
  const [form,    setForm]    = useState({
    preference: 'COLLECTION_AT_WORKSHOP',
    deliveryAddress: '', preferredDate: '', preferredTimeWindow: '', notes: '',
  })
  const [saving,  setSaving]  = useState(false)
  const [msg,     setMsg]     = useState('')
  const [msgOk,   setMsgOk]   = useState(true)

  useEffect(() => {
    portalFetch(`/${token}/delivery`)
      .then(r => r.json())
      .then(j => {
        if (j.success && j.data?.hasPreference) {
          setPref(j.data)
          setForm(f => ({
            ...f,
            preference:          j.data.preference || 'COLLECTION_AT_WORKSHOP',
            deliveryAddress:     j.data.deliveryAddress    || '',
            preferredDate:       j.data.preferredDate      || '',
            preferredTimeWindow: j.data.preferredTimeWindow || '',
            notes:               j.data.notes              || '',
          }))
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [token])

  async function handleSave(e) {
    e.preventDefault()
    setSaving(true); setMsg('')
    const r = await portalFetch(`/${token}/delivery`, {
      method: 'POST', body: JSON.stringify(form),
    })
    const j = await r.json()
    if (j.success) {
      setMsgOk(true); setMsg(j.data?.message || 'Preference saved.'); setPref(form)
    } else {
      setMsgOk(false); setMsg(j.message || 'Failed to save preference.')
    }
    setSaving(false)
  }

  return (
    <Section icon={Truck} title="Collection or delivery preference">
      {loading ? <Spinner /> : (
        <>
          {jobClosed && (
            <div className="infoStrip">Your vehicle has been delivered or collected. This preference is now read-only.</div>
          )}
          {msg && (
            <div className="infoStrip" style={{ background: msgOk ? '#f0fdf4' : '#fef2f2', color: msgOk ? '#15803d' : '#b91c1c', fontWeight: 600, marginBottom: 12 }}>
              {msg}
            </div>
          )}
          {jobClosed && pref ? (
            <div className="approvalStack">
              <div className="approvalRow">
                <div>
                  <strong>{pref.preference === 'DELIVERY' ? 'Delivery to customer' : 'Collection at workshop'}</strong>
                  {pref.deliveryAddress && <p>{pref.deliveryAddress}</p>}
                  {pref.preferredDate   && <small>Preferred date: {pref.preferredDate}</small>}
                </div>
                <span className="pill green">Confirmed</span>
              </div>
            </div>
          ) : (
            <form className="preferenceForm" onSubmit={handleSave}>
              <label>
                Preference
                <select value={form.preference} onChange={e => setForm(f => ({ ...f, preference: e.target.value }))} disabled={jobClosed}>
                  <option value="COLLECTION_AT_WORKSHOP">Collection at workshop</option>
                  <option value="DELIVERY">Delivery to my address</option>
                </select>
              </label>
              {form.preference === 'DELIVERY' && (
                <label className="fullField">
                  Delivery address
                  <input value={form.deliveryAddress} onChange={e => setForm(f => ({ ...f, deliveryAddress: e.target.value }))} placeholder="Enter delivery address" required disabled={jobClosed} />
                </label>
              )}
              <label>
                Preferred date
                <input type="date" value={form.preferredDate} onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))} disabled={jobClosed} />
              </label>
              <label>
                Preferred time window
                <input value={form.preferredTimeWindow} onChange={e => setForm(f => ({ ...f, preferredTimeWindow: e.target.value }))} placeholder="e.g. 09:00 – 11:00" disabled={jobClosed} />
              </label>
              <label className="fullField">
                Notes
                <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any special instructions" rows={2} disabled={jobClosed} />
              </label>
              {!jobClosed && (
                <button className="primaryBtn fullField" type="submit" disabled={saving}>
                  <PackageCheck size={18} /> {saving ? 'Saving…' : 'Save Preference'}
                </button>
              )}
            </form>
          )}
        </>
      )}
    </Section>
  )
}

// ── OTP-based quotation approval ──────────────────────────────────────────────

function QuotationApprovalByEmail() {
  const [step,          setStep]          = useState('email') // email | otp | quotations | done
  const [email,         setEmail]         = useState('')
  const [otp,           setOtp]           = useState('')
  const [sessionToken,  setSessionToken]  = useState('')
  const [verifiedToken, setVerifiedToken] = useState('')
  const [customerName,  setCustomerName]  = useState('')
  const [quotations,    setQuotations]    = useState([])
  const [busy,          setBusy]          = useState(false)
  const [msg,           setMsg]           = useState('')
  const [msgOk,         setMsgOk]         = useState(true)
  const [confirm,       setConfirm]       = useState(null) // quotationId + '_approve' | '_reject'
  const [comment,       setComment]       = useState('')
  const [responding,    setResponding]    = useState(null)
  const [devOtp,        setDevOtp]        = useState('')

  async function handleRequestOtp(e) {
    e.preventDefault()
    if (!email.trim()) return
    setBusy(true); setMsg(''); setDevOtp('')
    try {
      const res  = await fetch(`${API_BASE}/portal/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setSessionToken(data.data.sessionToken)
        setStep('otp')
        if (data.data._devOtp) {
          setDevOtp(data.data._devOtp)
          setMsgOk(false)
          setMsg('Email delivery is not configured on this server — use the code shown below for testing.')
        } else {
          setMsgOk(true)
          setMsg('If your email has a pending approval, an OTP has been sent. Check your inbox.')
        }
      } else {
        setMsgOk(false); setMsg(data.message || 'Unable to send OTP.')
      }
    } catch { setMsgOk(false); setMsg('Network error. Please try again.') }
    finally { setBusy(false) }
  }

  async function handleVerifyOtp(e) {
    e.preventDefault()
    if (!otp.trim()) return
    setBusy(true); setMsg('')
    try {
      const res  = await fetch(`${API_BASE}/portal/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionToken, otp: otp.trim() }),
      })
      const data = await res.json()
      if (data.success) {
        setVerifiedToken(data.data.verifiedToken)
        setCustomerName(data.data.customerName || '')
        setQuotations(data.data.quotations || [])
        setStep('quotations')
        setMsg('')
      } else {
        setMsgOk(false); setMsg(data.message || 'Invalid OTP.')
      }
    } catch { setMsgOk(false); setMsg('Network error. Please try again.') }
    finally { setBusy(false) }
  }

  async function handleRespond(quotationId, decision) {
    setResponding(quotationId)
    setMsg('')
    try {
      const res  = await fetch(`${API_BASE}/portal/otp/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verifiedToken, quotationId, decision, comment }),
      })
      const data = await res.json()
      if (data.success) {
        setMsgOk(true); setMsg(data.data.message)
        setQuotations(prev => prev.filter(q => q.id !== quotationId))
        setConfirm(null); setComment('')
        if (quotations.length <= 1) setStep('done')
      } else {
        setMsgOk(false); setMsg(data.message || 'Failed to submit response.')
      }
    } catch { setMsgOk(false); setMsg('Network error. Please try again.') }
    finally { setResponding(null) }
  }

  const msgStyle = {
    background: msgOk ? '#f0fdf4' : '#fef2f2',
    color:      msgOk ? '#15803d' : '#b91c1c',
    border:     `1px solid ${msgOk ? '#abefc6' : '#fecaca'}`,
  }

  return (
    <div>
      <div style={{ background: '#fff', border: '1px solid #e4e7ec', borderRadius: 28, padding: 22, boxShadow: '0 1px 4px rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <ShieldCheck size={22} style={{ color: 'var(--teal)' }} />
          <div>
            <strong style={{ fontSize: 16, display: 'block', color: 'var(--navy)' }}>Approve a Repair Quotation</strong>
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>Verify your email to review and approve pending quotations</span>
          </div>
        </div>

        {msg && (
          <div className="infoStrip" style={{ ...msgStyle, marginBottom: 14 }}>{msg}</div>
        )}

        {step === 'email' && (
          <form onSubmit={handleRequestOtp} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <label style={{ fontWeight: 700, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              Your email address
              <input
                type="email" required
                placeholder="customer@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </label>
            <button className="heroPrimary" type="submit" disabled={busy || !email.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: 8, height: 48, padding: '0 20px', borderRadius: 12 }}>
              {busy ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <Mail size={18} />}
              {busy ? 'Sending…' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {devOtp && (
              <div style={{ fontFamily: 'monospace', fontSize: 34, fontWeight: 900, letterSpacing: 10, padding: '16px 12px', background: '#fef9c3', border: '1px solid #fde68a', borderRadius: 12, textAlign: 'center', color: '#92400e' }}>
                {devOtp}
              </div>
            )}
            <label style={{ fontWeight: 700, fontSize: 13, display: 'flex', flexDirection: 'column', gap: 6 }}>
              Enter the 6-digit code sent to <strong>{email}</strong>
              <input
                type="text" required
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={otp}
                onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                style={{ fontFamily: 'monospace', fontSize: 22, letterSpacing: 8, textAlign: 'center', padding: '10px 16px' }}
                autoFocus
              />
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="heroPrimary" type="submit" disabled={busy || otp.length < 6}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 12 }}>
                {busy ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : <ShieldCheck size={18} />}
                {busy ? 'Verifying…' : 'Verify OTP'}
              </button>
              <button type="button" onClick={() => { setStep('email'); setOtp(''); setMsg('') }}
                style={{ padding: '0 14px', borderRadius: 12, border: '1px solid #e4e7ec', background: 'transparent', cursor: 'pointer', fontSize: 13 }}>
                Back
              </button>
            </div>
            <button type="button" onClick={handleRequestOtp} disabled={busy}
              style={{ background: 'none', border: 'none', color: 'var(--teal)', fontSize: 13, cursor: 'pointer', textAlign: 'left', padding: 0 }}>
              Resend OTP
            </button>
          </form>
        )}

        {step === 'quotations' && (
          <div>
            {customerName && <p style={{ fontWeight: 700, fontSize: 15, marginBottom: 12, color: 'var(--navy)' }}>Hi {customerName}, here are your pending approvals:</p>}
            {quotations.length === 0 && (
              <div className="infoStrip">No pending quotations found for this account.</div>
            )}
            {quotations.map(q => (
              <div key={q.id} className="approvalCard approvalPending" style={{ marginBottom: 14 }}>
                <div className="approvalCardHead">
                  <div>
                    <strong>{q.quoteNumber}</strong>
                    {q.repairType && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}>{q.repairType}</p>}
                    {q.vehicle && <p style={{ margin: '2px 0 0', fontSize: 13, color: 'var(--muted)' }}><Car size={12} style={{ marginRight: 4 }} />{q.vehicle.registrationNo} — {q.vehicle.makeModel}</p>}
                    {q.workshop && <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--muted)' }}>{q.workshop.name}</p>}
                  </div>
                  <span className="pill amber">Awaiting approval</span>
                </div>

                {q.lineItems.length > 0 && (
                  <div className="tableWrap" style={{ marginTop: 10 }}>
                    <table>
                      <thead><tr><th>Item</th><th>Type</th><th style={{ textAlign: 'right' }}>Cost</th></tr></thead>
                      <tbody>
                        {q.lineItems.map((li, i) => (
                          <tr key={i}>
                            <td>{li.item}</td>
                            <td style={{ color: 'var(--muted)', fontSize: 12 }}>{li.repairType || '—'}</td>
                            <td style={{ textAlign: 'right' }}>{li.cost ? `${q.currency} ${Number(li.cost).toLocaleString()}` : '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="approvalTotal">
                  Total estimate: <strong>{fmtMoney(q.totalEstimate, q.currency)}</strong>
                </div>

                {confirm === q.id + '_approve' ? (
                  <div className="approvalConfirm">
                    <p>Confirm <strong>approval</strong> of this quotation?</p>
                    <label style={{ display: 'block', margin: '8px 0' }}>
                      Comment (optional)
                      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} style={{ width: '100%', marginTop: 4 }} />
                    </label>
                    <div className="approvalConfirmActions">
                      <button className="primaryBtn" onClick={() => handleRespond(q.id, 'APPROVED')} disabled={!!responding}>
                        {responding === q.id ? <Loader2 size={16} /> : <CheckCircle2 size={16} />} Confirm Approve
                      </button>
                      <button className="softBtn" onClick={() => { setConfirm(null); setComment('') }}>Cancel</button>
                    </div>
                  </div>
                ) : confirm === q.id + '_reject' ? (
                  <div className="approvalConfirm" style={{ borderColor: '#ef4444' }}>
                    <p>Confirm <strong>decline</strong> of this quotation?</p>
                    <label style={{ display: 'block', margin: '8px 0' }}>
                      Reason for declining
                      <textarea value={comment} onChange={e => setComment(e.target.value)} rows={2} style={{ width: '100%', marginTop: 4 }} placeholder="Tell us why (optional)" />
                    </label>
                    <div className="approvalConfirmActions">
                      <button className="softBtn" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleRespond(q.id, 'REJECTED')} disabled={!!responding}>
                        {responding === q.id ? <Loader2 size={16} /> : <XCircle size={16} />} Confirm Decline
                      </button>
                      <button className="softBtn" onClick={() => { setConfirm(null); setComment('') }}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="approvalActions">
                    <button className="primaryBtn" onClick={() => setConfirm(q.id + '_approve')} disabled={!!responding}>
                      <CheckCircle2 size={16} /> Approve
                    </button>
                    <button className="softBtn dangerOutline" onClick={() => setConfirm(q.id + '_reject')} disabled={!!responding}>
                      <XCircle size={16} /> Decline
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {step === 'done' && (
          <div className="infoStrip" style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #abefc6', fontWeight: 600 }}>
            <CheckCircle2 size={16} style={{ marginRight: 6 }} />
            All done! Your response has been submitted. The workshop will be in touch.
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Tracking() {
  const { token: tokenParam } = useParams()
  const [searchParams]        = useSearchParams()
  const token = tokenParam || searchParams.get('token') || ''

  const [overview,  setOverview]  = useState(null)
  const [loading,   setLoading]   = useState(!!token)
  const [tokenErr,  setTokenErr]  = useState('')

  const [searching,    setSearching]    = useState(false)
  const [searchError,  setSearchError]  = useState('')
  const [searchedJob,  setSearchedJob]  = useState('')

  const resultsRef = useRef(null)

  // Auto-load when a token is in the URL
  useEffect(() => {
    if (!token) return
    setLoading(true)
    portalFetch(`/${token}`)
      .then(r => r.json())
      .then(j => {
        if (j.success) setOverview(j.data)
        else setTokenErr(j.message || 'Invalid or expired tracking link.')
      })
      .catch(() => setTokenErr('Unable to load tracking page. Please try again later.'))
      .finally(() => setLoading(false))
  }, [token])

  // Scroll to results after search
  useEffect(() => {
    if (overview && resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [overview])

  async function handleSearch(jobNumber) {
    setSearching(true)
    setSearchError('')
    setSearchedJob(jobNumber)
    try {
      const res  = await fetch(`${API_BASE}/portal/lookup/${encodeURIComponent(jobNumber)}`)
      const data = await res.json()
      if (data.success) {
        setOverview(data.data)
      } else {
        setSearchError(data.message || 'Job not found. Please check the number and try again.')
        setOverview(null)
      }
    } catch {
      setSearchError('Unable to reach server. Please check your connection and try again.')
    } finally {
      setSearching(false)
    }
  }

  const isLookupMode = !!overview?.lookupMode
  const cur = overview?.status

  return (
    <div className="trackingPublicPage">
      <MarketingHeader />

      <section className="staticHero contactHero">
        <p className="eyebrow">Track Your Vehicle</p>
        <h1>Real-time vehicle service status updates.</h1>
        <p>Enter your job number to check the live repair progress of your vehicle, or use the personal tracking link sent by your workshop.</p>
      </section>

      {/* ── Entry options: track by job number OR approve by email OTP ── */}
      {!token && (
        <div className="trackingLookupSection" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 24, alignItems: 'start' }}>
          <JobSearchForm
            onSearch={handleSearch}
            searching={searching}
            searchError={searchError}
            defaultValue={searchedJob}
            noWrap
          />
          <QuotationApprovalByEmail />
        </div>
      )}

      {/* ── Token loading / error ── */}
      {token && loading && <Spinner />}
      {token && !loading && tokenErr && (
        <div className="trackingLookupSection">
          <div className="infoStrip" style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}>
            {tokenErr}
          </div>
        </div>
      )}

      {/* ── Results ── */}
      {overview && (
        <div className="trackingDashboard" ref={resultsRef}>

          {/* Summary card */}
          <div className="trackingSummaryCard">
            <div>
              <p style={{ margin: '0 0 2px', color: '#9fb3c8', fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em' }}>
                {isLookupMode ? 'Job number' : `Hello, ${overview.customer?.firstName}`}
              </p>
              <h2 style={{ margin: '0 0 4px', fontSize: 34, fontWeight: 900, lineHeight: 1 }}>
                {isLookupMode ? overview.jobNumber : overview.vehicle?.makeModel}
              </h2>
              <p style={{ margin: 0, color: '#d7dee8', fontSize: 14 }}>
                {isLookupMode
                  ? `${overview.vehicle?.makeModel} · ${overview.vehicle?.registrationNo}`
                  : <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><Car size={14} /> {overview.vehicle?.registrationNo}</span>
                }
              </p>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span className="pill amber" style={{ display: 'inline-block', marginBottom: 6 }}>
                {overview.currentStage}
              </span>
              {overview.workshop?.name && (
                <p style={{ margin: 0, color: '#d7dee8', fontSize: 13 }}>
                  Service Advisor: {overview.workshop.name}
                </p>
              )}
              {overview.workshop?.phone && (
                <a href={`tel:${overview.workshop.phone}`} style={{ display: 'flex', alignItems: 'center', gap: 5, color: '#7dd3fc', fontSize: 13, fontWeight: 700, textDecoration: 'none', marginTop: 4, justifyContent: 'flex-end' }}>
                  <Phone size={13} /> {overview.workshop.phone}
                </a>
              )}
            </div>
          </div>

          {/* Pending approval callout */}
          {(overview.steps?.some(s => s.key === 'awaiting_approval' && s.active) ||
            overview.approvalSummary?.status === 'PENDING') && (
            <div className="portalAlertBanner">
              <AlertTriangle size={20} />
              <div>
                <strong>Your approval is needed</strong>
                <p>
                  {isLookupMode
                    ? 'A quotation is waiting for your approval. Use the personal link from your workshop to approve.'
                    : 'Please review the quotation in the Approvals section below and respond.'}
                </p>
              </div>
            </div>
          )}

          <div className="portalGrid">
            <ProgressTracker
              steps={overview.steps || []}
              progressPercent={overview.progressPercent || 0}
              currentStage={overview.currentStage || ''}
            />

            {isLookupMode ? (
              /* Lookup mode — read-only gallery placeholder */
              <Section icon={Camera} title="Photo / video gallery">
                <div className="customerGallery">
                  <div className="galleryTile" style={{ cursor: 'default' }}>
                    <Camera size={30} />
                    <strong>Vehicle intake photo</strong>
                    <span>Photo • Gallery</span>
                  </div>
                  <div className="galleryTile" style={{ cursor: 'default' }}>
                    <PlayCircle size={30} />
                    <strong>Inspection video</strong>
                    <span>Video • Gallery</span>
                  </div>
                </div>
                <div className="infoStrip" style={{ marginTop: 10 }}>
                  Contact your workshop for a personal tracking link to view your actual photos and videos.
                </div>
              </Section>
            ) : (
              <MediaGallery token={token} />
            )}

            {isLookupMode ? (
              <ApprovalStatusCard approvalSummary={overview.approvalSummary} />
            ) : (
              <ApprovalsSection
                token={token}
                onApprovalResponse={() => {
                  portalFetch(`/${token}`)
                    .then(r => r.json())
                    .then(j => { if (j.success) setOverview(j.data) })
                    .catch(() => {})
                }}
              />
            )}

            {!isLookupMode && <PaymentSummary token={token} />}

            {!isLookupMode && (
              <DeliverySection token={token} jobClosed={cur === 'Completed'} />
            )}

            <Section icon={MapPin} title="Need help?">
              <div className="helpLinks">
                {overview.workshop?.phone && (
                  <a href={`tel:${overview.workshop.phone}`} className="portalContactLink">
                    <Phone size={16} /> Call the workshop
                  </a>
                )}
                {overview.workshop?.email && (
                  <a href={`mailto:${overview.workshop.email}`} className="portalContactLink">
                    📧 Email the workshop
                  </a>
                )}
                <p className="mutedText">
                  Job reference: <strong>{overview.jobNumber}</strong>
                </p>
                {isLookupMode && (
                  <p className="mutedText" style={{ marginTop: 8 }}>
                    For full access including approvals, photos, and payment details — ask your workshop for a personal tracking link.
                  </p>
                )}
              </div>
            </Section>
          </div>
        </div>
      )}

      <AppFooter />
    </div>
  )
}

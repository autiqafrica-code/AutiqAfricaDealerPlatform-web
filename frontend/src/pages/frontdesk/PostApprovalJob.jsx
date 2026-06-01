import { useEffect, useState } from 'react'
import { Bell, CheckCircle2, Factory, Send, Wrench } from 'lucide-react'
import { apiFetch } from '../../utils/api'

export default function PostApprovalJob() {
  const [approvedQuotes, setApprovedQuotes] = useState([])
  const [jobs,           setJobs]           = useState([])
  const [loading,        setLoading]        = useState(true)

  // Job creation form
  const [selectedQuote,    setSelectedQuote]    = useState(null)
  const [controllers,      setControllers]      = useState([])
  const [form, setForm] = useState({
    quotationId: '', assignedControllerId: '', department: 'Service',
    expectedStartDate: '', deliveryPreference: 'Collection',
  })
  const [saving,        setSaving]        = useState(false)
  const [apiError,      setApiError]      = useState('')
  const [success,       setSuccess]       = useState('')
  const [newJobId,      setNewJobId]      = useState(null)
  const [sendingToWC,   setSendingToWC]   = useState(false)
  const [sendToWCNotes, setSendToWCNotes] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [qRes, jRes] = await Promise.all([
        apiFetch('/quotations?status=CustomerApproved&limit=50'),
        apiFetch('/jobs?limit=20'),
      ])
      const [qData, jData] = await Promise.all([qRes.json(), jRes.json()])
      if (qData.success) setApprovedQuotes(qData.data.data || [])
      if (jData.success) setJobs(jData.data.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function loadControllers(workshopId) {
    // Try to load users with Workshop Controller role
    try {
      const res  = await apiFetch('/users?role=WorkshopController&limit=50')
      const data = await res.json()
      if (data.success) setControllers(data.data.data || data.data || [])
    } catch { /* ignore */ }
  }

  function selectQuote(q) {
    setSelectedQuote(q)
    setForm(p => ({ ...p, quotationId: q.id }))
    loadControllers()
    setApiError('')
    setSuccess('')
  }

  async function createJob() {
    if (!form.quotationId) { setApiError('Please select an approved quotation'); return }
    setSaving(true)
    setApiError('')
    setSuccess('')
    try {
      const res  = await apiFetch('/jobs', {
        method: 'POST',
        body: JSON.stringify({
          quotationId:          form.quotationId,
          assignedControllerId: form.assignedControllerId || undefined,
          department:           form.department || undefined,
          expectedStartDate:    form.expectedStartDate || undefined,
          deliveryPreference:   form.deliveryPreference,
        }),
      })
      const data = await res.json()
      if (!data.success) { setApiError(data.message || 'Failed to create job'); return }
      const newJob = data.data.job
      setSuccess(`Job ${newJob.jobNumber} created successfully. You can now send it to Workshop Controller.`)
      setNewJobId(newJob.id)
      setSelectedQuote(null)
      setForm({ quotationId: '', assignedControllerId: '', department: 'Service', expectedStartDate: '', deliveryPreference: 'Collection' })
      loadData()
    } catch {
      setApiError('Network error — could not reach server')
    } finally {
      setSaving(false)
    }
  }

  async function sendToWorkshopController() {
    if (!newJobId) return
    setSendingToWC(true)
    setApiError(''); setSuccess('')
    try {
      const res  = await apiFetch(`/front-desk/jobs/${newJobId}/send-to-workshop-controller`, {
        method: 'POST', body: JSON.stringify({ notes: sendToWCNotes }),
      })
      const data = await res.json()
      if (!data.success) { setApiError(data.message || 'Failed to send to Workshop Controller'); return }
      setSuccess('Job sent to Workshop Controller.')
      setNewJobId(null); setSendToWCNotes('')
      loadData()
    } catch { setApiError('Network error') }
    finally { setSendingToWC(false) }
  }

  const pendingCount  = approvedQuotes.filter(q => !jobs.find(j => j.quotationId === q.id)).length
  const assignedToday = jobs.filter(j => new Date(j.createdAt).toDateString() === new Date().toDateString()).length
  const readyCount    = jobs.filter(j => j.status === 'Ready').length

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Approved Quotations</p>
        <h2>Create Job After Customer Approval</h2>
        <p>Once a quote is approved, create the job card, assign a workshop controller and notify the parts interpreter.</p>
      </section>

      {loading ? (
        <div className="panel"><p style={{ textAlign: 'center', padding: 24, color: 'var(--muted)' }}>Loading…</p></div>
      ) : (
        <>
          <div className="metricGrid">
            <article className="metricCard"><p>Approved Quotes</p><h2>{pendingCount}</h2><span>Ready for job creation</span></article>
            <article className="metricCard"><p>Jobs Created Today</p><h2>{assignedToday}</h2><span>This session</span></article>
            <article className="metricCard"><p>Jobs in Progress</p><h2>{jobs.filter(j => j.status === 'InProgress').length}</h2><span>Active on workshop floor</span></article>
            <article className="metricCard"><p>Ready for Collection</p><h2>{readyCount}</h2><span>QC approved</span></article>
          </div>

          {(apiError || success) && (
            <div style={{
              background: success ? '#f0fdf4' : '#fff8f7',
              border: `1px solid ${success ? '#abefc6' : '#fda29b'}`,
              borderRadius: 12, padding: '12px 16px',
              color: success ? '#027a48' : '#b91c1c', fontWeight: 700, fontSize: 14,
            }}>
              {success || `⚠ ${apiError}`}
            </div>
          )}

          {/* Send to Workshop Controller — shown after job creation */}
          {newJobId && (
            <section className="panel" style={{ background: '#f0f9ff', border: '1px solid #b2ddff' }}>
              <div className="sectionHeader compact">
                <div>
                  <p className="eyebrow" style={{ color: '#175cd3' }}>Next step</p>
                  <h3>Send job to Workshop Controller</h3>
                  <p>The job has been created. Send it to the Workshop Controller for technician assignment.</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <input
                  style={{ flex: 1, padding: '9px 12px', borderRadius: 8, border: '1px solid #b2ddff', fontSize: 13 }}
                  value={sendToWCNotes}
                  onChange={e => setSendToWCNotes(e.target.value)}
                  placeholder="Optional notes for Workshop Controller…"
                />
                <button className="primaryBtn" onClick={sendToWorkshopController} disabled={sendingToWC}>
                  <Send size={15} /> {sendingToWC ? 'Sending…' : 'Send to Workshop Controller'}
                </button>
                <button className="softBtn" onClick={() => setNewJobId(null)}>Skip for now</button>
              </div>
            </section>
          )}

          {/* Select an approved quotation */}
          <section className="panel">
            <div className="sectionHeader">
              <div><h3>Approved Quotations</h3><p>Select a quote to create a job card.</p></div>
            </div>
            {approvedQuotes.length === 0 ? (
              <div className="infoStrip">No approved quotations waiting for job creation.</div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr><th>Quote #</th><th>Customer</th><th>Vehicle</th><th>Repair Type</th><th>Total</th><th>Approved</th><th></th></tr>
                  </thead>
                  <tbody>
                    {approvedQuotes.map(q => {
                      const hasJob = jobs.find(j => j.quotationId === q.id)
                      return (
                        <tr key={q.id} style={{ opacity: hasJob ? 0.5 : 1 }}>
                          <td><strong>{q.quoteNumber}</strong></td>
                          <td>{q.customer?.name}</td>
                          <td>{q.vehicle?.registrationNo}</td>
                          <td>{q.repairType}</td>
                          <td>{q.totalEstimate ? `${q.currency} ${parseFloat(q.totalEstimate).toLocaleString()}` : '—'}</td>
                          <td>{q.approvedAt ? new Date(q.approvedAt).toLocaleDateString('en-GB') : '—'}</td>
                          <td>
                            {hasJob ? (
                              <span className="statusPill green">Job Created</span>
                            ) : (
                              <button className="softBtn" onClick={() => selectQuote(q)}>
                                <CheckCircle2 size={13} /> Select
                              </button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Job creation form */}
          {selectedQuote && (
            <section className="panel">
              <div className="sectionHeader">
                <div>
                  <h3>Create Job — {selectedQuote.quoteNumber}</h3>
                  <p>{selectedQuote.customer?.name} · {selectedQuote.vehicle?.registrationNo} — {selectedQuote.vehicle?.makeModel}</p>
                </div>
                <span className="statusPill green"><CheckCircle2 size={14} /> Customer Approved</span>
              </div>

              <div className="formGrid adminForm">
                <label>
                  Assign Workshop Controller
                  <select value={form.assignedControllerId} onChange={e => setForm(p => ({ ...p, assignedControllerId: e.target.value }))}>
                    <option value="">— Unassigned —</option>
                    {controllers.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </label>
                <label>
                  Department
                  <select value={form.department} onChange={e => setForm(p => ({ ...p, department: e.target.value }))}>
                    <option>Service</option>
                    <option>Paint &amp; Panel</option>
                    <option>Parts</option>
                    <option>Body Shop</option>
                  </select>
                </label>
                <label>
                  Expected Start Date
                  <input type="date" value={form.expectedStartDate} onChange={e => setForm(p => ({ ...p, expectedStartDate: e.target.value }))} />
                </label>
                <label>
                  Delivery Preference
                  <select value={form.deliveryPreference} onChange={e => setForm(p => ({ ...p, deliveryPreference: e.target.value }))}>
                    <option>Collection</option>
                    <option>Delivery</option>
                  </select>
                </label>
              </div>

              <div className="jobFlowPreview">
                <div><CheckCircle2 /> Quote approved by customer</div>
                <div><Factory /> Job assigned to workshop controller</div>
                <div><Wrench /> Parts interpreter notified</div>
                <div><Bell /> Customer progress notifications enabled</div>
              </div>

              <div className="stickyActions">
                <button className="primaryBtn" onClick={createJob} disabled={saving}>
                  <Send size={16} /> {saving ? 'Creating…' : 'Create Job & Notify Teams'}
                </button>
                <button className="softBtn" onClick={() => setSelectedQuote(null)}>Cancel</button>
              </div>
            </section>
          )}

          {/* Recent jobs */}
          {jobs.length > 0 && (
            <section className="panel">
              <div className="sectionHeader"><h3>Recent Jobs</h3></div>
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr><th>Job #</th><th>Customer</th><th>Vehicle</th><th>Repair</th><th>Status</th><th>Progress</th><th></th></tr>
                  </thead>
                  <tbody>
                    {jobs.slice(0, 10).map(j => (
                      <tr key={j.id}>
                        <td><strong>{j.jobNumber}</strong></td>
                        <td>{j.quotation?.customer?.name}</td>
                        <td>{j.vehicle?.registrationNo}</td>
                        <td>{j.quotation?.repairType}</td>
                        <td><span className={`statusPill ${j.status === 'Completed' || j.status === 'Ready' ? 'green' : 'amber'}`}>{j.status}</span></td>
                        <td>{j.progress}%</td>
                        <td>
                          {['New', 'Accepted', 'Completed', 'QCReview', 'Ready'].includes(j.status) && (
                            <button className="softBtn" style={{ fontSize: 11 }}
                              onClick={() => { setNewJobId(j.id); setSuccess(''); setApiError('') }}>
                              <Send size={11} /> Send to WC
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  )
}

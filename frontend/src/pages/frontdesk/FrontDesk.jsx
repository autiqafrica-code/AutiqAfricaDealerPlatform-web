import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  BellRing, Car, Check, CheckCircle2, ChevronRight, Clock, CreditCard, FileCheck2, FilePlus2, Search, Send, Truck, UserCheck, UserPlus, X,
} from 'lucide-react'
import { apiFetch } from '../../utils/api'

const TABS = ['Overview', 'Jobs', 'Delivery', 'Additional Work']

export default function FrontDesk() {
  const location   = useLocation()
  const [activeTab, setActiveTab] = useState('Overview')

  const [customers,           setCustomers]           = useState([])
  const [jobs,                setJobs]                = useState([])
  const [readyJobs,           setReadyJobs]           = useState([])
  const [workshopControllers, setWorkshopControllers] = useState([])
  const [loading,       setLoading]       = useState(true)
  const [loadingReady,  setLoadingReady]  = useState(false)
  const [searchTerm,    setSearchTerm]    = useState('')
  const [showTodayOnly, setShowTodayOnly] = useState(false)
  const customerSectionRef = useRef(null)

  // Stats
  const [stats, setStats] = useState({ jobsToday: 0, pendingApprovals: 0, readyDelivery: 0, inWorkshop: 0 })

  // Job detail panel
  const [selectedJob,   setSelectedJob]   = useState(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [additionalWork,setAdditionalWork]= useState([])
  const [sendToWCNotes, setSendToWCNotes] = useState('')

  // Assign workshop controller
  const [assignWcId,    setAssignWcId]    = useState('')
  const [assignWcNotes, setAssignWcNotes] = useState('')

  // Payment / Completed status actions
  const [paymentNotes,   setPaymentNotes]   = useState('')
  const [completedNotes, setCompletedNotes] = useState('')

  // Contact / delivery
  const [contactMethod, setContactMethod] = useState('Phone')
  const [contactNotes,  setContactNotes]  = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [collectedBy,   setCollectedBy]   = useState('')

  // Notification
  const [completedJobs, setCompletedJobs] = useState([])
  const [notifForm,     setNotifForm]     = useState({ jobId: '', channel: 'WhatsApp', message: '' })
  const [notifSending,  setNotifSending]  = useState(false)
  const [notifMsg,      setNotifMsg]      = useState('')

  const [saving,  setSaving]  = useState(false)
  const [message, setMessage] = useState('')
  const [msgType, setMsgType] = useState('success')

  useEffect(() => { loadData(); loadWorkshopControllers() }, [location.state])

  useEffect(() => {
    if (activeTab === 'Delivery') loadReadyJobs()
  }, [activeTab])

  async function loadWorkshopControllers() {
    try {
      const res  = await apiFetch('/users?role=WorkshopController&limit=50')
      const data = await res.json()
      if (data.success) setWorkshopControllers(data.data.data || data.data || [])
    } catch { /* ignore */ }
  }

  async function loadData() {
    setLoading(true)
    try {
      const [custRes, jobRes, approvalRes] = await Promise.all([
        apiFetch('/customers?limit=20'),
        apiFetch('/front-desk/jobs?limit=50'),
        apiFetch('/quotations?status=SentToCustomer&limit=50'),
      ])
      const [custData, jobData, approvalData] = await Promise.all([
        custRes.json(), jobRes.json(), approvalRes.json(),
      ])

      if (custData.success) setCustomers(custData.data.data || [])
      if (jobData.success) {
        const list = jobData.data.data || []
        setJobs(list)
        const today = new Date().toDateString()
        setCompletedJobs(list.filter(j => ['Completed', 'TechnicianCompleted', 'InvoiceGenerated', 'PaymentCleared', 'ReadyForDelivery', 'CustomerContactedForDelivery'].includes(j.status)))
        setStats(s => ({
          ...s,
          jobsToday:   list.filter(j => new Date(j.createdAt).toDateString() === today).length,
          inWorkshop:  list.filter(j => ['InProgress', 'AssignedToTechnician', 'SentToWorkshopController'].includes(j.status)).length,
          readyDelivery: list.filter(j => ['PaymentCleared', 'ReadyForDelivery', 'CustomerContactedForDelivery'].includes(j.status)).length,
        }))
      }
      if (approvalData.success) setStats(s => ({ ...s, pendingApprovals: approvalData.data?.meta?.total || 0 }))
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function loadReadyJobs() {
    setLoadingReady(true)
    try {
      const res  = await apiFetch('/front-desk/jobs/ready-for-delivery?limit=50')
      const data = await res.json()
      if (data.success) setReadyJobs(data.data.data || [])
    } catch { /* ignore */ }
    finally { setLoadingReady(false) }
  }

  async function openJobDetail(jobId) {
    setLoadingDetail(true); setMessage('')
    setSendToWCNotes(''); setContactMethod('Phone'); setContactNotes('')
    setDeliveryNotes(''); setCollectedBy('')
    setAssignWcId(''); setAssignWcNotes(''); setPaymentNotes(''); setCompletedNotes('')
    try {
      const res  = await apiFetch(`/front-desk/jobs/${jobId}`)
      const data = await res.json()
      if (data.success) {
        setSelectedJob(data.data.job)
        setAdditionalWork(data.data.job.additionalWorkRequests || [])
      }
    } catch { /* ignore */ }
    finally { setLoadingDetail(false) }
  }

  async function assignWorkshopController() {
    if (!selectedJob || !assignWcId) { setMsgType('error'); setMessage('Select a Workshop Controller'); return }
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/jobs/${selectedJob.id}/assign-controller`, {
        method: 'PATCH',
        body: JSON.stringify({ controllerId: assignWcId, notes: assignWcNotes || undefined }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed to assign'); return }
      setSelectedJob(p => ({ ...p, assignedControllerId: assignWcId }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, assignedControllerId: assignWcId } : j))
      setMsgType('success'); setMessage('Workshop Controller assigned.')
      setAssignWcId(''); setAssignWcNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function markPayment() {
    if (!selectedJob) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/jobs/${selectedJob.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Payment', notes: paymentNotes || undefined }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setSelectedJob(p => ({ ...p, status: 'Payment' }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'Payment' } : j))
      setMsgType('success'); setMessage('Job moved to Payment. Customer and Accounts notified.')
      setPaymentNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function markCompleted() {
    if (!selectedJob) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/jobs/${selectedJob.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'Completed', notes: completedNotes || undefined }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setSelectedJob(p => ({ ...p, status: 'Completed' }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'Completed' } : j))
      setMsgType('success'); setMessage('Job marked Completed. Customer notified for delivery/pickup.')
      setCompletedNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function sendToWorkshopController() {
    if (!selectedJob) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/front-desk/jobs/${selectedJob.id}/send-to-workshop-controller`, {
        method: 'POST', body: JSON.stringify({ notes: sendToWCNotes }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setSelectedJob(p => ({ ...p, status: 'SentToWorkshopController' }))
      setJobs(p => p.map(j => j.id === selectedJob.id ? { ...j, status: 'SentToWorkshopController' } : j))
      setMsgType('success'); setMessage('Job sent to Workshop Controller.')
      setSendToWCNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function approveAdditionalWork(reqId) {
    if (!selectedJob) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/front-desk/jobs/${selectedJob.id}/additional-work/${reqId}/approve`, {
        method: 'POST', body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setAdditionalWork(p => p.map(r => r.id === reqId ? { ...r, status: 'APPROVED', customerDecision: 'APPROVED' } : r))
      setSelectedJob(p => ({ ...p, status: 'AdditionalWorkApproved' }))
      setMsgType('success'); setMessage('Additional work approved. Technician notified.')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function rejectAdditionalWork(reqId) {
    if (!selectedJob) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/front-desk/jobs/${selectedJob.id}/additional-work/${reqId}/reject`, {
        method: 'POST', body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setAdditionalWork(p => p.map(r => r.id === reqId ? { ...r, status: 'REJECTED', customerDecision: 'REJECTED' } : r))
      setSelectedJob(p => ({ ...p, status: 'AdditionalWorkRejected' }))
      setMsgType('success'); setMessage('Additional work rejected.')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function contactCustomer(jobId) {
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/front-desk/jobs/${jobId}/contact-customer-delivery`, {
        method: 'POST', body: JSON.stringify({ contactMethod, contactNotes }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setReadyJobs(p => p.map(j => j.id === jobId ? { ...j, status: 'CustomerContactedForDelivery' } : j))
      setMsgType('success'); setMessage('Customer contact recorded.')
      setContactNotes('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function completeDelivery(jobId) {
    if (!deliveryNotes.trim() && !collectedBy.trim()) {
      setMsgType('error'); setMessage('Please add delivery notes or collected-by name'); return
    }
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/front-desk/jobs/${jobId}/complete-delivery`, {
        method: 'POST', body: JSON.stringify({ deliveryNotes, collectedBy }),
      })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setReadyJobs(p => p.filter(j => j.id !== jobId))
      setMsgType('success'); setMessage('Vehicle delivery recorded. Job is now closed.')
      setDeliveryNotes(''); setCollectedBy('')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function closeJob(jobId) {
    if (!window.confirm('Close this job permanently?')) return
    setSaving(true); setMessage('')
    try {
      const res  = await apiFetch(`/front-desk/jobs/${jobId}/close`, { method: 'POST', body: JSON.stringify({}) })
      const data = await res.json()
      if (!data.success) { setMsgType('error'); setMessage(data.message || 'Failed'); return }
      setJobs(p => p.map(j => j.id === jobId ? { ...j, status: 'Closed' } : j))
      if (selectedJob?.id === jobId) setSelectedJob(p => ({ ...p, status: 'Closed' }))
      setMsgType('success'); setMessage('Job closed.')
    } catch { setMsgType('error'); setMessage('Network error') }
    finally { setSaving(false) }
  }

  async function sendNotification() {
    if (!notifForm.jobId) { setNotifMsg('Please select a completed job'); return }
    setNotifSending(true); setNotifMsg('')
    try {
      const res  = await apiFetch(`/jobs/${notifForm.jobId}/notify-customer`, {
        method: 'POST',
        body: JSON.stringify({ channel: notifForm.channel, message: notifForm.message || undefined }),
      })
      const data = await res.json()
      if (data.success) setNotifMsg('Customer notification sent successfully.')
      else setNotifMsg(data.message || 'Failed to send')
    } catch { setNotifMsg('Network error') }
    finally { setNotifSending(false) }
  }

  const today           = new Date().toDateString()
  const todaysCustomers = customers.filter(c => new Date(c.createdAt).toDateString() === today).length

  const filteredCustomers = useMemo(() => {
    let list = customers
    if (showTodayOnly) {
      const todayStr = new Date().toDateString()
      list = list.filter(c => new Date(c.createdAt).toDateString() === todayStr)
    }
    const term = searchTerm.trim().toLowerCase()
    if (!term) return list
    return list.filter(c =>
      `${c.name} ${c.phone} ${c.email} ${c.licenseNumber} ${c.address}`.toLowerCase().includes(term)
    )
  }, [customers, searchTerm, showTodayOnly])

  const pillColor = (s) => {
    const m = { InProgress: 'blue', Completed: 'green', Ready: 'green', VehicleDelivered: 'green',
      PaymentCleared: 'green', InvoiceGenerated: 'green', Closed: 'green',
      WaitingParts: 'amber', WaitingApproval: 'amber', New: 'amber', Accepted: 'blue',
      SentToWorkshopController: 'amber', AdditionalWorkIdentified: 'red',
      CustomerContactedForDelivery: 'blue', ReadyForDelivery: 'blue' }
    return m[s] || 'amber'
  }

  const pendingAW = additionalWork.filter(r => r.status === 'SENT_TO_FRONT_DESK' && !r.customerDecision)

  const canSendToWC    = selectedJob && ['New', 'Accepted', 'Completed', 'QCReview', 'Ready'].includes(selectedJob.status)
  const canAssignWC    = selectedJob && !['Closed', 'Cancelled', 'VehicleDelivered', 'Completed'].includes(selectedJob.status)
  const canMarkPayment = selectedJob && ['Ready', 'TechnicianCompleted', 'QCReview'].includes(selectedJob.status)
  const canMarkCompleted = selectedJob && ['Payment', 'PaymentCleared', 'InvoiceGenerated', 'ReadyForDelivery'].includes(selectedJob.status)

  return (
    <div className="pageStack">
      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '8px 18px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13,
            background: activeTab === t ? 'var(--brand, #1a3c5e)' : '#f2f4f7',
            color: activeTab === t ? '#fff' : '#344054', transition: 'background .15s',
          }}>
            {t}
          </button>
        ))}
      </div>

      {message && (
        <div style={{
          background: msgType === 'success' ? '#ecfdf3' : '#fee4e2',
          color:      msgType === 'success' ? '#027a48' : '#d92d20',
          border:     `1px solid ${msgType === 'success' ? '#abefc6' : '#fecdca'}`,
          borderRadius: 12, padding: '10px 14px', fontWeight: 700, fontSize: 13,
        }}>
          {message}
        </div>
      )}

      {/* ─── OVERVIEW ─────────────────────────────────────────── */}
      {activeTab === 'Overview' && (
        <>
          <div className="metricGrid">
            <Card title="Jobs today"         value={loading ? '…' : String(stats.jobsToday)}        note="Created today"           onClick={() => setActiveTab('Jobs')} />
            <Card title="New customers"      value={loading ? '…' : String(todaysCustomers)}        note="Created today"           onClick={() => { setShowTodayOnly(true); setTimeout(() => customerSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50) }} />
            <Card title="Waiting approval"   value={loading ? '…' : String(stats.pendingApprovals)} note="Customer review pending" to="/front-desk/create-quotation" />
            <Card title="Ready for delivery" value={loading ? '…' : String(stats.readyDelivery)}    note="Payment cleared"         onClick={() => setActiveTab('Delivery')} />
          </div>

          {location.state?.customerCreated && (
            <section className="panel" style={{ background: '#ecfdf3', border: '1px solid #abefc6', color: '#027a48', fontWeight: 700 }}>
              Customer created successfully.
            </section>
          )}

          <section className="panel heroPanel">
            <p className="eyebrow">Front Desk / Service Consultant</p>
            <h2>Customer Intake, Quotation and Job Handoff</h2>
            <p>Create customers, manage vehicles, prepare quotations, send approvals, convert approved quotations into jobs and manage delivery.</p>
            <div className="serviceConsultantGrid">
              <Link to="/front-desk/add-customer"><UserPlus /><strong>Add New Customer</strong><span>Create customer profile and communication preferences</span></Link>
              <Link to="/front-desk/add-vehicle"><Car /><strong>Add Customer Vehicle</strong><span>Attach multiple vehicles to one customer</span></Link>
              <Link to="/front-desk/create-quotation"><FilePlus2 /><strong>Create Quotation</strong><span>Request repair time, cost and parts details</span></Link>
              <Link to="/front-desk/post-approval-job"><FileCheck2 /><strong>Approved Quotations</strong><span>Create job and notify workshop and parts teams</span></Link>
              <Link to="/front-desk/reminder-settings"><BellRing /><strong>Approval Reminders</strong><span>Configure auto reminders for pending quotation approval</span></Link>
            </div>
          </section>

          {/* Customer notification */}
          <section className="panel">
            <div className="sectionHeader">
              <div>
                <p className="eyebrow">Customer notification</p>
                <h3>Notify customer for delivery or collection</h3>
              </div>
              <span className="accessBadge"><BellRing size={16} /> WhatsApp / Email</span>
            </div>
            <div className="notificationGrid">
              <div className="quoteUpdateCard">
                <div className="formGrid adminForm twoCols">
                  <label>
                    Completed job
                    <select value={notifForm.jobId} onChange={e => setNotifForm(p => ({ ...p, jobId: e.target.value }))}>
                      <option value="">— Select completed job —</option>
                      {completedJobs.map(j => (
                        <option key={j.id} value={j.id}>{j.jobNumber} — {j.quotation?.customer?.name}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Channel
                    <select value={notifForm.channel} onChange={e => setNotifForm(p => ({ ...p, channel: e.target.value }))}>
                      <option>WhatsApp</option><option>Email</option>
                    </select>
                  </label>
                  <label className="wide">
                    Message
                    <textarea
                      value={notifForm.message}
                      onChange={e => setNotifForm(p => ({ ...p, message: e.target.value }))}
                      placeholder="Your vehicle service is complete. Please collect your vehicle from the service desk."
                    />
                  </label>
                </div>
                {notifMsg && (
                  <p style={{ color: notifMsg.startsWith('Customer') ? '#027a48' : '#b91c1c', fontWeight: 700, fontSize: 13, marginBottom: 12 }}>
                    {notifMsg}
                  </p>
                )}
                <button className="primaryBtn" type="button" onClick={sendNotification} disabled={notifSending}>
                  <Send size={16} /> {notifSending ? 'Sending…' : 'Send notification'}
                </button>
              </div>
            </div>
          </section>

          {/* Customer list */}
          <section className="panel" ref={customerSectionRef}>
            <div className="sectionHeader compact">
              <div>
                <p className="eyebrow">Customer records</p>
                <h3>{showTodayOnly ? "New customers added today" : "Recently created customers"}</h3>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                {showTodayOnly && (
                  <button
                    onClick={() => setShowTodayOnly(false)}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, border: '1px solid #d0d5dd', borderRadius: 20, background: '#f0f9ff', color: '#175cd3', fontWeight: 700, fontSize: 12, padding: '5px 12px', cursor: 'pointer' }}
                  >
                    Today only <X size={13} />
                  </button>
                )}
                <Link className="primaryBtn" to="/front-desk/add-customer"><UserPlus size={16} /> Add Customer</Link>
              </div>
            </div>
            <div className="searchBar">
              <Search size={18} />
              <input
                placeholder="Search by name, phone, email, licence number"
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            {filteredCustomers.length === 0 ? (
              <div className="infoStrip">
                {loading ? 'Loading customers…' : showTodayOnly
                  ? 'No new customers were added today.'
                  : customers.length === 0 ? 'No customers yet.' : 'No customers match your search.'}
              </div>
            ) : (
              <div className="tableWrap compactTable">
                <table>
                  <thead><tr><th>Customer</th><th>Contact</th><th>Preference</th><th>Status</th></tr></thead>
                  <tbody>
                    {filteredCustomers.map(c => (
                      <tr key={c.id}>
                        <td><strong>{c.name}</strong></td>
                        <td><strong>{c.phone}</strong>{c.email && <><br /><small>{c.email}</small></>}</td>
                        <td>{c.communicationPreference}</td>
                        <td><span className="statusPill success">{c.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      {/* ─── JOBS TAB ─────────────────────────────────────────── */}
      {activeTab === 'Jobs' && (
        <>
          <section className="panel">
            <div className="sectionHeader compact">
              <div>
                <p className="eyebrow">All jobs</p>
                <h3>Manage and send jobs to Workshop Controller</h3>
              </div>
              <Link className="primaryBtn" to="/front-desk/post-approval-job"><FileCheck2 size={16} /> Create Job</Link>
            </div>

            {loading ? (
              <p style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
            ) : jobs.length === 0 ? (
              <div className="infoStrip">No active jobs. Create a job from an approved quotation.</div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr><th>Job #</th><th>Customer</th><th>Vehicle</th><th>Status</th><th>Progress</th><th></th></tr>
                  </thead>
                  <tbody>
                    {jobs.map(j => (
                      <tr key={j.id} style={{ background: selectedJob?.id === j.id ? '#f0f9ff' : undefined }}>
                        <td><strong>{j.jobNumber}</strong></td>
                        <td>{j.quotation?.customer?.name}</td>
                        <td>{j.vehicle?.registrationNo}</td>
                        <td><span className={`pill ${pillColor(j.status)}`}>{j.status}</span></td>
                        <td>{j.progress || 0}%</td>
                        <td>
                          <button className="softBtn" onClick={() => openJobDetail(j.id)}>
                            <ChevronRight size={14} /> Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {loadingDetail && (
            <div className="panel" style={{ textAlign: 'center', padding: 30, color: 'var(--muted)' }}>Loading job details…</div>
          )}

          {selectedJob && !loadingDetail && (
            <section className="panel">
              <div className="sectionHeader compact">
                <div>
                  <h3>Job — {selectedJob.jobNumber}</h3>
                  <p>
                    {selectedJob.quotation?.customer?.name}
                    {selectedJob.vehicle?.registrationNo ? ` · ${selectedJob.vehicle.registrationNo}` : ''}
                    {selectedJob.quotation?.repairType ? ` — ${selectedJob.quotation.repairType}` : ''}
                  </p>
                  <span className={`pill ${pillColor(selectedJob.status)}`} style={{ marginTop: 4, display: 'inline-block' }}>
                    {selectedJob.status}
                  </span>
                </div>
                <button className="softBtn" onClick={() => setSelectedJob(null)}><X size={14} /> Close</button>
              </div>

              {/* Send to Workshop Controller */}
              {canSendToWC && (
                <div style={{ borderBottom: '1px solid #e4e7ec', paddingBottom: 16, marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Send to Workshop Controller</h4>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13 }}
                      value={sendToWCNotes}
                      onChange={e => setSendToWCNotes(e.target.value)}
                      placeholder="Optional notes for Workshop Controller…"
                    />
                    <button className="primaryBtn" onClick={sendToWorkshopController} disabled={saving}>
                      <Send size={14} /> Send to Workshop
                    </button>
                  </div>
                </div>
              )}

              {/* Assign Workshop Controller */}
              {canAssignWC && (
                <div style={{ borderBottom: '1px solid #e4e7ec', paddingBottom: 16, marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Assign Workshop Controller</h4>
                  {selectedJob.assignedController && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                      Currently: <strong>{selectedJob.assignedController.name}</strong>
                    </p>
                  )}
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <select
                      value={assignWcId}
                      onChange={e => setAssignWcId(e.target.value)}
                      style={{ flex: 1, minWidth: 160, padding: '8px 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13 }}
                    >
                      <option value="">— Select Workshop Controller —</option>
                      {workshopControllers.map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <input
                      style={{ flex: 1, minWidth: 140, padding: '8px 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13 }}
                      value={assignWcNotes}
                      onChange={e => setAssignWcNotes(e.target.value)}
                      placeholder="Notes (optional)…"
                    />
                    <button className="primaryBtn" onClick={assignWorkshopController} disabled={saving || !assignWcId}>
                      <UserCheck size={14} /> Assign WC
                    </button>
                  </div>
                </div>
              )}

              {/* Mark as Payment */}
              {canMarkPayment && (
                <div style={{ borderBottom: '1px solid #e4e7ec', paddingBottom: 16, marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Send to Payment</h4>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    Job is ready. Notify customer to make payment and alert Accounts department.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13 }}
                      value={paymentNotes}
                      onChange={e => setPaymentNotes(e.target.value)}
                      placeholder="Notes for customer/accounts (optional)…"
                    />
                    <button className="primaryBtn" onClick={markPayment} disabled={saving}
                      style={{ background: 'var(--teal)', whiteSpace: 'nowrap' }}>
                      <CreditCard size={14} /> Mark Payment
                    </button>
                  </div>
                </div>
              )}

              {/* Mark as Completed */}
              {canMarkCompleted && (
                <div style={{ borderBottom: '1px solid #e4e7ec', paddingBottom: 16, marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Mark as Completed</h4>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    Once accounts confirms payment, mark job complete and notify customer for delivery/pickup.
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 13 }}
                      value={completedNotes}
                      onChange={e => setCompletedNotes(e.target.value)}
                      placeholder="Delivery/pickup notes (optional)…"
                    />
                    <button className="primaryBtn" onClick={markCompleted} disabled={saving}
                      style={{ background: '#039855', whiteSpace: 'nowrap' }}>
                      <CheckCircle2 size={14} /> Mark Completed
                    </button>
                  </div>
                </div>
              )}

              {/* Close job */}
              {!['Closed', 'Cancelled', 'VehicleDelivered'].includes(selectedJob.status) && (
                <div style={{ marginBottom: 16 }}>
                  <button className="softBtn" onClick={() => closeJob(selectedJob.id)} disabled={saving}
                    style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}>
                    Close job
                  </button>
                </div>
              )}

              {/* Completion report */}
              {selectedJob.completionReport && (
                <div style={{ background: '#f9fafb', borderRadius: 10, padding: '12px 16px', marginBottom: 16 }}>
                  <h4 style={{ marginBottom: 8 }}>Technician completion report</h4>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span className={`pill ${selectedJob.completionReport.issueSeverity === 'GREEN' ? 'green' : selectedJob.completionReport.issueSeverity === 'AMBER' ? 'amber' : 'red'}`}>
                      {selectedJob.completionReport.issueSeverity}
                    </span>
                    <span style={{ fontSize: 13 }}>{selectedJob.completionReport.completionNotes}</span>
                  </div>
                  {selectedJob.completionReport.remainingIssues && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Remaining: {selectedJob.completionReport.remainingIssues}</p>
                  )}
                  {selectedJob.completionReport.customerAdvisoryNotes && (
                    <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Advisory: {selectedJob.completionReport.customerAdvisoryNotes}</p>
                  )}
                </div>
              )}

              {/* Timeline */}
              {selectedJob.statusHistory?.length > 0 && (
                <div>
                  <h4 style={{ marginBottom: 8 }}>Status timeline</h4>
                  <div style={{ borderLeft: '3px solid #e4e7ec', paddingLeft: 14 }}>
                    {selectedJob.statusHistory.slice().reverse().map((h, i) => (
                      <div key={h.id || i} style={{ marginBottom: 12, position: 'relative' }}>
                        <div style={{ position: 'absolute', left: -20, top: 4, width: 10, height: 10, borderRadius: '50%', background: '#175cd3' }} />
                        <p style={{ fontWeight: 600, fontSize: 13 }}>{h.title}</p>
                        {h.notes && <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{h.notes}</p>}
                        <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {h.performedByName || 'System'} · {new Date(h.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {/* ─── DELIVERY TAB ─────────────────────────────────────── */}
      {activeTab === 'Delivery' && (
        <section className="panel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Vehicle collection &amp; delivery</p>
              <h3>Vehicles ready for customer collection or delivery</h3>
            </div>
            <span className="accessBadge"><Truck size={15} /> Delivery management</span>
          </div>

          {loadingReady ? (
            <p style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
          ) : readyJobs.length === 0 ? (
            <div className="infoStrip">No vehicles are currently ready for delivery or collection.</div>
          ) : (
            readyJobs.map(j => (
              <div key={j.id} style={{ borderBottom: '1px solid #e4e7ec', paddingBottom: 20, marginBottom: 20 }}>
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <strong>{j.jobNumber}</strong>
                    <span className={`pill ${pillColor(j.status)}`} style={{ marginLeft: 8 }}>{j.status}</span>
                    <p style={{ fontSize: 13, marginTop: 4, color: 'var(--muted)' }}>
                      {j.quotation?.customer?.name} · {j.vehicle?.registrationNo} {j.vehicle?.makeModel}
                    </p>
                    {j.invoice && (
                      <p style={{ fontSize: 12, marginTop: 2, color: 'var(--muted)' }}>
                        Invoice: {j.invoice.paymentStatus} · {j.quotation?.currency} {parseFloat(j.invoice?.total || 0).toLocaleString()}
                      </p>
                    )}
                    {j.completionReport && (
                      <span className={`pill ${j.completionReport.issueSeverity === 'GREEN' ? 'green' : j.completionReport.issueSeverity === 'AMBER' ? 'amber' : 'red'}`} style={{ fontSize: 11, marginTop: 4, display: 'inline-block' }}>
                        {j.completionReport.issueSeverity}
                      </span>
                    )}
                  </div>
                </div>

                {/* Contact customer */}
                {j.status !== 'CustomerContactedForDelivery' && (
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                    <select
                      value={contactMethod}
                      onChange={e => setContactMethod(e.target.value)}
                      style={{ padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 12 }}
                    >
                      <option>Phone</option><option>WhatsApp</option><option>Email</option>
                    </select>
                    <input
                      style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 12, minWidth: 140 }}
                      value={contactNotes}
                      onChange={e => setContactNotes(e.target.value)}
                      placeholder="Contact notes…"
                    />
                    <button className="softBtn" onClick={() => contactCustomer(j.id)} disabled={saving}>
                      <Clock size={13} /> Mark Contacted
                    </button>
                  </div>
                )}

                {/* Complete delivery */}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input
                    style={{ flex: 1, padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 12, minWidth: 140 }}
                    value={deliveryNotes}
                    onChange={e => setDeliveryNotes(e.target.value)}
                    placeholder="Delivery / collection notes…"
                  />
                  <input
                    style={{ width: 160, padding: '7px 10px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: 12 }}
                    value={collectedBy}
                    onChange={e => setCollectedBy(e.target.value)}
                    placeholder="Collected by (name)"
                  />
                  <button className="primaryBtn" onClick={() => completeDelivery(j.id)} disabled={saving} style={{ background: '#039855', color: '#fff' }}>
                    <Check size={13} /> Complete Delivery
                  </button>
                </div>
              </div>
            ))
          )}
        </section>
      )}

      {/* ─── ADDITIONAL WORK TAB ─────────────────────────────── */}
      {activeTab === 'Additional Work' && (
        <>
          <section className="panel">
            <div className="sectionHeader compact">
              <div>
                <p className="eyebrow">From technicians</p>
                <h3>Additional work requests needing customer approval</h3>
              </div>
            </div>

            {loading ? (
              <p style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
            ) : jobs.filter(j => j.status === 'AdditionalWorkIdentified').length === 0 ? (
              <div className="infoStrip">No jobs with pending additional work requests.</div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr><th>Job #</th><th>Customer</th><th>Vehicle</th><th>Status</th><th></th></tr>
                  </thead>
                  <tbody>
                    {jobs.filter(j => j.status === 'AdditionalWorkIdentified').map(j => (
                      <tr key={j.id} style={{ background: selectedJob?.id === j.id ? '#fffaeb' : undefined }}>
                        <td><strong>{j.jobNumber}</strong></td>
                        <td>{j.quotation?.customer?.name}</td>
                        <td>{j.vehicle?.registrationNo}</td>
                        <td><span className="pill red">Additional work identified</span></td>
                        <td>
                          <button className="softBtn" onClick={() => openJobDetail(j.id)}>
                            <ChevronRight size={14} /> Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {selectedJob && !loadingDetail && (
            <section className="panel">
              <div className="sectionHeader compact">
                <div>
                  <h3>{selectedJob.jobNumber} — additional work requests</h3>
                  <p>{selectedJob.quotation?.customer?.name} · {selectedJob.vehicle?.registrationNo}</p>
                </div>
                <button className="softBtn" onClick={() => setSelectedJob(null)}><X size={14} /> Close</button>
              </div>

              {pendingAW.length === 0 ? (
                <div className="infoStrip">No pending additional work requests for this job.</div>
              ) : (
                pendingAW.map(aw => (
                  <div key={aw.id} style={{ background: '#fffaeb', borderRadius: 12, padding: '14px 16px', marginBottom: 14, border: '1px solid #fde68a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 700, marginBottom: 4 }}>{aw.description}</p>
                        {aw.reason && <p style={{ fontSize: 12, color: 'var(--muted)' }}>Reason: {aw.reason}</p>}
                        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                          <span className={`pill ${aw.severity === 'High' || aw.severity === 'Critical' ? 'red' : aw.severity === 'Medium' ? 'amber' : 'green'}`}>{aw.severity}</span>
                          {aw.estimatedTotalCost && <span>Est: {aw.currency} {parseFloat(aw.estimatedTotalCost).toLocaleString()}</span>}
                          {aw.estimatedLabourHours && <span>Labour: {aw.estimatedLabourHours}</span>}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button className="primaryBtn" onClick={() => approveAdditionalWork(aw.id)} disabled={saving}
                          style={{ background: '#039855', color: '#fff', fontSize: 12 }}>
                          <Check size={12} /> Approve
                        </button>
                        <button className="softBtn" onClick={() => rejectAdditionalWork(aw.id)} disabled={saving}
                          style={{ color: 'var(--danger)', borderColor: 'var(--danger)', fontSize: 12 }}>
                          <X size={12} /> Reject
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}

              {additionalWork.filter(r => r.customerDecision).length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <h4 style={{ marginBottom: 8, fontSize: 13, color: 'var(--muted)' }}>Decided requests</h4>
                  {additionalWork.filter(r => r.customerDecision).map(aw => (
                    <div key={aw.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #e4e7ec' }}>
                      <span>{aw.description}</span>
                      <span className={`pill ${aw.customerDecision === 'APPROVED' ? 'green' : 'red'}`}>{aw.customerDecision}</span>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  )
}

function Card({ title, value, note, onClick, to }) {
  const inner = (
    <article className={`metricCard${onClick || to ? ' metricCardLink' : ''}`}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <p style={{ margin: 0 }}>{title}</p>
        {(onClick || to) && <ChevronRight size={16} style={{ color: 'var(--muted)', flexShrink: 0, marginTop: 1 }} />}
      </div>
      <h2>{value}</h2>
      <span>{note}</span>
    </article>
  )
  if (to) return <Link to={to} style={{ textDecoration: 'none', display: 'block' }}>{inner}</Link>
  if (onClick) return <div onClick={onClick} style={{ cursor: 'pointer' }}>{inner}</div>
  return inner
}

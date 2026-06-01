import { useEffect, useState } from 'react'
import { BellRing, Save, Send, Trash2 } from 'lucide-react'
import { apiFetch } from '../../utils/api'

const CHANNELS    = ['WhatsApp', 'Email']
const DELAYS      = ['1 hour after quote sent','2 hours after quote sent','4 hours after quote sent','Next morning 09:00']
const FREQUENCIES = ['Every 12 hours','Every 24 hours','Every 48 hours','Daily at 10:00']
const STOPS       = ['Approved or rejected','Approved only','Payment received','Max attempts reached']

const defaultForm = {
  quotationId: '', channel: 'WhatsApp', firstReminderDelay: '2 hours after quote sent',
  repeatFrequency: 'Every 24 hours', maxAttempts: '3',
  stopCondition: 'Approved or rejected', messageTemplate: '', status: 'Active',
}

export default function ReminderSettings() {
  const [rules,        setRules]        = useState([])
  const [quotations,   setQuotations]   = useState([])
  const [loading,      setLoading]      = useState(true)
  const [form,         setForm]         = useState(defaultForm)
  const [saving,       setSaving]       = useState(false)
  const [testing,      setTesting]      = useState(false)
  const [apiError,     setApiError]     = useState('')
  const [success,      setSuccess]      = useState('')
  const [deletingId,   setDeletingId]   = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    try {
      const [rRes, qRes] = await Promise.all([
        apiFetch('/notifications/reminders?limit=50'),
        apiFetch('/quotations?status=SentToCustomer&limit=50'),
      ])
      const [rData, qData] = await Promise.all([rRes.json(), qRes.json()])
      if (rData.success) setRules(rData.data.data || [])
      if (qData.success) setQuotations(qData.data.data || [])
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function saveRule() {
    if (!form.quotationId) { setApiError('Please select a quotation'); return }
    setSaving(true)
    setApiError('')
    setSuccess('')
    try {
      const res  = await apiFetch('/notifications/reminders', {
        method: 'POST',
        body: JSON.stringify({
          quotationId:        form.quotationId,
          channel:            form.channel,
          firstReminderDelay: form.firstReminderDelay,
          repeatFrequency:    form.repeatFrequency,
          maxAttempts:        parseInt(form.maxAttempts),
          stopCondition:      form.stopCondition,
          messageTemplate:    form.messageTemplate.trim() || undefined,
          status:             form.status,
        }),
      })
      const data = await res.json()
      if (!data.success) { setApiError(data.message || 'Failed to save reminder rule'); return }
      setSuccess('Reminder rule created successfully.')
      setForm(defaultForm)
      loadData()
    } catch {
      setApiError('Network error — could not reach server')
    } finally {
      setSaving(false)
    }
  }

  async function sendTest() {
    if (!form.quotationId) { setApiError('Please select a quotation first'); return }
    setTesting(true)
    setApiError('')
    try {
      const res  = await apiFetch('/notifications/reminders/test', {
        method: 'POST',
        body: JSON.stringify({
          quotationId: form.quotationId,
          channel:     form.channel,
          message:     form.messageTemplate || 'Test reminder: Your quotation is waiting for approval.',
        }),
      })
      const data = await res.json()
      if (data.success) setSuccess('Test reminder sent.')
      else setApiError(data.message || 'Failed to send test')
    } catch {
      setApiError('Network error')
    } finally {
      setTesting(false)
    }
  }

  async function toggleStatus(rule) {
    const next = rule.status === 'Active' ? 'Paused' : 'Active'
    try {
      await apiFetch(`/notifications/reminders/${rule.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: next }),
      })
      setRules(prev => prev.map(r => r.id === rule.id ? { ...r, status: next } : r))
    } catch { /* ignore */ }
  }

  async function deleteRule(id) {
    if (!window.confirm('Delete this reminder rule?')) return
    setDeletingId(id)
    try {
      await apiFetch(`/notifications/reminders/${id}`, { method: 'DELETE' })
      setRules(prev => prev.filter(r => r.id !== id))
    } catch { /* ignore */ }
    finally { setDeletingId(null) }
  }

  function field(key) {
    return { value: form[key], onChange: e => setForm(p => ({ ...p, [key]: e.target.value })) }
  }

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Front Desk / Pending quotation approval</p>
        <h2>Configure auto reminders to customers</h2>
        <p>Set reminder timing, channel, repeat frequency and maximum attempts for customers who have not approved or rejected a quotation.</p>
      </div>

      <div className="panel formPanel">
        <div className="sectionHeader compact">
          <div>
            <p className="eyebrow">Reminder automation</p>
            <h3>Create approval reminder rule</h3>
          </div>
          <span className="accessBadge"><BellRing size={16} /> WhatsApp / Email</span>
        </div>

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

        <div className="formGrid adminForm twoCols">
          <label>
            Pending quotation
            <select {...field('quotationId')}>
              <option value="">— Select quotation —</option>
              {quotations.map(q => (
                <option key={q.id} value={q.id}>{q.quoteNumber} — {q.customer?.name}</option>
              ))}
            </select>
          </label>
          <label>
            Customer channel
            <select {...field('channel')}>
              {CHANNELS.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label>
            First reminder
            <select {...field('firstReminderDelay')}>
              {DELAYS.map(d => <option key={d}>{d}</option>)}
            </select>
          </label>
          <label>
            Repeat frequency
            <select {...field('repeatFrequency')}>
              {FREQUENCIES.map(f => <option key={f}>{f}</option>)}
            </select>
          </label>
          <label>
            Maximum attempts
            <select {...field('maxAttempts')}>
              {['1','2','3','4','5'].map(n => <option key={n}>{n}</option>)}
            </select>
          </label>
          <label>
            Stop reminders when
            <select {...field('stopCondition')}>
              {STOPS.map(s => <option key={s}>{s}</option>)}
            </select>
          </label>
          <label>
            Status
            <select {...field('status')}>
              <option>Active</option>
              <option>Paused</option>
            </select>
          </label>
          <label className="wide">
            Reminder message template
            <textarea
              placeholder="Your Autiq Africa quotation is waiting for approval. Please open the secure approval link to approve, reject, or request changes."
              {...field('messageTemplate')}
            />
          </label>
        </div>

        <div className="rowActions">
          <button className="primaryBtn" onClick={saveRule} disabled={saving}>
            <Save size={16} /> {saving ? 'Saving…' : 'Save reminder rule'}
          </button>
          <button className="softBtn" onClick={sendTest} disabled={testing}>
            <Send size={16} /> {testing ? 'Sending…' : 'Send test reminder'}
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="sectionHead">
          <h2>Active quotation approval reminder rules</h2>
        </div>
        {loading ? (
          <p style={{ padding: 20, textAlign: 'center', color: 'var(--muted)' }}>Loading…</p>
        ) : (
          <div className="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Rule</th><th>Quote</th><th>Customer</th><th>Channel</th>
                  <th>First Reminder</th><th>Repeat</th><th>Attempts</th><th>Status</th><th></th>
                </tr>
              </thead>
              <tbody>
                {rules.length === 0 ? (
                  <tr><td colSpan={9} style={{ textAlign: 'center', padding: 20, color: 'var(--muted)' }}>No reminder rules configured yet.</td></tr>
                ) : rules.map(rule => (
                  <tr key={rule.id}>
                    <td><strong>{rule.ruleCode}</strong></td>
                    <td>{rule.quotation?.quoteNumber}</td>
                    <td>{rule.quotation?.customer?.name}</td>
                    <td>{rule.channel}</td>
                    <td>{rule.firstReminderDelay}</td>
                    <td>{rule.repeatFrequency}</td>
                    <td>{rule.currentAttempts}/{rule.maxAttempts}</td>
                    <td>
                      <span className={`pill ${rule.status === 'Active' ? 'green' : 'amber'}`}>{rule.status}</span>
                    </td>
                    <td style={{ display: 'flex', gap: 6 }}>
                      <button className="softBtn" onClick={() => toggleStatus(rule)}>
                        {rule.status === 'Active' ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        style={{ border: 0, background: 'transparent', cursor: 'pointer', color: '#d92d20' }}
                        disabled={deletingId === rule.id}
                        onClick={() => deleteRule(rule.id)}
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  )
}

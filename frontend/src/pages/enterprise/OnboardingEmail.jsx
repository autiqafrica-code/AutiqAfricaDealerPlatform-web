import { useEffect, useState } from 'react'
import { Mail, MessageCircle, Send } from 'lucide-react'
import { apiFetch } from '../../utils/api'

export default function OnboardingEmail() {
  const [clients, setClients] = useState([])
  const [workshops, setWorkshops] = useState([])
  const [selectedClientId, setSelectedClientId] = useState('')
  const [msg, setMsg] = useState('')
  const [msgType, setMsgType] = useState('success')
  const [sending, setSending] = useState(false)

  const [form, setForm] = useState({
    recipientEmail: '',
    ceoWhatsApp: '',
    workshopWhatsApp: '',
    ccEmails: '',
    customBody: '',
    whatsappMessage: 'Welcome to Autiq Africa. Your dealer workspace is ready. Login link: https://app.autiqafrica.com/login. Your users and modules have been configured.',
    sendEmail: true,
    sendWhatsApp: false,
  })

  useEffect(() => {
    apiFetch('/clients?limit=200').then(r => r.json()).then(d => {
      if (d.success) setClients(d.data.clients || [])
    })
  }, [])

  useEffect(() => {
    if (!selectedClientId) { setWorkshops([]); return }
    apiFetch(`/workshops?clientId=${selectedClientId}&limit=100`).then(r => r.json()).then(d => {
      if (d.success) {
        const ws = d.data.workshops || []
        setWorkshops(ws)
        if (ws.length) {
          const first = ws[0]
          setForm(f => ({
            ...f,
            recipientEmail: first.ceoEmail || '',
            ceoWhatsApp: first.ceoPhone || '',
            workshopWhatsApp: first.whatsapp || first.phone || '',
          }))
        }
      }
    })
  }, [selectedClientId])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  const selectedClient = clients.find(c => c.id === selectedClientId)

  async function sendEmail() {
    if (!form.recipientEmail.trim()) { setMsg('Enter recipient email'); setMsgType('error'); return }
    setSending(true)
    setMsg('')
    try {
      const res = await apiFetch('/enterprise/send-onboarding-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId:       selectedClientId || undefined,
          recipientEmail: form.recipientEmail.trim(),
          cc:             form.ccEmails.trim() || undefined,
          customBody:     form.customBody.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (data.success) {
        setMsg(data.data?.message || 'Email sent')
        setMsgType('success')
      } else {
        setMsg(data.message || 'Failed to send email')
        setMsgType('error')
      }
    } catch (err) {
      setMsg('Network error — could not send email')
      setMsgType('error')
    } finally {
      setSending(false)
      setTimeout(() => setMsg(''), 5000)
    }
  }

  async function sendWhatsApp() {
    if (!form.ceoWhatsApp.trim() && !form.workshopWhatsApp.trim()) {
      setMsg('Enter a WhatsApp number'); setMsgType('error'); return
    }
    setMsg('WhatsApp integration not yet configured — contact support@autiqafrica.com')
    setMsgType('error')
    setTimeout(() => setMsg(''), 4000)
  }

  async function sendBoth() {
    await sendEmail()
    if (form.sendWhatsApp) await sendWhatsApp()
  }

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Onboarding notification</p>
        <h2>Send onboarding email after setup</h2>
        <p>Notify the dealer CEO and workshop contacts when the workspace, modules, users, currencies and invoice format are ready.</p>
      </div>

      <div className="grid two">
        <div className="panel formPanel">
          <h3>Notification setup</h3>
          <div className="formGrid">
            <label>Client
              <select value={selectedClientId} onChange={e => setSelectedClientId(e.target.value)}>
                <option value="">— Select client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Workshop
              <select onChange={e => {
                const ws = workshops.find(w => w.id === e.target.value)
                if (ws) setForm(f => ({ ...f, recipientEmail: ws.ceoEmail || '', ceoWhatsApp: ws.ceoPhone || '', workshopWhatsApp: ws.whatsapp || ws.phone || '' }))
              }}>
                <option value="">All workshops</option>
                {workshops.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </label>
            <label>Recipient CEO email
              <input value={form.recipientEmail} onChange={e => set('recipientEmail', e.target.value)} placeholder="ceo@dealer.com" />
            </label>
            <label>CEO WhatsApp number
              <input value={form.ceoWhatsApp} onChange={e => set('ceoWhatsApp', e.target.value)} placeholder="+27 82 555 0101" />
            </label>
            <label>Workshop WhatsApp number
              <input value={form.workshopWhatsApp} onChange={e => set('workshopWhatsApp', e.target.value)} placeholder="+27 82 555 0102" />
            </label>
            <label className="wide">CC emails
              <input value={form.ccEmails} onChange={e => set('ccEmails', e.target.value)} placeholder="workshop@dealer.com, accounts@dealer.com" />
            </label>
            <label className="wide">Custom message body (optional)
              <textarea
                value={form.customBody}
                onChange={e => set('customBody', e.target.value)}
                placeholder="Leave blank to use the default onboarding message"
                rows={3}
              />
            </label>
          </div>
          {msg && (
            <p className={msgType === 'error' ? 'errorMsg' : 'successMsg'}>{msg}</p>
          )}
          <div className="rowActions notificationActions">
            <button className="primaryBtn" onClick={sendEmail} disabled={sending}>
              <Mail size={16} /> {sending ? 'Sending…' : 'Send Email'}
            </button>
            <button className="primaryBtn" onClick={sendWhatsApp} disabled={sending}>
              <MessageCircle size={16} /> Send WhatsApp
            </button>
            <button className="softBtn" onClick={sendBoth} disabled={sending}>
              <Send size={16} /> Send Both
            </button>
          </div>
        </div>

        <div className="panel emailPreview">
          <h3>Email preview</h3>
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: '0.9rem' }}>{`Hello CEO,

Your Autiq Africa dealer workspace${selectedClient ? ` for ${selectedClient.name}` : ''} has been configured. Your workshops, users, modules, currency and invoice format are ready.

${form.customBody.trim() || 'Login to get started — your admin has set up all the necessary configurations.'}

Login: ${(import.meta.env.VITE_API_URL || 'http://localhost:5173').replace('/api', '')}/login
Support: support@autiqafrica.com

Regards,
Autiq Africa Enterprise Team`}</pre>
        </div>
      </div>
    </section>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ShieldCheck, Wrench } from 'lucide-react'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'
import { LOGIN_ROLES, LOGIN_ROLE_DEFAULTS } from '../../config/appConfig'

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8005/api'

export default function Login({ auth }) {
  const [selectedRole, setSelectedRole] = useState(LOGIN_ROLES[0])
  const defaults = LOGIN_ROLE_DEFAULTS[LOGIN_ROLES[0].display]
  const [email, setEmail]       = useState(defaults.email)
  const [password, setPassword] = useState(defaults.password)
  const [loading, setLoading]   = useState(false)
  const [loginError, setLoginError] = useState('')

  const handleRoleChange = (display) => {
    const role = LOGIN_ROLES.find((r) => r.display === display) || LOGIN_ROLES[0]
    setSelectedRole(role)
    setLoginError('')
    const d = LOGIN_ROLE_DEFAULTS[role.display] || { email: '', password: '' }
    setEmail(d.email)
    setPassword(d.password)
  }

  const handleLogin = async () => {
    setLoginError('')
    if (!email.trim() || !password) {
      setLoginError('Email and password are required.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          email,
          password,
          allowedRoles: selectedRole.allowedCodes,
        }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setLoginError(data.message || 'Invalid email or password')
        return
      }
      auth.login({ token: data.data.token, user: data.data.user })
    } catch {
      setLoginError('Cannot reach the server. Make sure the backend is running.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="landingPage loginShell">
      <MarketingHeader />
      <div className="loginPage">
        <section className="loginHero">
          <div className="logoMark large">AA</div>
          <p className="eyebrow">Secure workspace access</p>
          <h1><span>Autiq Africa</span><span>Dealer & Workshop</span></h1>
          <p>Select a user role, enter your credentials, and access only the screens that role can use.</p>
          <div className="heroList">
            <span><ShieldCheck size={18} /> Enterprise Admin has SaaS-only control screens</span>
            <span><Wrench size={18} /> Technician gets a mobile-first work screen</span>
          </div>
        </section>
        <section className="loginCard">
          <Wrench size={34} />
          <h2>Login</h2>
          <label>Choose user role</label>
          <select
            value={selectedRole.display}
            onChange={(e) => handleRoleChange(e.target.value)}
          >
            {LOGIN_ROLES.map((r) => (
              <option key={r.display} value={r.display}>{r.display}</option>
            ))}
          </select>
          <input
            placeholder="Email address"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setLoginError('') }}
          />
          <input
            placeholder="Password"
            type="password"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setLoginError('') }}
          />
          {loginError && (
            <p style={{ color: '#d92d20', fontSize: 13, margin: '-4px 0 0', fontWeight: 600 }}>
              {loginError}
            </p>
          )}
          <button className="primaryBtn full" onClick={handleLogin} disabled={loading}>
            {loading ? 'Logging in…' : `Login as ${selectedRole.display}`}
          </button>
          <Link to="/forgot-password">Forgot password?</Link>
        </section>
      </div>
      <AppFooter />
    </main>
  )
}

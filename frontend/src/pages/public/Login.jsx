import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'
import { roleHome } from '../../data/appConfig'

const roleOptions = [
  { label: 'Front Desk',          value: 'FRONT_DESK' },
  { label: 'Technician',          value: 'TECHNICIAN' },
  { label: 'Manager',             value: 'MANAGER' },
  { label: 'Workshop Controller', value: 'WORKSHOP_CONTROLLER' },
  { label: 'Accounts',            value: 'ACCOUNTS' },
  { label: 'Parts Interpreter',   value: 'PARTS_INTERPRETER' },
  { label: 'CEO',                 value: 'CEO' },
]

const roleCodeToAppRole = {
  FRONT_DESK:          'Front Desk',
  TECHNICIAN:          'Technician',
  MANAGER:             'Manager',
  WORKSHOP_CONTROLLER: 'Workshop Controller',
  ACCOUNTS:            'Accounts',
  PARTS_INTERPRETER:   'Parts Interpreter',
  CEO:                 'CEO',
}

export default function Login({ auth }) {
  const navigate = useNavigate()
  const [role, setRole]         = useState('FRONT_DESK')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  // Redirect away from login if already authenticated
  useEffect(() => {
    try {
      const token = localStorage.getItem('autiq_token')
      if (!token) return
      const p = JSON.parse(atob(token.split('.')[1]))
      if (!p || p.exp * 1000 <= Date.now()) return
      const appRole  = localStorage.getItem('autiqRole') || ''
      const dashPath = roleHome[appRole] || '/'
      navigate(dashPath, { replace: true })
    } catch { /* invalid token, stay on login */ }
  }, [])

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8006'

  async function handleLogin(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res  = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, role }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Login failed')

      const { token, refreshToken, user } = data.data
      if (!token || !user) throw new Error('Invalid response from server')

      localStorage.setItem('autiq_token',         token)
      localStorage.setItem('autiq_refresh_token', refreshToken || '')
      localStorage.setItem('autiq_user',          JSON.stringify(user))

      const appRole = roleCodeToAppRole[user.roleCode || role] || roleCodeToAppRole[role]
      localStorage.setItem('autiqLoggedIn', 'true')
      localStorage.setItem('autiqRole',     appRole)

      if (auth?.setRole) auth.setRole(appRole)
      if (auth?.login)   auth.login()
      else               navigate('/dashboard')
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const selectedLabel = roleOptions.find(r => r.value === role)?.label || ''

  return (
    <div className="loginShell">
      <MarketingHeader />

      <div className="loginContent">
        <div className="loginPane">

          <section className="loginBrand">
            <div className="loginBrandLogos">
              <img src="/assets/autiq-logo.png"      className="loginBrandMark" alt="" aria-hidden="true" />
              <img src="/assets/AutiqAfricaname.png" className="loginBrandName" alt="Autiq Africa" />
            </div>
            <p className="loginBrandDesc">
              Your workshop. Your role. Everything you need, right here.
            </p>
            <ul className="loginBrandPoints">
              <li>Role-specific workspace for every staff member</li>
              <li>Real-time job and quotation workflows</li>
              <li>Customer approvals and digital sign-off</li>
              <li>Parts, accounts, and reporting tools</li>
            </ul>
          </section>

          <section className="loginFormSection">
            <form className="loginFormCard" onSubmit={handleLogin}>
              <div className="loginCardHead">
                <h2>Sign in</h2>
                <p>Access your Autiq Africa workspace</p>
              </div>

              <label>User role</label>
              <select value={role} onChange={e => setRole(e.target.value)}>
                {roleOptions.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>

              <label>Email address</label>
              <input
                type="email"
                placeholder="name@dealership.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />

              <label>Password</label>
              <input
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />

              {error && <p className="errorText">{error}</p>}

              <button className="primaryBtn full" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : `Sign in as ${selectedLabel}`}
              </button>

              <a className="loginLink" onClick={() => navigate('/forgot-password')}>
                Forgot password?
              </a>

              <a className="loginLink adminLoginBack" onClick={() => navigate('/admin/login')}>
                Enterprise Admin login →
              </a>
            </form>
          </section>

        </div>
      </div>

      <AppFooter compact />
    </div>
  )
}

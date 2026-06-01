import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'

export default function AdminLogin({ auth }) {
  const navigate = useNavigate()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  useEffect(() => {
    try {
      const token = localStorage.getItem('autiq_token')
      if (!token) return
      const p = JSON.parse(atob(token.split('.')[1]))
      if (!p || p.exp * 1000 <= Date.now()) return
      const role = localStorage.getItem('autiqRole') || ''
      if (role === 'Enterprise Admin') navigate('/enterprise/dashboard', { replace: true })
    } catch { /* invalid token */ }
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
        body: JSON.stringify({ email, password, role: 'ENTERPRISE_ADMIN' }),
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.message || 'Login failed')

      const { token, refreshToken, user } = data.data
      if (!token || !user) throw new Error('Invalid response from server')

      localStorage.setItem('autiq_token',         token)
      localStorage.setItem('autiq_refresh_token', refreshToken || '')
      localStorage.setItem('autiq_user',          JSON.stringify(user))
      localStorage.setItem('autiqLoggedIn',       'true')
      localStorage.setItem('autiqRole',           'Enterprise Admin')

      if (auth?.setRole) auth.setRole('Enterprise Admin')
      if (auth?.login)   auth.login()
      else               navigate('/enterprise/dashboard')
    } catch (err) {
      setError(err.message || 'Unable to sign in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="loginShell adminLoginShell">
      <MarketingHeader />
      <div className="loginContent">
        <div className="loginPane">

          <section className="loginBrand adminLoginBrand">
            <div className="loginBrandLogos">
              <img src="/assets/autiq-logo.png"      className="loginBrandMark" alt="" aria-hidden="true" />
              <img src="/assets/AutiqAfricaname.png" className="loginBrandName" alt="Autiq Africa" />
            </div>
            <p className="adminLoginBadge">Enterprise Admin Portal</p>
            <p className="loginBrandDesc">
              Full platform control for Autiq Africa enterprise administrators.
            </p>
            <ul className="loginBrandPoints">
              <li>Onboard and manage dealer clients</li>
              <li>Configure workshops, modules and users</li>
              <li>Monitor platform revenue and activity</li>
              <li>Access-controlled admin environment</li>
            </ul>
          </section>

          <section className="loginFormSection">
            <form className="loginFormCard" onSubmit={handleLogin}>
              <div className="loginCardHead">
                <h2>Admin sign in</h2>
                <p>Enterprise Admin access only</p>
              </div>

              <label>Email address</label>
              <input
                type="email"
                placeholder="admin@autiqafrica.com"
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

              <button className="primaryBtn full adminLoginBtn" type="submit" disabled={loading}>
                {loading ? 'Signing in…' : 'Sign in to Admin'}
              </button>

              <a className="loginLink" onClick={() => navigate('/forgot-password')}>
                Forgot password?
              </a>

              <a className="loginLink adminLoginBack" onClick={() => navigate('/login')}>
                Workshop staff login →
              </a>
            </form>
          </section>

        </div>
      </div>

      <AppFooter compact />
    </div>
  )
}

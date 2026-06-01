import { useState, useRef, useEffect } from 'react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { LayoutDashboard, LockKeyhole, LogOut, Menu, X } from 'lucide-react'
import { getUser } from '../utils/api'
import { roleHome } from '../data/appConfig'

function getSessionUser() {
  try {
    const token = localStorage.getItem('autiq_token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload || payload.exp * 1000 <= Date.now()) return null
    const stored = localStorage.getItem('autiq_user')
    const user   = stored ? JSON.parse(stored) : payload
    return { name: user.name || payload.name || 'User', role: localStorage.getItem('autiqRole') || '' }
  } catch { return null }
}

function initials(name) {
  return name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
}

export default function MarketingHeader() {
  const [menuOpen,    setMenuOpen]    = useState(false)
  const [dropOpen,    setDropOpen]    = useState(false)
  const [sessionUser, setSessionUser] = useState(getSessionUser)
  const dropRef  = useRef(null)
  const navigate = useNavigate()
  const close = () => setMenuOpen(false)

  // Re-check session on storage changes (cross-tab login/logout)
  useEffect(() => {
    const onStorage = () => setSessionUser(getSessionUser())
    window.addEventListener('storage', onStorage)
    window.addEventListener('autiq:unauthorized', () => setSessionUser(null))
    return () => {
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('autiq:unauthorized', () => setSessionUser(null))
    }
  }, [])

  // Close dropdown on outside click
  useEffect(() => {
    if (!dropOpen) return
    function handler(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [dropOpen])

  function signOut() {
    ;['autiqLoggedIn', 'autiq_token', 'autiq_refresh_token', 'autiq_user', 'autiqRole']
      .forEach(k => localStorage.removeItem(k))
    setSessionUser(null)
    setDropOpen(false)
    window.dispatchEvent(new Event('autiq:unauthorized'))
    navigate('/login')
  }

  const dashPath = sessionUser?.role ? (roleHome[sessionUser.role] || '/') : '/'

  return (
    <header className="landingHeader">
      <Link className="landingLogo" to="/" onClick={close}>
        <img src="/assets/autiq-logo.png" className="headerLogoMark" alt="" aria-hidden="true" />
        <img src="/assets/AutiqAfricaname.png" className="headerLogoName" alt="Autiq Africa" />
      </Link>

      <nav className={`landingNav${menuOpen ? ' open' : ''}`} aria-label="Main navigation">
        <NavLink to="/" end onClick={close}>Home</NavLink>
        <NavLink to="/about" onClick={close}>About Us</NavLink>
        <NavLink to="/features" onClick={close}>Features</NavLink>
        <NavLink to="/pricing" onClick={close}>Pricing</NavLink>
        <NavLink to="/contact" onClick={close}>Contact</NavLink>
        <NavLink to="/tracking" onClick={close}>Track Your Vehicle</NavLink>
      </nav>

      <div className="headerRight">
        {sessionUser ? (
          <div className="headerUserMenu" ref={dropRef}>
            <button
              className="headerUserChip"
              onClick={() => setDropOpen(o => !o)}
              aria-label="Account menu"
              aria-expanded={dropOpen}
            >
              <span className="headerUserAvatar">{initials(sessionUser.name)}</span>
              <span className="headerUserName">{sessionUser.name}</span>
              <span className="headerUserRole">{sessionUser.role}</span>
              <span className="headerUserCaret">{dropOpen ? '▲' : '▼'}</span>
            </button>
            {dropOpen && (
              <div className="headerUserDrop">
                <Link className="headerDropItem" to={dashPath} onClick={() => setDropOpen(false)}>
                  <LayoutDashboard size={16} /> Go to Dashboard
                </Link>
                <button className="headerDropItem danger" onClick={signOut}>
                  <LogOut size={16} /> Sign Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <Link className="loginNavBtn" to="/login" onClick={close}>
            <LockKeyhole size={18} /> Login
          </Link>
        )}
        <button
          className="mobileMenuBtn"
          onClick={() => setMenuOpen(o => !o)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>
    </header>
  )
}

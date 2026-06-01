import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { LockKeyhole, Menu, X } from 'lucide-react'

export default function MarketingHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  const close = () => setMenuOpen(false)

  return (
    <header className="landingHeader">
      <Link className="landingLogo" to="/" onClick={close}>
        <img src="/assets/autiq-logo-footer.png" alt="Autiq Africa" />
      </Link>

      <nav className={`landingNav${menuOpen ? ' open' : ''}`} aria-label="Main navigation">
        <NavLink to="/" end onClick={close}>Home</NavLink>
        <NavLink to="/about" onClick={close}>About Us</NavLink>
        <NavLink to="/features" onClick={close}>Features</NavLink>
        <NavLink to="/pricing" onClick={close}>Pricing</NavLink>
        <NavLink to="/contact" onClick={close}>Contact</NavLink>
      </nav>

      <div className="headerRight">
        <Link className="loginNavBtn" to="/login" onClick={close}>
          <LockKeyhole size={18} /> Login
        </Link>
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

import { Link } from 'react-router-dom'
import { Globe, Mail, MapPin, Phone } from 'lucide-react'

export default function AppFooter({ compact = false }) {
  return (
    <footer id="contact" className={compact ? 'landingFooter workspaceDarkFooter' : 'landingFooter'}>
      <div className="footerMain">
        <section className="footerBrand">
          <img src="/assets/autiq-logo-footer.png" alt="Autiq Africa" />
          <p>Smarter decisions. Stronger businesses. Across Africa. Empowering dealers, workshops and partners with connected intelligence and real-time insights.</p>
        </section>

        <section className="footerLinks">
          <h4>Quick Links</h4>
          <div>
            <Link to="/">Home</Link>
            <Link to="/about">About Us</Link>
            <Link to="/features">Features</Link>
            <Link to="/pricing">Pricing</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/login">Login</Link>
          </div>
        </section>


        <section className="footerSocial">
          <h4>Follow Us</h4>
          <div className="socialRow">
            <a aria-label="LinkedIn" href="#">in</a>
            <a aria-label="Facebook" href="#">f</a>
            <a aria-label="Instagram" href="#">◎</a>
            <a aria-label="YouTube" href="#">▶</a>
          </div>
        </section>

        <section className="footerContact">
          <h4>Contact Us</h4>
          <p><MapPin size={18} /> Autiq Africa (Pty) Ltd<br />1 Sandton Drive, Sandton,<br />Johannesburg, 2196, South Africa</p>
          <p><Phone size={18} /> +27 10 001 2345</p>
          <p><Mail size={18} /> info@autiqa.africa</p>
          <p><Globe size={18} /> www.autiqafrica.com</p>
        </section>
      </div>

      <div className="footerBottom">
        <span>© 2025 Autiq Africa (Pty) Ltd. All rights reserved.</span>
        <span>Built for Africa. Driven by Innovation.</span>
      </div>
    </footer>
  )
}

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck } from 'lucide-react'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'

export default function ForgotPassword() {
  const [email, setEmail]       = useState('')
  const [submitted, setSubmitted] = useState(false)

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
              Secure account recovery for your Autiq Africa workspace.
            </p>
            <ul className="loginBrandPoints">
              <li>Reset link sent to your registered email</li>
              <li>Link expires after 30 minutes</li>
              <li>Contact your enterprise admin if access is locked</li>
            </ul>
          </section>

          <section className="loginFormSection">
            <div className="loginFormCard">
              <div className="loginCardHead">
                <h2>Reset password</h2>
                <p>Enter your login email and we'll send a secure reset link.</p>
              </div>

              <label>Login email address</label>
              <input
                type="email"
                placeholder="name@dealership.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />

              <button
                className="primaryBtn full"
                onClick={() => email && setSubmitted(true)}
              >
                Send reset link
              </button>

              {submitted && (
                <div className="formSuccess">
                  <MailCheck size={18} /> Reset link sent. Check your inbox and spam folder.
                </div>
              )}

              <Link to="/login" className="loginLink">← Back to sign in</Link>
            </div>
          </section>

        </div>
      </div>

      <AppFooter compact />
    </div>
  )
}

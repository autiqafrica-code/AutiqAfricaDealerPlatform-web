import { useState } from 'react'
import { Link } from 'react-router-dom'
import { MailCheck, RotateCcw, ShieldCheck } from 'lucide-react'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'

export default function ForgotPassword() {
  const [submitted, setSubmitted] = useState(false)

  return (
    <main className="landingPage loginShell">
      <MarketingHeader />
      <div className="loginPage forgotPasswordPage">
        <section className="loginHero">
          <div className="logoMark large">AA</div>
          <p className="eyebrow">Secure access recovery</p>
          <h1>Reset your Autiq Africa password.</h1>
          <p>Enter your login email. The system sends a secure reset link after checking the dealership user record.</p>
          <div className="heroList">
            <span><ShieldCheck size={18} /> Reset link expires after 30 minutes</span>
            <span><MailCheck size={18} /> Email is sent to the registered login email</span>
          </div>
        </section>

        <section className="loginCard forgotPasswordCard">
          <RotateCcw size={34} />
          <h2>Forgot password?</h2>
          <p className="mutedText">Use the email ID assigned to your Enterprise Admin or workshop user login.</p>
          <label>Login email address</label>
          <input placeholder="name@dealership.com" />
          <button className="primaryBtn full" onClick={() => setSubmitted(true)}>Send reset link</button>
          {submitted && (
            <div className="formSuccess">
              <MailCheck size={18} /> Password reset link sent. Check your inbox and spam folder.
            </div>
          )}
          <Link to="/login">Back to login</Link>
        </section>
      </div>
      <AppFooter />
    </main>
  )
}

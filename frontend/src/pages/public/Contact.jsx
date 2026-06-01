import { useState } from 'react'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'
import { Mail, MapPin, Phone, Send } from 'lucide-react'

export default function Contact() {
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (event) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main className="landingPage">
      <MarketingHeader />

      <section className="staticHero contactHero">
        <p className="eyebrow">Contact Autiq Africa</p>
        <h1>Talk to us about your dealer or workshop workflow.</h1>
        <p>Use the feedback form below to share your requirements, request a walkthrough or ask about enterprise setup.</p>
      </section>

      <section className="contactGrid">
        <article className="contactInfoCard">
          <h2>Autiq Africa Office</h2>
          <p><MapPin size={20} /> 1 Sandton Drive, Sandton, Johannesburg, 2196, South Africa</p>
          <p><Phone size={20} /> +27 10 001 2345</p>
          <p><Mail size={20} /> info@autiqa.africa</p>
          <div className="mapShell" aria-label="Google map showing Autiq Africa office location in Sandton">
            <iframe
              title="Autiq Africa Google Map Location"
              src="https://www.google.com/maps?q=1%20Sandton%20Drive%2C%20Sandton%2C%20Johannesburg%2C%202196%2C%20South%20Africa&output=embed"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            />
          </div>
        </article>

        <article className="feedbackCard">
          <h2>Feedback form</h2>
          <p>Send us your message. This form captures your message for follow-up.</p>
          <form className="feedbackForm" onSubmit={handleSubmit}>
            <label>
              Full name
              <input required type="text" placeholder="Enter your name" />
            </label>
            <label>
              Email address
              <input required type="email" placeholder="name@company.com" />
            </label>
            <label>
              Company or workshop
              <input type="text" placeholder="Dealer or workshop name" />
            </label>
            <label>
              Topic
              <select defaultValue="Product demo">
                <option>Product demo</option>
                <option>Enterprise setup</option>
                <option>Pricing</option>
                <option>Support</option>
                <option>General feedback</option>
              </select>
            </label>
            <label className="fullField">
              Message
              <textarea required placeholder="Tell us what you need help with" />
            </label>
            <button className="heroPrimary formSubmitBtn" type="submit"><Send size={18} /> Submit Feedback</button>
            {submitted && <div className="formSuccess">Thank you. Your feedback has been captured for follow-up.</div>}
          </form>
        </article>
      </section>

      <AppFooter />
    </main>
  )
}

import { Link } from 'react-router-dom'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'
import { BarChart3, Car, Globe2, Handshake, ShieldCheck, Users } from 'lucide-react'

const values = [
  { icon: ShieldCheck, title: 'Trust-first operations', text: 'Built for dealer groups that need clear controls, secure access and complete workflow visibility.' },
  { icon: Globe2, title: 'Designed for Africa', text: 'Responsive web access for dealerships, service teams and workshops across African markets.' },
  { icon: BarChart3, title: 'Data-led decisions', text: 'Connected reports help leaders track jobs, revenue, approvals, payments and technician performance.' }
]

export default function About() {
  return (
    <main className="landingPage">
      <MarketingHeader />

      <section className="staticHero aboutHero">
        <p className="eyebrow">About Autiq Africa</p>
        <h1>Dealer and workshop intelligence built for modern African automotive businesses.</h1>
        <p>Autiq Africa brings front desk teams, workshop controllers, technicians, parts interpreters, accounts users, managers and executives into one responsive web platform.</p>
      </section>

      <section className="aboutStoryGrid">
        <article className="storyCard wideStoryCard">
          <Car size={40} />
          <h2>Our purpose</h2>
          <p>We help automotive dealers and workshops manage the full service lifecycle from appointment booking and customer intake to quotation approvals, repair execution, payment tracking and delivery or collection notifications.</p>
          <p>The platform is web-first, mobile-friendly and designed to reduce manual follow-up between teams while giving leaders better control over daily operations.</p>
        </article>
        <article className="storyCard accentStoryCard">
          <Users size={40} />
          <h2>Who we support</h2>
          <p>Dealer groups, independent workshops, service consultants, technicians, parts teams, accounts users and enterprise administrators who need one connected operating system.</p>
        </article>
      </section>

      <section className="staticFeatureStack aboutValuesStack">
        <div className="staticFeatureGroup">
          <h2>What we stand for</h2>
          <div className="staticFeatureGrid">
            {values.map((item) => {
              const Icon = item.icon
              return (
                <article className="staticFeatureCard" key={item.title}>
                  <Icon size={34} />
                  <h3>{item.title}</h3>
                  <p>{item.text}</p>
                </article>
              )
            })}
          </div>
        </div>
      </section>

      <section className="ctaBand">
        <div>
          <Handshake size={38} />
          <h2>Ready to modernize your dealership workflow?</h2>
          <p>Explore platform features or contact the Autiq Africa team for a guided conversation.</p>
        </div>
        <div className="ctaActions">
          <Link className="heroPrimary" to="/features">View Features</Link>
          <Link className="heroSecondary darkSecondary" to="/contact">Contact Us</Link>
        </div>
      </section>

      <AppFooter />
    </main>
  )
}

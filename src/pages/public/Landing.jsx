import { Link } from 'react-router-dom'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'
import {
  BarChart3,
  Car,
  Globe,
  LockKeyhole,
  Mail,
  MapPin,
  Network,
  Phone,
  ShieldCheck,
  Star,
  Target,
  Users,
  TreePine,
  Sunrise
} from 'lucide-react'

const topFeatures = [
  { icon: Target, title: 'All-in-one', text: 'Powerful platform, one connected ecosystem.' },
  { icon: ShieldCheck, title: 'Secure & Reliable', text: 'Enterprise-grade security you can trust.' },
  { icon: BarChart3, title: 'Smart Insights', text: 'Real-time data for smarter decisions.' },
  { icon: Users, title: 'Connected Ecosystem', text: 'Dealers, workshops, fleets and partners, all in sync.' },
  { icon: Globe, title: 'Built for Africa', text: 'Designed for Africa. Focused on excellence.' },
  { icon: Star, title: 'Driven by You', text: 'Your journey. Our priority.' }
]

const valueItems = [
  { icon: TreePine, title: 'African Heritage', text: 'Rooted in Africa. Inspired by nature.' },
  { icon: Sunrise, title: 'Horizon', text: 'New beginnings. Limitless potential.' },
  { icon: Car, title: 'Automotive Excellence', text: 'Performance. Precision. Luxury.' },
  { icon: ShieldCheck, title: 'Trust', text: 'Protection. Reliability.' },
  { icon: BarChart3, title: 'Intelligence', text: 'Data-driven. Smarter decisions.' },
  { icon: Network, title: 'Connection', text: 'One ecosystem. Stronger together.' }
]

export default function Landing() {
  return (
    <main className="landingPage">
      <MarketingHeader />


      <section id="home" className="landingHero">
        <div className="heroCopy">
          <h1>
            Smarter Decisions.<br />
            Stronger Businesses.<br />
            <span>Across Africa.</span>
          </h1>
          <div className="goldRule" />
          <p>The all-in-one Dealer Intelligence Platform built to power automotive businesses across the continent.</p>
          <div className="heroActions">
            <Link className="heroPrimary" to="/login">Get Started</Link>
            <Link className="heroSecondary" to="/features">Learn More</Link>
          </div>
        </div>
        <div className="heroVisual" aria-label="Luxury automotive dealership visual">
          <img src="/assets/autiq-hero-vehicle.png" alt="Luxury vehicle outside a dealership in Africa" />
        </div>
      </section>

      <section id="features" className="featureBand darkBand">
        {topFeatures.map((item) => {
          const Icon = item.icon
          return (
            <article className="featureTile" key={item.title}>
              <Icon size={38} />
              <h3>{item.title}</h3>
              <p>{item.text}</p>
            </article>
          )
        })}
      </section>

      <AppFooter />

    </main>
  )
}

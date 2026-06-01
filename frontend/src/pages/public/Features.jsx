import { Link } from 'react-router-dom'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'
import { BarChart3, CalendarDays, Camera, CheckCircle2, CreditCard, FileText, Globe, LockKeyhole, Mail, MapPin, Network, Phone, ShieldCheck, Users, Wrench } from 'lucide-react'

const featureGroups = [
  {
    title: 'Dealer and workshop operations',
    items: [
      { icon: Users, title: 'Role-based workspaces', text: 'Front Desk, Technician, Workshop Controller, Parts Interpreter, Accounts, Manager, CEO and Enterprise Admin screens.' },
      { icon: CalendarDays, title: 'Appointment calendar', text: 'Daily, weekly and monthly booking views with workshop opening hours and capacity visibility.' },
      { icon: Wrench, title: 'Job lifecycle tracking', text: 'Track every job from intake to technician work, approval, payment and delivery or collection.' }
    ]
  },
  {
    title: 'Quotations and approvals',
    items: [
      { icon: FileText, title: 'Line-item quotation updates', text: 'Workshop, technician and parts teams can update quote details before sending back to Front Desk.' },
      { icon: Camera, title: 'Photo and video evidence', text: 'Capture intake, failed component, replacement and completion media from mobile browser.' },
      { icon: CheckCircle2, title: 'Customer approval journey', text: 'Prepare approvals through WhatsApp, email or secure web link with payment summary.' }
    ]
  },
  {
    title: 'Payments, reporting and SaaS control',
    items: [
      { icon: CreditCard, title: 'Payment tracking', text: 'Accounts can track approved quotes by payment status and log payment method.' },
      { icon: BarChart3, title: 'Reports and exports', text: 'Revenue, jobs, technician performance and pending approvals with data export support.' },
      { icon: ShieldCheck, title: 'Enterprise administration', text: 'Onboard clients, configure modules, manage Super Admin users and export client data.' }
    ]
  }
]

export default function Features() {
  return (
    <main className="landingPage">
      <MarketingHeader />


      <section className="featuresHero">
        <p className="eyebrow">Autiq Africa features</p>
        <h1>One responsive web platform for dealer and workshop operations.</h1>
        <p>Autiq Africa connects customer intake, workshop control, technician updates, parts quotations, payments, reports and customer notifications in one browser-based system.</p>
      </section>

      <section className="staticFeatureStack">
        {featureGroups.map((group) => (
          <div className="staticFeatureGroup" key={group.title}>
            <h2>{group.title}</h2>
            <div className="staticFeatureGrid">
              {group.items.map((item) => {
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
        ))}
      </section>

      <AppFooter />

    </main>
  )
}

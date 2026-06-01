import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'
import { CheckCircle2, Crown, Layers, ShieldCheck } from 'lucide-react'

const plans = [
  {
    icon: Layers,
    name: 'Starter Workshop',
    price: 'Custom quote',
    text: 'For a single workshop starting with customer intake, job cards, technician updates and quotation tracking.',
    items: ['Front Desk and technician workflow', 'Customer and vehicle management', 'Quotation approval link', 'Basic reports']
  },
  {
    icon: Crown,
    name: 'Dealer Growth',
    price: 'Custom quote',
    featured: true,
    text: 'For dealer service teams that need workshop control, parts updates, accounts payments and operational dashboards.',
    items: ['All Starter features', 'Workshop Controller and Parts Interpreter screens', 'Accounts payment tracking', 'Calendar and job capacity']
  },
  {
    icon: ShieldCheck,
    name: 'Enterprise Network',
    price: 'Custom quote',
    text: 'For multi-workshop groups that need enterprise administration, exports, role management and executive reporting.',
    items: ['All Dealer Growth features', 'Multi-workshop configuration', 'Enterprise admin controls', 'Data export and CEO reports']
  }
]

export default function Pricing() {
  return (
    <main className="landingPage">
      <MarketingHeader />

      <section className="staticHero pricingHero">
        <p className="eyebrow">Pricing</p>
        <h1>Flexible pricing for workshops, dealers and enterprise groups.</h1>
        <p>Autiq Africa pricing is configured around workshop count, user roles, enabled modules, currency, reporting needs and onboarding support.</p>
      </section>

      <section className="pricingGrid">
        {plans.map((plan) => {
          const Icon = plan.icon
          return (
            <article className={plan.featured ? 'pricingCard featuredPricingCard' : 'pricingCard'} key={plan.name}>
              <Icon size={38} />
              <h2>{plan.name}</h2>
              <strong>{plan.price}</strong>
              <p>{plan.text}</p>
              <ul>
                {plan.items.map((item) => <li key={item}><CheckCircle2 size={18} /> {item}</li>)}
              </ul>
            </article>
          )
        })}
      </section>

      <section className="pricingNote">
        <h2>Pricing is configured by module.</h2>
        <p>Enterprise Admin can configure service modules, checklist items, standard pricing, custom price permissions and workshop-level setup. This keeps pricing aligned to each dealer’s operating model.</p>
      </section>

      <AppFooter />
    </main>
  )
}

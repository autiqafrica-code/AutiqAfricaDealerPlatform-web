import { Save, Tags } from 'lucide-react'

const serviceModules = []
const workshops = []

export default function ServicePricing() {
  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Enterprise Admin / Pricing</p>
        <h2>Service-wise module standard price configuration</h2>
        <p>Maintain standard service prices in a separate pricing screen. Dealer or workshop level custom pricing can override the standard price when required.</p>
      </div>

      <div className="panel formPanel">
        <div className="sectionHeader compact">
          <div>
            <p className="eyebrow">Pricing rule</p>
            <h3>Create or update standard price</h3>
          </div>
          <span className="accessBadge"><Tags size={16} /> Multi-currency ready</span>
        </div>
        <div className="formGrid adminForm">
          <label>Workshop scope<select defaultValue="All workshops"><option>All workshops</option>{workshops.map((w) => <option key={w.workshop}>{w.workshop}</option>)}</select></label>
          <label>Service module<select defaultValue="Brake Repair">{serviceModules.map((service) => <option key={service.id}>{service.name}</option>)}</select></label>
          <label>Currency<select defaultValue="ZAR"><option>ZAR</option><option>NGN</option><option>BWP</option><option>KES</option><option>USD</option></select></label>
          <label>Standard price<input defaultValue="ZAR 3,080" /></label>
          <label>Allow custom override<select defaultValue="Yes"><option>Yes</option><option>No</option></select></label>
          <label>Effective from<input type="date" defaultValue="2026-05-12" /></label>
          <label>Approval required<select defaultValue="Manager"><option>Manager</option><option>CEO</option><option>Enterprise Admin</option></select></label>
          <label>Tax included<select defaultValue="Yes"><option>Yes</option><option>No</option></select></label>
        </div>
        <button className="primaryBtn"><Save size={16} /> Save standard price</button>
      </div>

      <section className="panel">
        <div className="sectionHead">
          <h2>Configured service prices</h2>
          <button className="softBtn">Export pricing CSV</button>
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Service</th><th>Module</th><th>Standard Price</th><th>Custom Price</th><th>Duration</th><th>Override</th></tr></thead>
            <tbody>
              {serviceModules.map((service) => (
                <tr key={service.id}>
                  <td>{service.name}</td>
                  <td>{service.module}</td>
                  <td><strong>{service.standardPrice}</strong></td>
                  <td>{service.customPrice}</td>
                  <td>{service.duration}</td>
                  <td><span className={`pill ${service.defaultPricingMode === 'Custom price' ? 'amber' : 'green'}`}>{service.defaultPricingMode}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </section>
  )
}

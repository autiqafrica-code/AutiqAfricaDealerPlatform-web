import { CheckCircle2, ListPlus, Save, Wrench } from 'lucide-react'

const serviceModules = []

export default function ServiceChecklists() {
  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Enterprise Admin / Service setup</p>
        <h2>Configure checklist items against each service module</h2>
        <p>Define the checklist that technicians and workshop teams follow for every service module. Each checklist line can use the module standard price or a custom price.</p>
      </div>

      <div className="panel formPanel">
        <div className="sectionHeader compact">
          <div>
            <p className="eyebrow">New checklist item</p>
            <h3>Add or edit service checklist rules</h3>
          </div>
          <span className="accessBadge"><ListPlus size={16} /> Standard or custom price</span>
        </div>
        <div className="formGrid adminForm twoCols">
          <label>Service module<select defaultValue="Major Service">{serviceModules.map((service) => <option key={service.id}>{service.name}</option>)}</select></label>
          <label>Checklist item<input defaultValue="Battery health check" /></label>
          <label>Required item<select defaultValue="Yes"><option>Yes</option><option>No</option></select></label>
          <label>Price type<select defaultValue="Standard price"><option>Standard price</option><option>Custom price</option></select></label>
          <label>Standard price<input defaultValue="ZAR 320" /></label>
          <label>Custom price<input placeholder="Enter only when custom price is selected" /></label>
          <label className="wide">Technician instruction<textarea defaultValue="Capture checklist result and attach media if the component fails inspection." /></label>
        </div>
        <button className="primaryBtn"><Save size={16} /> Save checklist item</button>
      </div>

      <div className="serviceConfigGrid">
        {serviceModules.map((service) => (
          <article className="serviceConfigCard" key={service.id}>
            <div className="serviceConfigHead">
              <span className="logoMark"><Wrench size={20} /></span>
              <div>
                <p className="eyebrow">{service.module}</p>
                <h3>{service.name}</h3>
                <small>{service.duration} • Default: {service.defaultPricingMode}</small>
              </div>
            </div>
            <div className="priceStrip">
              <span><strong>{service.standardPrice}</strong><small>Standard price</small></span>
              <span><strong>{service.customPrice}</strong><small>Custom example</small></span>
            </div>
            <div className="checklistStack">
              {service.checklist.map((row) => (
                <div className="checklistConfigRow" key={row.item}>
                  <CheckCircle2 size={18} />
                  <span><strong>{row.item}</strong><small>{row.required ? 'Required' : 'Optional'} • {row.priceMode} • {row.price}</small></span>
                  <button className="softBtn">Edit</button>
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

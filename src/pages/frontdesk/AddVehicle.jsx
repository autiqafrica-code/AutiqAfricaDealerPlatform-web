import { Car, Plus, Save, Search } from 'lucide-react'

const vehicles = [
  { reg: 'CA 245 889', customer: 'Amina Okafor', vehicle: 'Toyota Hilux', mileage: '82,400 km', type: 'Private' },
  { reg: 'GP 887 120', customer: 'Amina Okafor', vehicle: 'BMW X3', mileage: '45,100 km', type: 'Fleet' },
  { reg: 'LAG 220 AB', customer: 'Musa Dlamini', vehicle: 'Ford Ranger', mileage: '130,900 km', type: 'Insurance' }
]

export default function AddVehicle() {
  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Customer Vehicle Management</p>
        <h2>Add Vehicle for Existing Customer</h2>
        <p>Select a customer, then add one or more vehicle records. Each vehicle can later be linked to quotation, job card, media and payment history.</p>
      </section>

      <section className="panel">
        <div className="sectionHeader">
          <div>
            <h3>Vehicle Details</h3>
            <p>Service consultant captures vehicle number, mileage and vehicle type.</p>
          </div>
          <button className="primaryBtn"><Save size={16} /> Save Vehicle</button>
        </div>
        <div className="searchBar"><Search size={18} /><input placeholder="Search customer by name, phone or WhatsApp number" /></div>
        <div className="formGrid adminForm">
          <label>Customer<select><option>Amina Okafor</option><option>Musa Dlamini</option><option>Kwame Mensah</option></select></label>
          <label>Vehicle Registration Number<input placeholder="CA 245 889" /></label>
          <label>Vehicle Number / VIN<input placeholder="VIN or internal vehicle number" /></label>
          <label>Mileage<input placeholder="82400" /></label>
          <label>Type of Vehicle<select><option>Private</option><option>Fleet</option><option>Insurance</option><option>Warranty</option></select></label>
          <label>Make & Model<input placeholder="Toyota Hilux 2.8 GD-6" /></label>
          <label className="wide">Vehicle Notes<textarea placeholder="Condition, customer concern, visible damage or intake notes" /></label>
        </div>
        <button className="softBtn"><Plus size={16} /> Add Another Vehicle for Same Customer</button>
      </section>

      <section className="panel">
        <div className="sectionHeader"><h3>Vehicles Linked to Customer</h3><span className="accessBadge">Multiple vehicles supported</span></div>
        <div className="tableWrap"><table><thead><tr><th>Registration</th><th>Customer</th><th>Vehicle</th><th>Mileage</th><th>Type</th><th>Action</th></tr></thead><tbody>{vehicles.map(v => <tr key={v.reg}><td><Car size={16} /> {v.reg}</td><td>{v.customer}</td><td>{v.vehicle}</td><td>{v.mileage}</td><td>{v.type}</td><td><button className="softBtn">Create Quote</button></td></tr>)}</tbody></table></div>
      </section>
    </div>
  )
}

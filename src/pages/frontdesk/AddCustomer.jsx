import { Mail, MapPin, MessageCircle, Phone, Save, UserPlus } from 'lucide-react'

export default function AddCustomer() {
  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Front Desk / Service Consultant</p>
        <h2>Add New Customer</h2>
        <p>Capture the customer profile first. Vehicle details are managed on the separate customer vehicle screen because one customer can have multiple vehicles.</p>
      </section>

      <section className="panel formPanel">
        <div className="sectionHeader">
          <div>
            <h3>Customer Information</h3>
            <p>Used for job intake, quote approval, payment reminders and delivery updates.</p>
          </div>
          <button className="primaryBtn"><Save size={16} /> Save Customer</button>
        </div>

        <div className="formGrid adminForm">
          <label>Customer Name<input placeholder="Amina Okafor" /></label>
          <label>Phone Number<input placeholder="+27 10 001 2345" /></label>
          <label>Email<input placeholder="customer@email.com" /></label>
          <label>WhatsApp Number<input placeholder="+27 72 555 0199" /></label>
          <label>Communication Preference<select><option>WhatsApp</option><option>Email</option><option>Phone Call</option><option>SMS</option></select></label>
          <label>License Number<input placeholder="DL-2048-7781" /></label>
          <label className="wide">Address<textarea placeholder="Street, suburb, city, province, postal code" /></label>
        </div>

        <div className="quickActionGrid">
          <button className="softBtn"><UserPlus size={16} /> Create Customer</button>
          <button className="softBtn"><Phone size={16} /> Verify Phone</button>
          <button className="softBtn"><MessageCircle size={16} /> Verify WhatsApp</button>
          <button className="softBtn"><Mail size={16} /> Verify Email</button>
          <button className="softBtn"><MapPin size={16} /> Validate Address</button>
        </div>
      </section>
    </div>
  )
}

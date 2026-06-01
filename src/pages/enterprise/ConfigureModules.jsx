const clients = []

const modules =['Service Module', 'Paint & Panel Module', 'Parts Interpreter', 'Customer Approval Portal', 'Accounts & Payments', 'Calendar & Job Capacity', 'Reports & Analytics', 'WhatsApp Notifications', 'Email Notifications']

export default function ConfigureModules() {
  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Module enablement</p>
        <h2>Configure modules per client</h2>
        <p>Select which product modules are enabled for each dealer before onboarding email is sent. Use Module Functions screen to define what each enabled module covers.</p>
      </div>
      <div className="panel formPanel">
        <div className="formGrid">
          <label>Choose client<select>{clients.map((client) => <option key={client.name}>{client.name}</option>)}</select></label>
          <label>Default currency<select><option>ZAR</option><option>NGN</option><option>BWP</option><option>USD</option></select></label>
          <label>Setup package<select><option>Service only</option><option>Service + Paint & Panel</option><option>Full dealer suite</option></select></label>
        </div>
      </div>
      <div className="moduleGrid">
        {modules.map((module, index) => (
          <label className="moduleCard" key={module}>
            <input type="checkbox" defaultChecked={index < 6} />
            <strong>{module}</strong>
            <span>{index < 6 ? 'Enabled for initial setup' : 'Optional add-on'}</span>
          </label>
        ))}
      </div>
      <div className="stickyActions"><button className="primaryBtn">Save Module Configuration</button></div>
    </section>
  )
}

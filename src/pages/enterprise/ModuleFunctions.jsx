import { useState } from 'react'

const clients = []
const moduleFunctions = []

export default function ModuleFunctions() {
  const [selectedClient, setSelectedClient] = useState('')

  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Module functionality setup</p>
        <h2>Configure what each client module should cover</h2>
        <p>Define the exact functionality included inside every enabled module for a selected dealer client.</p>
      </div>

      <div className="panel formPanel">
        <div className="formGrid">
          <label>Choose client<select value={selectedClient} onChange={(e) => setSelectedClient(e.target.value)}>{clients.map((client) => <option key={client.name}>{client.name}</option>)}</select></label>
          <label>Configuration version<select><option>Initial onboarding setup</option><option>Phase 2 change request</option><option>Renewal configuration</option></select></label>
          <label>Approval status<select><option>Draft</option><option>Ready for client confirmation</option><option>Approved</option></select></label>
        </div>
      </div>

      <div className="moduleFunctionGrid">
        {moduleFunctions.map((module) => (
          <div className="panel moduleFunctionCard" key={module.module}>
            <div className="sectionHeader compact">
              <div>
                <h3>{module.module}</h3>
                <p>Included functionality for {selectedClient}</p>
              </div>
              <label className="switchLine"><input type="checkbox" defaultChecked /> Enabled</label>
            </div>
            <div className="functionList">
              {module.functions.map((item) => (
                <label key={item}><input type="checkbox" defaultChecked /> {item}</label>
              ))}
            </div>
            <textarea placeholder={`Add custom notes for ${module.module}`} />
          </div>
        ))}
      </div>

      <div className="stickyActions">
        <button className="secondaryBtn">Save Draft</button>
        <button className="primaryBtn">Save Functionality Configuration</button>
      </div>
    </section>
  )
}

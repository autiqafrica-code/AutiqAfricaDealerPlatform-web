import { KeyRound, Mail, MessageCircle, RefreshCcw, Search, ShieldCheck } from 'lucide-react'

const clients = []
const workshopUsers = []


export default function UserCredentials() {
  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">User login setup</p>
        <h2>Set login names, emails and passwords by workshop user count</h2>
        <p>Enterprise Admin can create credentials after onboarding based on the number of technicians, service consultants, workshop controllers, accounts users, managers and parts interpreters entered for each workshop.</p>
      </div>

      <div className="panel">
        <div className="sectionHeader compact">
          <div>
            <h3>Credential generation controls</h3>
            <p>Select client and workshop, then generate or update user login credentials.</p>
          </div>
          <span className="accessBadge"><ShieldCheck size={16} /> Enterprise Admin only</span>
        </div>
        <div className="formGrid adminForm">
          <label>Client<select>{clients.map((client) => <option key={client.name}>{client.name}</option>)}</select></label>
          <label>Workshop<select><option>Ikeja Workshop</option><option>Lekki Paint & Panel</option><option>Claremont Service Bay</option><option>Westlands Workshop</option></select></label>
          <label>Default password pattern<input defaultValue="Autiq@{role}{number}" /></label>
          <label>Credential status<select><option>All users</option><option>Missing password</option><option>Active</option><option>Blocked</option><option>Deactivated</option></select></label>
        </div>
        <div className="rowActions">
          <button><KeyRound size={16} /> Generate missing credentials</button>
          <button><Mail size={16} /> Share all by email</button>
          <button><MessageCircle size={16} /> Share all by WhatsApp</button>
        </div>
      </div>

      <div className="panel">
        <div className="sectionHeader">
          <div>
            <h3>Workshop users created from onboarding counts</h3>
            <p>Each row can be activated, deactivated, blocked, deleted, reset and shared.</p>
          </div>
          <div className="searchBar compactSearch"><Search size={18} /><input placeholder="Search by user, role, email or login" /></div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Workshop</th>
                <th>Role</th>
                <th>User name</th>
                <th>Login email / name</th>
                <th>Password</th>
                <th>Status</th>
                <th>Reset & share</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {workshopUsers.map((user, index) => (
                <tr key={`${user.role}-${index}`}>
                  <td>{user.workshop}</td>
                  <td>{user.role}</td>
                  <td><input className="tableInput" defaultValue={user.name} /></td>
                  <td><input className="tableInput" defaultValue={user.login} /></td>
                  <td><input className="tableInput" placeholder="Password" /></td>
                  <td><span className={`statusPill ${user.status.toLowerCase()}`}>{user.status}</span></td>
                  <td>
                    <div className="actionRow">
                      <button><RefreshCcw size={14} /> Reset</button>
                      <button><Mail size={14} /> Email</button>
                      <button><MessageCircle size={14} /> WhatsApp</button>
                    </div>
                  </td>
                  <td>
                    <div className="actionRow">
                      <button>Activate</button>
                      <button>Deactivate</button>
                      <button>Block</button>
                      <button className="danger">Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

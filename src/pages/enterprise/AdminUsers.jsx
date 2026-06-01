import { KeyRound, Mail, RefreshCcw, Save, Search, ShieldCheck, UserPlus } from 'lucide-react'

const enterpriseAdminUsers = []

export default function AdminUsers() {
  return (
    <section className="pageStack">
      <div className="panel heroPanel">
        <p className="eyebrow">Enterprise Admin Login Management</p>
        <h2>Maintain Autiq Africa admin users</h2>
        <p>Create and maintain Enterprise Super Admin users only. Update profile details, modify the login email ID, reset passwords, and control access status from one secure screen.</p>
      </div>

      <div className="panel">
        <div className="sectionHeader compact">
          <div>
            <h3>Add new enterprise super admin user</h3>
            <p>This user can log in to the Enterprise Admin workspace with Super Admin access only.</p>
          </div>
          <span className="accessBadge"><ShieldCheck size={16} /> Super Admin only</span>
        </div>
        <div className="formGrid adminForm">
          <label>Full name<input placeholder="Admin full name" defaultValue="Regional Setup Admin" /></label>
          <label>Role<select defaultValue="Super Admin"><option>Super Admin</option></select></label>
          <label>Email address<input type="email" placeholder="name@autiqafrica.com" defaultValue="regional.setup@autiqafrica.com" /></label>
          <label>Login email ID<input type="email" placeholder="Login email used for sign in" defaultValue="regional.setup@autiqafrica.com" /></label>
          <label>Temporary password<input type="password" defaultValue="Autiq@2026" /></label>
          <label>Status<select defaultValue="Active"><option>Active</option><option>Inactive</option><option>Blocked</option></select></label>
        </div>
        <div className="rowActions">
          <button><UserPlus size={16} /> Create super admin user</button>
          <button><Mail size={16} /> Send login details</button>
        </div>
      </div>

      <div className="panel">
        <div className="sectionHeader">
          <div>
            <h3>Admin users</h3>
            <p>Update Super Admin profile, modify login email, reset password, activate, block or deactivate access.</p>
          </div>
          <div className="searchBar compactSearch"><Search size={18} /><input placeholder="Search super admin name or login email" /></div>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Admin ID</th>
                <th>Name</th>
                <th>Role</th>
                <th>Email</th>
                <th>Login email ID</th>
                <th>Status</th>
                <th>Password</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {enterpriseAdminUsers.map((admin) => (
                <tr key={admin.id}>
                  <td><strong>{admin.id}</strong><br /><small>Last login: {admin.lastLogin}</small></td>
                  <td><input className="tableInput" defaultValue={admin.name} /></td>
                  <td><select className="tableInput" defaultValue="Super Admin"><option>Super Admin</option></select></td>
                  <td><input className="tableInput" type="email" defaultValue={admin.email} /></td>
                  <td><input className="tableInput" type="email" defaultValue={admin.loginEmail} /></td>
                  <td><span className={`statusPill ${admin.status.toLowerCase()}`}>{admin.status}</span></td>
                  <td><button className="softBtn"><RefreshCcw size={14} /> Reset password</button></td>
                  <td>
                    <div className="actionRow">
                      <button><Save size={14} /> Update</button>
                      <button><KeyRound size={14} /> Force reset</button>
                      <button>Activate</button>
                      <button>Block</button>
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

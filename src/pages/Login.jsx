import { useNavigate } from 'react-router-dom'
import { Wrench } from 'lucide-react'

export default function Login({ auth }) {
  const navigate = useNavigate()
  return (
    <div className="loginPage">
      <section className="loginHero">
        <div className="logoMark large">AA</div>
        <p className="eyebrow">Autiq Africa</p>
        <h1>Responsive dealer and workshop platform for Africa.</h1>
        <p>Role-based platform for Enterprise Admin, front desk, workshop, technician, parts, accounts, manager and CEO workflows.</p>
      </section>
      <section className="loginCard">
        <Wrench size={34} />
        <h2>Sign In</h2>
        <label>Select user role</label>
        <select value={auth.role} onChange={(e) => auth.setRole(e.target.value)}>
          {auth.roles.map((r) => <option key={r}>{r}</option>)}
        </select>
        <input placeholder="Email address" />
        <input placeholder="Password" type="password" />
        <button className="primaryBtn full" onClick={() => navigate('/dashboard')}>Sign In</button>
        <a>Forgot password?</a>
      </section>
    </div>
  )
}

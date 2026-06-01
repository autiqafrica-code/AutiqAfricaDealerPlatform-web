import { Link } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import QuotationWorkbench from '../../components/QuotationWorkbench.jsx'

export default function QuotationUpdate({ role }) {
  const backMap = {
    Technician: '/technician',
    'Workshop Controller': '/workshop',
    'Parts Interpreter': '/parts'
  }
  return (
    <div className="pageStack">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Dedicated quotation update screen</p>
          <h2>{role} Quotation Update</h2>
          <p className="mutedText">Update quotation details, add evidence, and return the completed update to Front Desk.</p>
        </div>
        <Link className="secondaryBtn" to={backMap[role] || '/jobs'}><ArrowLeft size={16} /> Back to dashboard</Link>
      </div>
      <QuotationWorkbench role={role} dedicated />
    </div>
  )
}

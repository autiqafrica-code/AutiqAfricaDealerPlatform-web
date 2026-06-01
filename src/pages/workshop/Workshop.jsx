import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'

const jobs = []

export default function Workshop(){return <div className="pageStack"><div className="metricGrid"><Card title="Accepted jobs" value="12" note="Ready to assign"/><Card title="In progress" value="18" note="Workshop floor"/><Card title="Waiting parts" value="5" note="Parts handoff"/><Card title="Completed today" value="17" note="Sent to front desk"/></div><section className="panel"><div className="sectionHead"><h2>Workshop Controller: assign and monitor technicians</h2><div className="rowActions"><button className="primaryBtn">Assign Technician</button><Link className="softBtn" to="/workshop/quotation-update"><FileText size={16} /> Quotation update</Link></div></div><div className="tableWrap"><table><thead><tr><th>Job</th><th>Vehicle</th><th>Status</th><th>Technician</th><th>Progress</th></tr></thead><tbody>{jobs.map(j=><tr key={j.id}><td>{j.id}</td><td>{j.vehicle}</td><td>{j.status}</td><td>{j.tech}</td><td><div className="progress"><span style={{width:`${j.progress}%`}} /></div></td></tr>)}</tbody></table></div></section></div>}
function Card({title,value,note}){return <article className="metricCard"><p>{title}</p><h2>{value}</h2><span>{note}</span></article>}

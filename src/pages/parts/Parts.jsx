import { Link } from 'react-router-dom'
import { FileText } from 'lucide-react'

const jobs = []

export default function Parts(){return <div className="pageStack"><div className="metricGrid"><Card title="Quotes needed" value="9" note="Line-item pricing"/><Card title="Waiting parts" value="5" note="Supplier follow-up"/><Card title="Sent for approval" value="6" note="Customer links"/><Card title="Insurance quotes" value="3" note="Standard pricing"/></div><section className="panel"><div className="sectionHead"><h2>Parts Interpreter: quote and parts workflow</h2><div className="rowActions"><button className="primaryBtn">Create Line-item Quote</button><Link className="softBtn" to="/parts/quotation-update"><FileText size={16} /> Quotation update</Link></div></div><div className="tableWrap"><table><thead><tr><th>Job</th><th>Vehicle</th><th>Required Part</th><th>Status</th><th>Quote</th></tr></thead><tbody>{jobs.slice(1,6).map((j,i)=><tr key={j.id}><td>{j.id}</td><td>{j.vehicle}</td><td>{['Brake pads','Oil filter','Bumper paint','Shock absorber','Battery'][i]}</td><td>{j.status}</td><td>{j.amount}</td></tr>)}</tbody></table></div></section></div>}
function Card({title,value,note}){return <article className="metricCard"><p>{title}</p><h2>{value}</h2><span>{note}</span></article>}

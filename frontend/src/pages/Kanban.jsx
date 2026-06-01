const jobs = []
const columns =['New','Accepted','In Progress','Waiting Approval','Waiting Parts','Payment','Completed']
export default function Kanban() {
  return <div className="kanbanScroller">{columns.map(col => <section className="kanbanCol" key={col}><h3>{col}</h3>{jobs.filter(j=>j.status===col).map(job => <article className="jobCard" key={job.id}><div className="jobTop"><strong>{job.id}</strong><span className={`dot ${job.priority.toLowerCase()}`}></span></div><h4>{job.customer}</h4><p>{job.vehicle}</p><div className="progress"><span style={{width:`${job.progress}%`}} /></div><small>{job.tech} • {job.amount}</small></article>)}</section>)}</div>
}

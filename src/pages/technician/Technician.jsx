import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Camera, Check, ClipboardCheck, FilePlus2, FileText, Save, Wrench } from 'lucide-react'

const technicianChecklist = []

const severityOptions = [
  { value: 'High', label: 'High', color: 'red', helper: 'Critical issue. Customer approval required.' },
  { value: 'Medium', label: 'Medium', color: 'amber', helper: 'Should be done within 5000 km.' },
  { value: 'Low', label: 'Low', color: 'green', helper: 'Low risk. Good to go.' }
]

export default function Technician() {
  const [jobStatus, setJobStatus] = useState('In Progress')
  const [completionNote, setCompletionNote] = useState('Road test completed. Vehicle cleaned and ready for QC handoff.')
  const [completionMedia, setCompletionMedia] = useState([])
  const [newIssue, setNewIssue] = useState({ title: '', severity: 'High', note: '' })
  const [issues, setIssues] = useState([
    { title: 'Brake pad wear below safe limit', severity: 'High', note: 'Front pads need replacement before delivery.' },
    { title: 'Suspension bush showing wear', severity: 'Medium', note: 'Recommend replacement within 5000 km.' },
    { title: 'Tyre pressure adjusted', severity: 'Low', note: 'Good to go after pressure correction.' }
  ])

  const activeSeverity = severityOptions.find((item) => item.value === newIssue.severity)
  const overallStatus = useMemo(() => {
    if (issues.some((issue) => issue.severity === 'High')) return { label: 'High severity issue found', color: 'red' }
    if (issues.some((issue) => issue.severity === 'Medium')) return { label: 'Medium severity issue found', color: 'amber' }
    return { label: 'Good to go', color: 'green' }
  }, [issues])

  const handleAddIssue = () => {
    const title = newIssue.title.trim() || (newIssue.severity === 'Low' ? 'Good to go note' : 'New technician issue')
    setIssues([...issues, { ...newIssue, title, note: newIssue.note.trim() || activeSeverity.helper }])
    setNewIssue({ title: '', severity: 'High', note: '' })
  }

  const handleCompletionUpload = (event) => {
    const files = Array.from(event.target.files || []).map((file) => file.name)
    setCompletionMedia(files)
  }

  return (
    <div className="pageStack">
      <section className="panel heroPanel">
        <p className="eyebrow">Technician mobile workspace</p>
        <h2>Job status, issue raise and completion evidence</h2>
        <p>Update job progress, capture photo/video evidence, add short completion notes and flag issues by severity.</p>
        <div className="rowActions">
          <Link className="primaryBtn" to="/technician/quotation-update"><FileText size={16} /> Open quotation update screen</Link>
        </div>
      </section>

      <div className="techWorkspaceGrid">
        <div className="techPhone">
          <div className="phoneHeader"><Wrench /><div><p>Job AA-1026</p><h2>Brake Service</h2></div></div>
          <div className={`bigStatus ${overallStatus.color}`}>{overallStatus.label}</div>

          <label className="techField">
            <span>Update job status</span>
            <select value={jobStatus} onChange={(event) => setJobStatus(event.target.value)}>
              <option>Accepted</option>
              <option>In Progress</option>
              <option>Waiting Approval</option>
              <option>Waiting Parts</option>
              <option>Completed</option>
            </select>
          </label>

          {technicianChecklist.map(item => (
            <div className="checkRow" key={item.label}>
              <div><strong>{item.label}</strong><span>{item.state}</span></div>
              <span className={`pill ${item.color.toLowerCase()}`}>{item.color}</span>
            </div>
          ))}

          {jobStatus === 'Completed' && (
            <div className="completionCard">
              <div className="mediaPanelHead"><ClipboardCheck size={18} /><strong>Completion evidence</strong></div>
              <textarea value={completionNote} onChange={(event) => setCompletionNote(event.target.value)} placeholder="Short completion note" />
              <div className="uploadBox">
                <Camera />
                <p>Upload completion photo/video</p>
                <input type="file" accept="image/*,video/*" multiple onChange={handleCompletionUpload} />
                <button className="softBtn" type="button">Choose Photo/Video</button>
              </div>
              {completionMedia.length > 0 && <div className="mediaPreviewRow">{completionMedia.map((file) => <span key={file}>{file}</span>)}</div>}
            </div>
          )}

          <div className="mobileActions"><button><Save />Save Status</button><button><Check />Submit QC</button></div>
        </div>

        <section className="panel issuePanel">
          <div className="sectionHeader compact">
            <div>
              <p className="eyebrow">Issue severity</p>
              <h3>Add new issue or good-to-go note</h3>
            </div>
            <span className={`pill ${activeSeverity.color}`}>{activeSeverity.label}</span>
          </div>

          <div className="formGrid twoCols">
            <label>
              Issue title
              <input value={newIssue.title} onChange={(event) => setNewIssue({ ...newIssue, title: event.target.value })} placeholder="Example: Oil leak found" />
            </label>
            <label>
              Severity
              <select value={newIssue.severity} onChange={(event) => setNewIssue({ ...newIssue, severity: event.target.value })}>
                {severityOptions.map((item) => <option key={item.value}>{item.value}</option>)}
              </select>
            </label>
            <label className="wide">
              Technician note
              <textarea value={newIssue.note} onChange={(event) => setNewIssue({ ...newIssue, note: event.target.value })} placeholder={activeSeverity.helper} />
            </label>
          </div>
          <button className="primaryBtn" type="button" onClick={handleAddIssue}><FilePlus2 size={16} /> Add issue</button>

          <div className="issueList">
            {issues.map((issue, index) => {
              const severity = severityOptions.find((item) => item.value === issue.severity) || severityOptions[2]
              return (
                <article className={`issueCard ${severity.color}`} key={`${issue.title}-${index}`}>
                  <div><AlertTriangle size={18} /><strong>{issue.title}</strong></div>
                  <p>{issue.note}</p>
                  <span className={`pill ${severity.color}`}>{issue.severity}</span>
                </article>
              )
            })}
          </div>
        </section>
      </div>
    </div>
  )
}

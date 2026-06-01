import { useMemo, useState } from 'react'
import { ArrowLeftRight, Camera, CheckCircle2, Edit3, FileText, ImagePlus, Plus, Save, Send, Trash2, Video } from 'lucide-react'

const partLineItems = []
const quotationWorkItems = []

const roleConfig = {
  'Workshop Controller': {
    title: 'Workshop Controller quotation updates',
    subtitle: 'Review Front Desk quotation requests, add bay allocation, repair route, estimated labour time and send the completed update back to Front Desk.',
    focusLabel: 'Bay / repair route update',
    notePlaceholder: 'Example: Bay 3 required for 2.5 hours. Brake skim and road test needed before final quote.',
    updateLabel: 'Update workshop quote details'
  },
  Technician: {
    title: 'Technician quotation updates with photos and videos',
    subtitle: 'Review quotation requests, add diagnosis, upload photo/video evidence, confirm repair time, failed component notes and return the completed technical update to Front Desk.',
    focusLabel: 'Diagnosis / repair update',
    notePlaceholder: 'Example: Front brake pads worn below safe limit. Disc skim recommended. Labour estimate 2.5 hours.',
    updateLabel: 'Update technician quote details'
  },
  'Parts Interpreter': {
    title: 'Parts Interpreter quotation updates',
    subtitle: 'Add old part media, separate line items, individual prices, availability and replacement time for each part before returning the quote to Front Desk.',
    focusLabel: 'Parts / availability update',
    notePlaceholder: 'Example: Brake pads available today. Front disc set requires supplier order. ETA 1 business day.',
    updateLabel: 'Update parts quote details'
  },
}

function MediaUpload({ title, helper, multiple = true }) {
  return (
    <label className="mediaDrop">
      <span><Camera size={18} /> {title}</span>
      <small>{helper}</small>
      <input type="file" accept="image/*,video/*" multiple={multiple} />
    </label>
  )
}

function TechnicianMediaPanel() {
  return (
    <div className="mediaPanel">
      <div className="mediaPanelHead"><ImagePlus size={18} /><strong>Technician quotation evidence</strong></div>
      <div className="mediaGrid">
        <MediaUpload title="Upload diagnosis photos/videos" helper="Photos or videos captured while updating the quotation" />
        <MediaUpload title="Upload failed component media" helper="Required for failed component evidence" />
        <MediaUpload title="Upload replaced component media" helper="After repair or replacement proof" />
      </div>
      <div className="mediaPreviewRow">
        <span><ImagePlus size={15} /> brake-pad-wear.jpg</span>
        <span><Video size={15} /> brake-noise-test.mp4</span>
      </div>
    </div>
  )
}

function PartsLineItemEditor() {
  const [items, setItems] = useState(partLineItems)
  const total = useMemo(() => items.reduce((sum, item) => sum + Number(String(item.price).replace(/[^0-9.]/g, '') || 0), 0), [items])
  const update = (index, key, value) => setItems((current) => current.map((item, i) => i === index ? { ...item, [key]: value } : item))
  const add = () => setItems((current) => [...current, { oldPart: '', replacementPart: '', price: 'ZAR 0', eta: 'To confirm', replacementTime: '0.5 hours' }])
  const remove = (index) => setItems((current) => current.filter((_, i) => i !== index))

  return (
    <div className="partsEditor">
      <div className="sectionHeader compact">
        <div>
          <p className="eyebrow">Parts quotation line items</p>
          <h4>Each part is priced separately</h4>
        </div>
        <button className="softBtn" onClick={add}><Plus size={16} /> Add part line</button>
      </div>
      <div className="tableWrap">
        <table>
          <thead><tr><th>Old part</th><th>Replacement part</th><th>Price</th><th>Availability / ETA</th><th>Replacement time</th><th>Media</th><th></th></tr></thead>
          <tbody>{items.map((item, index) => (
            <tr key={`${item.oldPart}-${index}`}>
              <td><input className="tableInput" value={item.oldPart} onChange={(e) => update(index, 'oldPart', e.target.value)} /></td>
              <td><input className="tableInput" value={item.replacementPart} onChange={(e) => update(index, 'replacementPart', e.target.value)} /></td>
              <td><input className="miniInput" value={item.price} onChange={(e) => update(index, 'price', e.target.value)} /></td>
              <td><input className="tableInput" value={item.eta} onChange={(e) => update(index, 'eta', e.target.value)} /></td>
              <td><input className="miniInput" value={item.replacementTime} onChange={(e) => update(index, 'replacementTime', e.target.value)} /></td>
              <td><input type="file" accept="image/*,video/*" multiple /></td>
              <td><button className="dangerIcon" onClick={() => remove(index)}><Trash2 size={15} /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      <div className="quoteTotal"><span>Parts subtotal</span><strong>ZAR {total.toLocaleString()}</strong></div>
      <div className="mediaGrid partsMediaGrid">
        <MediaUpload title="Upload old part media" helper="Photo/video of old damaged part" />
        <MediaUpload title="Upload new/replacement part media" helper="Photo/video for each replacement item" />
      </div>
    </div>
  )
}

export default function QuotationWorkbench({ role }) {
  const config = roleConfig[role] || roleConfig.Technician
  const isTechnician = role === 'Technician'
  const isParts = role === 'Parts Interpreter'

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Quotation Handoff</p>
          <h3>{config.title}</h3>
          <p>{config.subtitle}</p>
        </div>
        <span className="accessBadge"><FileText size={16} /> View + update quotations</span>
      </div>

      <div className="tableWrap">
        <table>
          <thead>
            <tr>
              <th>Quote</th>
              <th>Customer / vehicle</th>
              <th>Repair request</th>
              <th>Front Desk status</th>
              <th>Your update status</th>
              <th>Estimate</th>
            </tr>
          </thead>
          <tbody>
            {quotationWorkItems.map((quote) => (
              <tr key={quote.id}>
                <td><strong>{quote.id}</strong><br /><small>{quote.createdAt}</small></td>
                <td>{quote.customer}<br /><small>{quote.vehicle}</small></td>
                <td>{quote.repairType}<br /><small>{quote.request}</small></td>
                <td><span className="pill amber">{quote.frontDeskStatus}</span></td>
                <td><span className={`pill ${quote.roleStatus[role] === 'Completed' ? 'green' : 'amber'}`}>{quote.roleStatus[role] || 'Pending update'}</span></td>
                <td>{quote.estimate}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="quoteUpdateGrid">
        <div className="quoteUpdateCard">
          <div className="sectionHeader compact">
            <div>
              <h4>Update selected quotation</h4>
              <p>Changes are saved against the quotation and visible to Front Desk.</p>
            </div>
            <Edit3 size={18} />
          </div>
          <div className="formGrid adminForm">
            <label>Quotation<select defaultValue="AA-Q-2048">{quotationWorkItems.map(q => <option key={q.id}>{q.id}</option>)}</select></label>
            <label>{config.focusLabel}<input defaultValue={isParts ? 'Brake pads available today' : 'Brake repair estimate updated'} /></label>
            <label>Time / ETA<input defaultValue={isParts ? 'Available today' : '2.5 hours'} /></label>
            <label>Cost impact<input defaultValue={isParts ? 'ZAR 980' : 'ZAR 1,450'} /></label>
            <label>Status<select defaultValue="Completed"><option>Pending update</option><option>In progress</option><option>Completed</option><option>Need clarification from Front Desk</option></select></label>
            <label className="wide">Update notes<textarea defaultValue="" placeholder={config.notePlaceholder} /></label>
          </div>
          {isTechnician && <TechnicianMediaPanel />}
          {isParts && <PartsLineItemEditor />}
          <div className="rowActions">
            <button className="softBtn"><Save size={16} /> {config.updateLabel}</button>
            <button className="primaryBtn"><Send size={16} /> Send back to Front Desk</button>
          </div>
        </div>

        <div className="quoteUpdateCard mutedCard">
          <h4>Front Desk return workflow</h4>
          <div className="handoffStep"><CheckCircle2 size={17} /> View quotation sent by Front Desk</div>
          <div className="handoffStep"><Edit3 size={17} /> Update role-specific details</div>
          <div className="handoffStep"><ArrowLeftRight size={17} /> Send completed update back to Front Desk</div>
          <p className="infoStrip">Front Desk receives the updated quote lines and can send the final quotation to the customer for approval.</p>
        </div>
      </div>
    </section>
  )
}

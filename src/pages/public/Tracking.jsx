import { useMemo, useState } from 'react'
import MarketingHeader from '../../components/MarketingHeader.jsx'
import AppFooter from '../../components/AppFooter.jsx'
import { Camera, CheckCircle2, Clock3, CreditCard, FileSignature, Mail, MapPin, PackageCheck, Phone, PlayCircle, Search, Truck, Wrench } from 'lucide-react'

const jobRecords = {
  'AA-1024': {
    customer: 'Amina Dlamini',
    vehicle: 'Toyota Hilux • GP 45 AB 09',
    status: 'In Progress',
    advisor: 'Mpho Service Desk',
    mobile: '+27 72 555 0188',
    email: 'amina@example.com',
    preference: 'Collection',
    progress: [
      { title: 'Job created', detail: 'Vehicle received and intake photos captured.', done: true },
      { title: 'Inspection completed', detail: 'Technician completed checklist and raised brake pad issue.', done: true },
      { title: 'Quotation approval', detail: 'Customer approved service and parts quotation.', done: true },
      { title: 'Work in progress', detail: 'Workshop team replacing approved parts.', done: true },
      { title: 'Quality check', detail: 'Final road test and controller QC pending.', done: false },
      { title: 'Ready for collection', detail: 'Customer notification will be sent once completed.', done: false }
    ],
    media: [
      { type: 'Photo', title: 'Front intake photo', tag: 'Before service' },
      { type: 'Photo', title: 'Brake pad wear image', tag: 'Issue evidence' },
      { type: 'Video', title: 'Technician walkaround video', tag: 'Inspection' },
      { type: 'Photo', title: 'Replacement part image', tag: 'Approved work' }
    ],
    approvals: [
      { item: '45,000 km service package', amount: 'R 2,850', status: 'Approved' },
      { item: 'Front brake pad replacement', amount: 'R 1,400', status: 'Approved' },
      { item: 'Wheel alignment', amount: 'R 650', status: 'Pending' }
    ],
    payment: {
      quotation: 'R 4,900',
      paid: 'R 0',
      balance: 'R 4,900',
      status: 'Unpaid'
    }
  }
}

const fallbackJob = {
  customer: 'Customer',
  vehicle: 'Vehicle linked to entered job number',
  status: 'Waiting Approval',
  advisor: 'Service Desk',
  mobile: '',
  email: '',
  preference: 'Delivery',
  progress: [
    { title: 'Job created', detail: 'Service Consultant captured intake details.', done: true },
    { title: 'Inspection', detail: 'Technician inspection is underway.', done: true },
    { title: 'Quotation approval', detail: 'One or more approvals may be pending.', done: false },
    { title: 'Work execution', detail: 'Work starts after customer approval.', done: false },
    { title: 'Payment', detail: 'Payment summary will update once quotation is approved.', done: false },
    { title: 'Collection or delivery', detail: 'Preference can be updated below.', done: false }
  ],
  media: [
    { type: 'Photo', title: 'Vehicle intake photo', tag: 'Gallery' },
    { type: 'Video', title: 'Inspection video', tag: 'Gallery' }
  ],
  approvals: [
    { item: 'Inspection quotation', amount: 'To be confirmed', status: 'Pending' }
  ],
  payment: {
    quotation: 'To be confirmed',
    paid: 'R 0',
    balance: 'To be confirmed',
    status: 'Unpaid'
  }
}

export default function Tracking() {
  const [jobNumber, setJobNumber] = useState('')
  const [searchedJob, setSearchedJob] = useState('')
  const [contact, setContact] = useState({ mobile: '', email: '' })
  const [deliveryPreference, setDeliveryPreference] = useState('Collection')
  const [saved, setSaved] = useState(false)

  const job = useMemo(() => {
    if (!searchedJob) return null
    return jobRecords[searchedJob.toUpperCase()] || fallbackJob
  }, [searchedJob])

  const handleSearch = (event) => {
    event.preventDefault()
    const nextJob = jobNumber.trim() || 'AA-1024'
    const record = jobRecords[nextJob.toUpperCase()] || fallbackJob
    setSearchedJob(nextJob)
    setContact({ mobile: record.mobile || '', email: record.email || '' })
    setDeliveryPreference(record.preference || 'Collection')
    setSaved(false)
  }

  const handleSavePreference = (event) => {
    event.preventDefault()
    setSaved(true)
  }

  return (
    <main className="landingPage">
      <MarketingHeader />

      <section className="staticHero trackingHero">
        <p className="eyebrow">Customer job tracking</p>
        <h1>Track your vehicle repair or service without logging in.</h1>
        <p>Enter your job number to view job progress, gallery updates, approval status, payment summary and delivery or collection preference.</p>
      </section>

      <section className="trackingLookupSection">
        <form className="trackingLookupCard" onSubmit={handleSearch}>
          <label>
            Job number
            <input value={jobNumber} onChange={(event) => setJobNumber(event.target.value)} placeholder="Example: AA-1024" />
          </label>
          <button className="heroPrimary" type="submit"><Search size={18} /> Track Job</button>
          <small>Demo hint: enter AA-1024 or leave blank to load sample customer tracking data.</small>
        </form>
      </section>

      {job && (
        <section className="trackingDashboard">
          <div className="trackingSummaryCard">
            <div>
              <p className="eyebrow">Job number</p>
              <h2>{searchedJob.toUpperCase()}</h2>
              <p>{job.customer} • {job.vehicle}</p>
            </div>
            <span className={job.status === 'Completed' ? 'pill green' : job.status === 'Waiting Approval' ? 'pill amber' : 'pill'}>{job.status}</span>
            <div className="trackingAdvisor"><Phone size={18} /> Service Advisor: {job.advisor}</div>
          </div>

          <div className="trackingGrid">
            <article className="trackingPanel progressPanel">
              <div className="trackingPanelHead"><Wrench size={22} /><h2>Job progress tracking</h2></div>
              <div className="customerTimeline">
                {job.progress.map((step, index) => (
                  <div className={step.done ? 'timelineStep done' : 'timelineStep'} key={step.title}>
                    <span>{step.done ? <CheckCircle2 size={18} /> : index + 1}</span>
                    <div>
                      <strong>{step.title}</strong>
                      <p>{step.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="trackingPanel">
              <div className="trackingPanelHead"><Camera size={22} /><h2>Photo/video gallery</h2></div>
              <div className="customerGallery">
                {job.media.map((item) => (
                  <div className="galleryTile" key={item.title}>
                    {item.type === 'Video' ? <PlayCircle size={30} /> : <Camera size={30} />}
                    <strong>{item.title}</strong>
                    <span>{item.type} • {item.tag}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="trackingPanel">
              <div className="trackingPanelHead"><FileSignature size={22} /><h2>Approvals</h2></div>
              <div className="approvalStack">
                {job.approvals.map((approval) => (
                  <div className="approvalRow" key={approval.item}>
                    <div>
                      <strong>{approval.item}</strong>
                      <span>{approval.amount}</span>
                    </div>
                    <span className={approval.status === 'Approved' ? 'pill green' : 'pill amber'}>{approval.status}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="trackingPanel">
              <div className="trackingPanelHead"><CreditCard size={22} /><h2>Payment summary</h2></div>
              <div className="paymentSummaryGrid">
                <span><small>Quotation</small><strong>{job.payment.quotation}</strong></span>
                <span><small>Paid</small><strong>{job.payment.paid}</strong></span>
                <span><small>Balance</small><strong>{job.payment.balance}</strong></span>
                <span><small>Status</small><strong className={job.payment.status === 'Paid' ? 'greenText' : 'redText'}>{job.payment.status}</strong></span>
              </div>
            </article>

            <article className="trackingPanel preferencePanel">
              <div className="trackingPanelHead"><Truck size={22} /><h2>Collection or delivery preference</h2></div>
              <form className="preferenceForm" onSubmit={handleSavePreference}>
                <label>
                  Preference
                  <select value={deliveryPreference} onChange={(event) => setDeliveryPreference(event.target.value)}>
                    <option>Collection</option>
                    <option>Delivery</option>
                  </select>
                </label>
                {deliveryPreference === 'Delivery' && (
                  <label className="fullField">
                    Delivery location
                    <input placeholder="Enter delivery address or landmark" />
                  </label>
                )}
                <label>
                  Mobile number
                  <input value={contact.mobile} onChange={(event) => setContact({ ...contact, mobile: event.target.value })} placeholder="Update mobile number" />
                </label>
                <label>
                  Email address
                  <input type="email" value={contact.email} onChange={(event) => setContact({ ...contact, email: event.target.value })} placeholder="Update email address" />
                </label>
                <button className="primaryBtn fullField" type="submit"><PackageCheck size={18} /> Save Preference</button>
                {saved && <div className="formSuccess"><Mail size={18} /> Preference and contact details updated.</div>}
              </form>
            </article>

            <article className="trackingPanel helpPanel">
              <div className="trackingPanelHead"><MapPin size={22} /><h2>Next step</h2></div>
              <p><Clock3 size={18} /> Watch this page for approval, payment and completion updates from the service team.</p>
              <p><Phone size={18} /> Contact the Service Desk if your mobile number or email is incorrect.</p>
            </article>
          </div>
        </section>
      )}

      <AppFooter />
    </main>
  )
}

import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { FileSpreadsheet, FileText, TrendingUp, Wrench, Clock, CreditCard, CheckCircle2, AlertTriangle } from 'lucide-react'

const approvedQuotations = []
const jobs = []
const paymentRecords = []

const reportTabs = [
  { to: '/reports/jobs', type: 'jobs', label: 'Jobs Created & Completed' },
  { to: '/reports/revenue', type: 'revenue', label: 'Revenue' },
  { to: '/reports/technician-performance', type: 'technician', label: 'Technician Performance' },
  { to: '/reports/pending-approvals-payments', type: 'pending', label: 'Pending Approvals & Payments' }
]

const technicianRows = [
  { technician: 'S. Ndlovu', assigned: 42, completed: 38, avgHours: 5.4, rework: 2, rating: '91%' },
  { technician: 'T. Banda', assigned: 36, completed: 31, avgHours: 6.1, rework: 3, rating: '86%' },
  { technician: 'L. Moyo', assigned: 29, completed: 27, avgHours: 4.8, rework: 1, rating: '93%' },
  { technician: 'A. Diallo', assigned: 33, completed: 30, avgHours: 5.2, rework: 2, rating: '90%' }
]

const monthlyRevenue = [
  { month: 'Jan', revenue: 265000, created: 74, completed: 68 },
  { month: 'Feb', revenue: 318000, created: 82, completed: 76 },
  { month: 'Mar', revenue: 356000, created: 91, completed: 84 },
  { month: 'Apr', revenue: 389000, created: 96, completed: 90 },
  { month: 'May', revenue: 412000, created: 104, completed: 97 }
]

const pendingApprovalRows = [
  { job: 'AA-1027', customer: 'Zola Naidoo', vehicle: 'BMW X3', type: 'Customer approval', status: 'Pending', age: '18 hours', amount: 'ZAR 2,800' },
  { job: 'AA-1028', customer: 'Chipo Phiri', vehicle: 'Isuzu D-Max', type: 'Parts approval', status: 'Pending', age: '1 day', amount: 'ZAR 7,400' },
  { job: 'AA-1031', customer: 'Thandi Ncube', vehicle: 'Mazda CX-5', type: 'Insurance approval', status: 'Pending', age: '2 days', amount: 'ZAR 9,600' }
]

function money(value) {
  return `ZAR ${value.toLocaleString('en-ZA')}`
}

function getNumberFromAmount(amount) {
  return Number(String(amount).replace(/[^0-9.]/g, '')) || 0
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function csvEscape(value) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

function getReportRows(type, summary, period, workshop) {
  const header = [
    ['Report period', period],
    ['Workshop filter', workshop],
    []
  ]

  if (type === 'jobs') {
    return [
      ...header,
      ['Month', 'Jobs Created', 'Jobs Completed', 'Completion Rate'],
      ...monthlyRevenue.map((row) => [row.month, row.created, row.completed, `${Math.round((row.completed / row.created) * 100)}%`]),
      [],
      ['Total created', summary.created],
      ['Total completed', summary.completed]
    ]
  }

  if (type === 'revenue') {
    return [
      ...header,
      ['Month', 'Revenue'],
      ...monthlyRevenue.map((row) => [row.month, money(row.revenue)]),
      [],
      ['Approved quotation revenue', money(summary.revenue)],
      ['Paid records', summary.paid]
    ]
  }

  if (type === 'technician') {
    return [
      ...header,
      ['Technician', 'Assigned Jobs', 'Completed Jobs', 'Average Hours', 'Rework', 'Performance Rating'],
      ...technicianRows.map((row) => [row.technician, row.assigned, row.completed, row.avgHours, row.rework, row.rating])
    ]
  }

  return [
    ...header,
    ['Pending approvals'],
    ['Job', 'Customer', 'Vehicle', 'Approval Type', 'Status', 'Age', 'Amount'],
    ...pendingApprovalRows.map((row) => [row.job, row.customer, row.vehicle, row.type, row.status, row.age, row.amount]),
    [],
    ['Pending payments'],
    ['Quote', 'Job', 'Customer', 'Amount', 'Method', 'Payment Status'],
    ...approvedQuotations.map((quote) => [quote.id, quote.jobId, quote.customer, quote.amount, quote.method, quote.paymentStatus])
  ]
}

export default function Reports({ reportType = 'jobs' }) {
  const [period, setPeriod] = useState('Month to date')
  const [workshop, setWorkshop] = useState('All workshops')

  const summary = useMemo(() => {
    const created = jobs.length
    const completed = jobs.filter((job) => job.status === 'Completed').length
    const revenue = approvedQuotations.reduce((sum, quote) => sum + getNumberFromAmount(quote.amount), 0)
    const pendingPayments = approvedQuotations.filter((quote) => quote.paymentStatus !== 'Paid').length
    const pendingApprovals = jobs.filter((job) => job.status === 'Waiting Approval').length + pendingApprovalRows.length
    const paid = paymentRecords.filter((payment) => payment.status === 'Paid').length
    return { created, completed, revenue, pendingPayments, pendingApprovals, paid }
  }, [])

  const title = reportTabs.find((tab) => tab.type === reportType)?.label || 'Reports'

  const handleExcelExport = () => {
    const rows = getReportRows(reportType, summary, period, workshop)
    const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
    downloadFile(`autiq-africa-${reportType}-report.csv`, csv, 'text/csv;charset=utf-8')
  }

  const handlePdfExport = () => {
    window.print()
  }

  return (
    <div className="pageStack reportsPage">
      <section className="panel reportsHeroPanel printArea">
        <div className="sectionHead reportsHeaderStack">
          <div>
            <p className="eyebrow">Reports & Analytics</p>
            <h2>{title}</h2>
            <p className="mutedText">Visible only to Accounts, CEO and Enterprise Admin users.</p>
          </div>
          <div className="rowActions noPrint">
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option>Month to date</option>
              <option>Last month</option>
              <option>Quarter to date</option>
              <option>Year to date</option>
            </select>
            <select value={workshop} onChange={(event) => setWorkshop(event.target.value)}>
              <option>All workshops</option>
              <option>Ikeja Workshop</option>
              <option>Lekki Paint & Panel</option>
              <option>Claremont Service Bay</option>
              <option>Westlands Workshop</option>
            </select>
            <button className="softBtn" onClick={handlePdfExport}><FileText size={16} /> Export PDF</button>
            <button className="primaryBtn" onClick={handleExcelExport}><FileSpreadsheet size={16} /> Export Excel</button>
          </div>
        </div>
        <div className="reportTabs noPrint">
          {reportTabs.map((tab) => (
            <Link key={tab.to} className={tab.type === reportType ? 'active' : ''} to={tab.to}>{tab.label}</Link>
          ))}
        </div>
      </section>

      {reportType === 'jobs' && <JobsReport summary={summary} />}
      {reportType === 'revenue' && <RevenueReport summary={summary} />}
      {reportType === 'technician' && <TechnicianReport />}
      {reportType === 'pending' && <PendingReport summary={summary} />}
    </div>
  )
}

function JobsReport({ summary }) {
  return (
    <>
      <div className="metricGrid">
        <ReportCard icon={Clock} title="Jobs created" value={summary.created} note="New jobs in selected period" />
        <ReportCard icon={CheckCircle2} title="Jobs completed" value={summary.completed} note="Completed workshop jobs" />
        <ReportCard icon={Wrench} title="Completion rate" value={`${Math.round((summary.completed / summary.created) * 100)}%`} note="Completed against created" />
        <ReportCard icon={AlertTriangle} title="Open jobs" value={summary.created - summary.completed} note="Still in workflow" danger />
      </div>
      <section className="panel printArea">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Jobs created and completed</p>
            <h2>Job movement by month</h2>
          </div>
          <span className="pill green">Completion rate {Math.round((summary.completed / summary.created) * 100)}%</span>
        </div>
        <div className="reportBars">
          {monthlyRevenue.map((row) => (
            <div className="reportBarGroup" key={row.month}>
              <div className="dualBars">
                <span title="Created" style={{ height: `${row.created}%` }}></span>
                <span title="Completed" style={{ height: `${row.completed}%` }}></span>
              </div>
              <strong>{row.month}</strong>
              <small>{row.completed}/{row.created}</small>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}

function RevenueReport({ summary }) {
  return (
    <>
      <div className="metricGrid">
        <ReportCard icon={TrendingUp} title="Revenue" value={money(summary.revenue)} note="Approved quotations value" />
        <ReportCard icon={CreditCard} title="Paid records" value={summary.paid} note="Payment records marked paid" />
        <ReportCard icon={CreditCard} title="Pending payments" value={summary.pendingPayments} note="Unpaid or part-paid quotes" danger />
        <ReportCard icon={TrendingUp} title="May revenue" value="ZAR 412,000" note="Highest month in sample" />
      </div>
      <section className="panel printArea">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Revenue</p>
            <h2>Revenue trend</h2>
          </div>
          <span className="pill green">Current {money(summary.revenue)}</span>
        </div>
        <div className="chartMock reportRevenueChart">
          {monthlyRevenue.map((row) => (
            <span key={row.month} style={{ height: `${Math.max(30, row.revenue / 5000)}%` }} title={`${row.month}: ${money(row.revenue)}`}></span>
          ))}
        </div>
        <div className="reportLegend"><span>Jan</span><span>Feb</span><span>Mar</span><span>Apr</span><span>May</span></div>
      </section>
    </>
  )
}

function TechnicianReport() {
  return (
    <section className="panel printArea">
      <div className="sectionHead">
        <div>
          <p className="eyebrow">Technician performance</p>
          <h2>Productivity and quality</h2>
        </div>
        <span className="pill amber">Average rating 90%</span>
      </div>
      <div className="tableWrap">
        <table>
          <thead>
            <tr><th>Technician</th><th>Assigned</th><th>Completed</th><th>Avg. hours</th><th>Rework</th><th>Rating</th></tr>
          </thead>
          <tbody>
            {technicianRows.map((row) => (
              <tr key={row.technician}>
                <td><strong>{row.technician}</strong></td>
                <td>{row.assigned}</td>
                <td>{row.completed}</td>
                <td>{row.avgHours}</td>
                <td>{row.rework}</td>
                <td><span className="pill green">{row.rating}</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function PendingReport({ summary }) {
  return (
    <section className="reportTwoCol">
      <div className="panel printArea">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Pending approvals</p>
            <h2>Customer and internal approvals</h2>
          </div>
          <span className="pill amber">{summary.pendingApprovals} open</span>
        </div>
        <div className="tableWrap">
          <table>
            <thead><tr><th>Job</th><th>Customer</th><th>Type</th><th>Age</th><th>Amount</th></tr></thead>
            <tbody>{pendingApprovalRows.map((row) => (
              <tr key={row.job}><td><strong>{row.job}</strong></td><td>{row.customer}</td><td>{row.type}</td><td>{row.age}</td><td>{row.amount}</td></tr>
            ))}</tbody>
          </table>
        </div>
      </div>

      <div className="panel printArea">
        <div className="sectionHead">
          <div>
            <p className="eyebrow">Pending payments</p>
            <h2>Approved quotations by payment status</h2>
          </div>
          <span className="pill red">{summary.pendingPayments} pending</span>
        </div>
        <div className="approvalStack">
          {approvedQuotations.map((quote) => (
            <div className="approvalRow" key={quote.id}>
              <div>
                <strong>{quote.id} · {quote.customer}</strong>
                <span>{quote.jobId} · {quote.amount} · {quote.method}</span>
              </div>
              <span className={`pill ${quote.paymentColor}`}>{quote.paymentStatus}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function ReportCard({ icon: Icon, title, value, note, danger }) {
  return (
    <article className={`metricCard reportMetric ${danger ? 'dangerCard' : ''}`}>
      <div className="metricIcon"><Icon size={24} /></div>
      <p>{title}</p>
      <h2>{value}</h2>
      <span>{note}</span>
    </article>
  )
}

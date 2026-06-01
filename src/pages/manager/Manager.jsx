import { CalendarDays, Clock, UserRoundCheck, Wrench } from 'lucide-react'

const jobs = []

const weekDays = [
  {
    day: 'Mon',
    date: '11 May',
    booked: 22,
    limit: 30,
    appointments: [
      { time: '10:00', customer: 'Amina Okafor', vehicle: 'Toyota Hilux', job: 'Vehicle intake', status: 'New' },
      { time: '12:30', customer: 'Musa Dlamini', vehicle: 'VW Polo', job: 'Brake inspection', status: 'Accepted' },
      { time: '16:00', customer: 'Nia Kamara', vehicle: 'Mercedes C200', job: 'Final QC', status: 'Payment' }
    ]
  },
  {
    day: 'Tue',
    date: '12 May',
    booked: 28,
    limit: 30,
    appointments: [
      { time: '10:30', customer: 'Kwame Mensah', vehicle: 'Ford Ranger', job: 'Engine diagnostic', status: 'In Progress' },
      { time: '13:00', customer: 'Zola Naidoo', vehicle: 'BMW X3', job: 'Approval follow-up', status: 'Waiting Approval' },
      { time: '17:30', customer: 'Peter Botha', vehicle: 'Nissan Navara', job: 'Delivery check', status: 'Completed' }
    ]
  },
  {
    day: 'Wed',
    date: '13 May',
    booked: 34,
    limit: 30,
    appointments: [
      { time: '10:00', customer: 'Chipo Phiri', vehicle: 'Isuzu D-Max', job: 'Parts escalation', status: 'Waiting Parts' },
      { time: '11:30', customer: 'Amina Okafor', vehicle: 'Toyota Hilux', job: 'Manager QC', status: 'QC Review' },
      { time: '15:00', customer: 'Kwame Mensah', vehicle: 'Ford Ranger', job: 'Red issue review', status: 'Critical' },
      { time: '18:30', customer: 'Musa Dlamini', vehicle: 'VW Polo', job: 'Customer handover', status: 'Ready' }
    ]
  },
  {
    day: 'Thu',
    date: '14 May',
    booked: 19,
    limit: 30,
    appointments: [
      { time: '10:30', customer: 'Nia Kamara', vehicle: 'Mercedes C200', job: 'Payment clearance', status: 'Payment' },
      { time: '14:30', customer: 'Zola Naidoo', vehicle: 'BMW X3', job: 'Quote revision', status: 'Waiting Approval' }
    ]
  },
  {
    day: 'Fri',
    date: '15 May',
    booked: 31,
    limit: 30,
    appointments: [
      { time: '10:00', customer: 'Peter Botha', vehicle: 'Nissan Navara', job: 'Road test', status: 'Completed' },
      { time: '12:00', customer: 'Chipo Phiri', vehicle: 'Isuzu D-Max', job: 'Parts received check', status: 'Waiting Parts' },
      { time: '15:30', customer: 'Amina Okafor', vehicle: 'Toyota Hilux', job: 'Service advisor handoff', status: 'New' }
    ]
  },
  {
    day: 'Sat',
    date: '16 May',
    booked: 14,
    limit: 30,
    appointments: [
      { time: '10:00', customer: 'Musa Dlamini', vehicle: 'VW Polo', job: 'Final inspection', status: 'QC Review' },
      { time: '13:00', customer: 'Kwame Mensah', vehicle: 'Ford Ranger', job: 'Manager sign-off', status: 'Critical' }
    ]
  }
]

const timelineSlots = ['10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM']

export default function Manager() {
  const overCapacityDays = weekDays.filter((day) => day.booked > day.limit).length
  const todaysAppointments = weekDays[0].appointments.length

  return (
    <div className="pageStack">
      <div className="metricGrid">
        <Card title="QC queue" value="8" note="Awaiting manager check" />
        <Card title="Critical issues" value="3" note="Red priority" />
        <Card title="Technician output" value="89%" note="This week" />
        <Card title="Calendar alerts" value={overCapacityDays} note="Days over capacity" />
      </div>

      <section className="panel managerCalendarPanel">
        <div className="sectionHead managerCalendarHead">
          <div>
            <p className="eyebrow">Manager calendar</p>
            <h2>Workshop appointments and daily capacity</h2>
            <span>View booked jobs, QC slots, capacity overloads, and manager actions from 10 AM to 8 PM.</span>
          </div>
          <div className="managerCalendarActions">
            <button className="softBtn"><CalendarDays size={17} /> Week view</button>
            <button className="primaryBtn"><UserRoundCheck size={17} /> Assign manager review</button>
          </div>
        </div>

        <div className="managerCalendarSummary">
          <div>
            <CalendarDays size={19} />
            <span>{todaysAppointments} manager-visible appointments today</span>
          </div>
          <div>
            <Clock size={19} />
            <span>Workshop hours: 10 AM to 8 PM</span>
          </div>
          <div>
            <Wrench size={19} />
            <span>Daily limit: 30 jobs</span>
          </div>
        </div>

        <div className="managerCalendarGrid">
          {weekDays.map((day) => {
            const overLimit = day.booked > day.limit
            return (
              <article className={`managerDayCard ${overLimit ? 'overLimit' : ''}`} key={day.day}>
                <div className="managerDayTop">
                  <div>
                    <strong>{day.day}</strong>
                    <span>{day.date}</span>
                  </div>
                  <span className={`pill ${overLimit ? 'red' : day.booked >= 28 ? 'amber' : 'green'}`}>
                    {day.booked}/{day.limit}
                  </span>
                </div>

                <div className="capacityTrack">
                  <span style={{ width: `${Math.min((day.booked / day.limit) * 100, 100)}%` }} />
                </div>
                <p className="capacityText">{overLimit ? 'Capacity exceeded. Manager action needed.' : 'Within daily capacity.'}</p>

                <div className="appointmentList">
                  {day.appointments.map((appointment) => (
                    <div className="appointmentItem" key={`${day.day}-${appointment.time}-${appointment.customer}`}>
                      <strong>{appointment.time}</strong>
                      <div>
                        <span>{appointment.customer}</span>
                        <small>{appointment.vehicle} • {appointment.job}</small>
                      </div>
                      <em>{appointment.status}</em>
                    </div>
                  ))}
                </div>
              </article>
            )
          })}
        </div>

        <div className="managerTimeline">
          {timelineSlots.map((slot) => <span key={slot}>{slot}</span>)}
        </div>
      </section>

      <section className="panel">
        <div className="sectionHead">
          <h2>Manager: QC and exception control</h2>
          <button className="primaryBtn">Approve QC</button>
        </div>
        <div className="tableWrap">
          <table>
            <thead>
              <tr><th>Job</th><th>Technician</th><th>Status</th><th>Risk</th><th>Manager Action</th></tr>
            </thead>
            <tbody>
              {jobs.filter(j => j.priority !== 'Green').map(j => (
                <tr key={j.id}>
                  <td>{j.id}</td>
                  <td>{j.tech}</td>
                  <td>{j.status}</td>
                  <td><span className={`pill ${j.priority.toLowerCase()}`}>{j.priority}</span></td>
                  <td>Review media and approve next step</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function Card({ title, value, note }) {
  return <article className="metricCard"><p>{title}</p><h2>{value}</h2><span>{note}</span></article>
}

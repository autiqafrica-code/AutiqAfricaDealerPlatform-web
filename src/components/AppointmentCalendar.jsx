import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Lock, Plus, Save, Users } from 'lucide-react'

const appointmentBookings = []
const workshopSchedule = { dailyJobLimit: 30, openingTime: '10:00', closingTime: '20:00', openingLabel: '10:00 AM', closingLabel: '8:00 PM' }

const viewOptions = ['Month', 'Week', 'Day']
const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toMinutes(time) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function formatHour(hour) {
  const suffix = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:00 ${suffix}`
}

function statusClass(status) {
  if (status === 'Confirmed') return 'green'
  if (status === 'Waiting Approval') return 'amber'
  if (status === 'Over Limit') return 'red'
  return 'soft'
}

export default function AppointmentCalendar({ title = 'Appointment calendar', compact = false, viewerRole = 'Front Desk', canBook = false, canSetDailyLimit = false }) {
  const [view, setView] = useState('Week')
  const [activeDate, setActiveDate] = useState(12)
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [dailyLimit, setDailyLimit] = useState(workshopSchedule.dailyJobLimit)
  const openingHour = toMinutes(workshopSchedule.openingTime) / 60
  const closingHour = toMinutes(workshopSchedule.closingTime) / 60
  const hours = useMemo(() => {
    const list = []
    for (let hour = openingHour; hour < closingHour; hour += 1) list.push(hour)
    return list
  }, [openingHour, closingHour])

  const dayBookings = appointmentBookings.filter((item) => item.date === activeDate)
  const selectedDateLabel = `${activeDate} May 2026`

  return (
    <section className={`panel appointmentPanel ${compact ? 'compactCalendar' : ''}`}>
      <div className="sectionHead calendarHead">
        <div>
          <p className="eyebrow">Calendar access: {viewerRole}</p>
          <h2>{title}</h2>
          <p className="mutedText">Workshop open from {workshopSchedule.openingLabel} to {workshopSchedule.closingLabel}. {canBook ? 'Front Desk can block booking slots.' : 'This role has view-only calendar access.'}</p>
        </div>
        <div className="calendarActions">
          <button className="softBtn"><ChevronLeft size={16} /> Previous</button>
          <strong>May 2026</strong>
          <button className="softBtn">Next <ChevronRight size={16} /></button>
          {canBook ? (
            <button className="primaryBtn" onClick={() => setShowBookingForm((open) => !open)}><Plus size={16} /> New booking</button>
          ) : (
            <span className="viewOnlyBadge"><Lock size={15} /> View only</span>
          )}
        </div>
      </div>

      <div className="calendarToolbar">
        <div className="viewToggle" role="tablist" aria-label="Calendar view selector">
          {viewOptions.map((option) => (
            <button key={option} className={view === option ? 'active' : ''} onClick={() => setView(option)}>{option}</button>
          ))}
        </div>
        <div className="calendarMeta">
          <span><Clock size={15} /> {workshopSchedule.openingLabel} - {workshopSchedule.closingLabel}</span>
          <span><Users size={15} /> Daily limit {dailyLimit}</span>
        </div>
      </div>

      {canSetDailyLimit && <DailyLimitPanel dailyLimit={dailyLimit} setDailyLimit={setDailyLimit} />}
      {canBook && showBookingForm && <NewBookingForm activeDate={activeDate} hours={hours} />}

      {view === 'Month' && <MonthView activeDate={activeDate} setActiveDate={setActiveDate} dailyLimit={dailyLimit} canSetDailyLimit={canSetDailyLimit} />}
      {view === 'Week' && <WeekView hours={hours} activeDate={activeDate} setActiveDate={setActiveDate} dailyLimit={dailyLimit} />}
      {view === 'Day' && <DayView hours={hours} bookings={dayBookings} selectedDateLabel={selectedDateLabel} canBook={canBook} />}
    </section>
  )
}

function DailyLimitPanel({ dailyLimit, setDailyLimit }) {
  return (
    <div className="limitPanel">
      <div>
        <strong>CEO daily job limit control</strong>
        <span>Set the max jobs allowed per day. Days crossing this limit turn red in the calendar.</span>
      </div>
      <label>Default daily limit<input type="number" min="1" value={dailyLimit} onChange={(event) => setDailyLimit(Number(event.target.value || 0))} /></label>
      <button className="primaryBtn"><Save size={16} /> Save limit</button>
    </div>
  )
}

function NewBookingForm({ activeDate, hours }) {
  return (
    <div className="bookingForm">
      <div>
        <strong>Block a calendar slot</strong>
        <span>Only Front Desk / Service Consultant users can create new bookings.</span>
      </div>
      <label>Date<input defaultValue={`${activeDate} May 2026`} /></label>
      <label>Time<select defaultValue="10:00">{hours.map((hour) => <option key={hour} value={`${String(hour).padStart(2, '0')}:00`}>{formatHour(hour)}</option>)}</select></label>
      <label>Customer<input defaultValue="New customer" /></label>
      <label>Vehicle<input defaultValue="Registration / vehicle" /></label>
      <label>Service<input defaultValue="Service intake" /></label>
      <button className="primaryBtn"><Plus size={16} /> Save booking</button>
    </div>
  )
}

function MonthView({ activeDate, setActiveDate, dailyLimit, canSetDailyLimit }) {
  const days = Array.from({ length: 31 }, (_, index) => index + 1)
  return (
    <div className="monthCalendar">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => <strong className="monthDayName" key={day}>{day}</strong>)}
      {days.map((date) => {
        const bookings = appointmentBookings.filter((item) => item.date === date)
        const overLimit = bookings.length > dailyLimit
        return (
          <button key={date} className={`monthCell ${activeDate === date ? 'selected' : ''} ${overLimit ? 'overLimit' : ''}`} onClick={() => setActiveDate(date)}>
            <span>{date}</span>
            <small>{bookings.length ? `${bookings.length}/${dailyLimit} bookings` : `0/${dailyLimit} open`}</small>
            {canSetDailyLimit && <em>Limit controlled by CEO</em>}
            {bookings.slice(0, 2).map((booking) => <em key={booking.id}>{booking.time} {booking.customer}</em>)}
          </button>
        )
      })}
    </div>
  )
}

function WeekView({ hours, activeDate, setActiveDate, dailyLimit }) {
  return (
    <div className="weekCalendar">
      <div className="timeColumnHeader">Time</div>
      {weekDays.map((day, index) => {
        const date = 11 + index
        const booked = appointmentBookings.filter((item) => item.date === date).length
        return <button key={day} onClick={() => setActiveDate(date)} className={`weekDayHeader ${activeDate === date ? 'selected' : ''}`}>{day}<span>{date} May • {booked}/{dailyLimit}</span></button>
      })}
      {hours.map((hour) => (
        <TimeRow key={hour} hour={hour} />
      ))}
    </div>
  )
}

function TimeRow({ hour }) {
  return (
    <>
      <div className="timeLabel">{formatHour(hour)}</div>
      {weekDays.map((day, index) => {
        const date = 11 + index
        const slotBookings = appointmentBookings.filter((item) => item.date === date && Number(item.time.split(':')[0]) === hour)
        return (
          <div className="timeSlot" key={`${date}-${hour}`}>
            {slotBookings.map((booking) => <BookingCard key={booking.id} booking={booking} />)}
          </div>
        )
      })}
    </>
  )
}

function DayView({ hours, bookings, selectedDateLabel, canBook }) {
  return (
    <div className="dayCalendar">
      <div className="daySummary">
        <CalendarDays size={20} />
        <div><strong>{selectedDateLabel}</strong><span>{bookings.length} bookings scheduled</span></div>
      </div>
      {hours.map((hour) => {
        const slotBookings = bookings.filter((item) => Number(item.time.split(':')[0]) === hour)
        return (
          <div className="dayTimeRow" key={hour}>
            <div className="timeLabel">{formatHour(hour)}</div>
            <div className="daySlot">
              {slotBookings.length ? slotBookings.map((booking) => <BookingCard key={booking.id} booking={booking} wide />) : <span className="emptySlot">{canBook ? 'Available for booking' : 'No scheduled booking'}</span>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function BookingCard({ booking, wide = false }) {
  return (
    <article className={`bookingCard ${wide ? 'wide' : ''}`}>
      <strong>{booking.time} • {booking.customer}</strong>
      <span>{booking.vehicle}</span>
      <span>{booking.service}</span>
      <small className={`pill ${statusClass(booking.status)}`}>{booking.status}</small>
    </article>
  )
}

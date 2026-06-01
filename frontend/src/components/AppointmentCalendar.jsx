import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Lock, Plus, Save, Users } from 'lucide-react'

const DEFAULT_SCHEDULE = { dailyJobLimit: 30, openingTime: '10:00', closingTime: '20:00' }

const viewOptions = ['Month', 'Week', 'Day']
const weekDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function toMinutes(time) {
  const [hour, minute] = time.split(':').map(Number)
  return hour * 60 + minute
}

function formatHour(hour) {
  const suffix  = hour >= 12 ? 'PM' : 'AM'
  const display = hour % 12 || 12
  return `${display}:00 ${suffix}`
}

function statusClass(status) {
  if (status === 'Confirmed')       return 'green'
  if (status === 'WaitingApproval') return 'amber'
  if (status === 'Cancelled')       return 'red'
  return 'soft'
}

/**
 * AppointmentCalendar
 *
 * Props:
 *  - title            string
 *  - compact          boolean
 *  - viewerRole       string
 *  - canBook          boolean  – show new booking button
 *  - canSetDailyLimit boolean  – show daily limit control (CEO)
 *  - bookings         Appointment[] | null  – real data from parent; falls back to []
 *  - settings         { dailyJobLimit, openingTime, closingTime } | null
 *  - onSaveDailyLimit (limit: number) => void  – called when CEO saves limit
 *  - savingLimit      boolean  – spinner state controlled by parent
 *  - limitSaveMsg     string   – success/error feedback from parent
 */
export default function AppointmentCalendar({
  title = 'Appointment calendar',
  compact = false,
  viewerRole = 'Front Desk',
  canBook = false,
  canSetDailyLimit = false,
  bookings = null,
  settings = null,
  onSaveDailyLimit = null,
  savingLimit = false,
  limitSaveMsg = '',
}) {
  const schedule = settings || DEFAULT_SCHEDULE
  const appts    = bookings || []

  const [view,            setView]            = useState('Week')
  const [activeDate,      setActiveDate]      = useState(() => new Date().getDate())
  const [showBookingForm, setShowBookingForm] = useState(false)
  const [dailyLimit,      setDailyLimit]      = useState(schedule.dailyJobLimit)

  // Keep dailyLimit in sync if parent updates settings (CEO saves)
  const effectiveLimit = onSaveDailyLimit ? dailyLimit : schedule.dailyJobLimit

  const openingHour = toMinutes(schedule.openingTime) / 60
  const closingHour = toMinutes(schedule.closingTime) / 60
  const hours = useMemo(() => {
    const list = []
    for (let h = openingHour; h < closingHour; h++) list.push(h)
    return list
  }, [openingHour, closingHour])

  const openLabel  = formatHour(openingHour)
  const closeLabel = formatHour(closingHour)

  const now = new Date()
  const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })

  const dayBookings     = appts.filter(a => new Date(a.appointmentDate).getDate() === activeDate)
  const selectedDateLbl = `${activeDate} ${monthLabel}`

  return (
    <section className={`panel appointmentPanel ${compact ? 'compactCalendar' : ''}`}>
      <div className="sectionHead calendarHead">
        <div>
          <p className="eyebrow">Calendar access: {viewerRole}</p>
          <h2>{title}</h2>
          <p className="mutedText">
            Workshop open from {openLabel} to {closeLabel}.{' '}
            {canBook ? 'Front Desk can block booking slots.' : 'This role has view-only calendar access.'}
          </p>
        </div>
        <div className="calendarActions">
          <button className="softBtn"><ChevronLeft size={16} /> Previous</button>
          <strong>{monthLabel}</strong>
          <button className="softBtn">Next <ChevronRight size={16} /></button>
          {canBook ? (
            <button className="primaryBtn" onClick={() => setShowBookingForm(o => !o)}><Plus size={16} /> New booking</button>
          ) : (
            <span className="viewOnlyBadge"><Lock size={15} /> View only</span>
          )}
        </div>
      </div>

      <div className="calendarToolbar">
        <div className="viewToggle" role="tablist" aria-label="Calendar view selector">
          {viewOptions.map(o => (
            <button key={o} className={view === o ? 'active' : ''} onClick={() => setView(o)}>{o}</button>
          ))}
        </div>
        <div className="calendarMeta">
          <span><Clock size={15} /> {openLabel} - {closeLabel}</span>
          <span><Users size={15} /> Daily limit {effectiveLimit}</span>
        </div>
      </div>

      {canSetDailyLimit && (
        <DailyLimitPanel
          dailyLimit={dailyLimit}
          setDailyLimit={setDailyLimit}
          onSave={onSaveDailyLimit}
          saving={savingLimit}
          msg={limitSaveMsg}
        />
      )}
      {canBook && showBookingForm && <NewBookingForm activeDate={activeDate} hours={hours} />}

      {view === 'Month' && (
        <MonthView
          activeDate={activeDate}
          setActiveDate={setActiveDate}
          dailyLimit={effectiveLimit}
          canSetDailyLimit={canSetDailyLimit}
          bookings={appts}
        />
      )}
      {view === 'Week' && (
        <WeekView
          hours={hours}
          activeDate={activeDate}
          setActiveDate={setActiveDate}
          dailyLimit={effectiveLimit}
          bookings={appts}
        />
      )}
      {view === 'Day' && (
        <DayView
          hours={hours}
          bookings={dayBookings}
          selectedDateLabel={selectedDateLbl}
          canBook={canBook}
        />
      )}
    </section>
  )
}

function DailyLimitPanel({ dailyLimit, setDailyLimit, onSave, saving, msg }) {
  function handleSave() {
    if (onSave) onSave(dailyLimit)
  }

  return (
    <div className="limitPanel">
      <div>
        <strong>CEO daily job limit control</strong>
        <span>Set the max jobs allowed per day. Days crossing this limit turn red in the calendar.</span>
      </div>
      <label>
        Default daily limit
        <input
          type="number"
          min="1"
          max="500"
          value={dailyLimit}
          onChange={e => setDailyLimit(Number(e.target.value || 0))}
        />
      </label>
      <button className="primaryBtn" onClick={handleSave} disabled={saving}>
        <Save size={16} /> {saving ? 'Saving…' : 'Save limit'}
      </button>
      {msg && (
        <span style={{ marginLeft: 10, color: msg.toLowerCase().includes('error') || msg.toLowerCase().includes('fail') ? '#ef4444' : '#16a34a', fontSize: 13 }}>
          {msg}
        </span>
      )}
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
      <label>Date<input defaultValue={`${activeDate} — current month`} /></label>
      <label>Time
        <select defaultValue="10:00">
          {hours.map(h => <option key={h} value={`${String(h).padStart(2,'0')}:00`}>{formatHour(h)}</option>)}
        </select>
      </label>
      <label>Customer<input placeholder="Customer name" /></label>
      <label>Vehicle<input placeholder="Registration / vehicle" /></label>
      <label>Service<input placeholder="Service type" /></label>
      <button className="primaryBtn"><Plus size={16} /> Save booking</button>
    </div>
  )
}

function MonthView({ activeDate, setActiveDate, dailyLimit, canSetDailyLimit, bookings }) {
  const days = Array.from({ length: 31 }, (_, i) => i + 1)
  return (
    <div className="monthCalendar">
      {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
        <strong className="monthDayName" key={d}>{d}</strong>
      ))}
      {days.map(date => {
        const dayAppts  = bookings.filter(a => new Date(a.appointmentDate).getDate() === date)
        const overLimit = dayAppts.length > dailyLimit
        return (
          <button
            key={date}
            className={`monthCell ${activeDate === date ? 'selected' : ''} ${overLimit ? 'overLimit' : ''}`}
            onClick={() => setActiveDate(date)}
          >
            <span>{date}</span>
            <small>{dayAppts.length ? `${dayAppts.length}/${dailyLimit} booked` : `0/${dailyLimit} open`}</small>
            {canSetDailyLimit && <em>Limit: CEO controlled</em>}
            {dayAppts.slice(0, 2).map(a => (
              <em key={a.id}>{a.appointmentTime} {a.customer?.name || ''}</em>
            ))}
          </button>
        )
      })}
    </div>
  )
}

function WeekView({ hours, activeDate, setActiveDate, dailyLimit, bookings }) {
  const now   = new Date()
  const month = now.getMonth()
  const year  = now.getFullYear()

  // Build 6 weekday columns starting from Monday of current week
  const monday = new Date(now)
  const dow    = monday.getDay()
  monday.setDate(monday.getDate() - (dow === 0 ? 6 : dow - 1))

  const weekDates = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(monday)
    d.setDate(monday.getDate() + i)
    return d
  })

  return (
    <div className="weekCalendar">
      <div className="timeColumnHeader">Time</div>
      {weekDates.map((date, idx) => {
        const dateNum = date.getDate()
        const dayAppts = bookings.filter(a => new Date(a.appointmentDate).getDate() === dateNum &&
          new Date(a.appointmentDate).getMonth() === month &&
          new Date(a.appointmentDate).getFullYear() === year
        )
        const over = dayAppts.length > dailyLimit
        return (
          <button
            key={idx}
            onClick={() => setActiveDate(dateNum)}
            className={`weekDayHeader ${activeDate === dateNum ? 'selected' : ''} ${over ? 'overLimit' : ''}`}
          >
            {weekDayNames[idx]}
            <span>{dateNum} • {dayAppts.length}/{dailyLimit}</span>
          </button>
        )
      })}
      {hours.map(hour => (
        <TimeRow key={hour} hour={hour} weekDates={weekDates} month={month} year={year} bookings={bookings} />
      ))}
    </div>
  )
}

function TimeRow({ hour, weekDates, month, year, bookings }) {
  return (
    <>
      <div className="timeLabel">{formatHour(hour)}</div>
      {weekDates.map((date, idx) => {
        const slotAppts = bookings.filter(a => {
          const d = new Date(a.appointmentDate)
          return d.getDate() === date.getDate() && d.getMonth() === month && d.getFullYear() === year
            && Number(a.appointmentTime?.split(':')[0]) === hour
        })
        return (
          <div className="timeSlot" key={idx}>
            {slotAppts.map(a => <BookingCard key={a.id} booking={a} />)}
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
        <div>
          <strong>{selectedDateLabel}</strong>
          <span>{bookings.length} bookings scheduled</span>
        </div>
      </div>
      {hours.map(hour => {
        const slotAppts = bookings.filter(a => Number(a.appointmentTime?.split(':')[0]) === hour)
        return (
          <div className="dayTimeRow" key={hour}>
            <div className="timeLabel">{formatHour(hour)}</div>
            <div className="daySlot">
              {slotAppts.length
                ? slotAppts.map(a => <BookingCard key={a.id} booking={a} wide />)
                : <span className="emptySlot">{canBook ? 'Available for booking' : 'No scheduled booking'}</span>}
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
      <strong>{booking.appointmentTime} • {booking.customer?.name || '—'}</strong>
      <span>{booking.vehicle?.makeModel || booking.vehicle?.registrationNo || '—'}</span>
      <span>{booking.serviceType || ''}</span>
      <small className={`pill ${statusClass(booking.status)}`}>{booking.status}</small>
    </article>
  )
}

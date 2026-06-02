import { useMemo, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, Lock, Menu, Plus, Save, Search, Users } from 'lucide-react'

const DEFAULT_SCHEDULE = { dailyJobLimit: 30, openingTime: '10:00', closingTime: '20:00' }

const viewOptions = ['Month', 'Week', 'Day', 'Schedule']
const weekDayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_ABBR  = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC']
const DAY_ABBR    = ['SUN','MON','TUE','WED','THU','FRI','SAT']
const MONTH_GRADIENTS = [
  'linear-gradient(160deg,#4facfe 0%,#00f2fe 100%)',
  'linear-gradient(160deg,#fd79a8 0%,#fdcb6e 100%)',
  'linear-gradient(160deg,#55efc4 0%,#00b894 100%)',
  'linear-gradient(160deg,#a29bfe 0%,#fd79a8 100%)',
  'linear-gradient(160deg,#fd79a8 0%,#fedb37 100%)',
  'linear-gradient(160deg,#f093fb 0%,#f5576c 100%)',
  'linear-gradient(160deg,#4facfe 0%,#43e97b 100%)',
  'linear-gradient(160deg,#f7971e 0%,#ffd200 100%)',
  'linear-gradient(160deg,#ff6a00 0%,#ee0979 100%)',
  'linear-gradient(160deg,#f7971e 0%,#ee0979 100%)',
  'linear-gradient(160deg,#373b44 0%,#4286f4 100%)',
  'linear-gradient(160deg,#4facfe 0%,#a29bfe 100%)',
]

function toDateStr(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

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

function formatWeekLabel(start, end) {
  const s = `${MONTH_ABBR[start.getMonth()]} ${start.getDate()}`
  const e = start.getMonth() === end.getMonth()
    ? String(end.getDate())
    : `${MONTH_ABBR[end.getMonth()]} ${end.getDate()}`
  return `${s} – ${e}`
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

  const [view,            setView]            = useState(() =>
    typeof window !== 'undefined' && window.innerWidth < 680 ? 'Schedule' : 'Week'
  )
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
  const monthLabel       = now.toLocaleString('default', { month: 'long', year: 'numeric' })
  const mobileMonthLabel = now.toLocaleString('default', { month: 'long' })

  const dayBookings     = appts.filter(a => new Date(a.appointmentDate).getDate() === activeDate)
  const selectedDateLbl = `${activeDate} ${monthLabel}`

  return (
    <section className={`panel appointmentPanel ${compact ? 'compactCalendar' : ''}`}>

      {/* ── Mobile header (hidden ≥680px) ─────────────────────────────────── */}
      <div className="mobileCalendarHeader">
        <button className="mobileCalMenuBtn" type="button" aria-label="Open menu">
          <Menu size={22} />
        </button>
        <button className="mobileCalMonth" type="button">
          <span>{mobileMonthLabel}</span>
          <ChevronDown size={16} />
        </button>
        <div className="mobileCalHeaderRight">
          <button type="button" aria-label="Search"><Search size={22} /></button>
          <div className="mobileCalDateBadge">{now.getDate()}</div>
          <div className="mobileCalAvatar">{viewerRole.charAt(0).toUpperCase()}</div>
        </div>
      </div>

      {/* ── Desktop header (hidden <680px) ────────────────────────────────── */}
      <div className="sectionHead calendarHead desktopCalHead">
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

      <div className="calendarToolbar desktopCalToolbar">
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

      {/* ── Mobile view toggle (hidden ≥680px) ────────────────────────────── */}
      <div className="mobileCalViewToggle">
        {viewOptions.map(o => (
          <button key={o} type="button" onClick={() => setView(o)}
            style={{
              padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 12,
              background: view === o ? 'var(--teal)' : '#f2f4f7',
              color: view === o ? '#fff' : '#344054',
            }}>
            {o}
          </button>
        ))}
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
      {view === 'Schedule' && (
        <ScheduleView bookings={appts} canBook={canBook} />
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

// ── Schedule (agenda) view ────────────────────────────────────────────────────

function ScheduleView({ bookings, canBook }) {
  const now = new Date()
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const todayStr = toDateStr(todayMidnight)

  // Start from Monday of the current week
  const monday = new Date(todayMidnight)
  const startDow = monday.getDay()
  monday.setDate(monday.getDate() - (startDow === 0 ? 6 : startDow - 1))

  const endDate = new Date(todayMidnight)
  endDate.setDate(endDate.getDate() + 90)

  // Build list of weeks (Mon–Sun) within range
  const weeks = []
  const cursor = new Date(monday)
  while (cursor <= endDate) {
    const weekStart = new Date(cursor)
    const weekEndFull = new Date(cursor)
    weekEndFull.setDate(cursor.getDate() + 6)

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(cursor)
      d.setDate(cursor.getDate() + i)
      if (d >= todayMidnight && d <= endDate) days.push(new Date(d))
    }

    if (days.length > 0) {
      weeks.push({ weekStart, weekEnd: weekEndFull, days })
    }
    cursor.setDate(cursor.getDate() + 7)
  }

  // Build sections: inject month banners when a week contains the 1st of a new month
  const sections = []
  let lastBannerMonth = -1
  weeks.forEach(week => {
    const monthStart = week.days.find(d => d.getDate() === 1)
    if (monthStart) {
      const m = monthStart.getMonth()
      if (m !== lastBannerMonth) {
        sections.push({ type: 'monthBanner', month: m, year: monthStart.getFullYear() })
        lastBannerMonth = m
      }
    }
    sections.push({ type: 'week', ...week })
  })

  return (
    <div className="scheduleView">
      {sections.map((section, idx) => {
        if (section.type === 'monthBanner') {
          return <MonthBanner key={`mb-${section.month}-${section.year}`} month={section.month} year={section.year} />
        }

        const { weekStart, weekEnd, days } = section
        const weekLabel = formatWeekLabel(weekStart, weekEnd)

        // Only render day rows for today or days with bookings
        const relevantDays = days.filter(d => {
          const ds = toDateStr(d)
          return ds === todayStr || bookings.some(a => toDateStr(new Date(a.appointmentDate)) === ds)
        })

        return (
          <div key={`wk-${toDateStr(weekStart)}`} className="scheduleWeekGroup">
            <div className="scheduleWeekHeader">{weekLabel}</div>
            {relevantDays.map(d => {
              const ds = toDateStr(d)
              const dayBkgs = bookings.filter(a => toDateStr(new Date(a.appointmentDate)) === ds)
              return (
                <ScheduleDayRow
                  key={ds}
                  date={d}
                  bookings={dayBkgs}
                  isToday={ds === todayStr}
                  canBook={canBook}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

function ScheduleDayRow({ date, bookings, isToday, canBook }) {
  return (
    <div className="scheduleDayRow">
      <div className="scheduleDayLabel">
        <span className="scheduleDayName">{DAY_ABBR[date.getDay()]}</span>
        <span className={`scheduleDayNum${isToday ? ' scheduleToday' : ''}`}>{date.getDate()}</span>
      </div>
      <div className="scheduleDayEvents">
        {bookings.length > 0
          ? bookings.map(b => (
              <div key={b.id} className="scheduleEventCard">
                <span>{b.customer?.name || b.serviceType || 'Appointment'}</span>
                {b.appointmentTime && <small>{b.appointmentTime}</small>}
              </div>
            ))
          : isToday && (
              <span className="scheduleNothingPlanned">
                {canBook ? 'Nothing planned. Tap to create.' : 'Nothing planned.'}
              </span>
            )
        }
      </div>
    </div>
  )
}

function MonthBanner({ month, year }) {
  return (
    <div className="scheduleMonthBanner" style={{ background: MONTH_GRADIENTS[month] }}>
      <strong>{MONTH_NAMES[month]}</strong>
    </div>
  )
}

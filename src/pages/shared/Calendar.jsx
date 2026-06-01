import AppointmentCalendar from '../../components/AppointmentCalendar.jsx'

export default function Calendar({ role = 'Front Desk' }) {
  const canBook = role === 'Front Desk'
  const canSetDailyLimit = role === 'CEO'
  return (
    <div className="pageStack">
      <AppointmentCalendar
        title="Appointment calendar"
        viewerRole={role}
        canBook={canBook}
        canSetDailyLimit={canSetDailyLimit}
      />
    </div>
  )
}

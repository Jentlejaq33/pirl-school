export default function Attendance() {
  return (
    <div>
      <h1>Attendance</h1>
      <p className="muted">
        Pattern: pick a class + date, mark each student present/absent/late, then
        upsert into <code>attendance</code> (unique on student_id+date). Absences can
        fan out an SMS via the comms function. Build on the Results page pattern.
      </p>
    </div>
  )
}

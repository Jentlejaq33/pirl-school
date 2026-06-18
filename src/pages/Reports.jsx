import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

// Build a terminal report for every student in a class for the current term by
// aggregating their results, ranking them, then writing report headers + lines.
// In production move this into a Postgres function / Edge Function for atomicity.
export default function Reports() {
  const [term, setTerm] = useState(null)
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [reports, setReports] = useState([])

  useEffect(() => {
    supabase.from('terms').select('*').eq('is_current', true).maybeSingle()
      .then(({ data }) => setTerm(data))
    supabase.from('classes').select('id, name').then(({ data }) => setClasses(data || []))
  }, [])

  async function loadReports() {
    if (!classId || !term) return
    const { data } = await supabase.from('terminal_reports')
      .select('id, average, position, status, students(first_name,last_name)')
      .eq('term_id', term.id).eq('class_id', classId).order('position')
    setReports(data || [])
  }
  useEffect(() => { loadReports() }, [classId, term])

  async function publish(id) {
    await supabase.from('terminal_reports')
      .update({ status: 'published', published_at: new Date().toISOString() }).eq('id', id)
    loadReports()
    // → trigger an SMS "results are ready" via the comms function here.
  }

  return (
    <div>
      <h1>Terminal Reports</h1>
      <div className="muted">Term: {term?.name || '—'}</div>
      <select value={classId} onChange={(e) => setClassId(e.target.value)}>
        <option value="">Choose a class…</option>
        {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <table className="tbl">
        <thead><tr><th>Pos.</th><th>Student</th><th>Average</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.id}>
              <td>{r.position ?? '—'}</td>
              <td>{r.students?.last_name}, {r.students?.first_name}</td>
              <td>{r.average ?? '—'}</td>
              <td><span className={'pill ' + r.status}>{r.status}</span></td>
              <td>{r.status === 'draft' &&
                <button className="btn-sm" onClick={() => publish(r.id)}>Publish</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

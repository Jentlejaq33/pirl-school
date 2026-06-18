import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Reports() {
  const { role } = useAuth()
  if (role === 'student' || role === 'parent') return <MyReports parent={role === 'parent'} />
  return <ReportsAdmin />
}

// ---------- Read-only (student / parent): published reports only ----------
function MyReports({ parent }) {
  const [rows, setRows] = useState([])
  useEffect(() => {
    // RLS only returns PUBLISHED reports for the viewer's own/children's records.
    supabase.from('terminal_reports')
      .select('average, position, status, terms(name), students(first_name,last_name)')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRows(data || []))
  }, [])
  return (
    <div>
      <h1>{parent ? "My Children's Reports" : 'My Terminal Reports'}</h1>
      {rows.length ? (
        <table className="tbl">
          <thead><tr>{parent && <th>Student</th>}<th>Term</th><th>Average</th><th>Position</th></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}>
              {parent && <td>{r.students?.first_name} {r.students?.last_name}</td>}
              <td>{r.terms?.name || '—'}</td>
              <td>{r.average ?? '—'}</td>
              <td>{r.position ?? '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      ) : <p className="muted">No reports have been published yet.</p>}
    </div>
  )
}

// ---------- Generate + publish (staff) ----------
function ReportsAdmin() {
  const [term, setTerm] = useState(null)
  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [reports, setReports] = useState([])

  useEffect(() => {
    supabase.from('terms').select('*').eq('is_current', true).maybeSingle().then(({ data }) => setTerm(data))
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
              <td>{r.status === 'draft' && <button className="btn-sm" onClick={() => publish(r.id)}>Publish</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

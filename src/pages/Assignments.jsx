import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Assignments() {
  const { role } = useAuth()
  const staff = ['school_admin', 'teacher'].includes(role)
  if (staff) return <StaffAssignments />
  if (role === 'student') return <StudentAssignments />
  return <ParentAssignments />
}

// ---------- Staff: create + grade ----------
function StaffAssignments() {
  const { profile } = useAuth()
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [list, setList] = useState([])
  const [form, setForm] = useState({ class_id: '', subject_id: '', title: '', instructions: '', due_date: '' })
  const [openId, setOpenId] = useState('')
  const [subs, setSubs] = useState([])

  async function load() {
    const { data } = await supabase.from('assignments')
      .select('id, title, due_date, classes(name), subjects(name)').order('due_date', { ascending: false })
    setList(data || [])
  }
  useEffect(() => {
    supabase.from('classes').select('id, name').then(({ data }) => setClasses(data || []))
    supabase.from('subjects').select('id, name').then(({ data }) => setSubjects(data || []))
    load()
  }, [])

  async function create() {
    if (!form.title || !form.class_id) return alert('Title and class are required')
    await supabase.from('assignments').insert({ ...form, school_id: profile.school_id, created_by: profile.id,
      subject_id: form.subject_id || null, due_date: form.due_date || null })
    setForm({ class_id: '', subject_id: '', title: '', instructions: '', due_date: '' })
    load()
  }

  async function viewSubs(id) {
    setOpenId(id)
    const { data } = await supabase.from('assignment_submissions')
      .select('id, content, grade, feedback, students(first_name,last_name)').eq('assignment_id', id)
    setSubs(data || [])
  }
  async function grade(subId, grade) {
    await supabase.from('assignment_submissions').update({ grade }).eq('id', subId)
    viewSubs(openId)
  }

  return (
    <div>
      <h1>Assignments</h1>
      <div className="card" style={{ maxWidth: 520 }}>
        <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
        <label>Class
          <select value={form.class_id} onChange={(e) => setForm({ ...form, class_id: e.target.value })}>
            <option value="">Choose…</option>
            {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>
        <label>Subject
          <select value={form.subject_id} onChange={(e) => setForm({ ...form, subject_id: e.target.value })}>
            <option value="">—</option>
            {subjects.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label>Instructions<textarea rows={2} value={form.instructions} onChange={(e) => setForm({ ...form, instructions: e.target.value })} /></label>
        <label>Due date<input type="date" value={form.due_date} onChange={(e) => setForm({ ...form, due_date: e.target.value })} /></label>
        <button className="btn" onClick={create}>Create assignment</button>
      </div>

      <h3>All assignments</h3>
      <table className="tbl">
        <thead><tr><th>Title</th><th>Class</th><th>Subject</th><th>Due</th><th></th></tr></thead>
        <tbody>{list.map((a) => (
          <tr key={a.id}>
            <td>{a.title}</td><td>{a.classes?.name || '—'}</td><td>{a.subjects?.name || '—'}</td><td>{a.due_date || '—'}</td>
            <td><button className="btn-sm" onClick={() => viewSubs(a.id)}>Submissions</button></td>
          </tr>
        ))}</tbody>
      </table>

      {openId && (
        <>
          <h3>Submissions</h3>
          {subs.length ? (
            <table className="tbl">
              <thead><tr><th>Student</th><th>Answer</th><th>Grade</th></tr></thead>
              <tbody>{subs.map((s) => (
                <tr key={s.id}>
                  <td>{s.students?.first_name} {s.students?.last_name}</td>
                  <td style={{ maxWidth: 300 }}>{s.content || '—'}</td>
                  <td><input style={{ width: 70 }} defaultValue={s.grade || ''}
                    onBlur={(e) => grade(s.id, e.target.value)} placeholder="grade" /></td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="muted">No submissions yet.</p>}
        </>
      )}
    </div>
  )
}

// ---------- Student: view + submit ----------
function StudentAssignments() {
  const { profile } = useAuth()
  const [me, setMe] = useState(null)
  const [rows, setRows] = useState([])
  const [draft, setDraft] = useState({})

  async function load(studentId) {
    const { data: a } = await supabase.from('assignments')
      .select('id, title, instructions, due_date, subjects(name)').order('due_date')
    const { data: subs } = await supabase.from('assignment_submissions')
      .select('assignment_id, content, grade').eq('student_id', studentId)
    const byId = Object.fromEntries((subs || []).map((s) => [s.assignment_id, s]))
    setRows((a || []).map((x) => ({ ...x, submission: byId[x.id] })))
  }
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('students').select('id, first_name').eq('profile_id', profile.id).maybeSingle()
      setMe(s)
      if (s) load(s.id)
    })()
  }, [])

  async function submit(assignmentId) {
    const content = draft[assignmentId]
    if (!content) return
    await supabase.from('assignment_submissions').upsert(
      { school_id: profile.school_id, assignment_id: assignmentId, student_id: me.id, content },
      { onConflict: 'assignment_id,student_id' })
    setDraft({ ...draft, [assignmentId]: '' })
    load(me.id)
  }

  if (!me) return <div><h1>Assignments</h1><p className="muted">Your account isn't linked to a student record yet — ask the school office.</p></div>

  return (
    <div>
      <h1>My Assignments</h1>
      {rows.length ? rows.map((a) => (
        <div className="card" key={a.id} style={{ marginBottom: 12, maxWidth: 600 }}>
          <strong>{a.title}</strong> <span className="muted">· {a.subjects?.name || ''} · due {a.due_date || 'TBC'}</span>
          <div className="muted" style={{ margin: '6px 0' }}>{a.instructions}</div>
          {a.submission ? (
            <div className="pill published">Submitted{a.submission.grade ? ` · Grade: ${a.submission.grade}` : ' · awaiting grade'}</div>
          ) : (
            <div>
              <textarea rows={2} placeholder="Type your answer…" value={draft[a.id] || ''}
                onChange={(e) => setDraft({ ...draft, [a.id]: e.target.value })} />
              <button className="btn-sm" style={{ marginTop: 6 }} onClick={() => submit(a.id)}>Submit</button>
            </div>
          )}
        </div>
      )) : <p className="muted">No assignments set yet.</p>}
    </div>
  )
}

// ---------- Parent: read-only view of children's assignments ----------
function ParentAssignments() {
  const [rows, setRows] = useState([])
  useEffect(() => {
    supabase.from('assignments').select('id, title, due_date, classes(name), subjects(name)')
      .order('due_date').then(({ data }) => setRows(data || []))
  }, [])
  return (
    <div>
      <h1>Assignments</h1>
      <table className="tbl">
        <thead><tr><th>Title</th><th>Class</th><th>Subject</th><th>Due</th></tr></thead>
        <tbody>{rows.map((a) => (
          <tr key={a.id}><td>{a.title}</td><td>{a.classes?.name || '—'}</td><td>{a.subjects?.name || '—'}</td><td>{a.due_date || '—'}</td></tr>
        ))}</tbody>
      </table>
    </div>
  )
}

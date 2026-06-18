import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const ROLES = ['school_admin', 'bursar', 'teacher', 'student', 'parent']

export default function Users() {
  const [users, setUsers] = useState([])
  const [students, setStudents] = useState([])
  const [form, setForm] = useState({ full_name: '', email: '', role: 'teacher', password: '', student_id: '' })
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data } = await supabase.from('profiles')
      .select('id, full_name, email, role').order('role')
    setUsers(data || [])
    // Unlinked students available to attach a student login to.
    const { data: st } = await supabase.from('students')
      .select('id, first_name, last_name').is('profile_id', null).order('last_name')
    setStudents(st || [])
  }
  useEffect(() => { load() }, [])

  async function create() {
    setBusy(true); setError(''); setResult(null)
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: form.email.trim(),
        full_name: form.full_name.trim(),
        role: form.role,
        password: form.password || undefined,
        student_id: form.role === 'student' ? (form.student_id || undefined) : undefined,
      },
    })
    setBusy(false)
    if (error) {
      // Surface the function's JSON error message, not the generic one.
      let msg = error.message
      try { const b = await error.context.json(); if (b?.error) msg = b.error } catch { /* ignore */ }
      setError(msg); return
    }
    if (data?.error) { setError(data.error); return }
    setResult(data)
    setForm({ full_name: '', email: '', role: 'teacher', password: '', student_id: '' })
    load()
  }

  return (
    <div>
      <h1>Users &amp; Access</h1>
      <p className="muted">Create logins for staff, students and parents. The role and
        school are wired automatically — no database steps.</p>

      <div className="card" style={{ maxWidth: 460 }}>
        <label>Full name
          <input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
        </label>
        <label>Email
          <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
        </label>
        <label>Role
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
          </select>
        </label>
        {form.role === 'student' && (
          <label>Link to student (optional)
            <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })}>
              <option value="">— none —</option>
              {students.map((s) => <option key={s.id} value={s.id}>{s.last_name}, {s.first_name}</option>)}
            </select>
          </label>
        )}
        <label>Password (optional — leave blank to auto-generate)
          <input type="text" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
        </label>
        {error && <div className="error">{error}</div>}
        <button className="btn" disabled={busy} onClick={create}>
          {busy ? 'Creating…' : 'Create user'}
        </button>
      </div>

      {result && (
        <div className="card" style={{ maxWidth: 460, marginTop: 14, borderColor: 'var(--accent)' }}>
          <strong>User created.</strong>
          <div>{result.email} — {result.role.replace('_', ' ')}</div>
          {result.password &&
            <div style={{ marginTop: 8 }}>Temporary password: <code>{result.password}</code>
              <div className="muted" style={{ fontSize: 12 }}>Share it securely — it won't be shown again.</div>
            </div>}
        </div>
      )}

      <h3>Existing users</h3>
      <table className="tbl">
        <thead><tr><th>Name</th><th>Email</th><th>Role</th></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id}>
              <td>{u.full_name || '—'}</td>
              <td>{u.email}</td>
              <td><span className="pill">{u.role.replace('_', ' ')}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

const AUDIENCES = ['all', 'staff', 'students', 'parents']

export default function Announcements() {
  const { profile, role } = useAuth()
  const canPost = ['school_admin', 'bursar', 'teacher'].includes(role)
  const [list, setList] = useState([])
  const [form, setForm] = useState({ title: '', body: '', audience: 'all' })

  async function load() {
    // RLS only returns announcements aimed at the viewer's role.
    const { data } = await supabase.from('announcements')
      .select('id, title, body, audience, created_at').order('created_at', { ascending: false })
    setList(data || [])
  }
  useEffect(() => { load() }, [])

  async function post() {
    if (!form.title) return
    await supabase.from('announcements').insert({ ...form, school_id: profile.school_id, created_by: profile.id })
    setForm({ title: '', body: '', audience: 'all' })
    load()
  }

  return (
    <div>
      <h1>Announcements</h1>
      {canPost && (
        <div className="card" style={{ maxWidth: 560 }}>
          <label>Title<input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></label>
          <label>Message<textarea rows={3} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} /></label>
          <label>Audience
            <select value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
              {AUDIENCES.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <button className="btn" onClick={post}>Post announcement</button>
        </div>
      )}

      <h3 style={{ marginTop: canPost ? 22 : 0 }}>Latest</h3>
      {list.length ? list.map((n) => (
        <div className="card" key={n.id} style={{ marginBottom: 10, maxWidth: 640 }}>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <strong>{n.title}</strong>
            <span className="pill">{n.audience}</span>
          </div>
          <div className="muted" style={{ marginTop: 4 }}>{n.body}</div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{new Date(n.created_at).toLocaleDateString()}</div>
        </div>
      )) : <p className="muted">No announcements.</p>}
    </div>
  )
}

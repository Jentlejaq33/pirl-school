import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Dashboard() {
  const { role } = useAuth()
  const staff = ['school_admin', 'bursar', 'teacher'].includes(role)
  if (role === 'student') return <StudentHome />
  if (role === 'parent') return <ParentHome />
  if (staff) return <StaffHome />
  return <div><h1>Welcome</h1></div>
}

const Stat = ({ label, value }) => (
  <div className="card"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
)

// ---------- Staff: school overview ----------
function StaffHome() {
  const { school } = useAuth()
  const [stats, setStats] = useState({ students: 0, unpaid: 0, collected: 0 })
  useEffect(() => {
    (async () => {
      const { count } = await supabase.from('students').select('id', { count: 'exact', head: true })
      const { data: inv } = await supabase.from('invoices').select('paid, status')
      setStats({
        students: count || 0,
        unpaid: (inv || []).filter((i) => i.status !== 'paid').length,
        collected: (inv || []).reduce((s, i) => s + Number(i.paid || 0), 0),
      })
    })()
  }, [])
  return (
    <div>
      <h1>Welcome{school ? `, ${school.name}` : ''}</h1>
      <div className="cards">
        <Stat label="Students" value={stats.students} />
        <Stat label="Unpaid invoices" value={stats.unpaid} />
        <Stat label="Fees collected" value={`GH₵${stats.collected.toLocaleString()}`} />
      </div>
    </div>
  )
}

// ---------- Student: only their own world ----------
function StudentHome() {
  const { profile } = useAuth()
  const [me, setMe] = useState(null)
  const [results, setResults] = useState([])
  const [due, setDue] = useState([])
  const [news, setNews] = useState([])
  useEffect(() => {
    (async () => {
      const { data: s } = await supabase.from('students')
        .select('id, first_name, last_name, classes(name)').eq('profile_id', profile.id).maybeSingle()
      setMe(s)
      const { data: r } = await supabase.from('results')
        .select('score, grade, assessments(name)').order('recorded_at', { ascending: false }).limit(5)
      setResults(r || [])
      const { data: a } = await supabase.from('assignments')
        .select('id, title, due_date, subjects(name)').order('due_date').limit(5)
      setDue(a || [])
      const { data: n } = await supabase.from('announcements')
        .select('title, body, created_at').order('created_at', { ascending: false }).limit(3)
      setNews(n || [])
    })()
  }, [])
  return (
    <div>
      <h1>Hi {me?.first_name || profile?.full_name || 'there'} 👋</h1>
      <p className="muted">{me?.classes?.name ? `Class: ${me.classes.name}` : 'Your student dashboard'}</p>
      <div className="cards">
        <Stat label="Assignments due" value={due.length} />
        <Stat label="Recent results" value={results.length} />
      </div>

      <h3>Assignments due</h3>
      {due.length ? (
        <table className="tbl"><thead><tr><th>Title</th><th>Subject</th><th>Due</th></tr></thead>
          <tbody>{due.map((a) => (
            <tr key={a.id}><td>{a.title}</td><td>{a.subjects?.name || '—'}</td><td>{a.due_date || '—'}</td></tr>
          ))}</tbody></table>
      ) : <p className="muted">Nothing due right now.</p>}

      <h3>My latest results</h3>
      {results.length ? (
        <table className="tbl"><thead><tr><th>Assessment</th><th>Score</th><th>Grade</th></tr></thead>
          <tbody>{results.map((r, i) => (
            <tr key={i}><td>{r.assessments?.name || '—'}</td><td>{r.score ?? '—'}</td><td>{r.grade || '—'}</td></tr>
          ))}</tbody></table>
      ) : <p className="muted">No results published yet.</p>}

      <h3>Announcements</h3>
      {news.length ? news.map((n, i) => (
        <div className="card" key={i} style={{ marginBottom: 10 }}>
          <strong>{n.title}</strong><div className="muted">{n.body}</div>
        </div>
      )) : <p className="muted">No announcements.</p>}
    </div>
  )
}

// ---------- Parent: their children ----------
function ParentHome() {
  const { profile } = useAuth()
  const [children, setChildren] = useState([])
  const [news, setNews] = useState([])
  useEffect(() => {
    (async () => {
      // RLS returns only this parent's children.
      const { data: kids } = await supabase.from('students')
        .select('id, first_name, last_name, classes(name)')
      setChildren(kids || [])
      const { data: n } = await supabase.from('announcements')
        .select('title, body').order('created_at', { ascending: false }).limit(3)
      setNews(n || [])
    })()
  }, [])
  return (
    <div>
      <h1>Welcome{profile?.full_name ? `, ${profile.full_name}` : ''}</h1>
      <h3>My children</h3>
      {children.length ? (
        <table className="tbl"><thead><tr><th>Name</th><th>Class</th></tr></thead>
          <tbody>{children.map((c) => (
            <tr key={c.id}><td>{c.first_name} {c.last_name}</td><td>{c.classes?.name || '—'}</td></tr>
          ))}</tbody></table>
      ) : <p className="muted">No children linked to your account yet.</p>}
      <h3>Announcements</h3>
      {news.length ? news.map((n, i) => (
        <div className="card" key={i} style={{ marginBottom: 10 }}>
          <strong>{n.title}</strong><div className="muted">{n.body}</div>
        </div>
      )) : <p className="muted">No announcements.</p>}
    </div>
  )
}

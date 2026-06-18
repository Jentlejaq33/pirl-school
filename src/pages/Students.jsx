import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Students() {
  const { profile } = useAuth()
  const [rows, setRows] = useState([])
  const [form, setForm] = useState({ first_name: '', last_name: '', student_no: '' })

  async function load() {
    const { data } = await supabase
      .from('students')
      .select('id, student_no, first_name, last_name, classes(name)')
      .order('last_name')
    setRows(data || [])
  }
  useEffect(() => { load() }, [])

  async function add() {
    if (!form.first_name) return
    // school_id is required by the schema; stamp it from the signed-in profile.
    await supabase.from('students').insert({ ...form, school_id: profile.school_id })
    setForm({ first_name: '', last_name: '', student_no: '' })
    load()
  }

  return (
    <div>
      <h1>Students</h1>
      <div className="row gap">
        <input placeholder="First name" value={form.first_name}
          onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
        <input placeholder="Last name" value={form.last_name}
          onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
        <input placeholder="Student no." value={form.student_no}
          onChange={(e) => setForm({ ...form, student_no: e.target.value })} />
        <button className="btn" onClick={add}>Add</button>
      </div>
      <table className="tbl">
        <thead><tr><th>No.</th><th>Name</th><th>Class</th></tr></thead>
        <tbody>
          {rows.map((s) => (
            <tr key={s.id}>
              <td>{s.student_no || '—'}</td>
              <td>{s.last_name}, {s.first_name}</td>
              <td>{s.classes?.name || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

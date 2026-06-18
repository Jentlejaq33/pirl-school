import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Dashboard() {
  const { school } = useAuth()
  const [stats, setStats] = useState({ students: 0, unpaid: 0, collected: 0 })

  useEffect(() => {
    async function load() {
      // RLS scopes every query to this school automatically — no school_id filter needed.
      const { count: students } = await supabase
        .from('students').select('id', { count: 'exact', head: true })
      const { data: inv } = await supabase.from('invoices').select('total, paid, status')
      const unpaid = (inv || []).filter((i) => i.status !== 'paid').length
      const collected = (inv || []).reduce((s, i) => s + Number(i.paid || 0), 0)
      setStats({ students: students || 0, unpaid, collected })
    }
    load()
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
const Stat = ({ label, value }) => (
  <div className="card"><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>
)

import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Sports() {
  const [events, setEvents] = useState([])
  const [standings, setStandings] = useState([])
  useEffect(() => {
    supabase.from('sports_events').select('id, name, date').order('date', { ascending: false })
      .then(({ data }) => setEvents(data || []))
    // House points leaderboard (sum points per house).
    supabase.from('sports_results').select('points, houses(name)')
      .then(({ data }) => {
        const m = {}
        ;(data || []).forEach((r) => { const n = r.houses?.name || '—'; m[n] = (m[n]||0)+Number(r.points||0) })
        setStandings(Object.entries(m).sort((a,b) => b[1]-a[1]))
      })
  }, [])
  return (
    <div>
      <h1>Sports</h1>
      <h3>Inter-house standings</h3>
      <table className="tbl"><thead><tr><th>House</th><th>Points</th></tr></thead>
        <tbody>{standings.map(([h,p]) => <tr key={h}><td>{h}</td><td>{p}</td></tr>)}</tbody></table>
      <h3>Events</h3>
      <ul>{events.map((e) => <li key={e.id}>{e.name} — {e.date || 'TBC'}</li>)}</ul>
    </div>
  )
}

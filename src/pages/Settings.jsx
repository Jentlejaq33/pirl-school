import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Settings() {
  const { school } = useAuth()
  const [name, setName] = useState(school?.name || '')
  const [primary, setPrimary] = useState(school?.primary_color || '#07111f')
  const [secondary, setSecondary] = useState(school?.secondary_color || '#c9a227')

  async function save() {
    await supabase.from('schools')
      .update({ name, primary_color: primary, secondary_color: secondary }).eq('id', school.id)
    alert('Saved. Reload to apply branding.')
  }
  return (
    <div>
      <h1>Settings</h1>
      <label>School name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
      <label>Primary colour<input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} /></label>
      <label>Accent colour<input type="color" value={secondary} onChange={(e) => setSecondary(e.target.value)} /></label>
      <div><button className="btn" onClick={save}>Save</button></div>
    </div>
  )
}

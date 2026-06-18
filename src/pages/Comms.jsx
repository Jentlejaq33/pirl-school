import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Comms() {
  const [body, setBody] = useState('')
  async function send() {
    // Edge Function fans out to the SMS gateway (Arkesel / Hubtel / mNotify)
    // and writes a row to messages_log per recipient.
    const { data, error } = await supabase.functions.invoke('send-sms', { body: { body } })
    if (error) {
      let msg = error.message
      try { const b = await error.context.json(); if (b?.error) msg = b.error } catch { /* ignore */ }
      return alert('Failed: ' + msg)
    }
    alert(`Sent to ${data?.sent ?? 0} parents`)
    setBody('')
  }
  return (
    <div>
      <h1>Messages</h1>
      <p className="muted">Bulk SMS / WhatsApp to parents.</p>
      <textarea rows={4} value={body} onChange={(e) => setBody(e.target.value)}
        placeholder="Type your message to parents…" />
      <div><button className="btn" onClick={send}>Send to parents</button></div>
    </div>
  )
}

import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Comms() {
  const [body, setBody] = useState('')
  async function send() {
    // Edge Function fans out to the SMS gateway (Hubtel / Arkesel / mNotify)
    // and writes a row to messages_log per recipient.
    const { error } = await supabase.functions.invoke('send-sms', { body: { body } })
    alert(error ? 'Failed: ' + error.message : 'Queued for sending')
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

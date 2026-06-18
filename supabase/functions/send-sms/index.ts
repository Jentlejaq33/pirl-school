// Supabase Edge Function: send-sms
// Sends a bulk SMS to parents (default gateway: Arkesel) and logs each message.
// If no recipients are passed, it messages every guardian phone in the school.
//
// Secrets:  supabase secrets set SMS_API_KEY=xxx  SMS_SENDER=PIRLSchool
// Deploy:   supabase functions deploy send-sms
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

// Arkesel expects 233XXXXXXXXX.
const toGh = (p: string) => p.replace(/\s/g, '').replace(/^\+/, '').replace(/^0/, '233')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: who } = await admin.auth.getUser(token)
    if (!who?.user) return json({ error: 'Not authenticated' }, 401)
    const { data: caller } = await admin.from('profiles')
      .select('role, school_id').eq('id', who.user.id).maybeSingle()
    if (!caller || !['school_admin', 'bursar', 'teacher'].includes(caller.role))
      return json({ error: 'Not allowed' }, 403)

    const { body, recipients } = await req.json()
    if (!body) return json({ error: 'Message body is required' }, 400)

    // Default audience: every guardian phone in the school.
    let phones: string[] = recipients
    if (!phones?.length) {
      const { data: gs } = await admin.from('guardians')
        .select('phone').eq('school_id', caller.school_id).not('phone', 'is', null)
      phones = (gs || []).map((g) => g.phone).filter(Boolean)
    }
    if (!phones.length) return json({ error: 'No recipients found' }, 400)
    const normalised = phones.map(toGh)

    const res = await fetch('https://sms.arkesel.com/api/v2/sms/send', {
      method: 'POST',
      headers: { 'api-key': Deno.env.get('SMS_API_KEY')!, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sender: Deno.env.get('SMS_SENDER') ?? 'School',
        message: body,
        recipients: normalised,
      }),
    })
    const out = await res.json()
    const ok = res.ok

    // Log one row per recipient.
    await admin.from('messages_log').insert(
      normalised.map((r) => ({
        school_id: caller.school_id, channel: 'sms', recipient: r,
        body, status: ok ? 'sent' : 'failed', sent_by: who.user.id,
      })),
    )

    if (!ok) return json({ error: out.message || 'SMS gateway error' }, 400)
    return json({ sent: normalised.length })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

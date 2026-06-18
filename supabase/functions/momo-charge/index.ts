// Supabase Edge Function: momo-charge
// Starts a Mobile Money collection against an invoice (default: Paystack).
// A prompt is pushed to the parent's phone; the momo-webhook function records
// the payment when Paystack fires charge.success.
//
// Secrets:  supabase secrets set PAYSTACK_SECRET_KEY=sk_live_xxx
// Deploy:   supabase functions deploy momo-charge
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    // Caller must be staff (admin or bursar).
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: who } = await admin.auth.getUser(token)
    if (!who?.user) return json({ error: 'Not authenticated' }, 401)
    const { data: caller } = await admin.from('profiles')
      .select('role, school_id').eq('id', who.user.id).maybeSingle()
    if (!caller || !['school_admin', 'bursar'].includes(caller.role))
      return json({ error: 'Not allowed' }, 403)

    const { invoice_id, phone, amount, provider = 'mtn' } = await req.json()
    if (!invoice_id || !phone) return json({ error: 'invoice_id and phone are required' }, 400)

    // Load the invoice — and confirm it belongs to the caller's school.
    const { data: inv } = await admin.from('invoices')
      .select('id, school_id, student_id, total, paid, students(first_name,last_name)')
      .eq('id', invoice_id).maybeSingle()
    if (!inv || inv.school_id !== caller.school_id) return json({ error: 'Invoice not found' }, 404)

    const due = amount ?? (Number(inv.total) - Number(inv.paid))
    if (due <= 0) return json({ error: 'Nothing to collect' }, 400)

    // Normalise Ghana number to 0XXXXXXXXX for Paystack.
    const local = phone.replace(/^\+?233/, '0').replace(/\s/g, '')

    const res = await fetch('https://api.paystack.co/charge', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${Deno.env.get('PAYSTACK_SECRET_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: `student-${inv.student_id}@school.local`,   // Paystack requires an email
        amount: Math.round(due * 100),                      // pesewas
        currency: 'GHS',
        mobile_money: { phone: local, provider },           // 'mtn' | 'vod' | 'atl'
        metadata: { invoice_id: inv.id, school_id: inv.school_id, student_id: inv.student_id },
      }),
    })
    const out = await res.json()
    if (!res.ok || out.status === false)
      return json({ error: out.message || 'Charge failed' }, 400)

    // Record a pending payment so it shows in the ledger; webhook flips it to success.
    await admin.from('payments').insert({
      school_id: inv.school_id, invoice_id: inv.id, student_id: inv.student_id,
      amount: due, method: 'momo', momo_provider: provider,
      reference: out.data.reference, status: 'pending',
    })

    return json({ reference: out.data.reference, status: out.data.status, message: out.data.display_text })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

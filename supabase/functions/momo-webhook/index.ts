// Supabase Edge Function — payment webhook (Paystack / Hubtel).
// Verify the signature, then record the payment with the SERVICE ROLE key
// (bypasses RLS). Deploy: supabase functions deploy momo-webhook
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const admin = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, // server-only
)

Deno.serve(async (req) => {
  const event = await req.json()
  // TODO: verify provider signature header before trusting the payload.
  if (event?.event === 'charge.success') {
    const { invoice_id, school_id, student_id } = event.data.metadata
    const amount = event.data.amount / 100

    await admin.from('payments').insert({
      school_id, invoice_id, student_id, amount,
      method: 'momo', reference: event.data.reference,
      status: 'success', paid_at: new Date().toISOString(),
    })

    // Recompute invoice total + status.
    const { data: pays } = await admin.from('payments')
      .select('amount').eq('invoice_id', invoice_id).eq('status', 'success')
    const paid = (pays || []).reduce((s, p) => s + Number(p.amount), 0)
    const { data: inv } = await admin.from('invoices').select('total').eq('id', invoice_id).single()
    const status = paid >= Number(inv?.total) ? 'paid' : paid > 0 ? 'part_paid' : 'unpaid'
    await admin.from('invoices').update({ paid, status }).eq('id', invoice_id)
    // TODO: queue an SMS receipt to the parent here.
  }
  return new Response('ok', { status: 200 })
})

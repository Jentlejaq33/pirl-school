import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Fees() {
  const { role } = useAuth()
  const staff = ['school_admin', 'bursar'].includes(role)
  const [invoices, setInvoices] = useState([])

  async function load() {
    const { data } = await supabase.from('invoices')
      .select('id, total, paid, status, due_date, students(first_name,last_name)')
      .order('created_at', { ascending: false })
    setInvoices(data || [])
  }
  useEffect(() => { load() }, [])

  // Kick off a Mobile Money collection. The Edge Function talks to the aggregator
  // (Paystack / Hubtel) server-side; the webhook later confirms and records payment.
  async function collect(invoice) {
    const phone = prompt('Parent MoMo number (e.g. 024xxxxxxx):')
    if (!phone) return
    const { data, error } = await supabase.functions.invoke('momo-charge', {
      body: { invoice_id: invoice.id, phone, amount: invoice.total - invoice.paid },
    })
    if (error) {
      let msg = error.message
      try { const b = await error.context.json(); if (b?.error) msg = b.error } catch { /* ignore */ }
      return alert('Could not start charge: ' + msg)
    }
    alert((data?.message || 'Prompt sent to ' + phone) + '\nRef: ' + (data?.reference || 'pending'))
    load()
  }

  return (
    <div>
      <h1>{staff ? 'Fees & Payments' : 'My Fees'}</h1>
      <table className="tbl">
        <thead><tr><th>Student</th><th>Total</th><th>Paid</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {invoices.map((i) => (
            <tr key={i.id}>
              <td>{i.students?.last_name}, {i.students?.first_name}</td>
              <td>GH₵{Number(i.total).toLocaleString()}</td>
              <td>GH₵{Number(i.paid).toLocaleString()}</td>
              <td><span className={'pill ' + i.status}>{i.status.replace('_',' ')}</span></td>
              <td>{staff && i.status !== 'paid' &&
                <button className="btn-sm" onClick={() => collect(i)}>Collect (MoMo)</button>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

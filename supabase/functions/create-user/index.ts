// Supabase Edge Function: create-user
// Lets a SCHOOL ADMIN create staff/student/parent logins from the app.
// Security model:
//   - caller is identified from their JWT (not trusted from the body)
//   - caller must be a school_admin; the new user's school_id is FORCED to the
//     caller's school, so an admin can only ever create users in their own school
//   - super_admin cannot be created here
// The new auth user carries school_id+role in metadata, so the handle_new_user
// trigger creates the matching profile row automatically.
//
// Deploy:  supabase functions deploy create-user
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase automatically.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ALLOWED_ROLES = ['school_admin', 'bursar', 'teacher', 'student', 'parent']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // 1. Identify the caller from their access token.
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    if (!token) return json({ error: 'Not authenticated' }, 401)
    const { data: who, error: whoErr } = await admin.auth.getUser(token)
    if (whoErr || !who?.user) return json({ error: 'Invalid session' }, 401)

    // 2. Caller must be a school_admin with a school. School is taken from HERE.
    const { data: caller } = await admin
      .from('profiles').select('role, school_id').eq('id', who.user.id).maybeSingle()
    if (!caller || caller.role !== 'school_admin' || !caller.school_id)
      return json({ error: 'Only a school admin can create users' }, 403)

    // 3. Validate the requested new user.
    const { email, password, role, full_name, student_id } = await req.json()
    if (!email || !role) return json({ error: 'Email and role are required' }, 400)
    if (!ALLOWED_ROLES.includes(role)) return json({ error: 'Invalid role' }, 400)

    const generated = !password || password.length < 8
    const pwd = generated ? crypto.randomUUID().slice(0, 10) + 'A1!' : password

    // 4. Create the auth user; the DB trigger creates the profile from metadata.
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password: pwd,
      email_confirm: true,
      user_metadata: { school_id: caller.school_id, role, full_name: full_name ?? '' },
    })
    if (createErr) return json({ error: createErr.message }, 400)

    // 5. Optional: link a student login to a student record (powers the portal).
    if (role === 'student' && student_id) {
      await admin.from('students')
        .update({ profile_id: created.user.id })
        .eq('id', student_id).eq('school_id', caller.school_id)
    }

    return json({
      id: created.user.id,
      email,
      role,
      // Only returned when we generated it — show it once to the admin.
      password: generated ? pwd : undefined,
    })
  } catch (e) {
    return json({ error: String(e) }, 500)
  }
})

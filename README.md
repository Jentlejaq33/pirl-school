# PIRL School Management System — Template

Multi-tenant school platform: enrolment, fees (Mobile Money), test/exam results,
terminal reports, attendance, sports, and parent/student portals. One codebase
serves every school; data is isolated per school by Row Level Security.

Stack: React + Vite · Supabase (Postgres, Auth, Edge Functions) · Vercel · Resend.

## What's in here

```
supabase/
  schema.sql                  # all tables + RLS policies + role helpers  ← run first
  seed.sql                    # a demo school to test against
  functions/momo-webhook/     # payment confirmation (Paystack/Hubtel) — service role
src/
  config.js                   # REBRAND HERE: branding + tier feature flags
  lib/supabase.js             # client (anon key — safe, RLS protects data)
  lib/auth.jsx                # session + profile + school context, applies brand colours
  lib/guards.jsx              # RequireAuth / RequireRole route protection
  components/Layout.jsx       # sidebar built from tier + role
  pages/                      # Dashboard, Students, Results, Reports, Fees, Sports, …
```

## Setup

1. Create a Supabase project (pick the EU region — see data residency note below).
2. SQL editor → run `supabase/schema.sql`, then `supabase/seed.sql`.
3. `cp .env.example .env` and fill in `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY`.
4. `npm install` then `npm run dev`.
5. Create users in Supabase Auth. Pass `school_id`, `role`, `full_name` in user
   metadata — the `handle_new_user` trigger creates the matching profile row.

Roles: `super_admin`, `school_admin`, `bursar`, `teacher`, `student`, `parent`.

## Onboarding a new school (the repeatable part)

1. Insert a `schools` row (name, slug, tier, colours).
2. Create the head's auth user with `role=school_admin` + that `school_id`.
3. They sign in, set branding in Settings, import students, and go live.

Tiers map to `FEATURES_BY_TIER` in `src/config.js` — Starter/Standard/Premium
unlock different sidebar modules, matching the sales offer sheet.

## Creating logins (no SQL)

A school admin creates staff/student/parent logins from **Users & Access** in the app.
This calls the `create-user` Edge Function, which (using the service-role key) creates
the auth user with `school_id`+`role` in metadata — the DB trigger does the rest.
An admin can only ever create users for their own school, and cannot create super_admins.

Deploy it:

```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy create-user
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected automatically.
```

After this, the only manual step ever needed is bootstrapping the FIRST school_admin
for a new school (insert the schools row, then promote that one profile in SQL).

## Integrations to wire before launch

- **Mobile Money:** create an `momo-charge` Edge Function that calls Paystack or
  Hubtel; `momo-webhook` (included) records the confirmed payment server-side.
- **SMS/WhatsApp:** a `send-sms` Edge Function hitting Hubtel / Arkesel / mNotify,
  writing to `messages_log`.
- **Terminal report PDF:** generate from `terminal_reports` + `terminal_report_subjects`.

## Data residency

Supabase has no Ghana region. Use the closest (EU), and be ready to register
under Ghana's Data Protection Act, 2012 (Act 843) — important if you pitch
public/government schools.

## Security rules (non-negotiable)

- RLS stays ON for every table.
- The service-role key lives ONLY in Edge Functions / server env — never client-side.
- All secrets in env vars; nothing hardcoded.

-- =====================================================================
-- PIRL School Management System — Database Schema (Supabase / PostgreSQL)
-- Multi-tenant: one project, many schools. Every row is scoped by school_id
-- and protected by Row Level Security. Paste this into the Supabase SQL editor.
-- =====================================================================

-- ---------- Extensions ----------
create extension if not exists "pgcrypto";

-- ---------- Enums ----------
create type user_role as enum
  ('super_admin','school_admin','bursar','teacher','student','parent');
create type school_tier      as enum ('starter','standard','premium');
create type assessment_type  as enum ('classwork','test','exam');
create type invoice_status   as enum ('unpaid','part_paid','paid');
create type payment_method   as enum ('momo','cash','bank','card');
create type payment_status   as enum ('pending','success','failed');
create type attendance_status as enum ('present','absent','late','excused');
create type report_status    as enum ('draft','published');
create type comm_channel      as enum ('sms','whatsapp','email');

-- =====================================================================
-- CORE TENANT TABLES
-- =====================================================================

create table schools (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  slug          text unique not null,                 -- subdomain: {slug}.pirl.uk
  tier          school_tier not null default 'starter',
  logo_url      text,
  primary_color text default '#07111f',
  secondary_color text default '#c9a227',
  contact_email text,
  phone         text,
  address       text,
  region        text,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

-- One row per login. id == auth.users.id. super_admin rows have school_id = null.
create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  school_id  uuid references schools(id) on delete cascade,
  role       user_role not null,
  full_name  text,
  email      text,
  phone      text,
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create index on profiles(school_id);

create table academic_years (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  name       text not null,                            -- e.g. 2025/2026
  is_current boolean not null default false
);

create table terms (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references schools(id) on delete cascade,
  academic_year_id uuid references academic_years(id) on delete cascade,
  name             text not null,                      -- e.g. First Term
  start_date       date,
  end_date         date,
  is_current       boolean not null default false
);

create table classes (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references schools(id) on delete cascade,
  name             text not null,                      -- e.g. JHS 1A
  level            text,                               -- Basic / JHS / SHS
  class_teacher_id uuid references profiles(id) on delete set null
);

create table subjects (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name      text not null,
  code      text
);

create table houses (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  name      text not null,
  color     text
);

create table students (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  profile_id uuid references profiles(id) on delete set null,   -- student login (optional)
  student_no text,
  first_name text not null,
  last_name  text not null,
  dob        date,
  gender     text,
  class_id   uuid references classes(id) on delete set null,
  house_id   uuid references houses(id) on delete set null,
  photo_url  text,
  status     text default 'active',
  created_at timestamptz not null default now()
);
create index on students(school_id);
create index on students(class_id);

create table guardians (
  id                uuid primary key default gen_random_uuid(),
  school_id         uuid not null references schools(id) on delete cascade,
  profile_id        uuid references profiles(id) on delete set null,  -- parent login (optional)
  full_name         text not null,
  phone             text,
  email             text,
  relationship      text
);

create table student_guardians (
  student_id  uuid not null references students(id) on delete cascade,
  guardian_id uuid not null references guardians(id) on delete cascade,
  primary key (student_id, guardian_id)
);

-- =====================================================================
-- ACADEMICS: assessments, grading, terminal reports
-- =====================================================================

create table grading_scales (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  min_score numeric not null,
  max_score numeric not null,
  grade     text not null,
  remark    text
);

create table assessments (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  term_id    uuid references terms(id) on delete cascade,
  class_id   uuid references classes(id) on delete cascade,
  subject_id uuid references subjects(id) on delete cascade,
  name       text not null,
  type       assessment_type not null default 'test',
  max_score  numeric not null default 100,
  weight     numeric not null default 1,
  date       date,
  created_by uuid references profiles(id) on delete set null
);

create table results (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  assessment_id uuid not null references assessments(id) on delete cascade,
  student_id    uuid not null references students(id) on delete cascade,
  score         numeric,
  grade         text,
  recorded_by   uuid references profiles(id) on delete set null,
  recorded_at   timestamptz not null default now(),
  unique (assessment_id, student_id)
);
create index on results(student_id);

-- End-of-term report (header) + per-subject snapshot lines
create table terminal_reports (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  term_id       uuid not null references terms(id) on delete cascade,
  student_id    uuid not null references students(id) on delete cascade,
  class_id      uuid references classes(id) on delete set null,
  total         numeric,
  average       numeric,
  position      int,
  attendance_summary text,
  teacher_remark text,
  head_remark    text,
  status        report_status not null default 'draft',
  published_at  timestamptz,
  created_at    timestamptz not null default now(),
  unique (term_id, student_id)
);

create table terminal_report_subjects (
  id          uuid primary key default gen_random_uuid(),
  report_id   uuid not null references terminal_reports(id) on delete cascade,
  subject_id  uuid references subjects(id) on delete set null,
  score       numeric,
  grade       text,
  remark      text,
  subject_position int
);

create table attendance (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  class_id    uuid references classes(id) on delete cascade,
  student_id  uuid not null references students(id) on delete cascade,
  date        date not null,
  status      attendance_status not null default 'present',
  recorded_by uuid references profiles(id) on delete set null,
  unique (student_id, date)
);

-- =====================================================================
-- FEES & PAYMENTS
-- =====================================================================

create table fee_structures (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references schools(id) on delete cascade,
  term_id   uuid references terms(id) on delete cascade,
  class_id  uuid references classes(id) on delete set null,  -- null = applies to all
  name      text not null,
  amount    numeric not null default 0
);

create table invoices (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  term_id    uuid references terms(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  total      numeric not null default 0,
  paid       numeric not null default 0,
  status     invoice_status not null default 'unpaid',
  due_date   date,
  created_at timestamptz not null default now()
);
create index on invoices(student_id);

create table invoice_items (
  id               uuid primary key default gen_random_uuid(),
  invoice_id       uuid not null references invoices(id) on delete cascade,
  fee_structure_id uuid references fee_structures(id) on delete set null,
  description      text,
  amount           numeric not null default 0
);

create table payments (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  invoice_id    uuid references invoices(id) on delete set null,
  student_id    uuid references students(id) on delete set null,
  amount        numeric not null,
  method        payment_method not null default 'momo',
  momo_provider text,                                  -- MTN / Telecel / AirtelTigo
  reference     text,                                  -- aggregator txn ref
  status        payment_status not null default 'pending',
  paid_at       timestamptz,
  recorded_by   uuid references profiles(id) on delete set null,
  created_at    timestamptz not null default now()
);
create index on payments(invoice_id);

-- =====================================================================
-- SPORTS
-- =====================================================================

create table sports_events (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references schools(id) on delete cascade,
  term_id     uuid references terms(id) on delete set null,
  name        text not null,
  date        date,
  description text
);

create table sports_results (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  event_id   uuid not null references sports_events(id) on delete cascade,
  house_id   uuid references houses(id) on delete set null,
  student_id uuid references students(id) on delete set null,
  position   int,
  points     numeric default 0,
  notes      text
);

-- =====================================================================
-- COMMS & AUDIT
-- =====================================================================

create table messages_log (
  id                 uuid primary key default gen_random_uuid(),
  school_id          uuid not null references schools(id) on delete cascade,
  channel            comm_channel not null,
  recipient          text not null,
  body               text,
  status             text default 'queued',
  related_student_id uuid references students(id) on delete set null,
  sent_by            uuid references profiles(id) on delete set null,
  sent_at            timestamptz not null default now()
);

create table audit_log (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid references schools(id) on delete set null,
  actor_id   uuid references profiles(id) on delete set null,
  action     text not null,
  entity     text,
  entity_id  uuid,
  meta       jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- HELPER FUNCTIONS (SECURITY DEFINER to read profiles without RLS recursion)
-- =====================================================================

create or replace function current_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from profiles where id = auth.uid();
$$;

create or replace function current_role_name()
returns user_role language sql stable security definer set search_path = public as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_super()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role = 'super_admin' from profiles where id = auth.uid()), false);
$$;

create or replace function is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select role in ('school_admin','bursar','teacher')
                   from profiles where id = auth.uid()), false);
$$;

-- Students/guardians the current user is allowed to read (own record / own children).
create or replace function visible_student_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  -- student login -> own student record
  select s.id from students s
    join profiles p on p.id = auth.uid()
   where s.profile_id = auth.uid() and p.role = 'student'
  union
  -- parent login -> children via guardian link
  select sg.student_id from student_guardians sg
    join guardians g on g.id = sg.guardian_id
    join profiles p  on p.id = auth.uid()
   where g.profile_id = auth.uid() and p.role = 'parent';
$$;

-- =====================================================================
-- ROW LEVEL SECURITY
-- Pattern: enable RLS on every table, then scope by school_id.
-- Staff read/write within their school; students/parents read their own data.
-- The super_admin path is normally exercised server-side via the service-role
-- key (which bypasses RLS); the is_super() clauses are a convenience.
-- =====================================================================

-- Turn RLS on for all tenant tables.
do $$
declare t text;
begin
  foreach t in array array[
    'schools','profiles','academic_years','terms','classes','subjects','houses',
    'students','guardians','student_guardians','grading_scales','assessments',
    'results','terminal_reports','terminal_report_subjects','attendance',
    'fee_structures','invoices','invoice_items','payments','sports_events',
    'sports_results','messages_log','audit_log'
  ] loop
    execute format('alter table %I enable row level security;', t);
  end loop;
end $$;

-- schools: a user sees their own school; super sees all.
create policy school_read on schools for select
  using (id = current_school_id() or is_super());
create policy school_write on schools for all
  using (is_super()) with check (is_super());

-- profiles: see profiles in your school; manage if staff.
create policy profile_self on profiles for select
  using (id = auth.uid() or school_id = current_school_id() or is_super());
create policy profile_manage on profiles for all
  using (is_staff() and school_id = current_school_id())
  with check (is_staff() and school_id = current_school_id());

-- Generic school-scoped tables: staff full access; everyone in-school can read.
-- (Apply this pair to each operational table.)
do $$
declare t text;
begin
  foreach t in array array[
    'academic_years','terms','classes','subjects','houses','grading_scales',
    'assessments','fee_structures','sports_events','sports_results','messages_log'
  ] loop
    execute format($f$
      create policy %1$s_read on %1$I for select
        using (school_id = current_school_id() or is_super());
      create policy %1$s_write on %1$I for all
        using (is_staff() and school_id = current_school_id() or is_super())
        with check (is_staff() and school_id = current_school_id() or is_super());
    $f$, t);
  end loop;
end $$;

-- students: staff manage all; students/parents read only their own.
create policy students_staff on students for all
  using (is_staff() and school_id = current_school_id() or is_super())
  with check (is_staff() and school_id = current_school_id() or is_super());
create policy students_owner_read on students for select
  using (id in (select visible_student_ids()));

-- guardians + links: staff manage; parent reads own row.
create policy guardians_staff on guardians for all
  using (is_staff() and school_id = current_school_id() or is_super())
  with check (is_staff() and school_id = current_school_id() or is_super());
create policy guardians_self_read on guardians for select
  using (profile_id = auth.uid());
create policy sg_staff on student_guardians for all
  using (is_super() or exists (select 1 from students s
         where s.id = student_id and s.school_id = current_school_id() and is_staff()))
  with check (is_super() or exists (select 1 from students s
         where s.id = student_id and s.school_id = current_school_id() and is_staff()));

-- results: staff manage; student/parent read for visible students only.
create policy results_staff on results for all
  using (is_staff() and school_id = current_school_id() or is_super())
  with check (is_staff() and school_id = current_school_id() or is_super());
create policy results_owner_read on results for select
  using (student_id in (select visible_student_ids()));

-- terminal_reports: staff manage; student/parent read only PUBLISHED reports.
create policy reports_staff on terminal_reports for all
  using (is_staff() and school_id = current_school_id() or is_super())
  with check (is_staff() and school_id = current_school_id() or is_super());
create policy reports_owner_read on terminal_reports for select
  using (status = 'published' and student_id in (select visible_student_ids()));

create policy report_subjects_read on terminal_report_subjects for select
  using (exists (select 1 from terminal_reports r
         where r.id = report_id
           and (r.school_id = current_school_id() and is_staff()
                or (r.status = 'published' and r.student_id in (select visible_student_ids()))
                or is_super())));
create policy report_subjects_write on terminal_report_subjects for all
  using (exists (select 1 from terminal_reports r
         where r.id = report_id and r.school_id = current_school_id() and is_staff()) or is_super())
  with check (exists (select 1 from terminal_reports r
         where r.id = report_id and r.school_id = current_school_id() and is_staff()) or is_super());

-- attendance: staff manage; student/parent read own.
create policy attendance_staff on attendance for all
  using (is_staff() and school_id = current_school_id() or is_super())
  with check (is_staff() and school_id = current_school_id() or is_super());
create policy attendance_owner_read on attendance for select
  using (student_id in (select visible_student_ids()));

-- invoices: staff manage; student/parent read own.
create policy invoices_staff on invoices for all
  using (is_staff() and school_id = current_school_id() or is_super())
  with check (is_staff() and school_id = current_school_id() or is_super());
create policy invoices_owner_read on invoices for select
  using (student_id in (select visible_student_ids()));

create policy invoice_items_read on invoice_items for select
  using (exists (select 1 from invoices i where i.id = invoice_id
         and (i.school_id = current_school_id() and is_staff()
              or i.student_id in (select visible_student_ids()) or is_super())));
create policy invoice_items_write on invoice_items for all
  using (exists (select 1 from invoices i where i.id = invoice_id
         and i.school_id = current_school_id() and is_staff()) or is_super())
  with check (exists (select 1 from invoices i where i.id = invoice_id
         and i.school_id = current_school_id() and is_staff()) or is_super());

-- payments: staff manage; student/parent read own. Inserts from MoMo webhook use
-- the service-role key (bypasses RLS), so no public insert policy is needed.
create policy payments_staff on payments for all
  using (is_staff() and school_id = current_school_id() or is_super())
  with check (is_staff() and school_id = current_school_id() or is_super());
create policy payments_owner_read on payments for select
  using (student_id in (select visible_student_ids()));

-- audit_log: staff/super read within school; writes happen server-side.
create policy audit_read on audit_log for select
  using (school_id = current_school_id() and is_staff() or is_super());

-- =====================================================================
-- AUTO-PROVISION a profile row when a new auth user is created.
-- The signup flow should pass school_id + role in user metadata.
-- =====================================================================
create or replace function handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, school_id, role, full_name, email)
  values (
    new.id,
    nullif(new.raw_user_meta_data->>'school_id','')::uuid,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'student'),
    new.raw_user_meta_data->>'full_name',
    new.email
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- =====================================================================
-- Done. Next: run seed.sql for a demo school, then point the app at this DB.
-- =====================================================================

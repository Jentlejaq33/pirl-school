-- =====================================================================
-- Migration 0002: Assignments + Announcements
-- Run this in the Supabase SQL editor AFTER schema.sql + seed.sql.
-- =====================================================================

create type announcement_audience as enum ('all', 'staff', 'students', 'parents');

-- ---------- Assignments ----------
create table assignments (
  id           uuid primary key default gen_random_uuid(),
  school_id    uuid not null references schools(id) on delete cascade,
  class_id     uuid references classes(id) on delete cascade,
  subject_id   uuid references subjects(id) on delete set null,
  title        text not null,
  instructions text,
  due_date     date,
  created_by   uuid references profiles(id) on delete set null,
  created_at   timestamptz not null default now()
);

create table assignment_submissions (
  id            uuid primary key default gen_random_uuid(),
  school_id     uuid not null references schools(id) on delete cascade,
  assignment_id uuid not null references assignments(id) on delete cascade,
  student_id    uuid not null references students(id) on delete cascade,
  content       text,
  submitted_at  timestamptz not null default now(),
  grade         text,
  feedback      text,
  unique (assignment_id, student_id)
);

-- ---------- Announcements ----------
create table announcements (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references schools(id) on delete cascade,
  title      text not null,
  body       text,
  audience   announcement_audience not null default 'all',
  created_by uuid references profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ---------- Helper: classes the current student/parent may see ----------
create or replace function visible_class_ids()
returns setof uuid language sql stable security definer set search_path = public as $$
  select distinct class_id from students
   where id in (select visible_student_ids()) and class_id is not null;
$$;

-- ---------- RLS ----------
alter table assignments            enable row level security;
alter table assignment_submissions enable row level security;
alter table announcements          enable row level security;

-- Assignments: staff manage; students/parents read for their class only.
create policy assignments_read on assignments for select
  using (school_id = current_school_id()
         and (is_staff() or class_id in (select visible_class_ids()))
         or is_super());
create policy assignments_write on assignments for all
  using (is_staff() and school_id = current_school_id() or is_super())
  with check (is_staff() and school_id = current_school_id() or is_super());

-- Submissions: a student manages their own; staff read + grade; parent reads child's.
create policy subs_student on assignment_submissions for all
  using (current_role_name() = 'student' and student_id in (select visible_student_ids()))
  with check (current_role_name() = 'student' and student_id in (select visible_student_ids()));
create policy subs_staff on assignment_submissions for all
  using (is_staff() and school_id = current_school_id() or is_super())
  with check (is_staff() and school_id = current_school_id() or is_super());
create policy subs_parent_read on assignment_submissions for select
  using (current_role_name() = 'parent' and student_id in (select visible_student_ids()));

-- Announcements: staff manage; everyone reads ones aimed at them.
create policy ann_read on announcements for select
  using (school_id = current_school_id() and (
           is_staff()
           or audience = 'all'
           or (audience = 'students' and current_role_name() = 'student')
           or (audience = 'parents'  and current_role_name() = 'parent')
         ) or is_super());
create policy ann_write on announcements for all
  using (is_staff() and school_id = current_school_id() or is_super())
  with check (is_staff() and school_id = current_school_id() or is_super());

-- ---------- Demo content so the student view isn't empty ----------
insert into announcements (school_id, title, body, audience) values
  ('11111111-1111-1111-1111-111111111111', 'Welcome to First Term',
   'School reopens Monday. Please ensure all fees are settled by week two.', 'all');

insert into assignments (school_id, class_id, subject_id, title, instructions, due_date)
select '11111111-1111-1111-1111-111111111111',
       '44444444-4444-4444-4444-444444444444',
       (select id from subjects where code = 'MATH'
          and school_id = '11111111-1111-1111-1111-111111111111' limit 1),
       'Algebra Worksheet 1', 'Complete questions 1-10 and submit before the due date.',
       current_date + 7;

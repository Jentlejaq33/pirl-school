-- Demo data for local testing. Run AFTER schema.sql.
-- NOTE: create the auth users first (Supabase dashboard or admin API), then
-- map their UUIDs into profiles. Below seeds the non-auth tenant data.

insert into schools (id, name, slug, tier, contact_email)
values ('11111111-1111-1111-1111-111111111111',
        'St. Mary''s Demo School', 'stmarys', 'standard', 'head@stmarys.demo');

insert into academic_years (id, school_id, name, is_current) values
  ('22222222-2222-2222-2222-222222222222',
   '11111111-1111-1111-1111-111111111111', '2025/2026', true);

insert into terms (id, school_id, academic_year_id, name, is_current) values
  ('33333333-3333-3333-3333-333333333333',
   '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 'First Term', true);

insert into classes (id, school_id, name, level) values
  ('44444444-4444-4444-4444-444444444444',
   '11111111-1111-1111-1111-111111111111', 'JHS 1A', 'JHS');

insert into subjects (school_id, name, code) values
  ('11111111-1111-1111-1111-111111111111', 'Mathematics', 'MATH'),
  ('11111111-1111-1111-1111-111111111111', 'English', 'ENG'),
  ('11111111-1111-1111-1111-111111111111', 'Integrated Science', 'SCI');

insert into grading_scales (school_id, min_score, max_score, grade, remark) values
  ('11111111-1111-1111-1111-111111111111', 80, 100, 'A', 'Excellent'),
  ('11111111-1111-1111-1111-111111111111', 70, 79,  'B', 'Very good'),
  ('11111111-1111-1111-1111-111111111111', 60, 69,  'C', 'Good'),
  ('11111111-1111-1111-1111-111111111111', 50, 59,  'D', 'Pass'),
  ('11111111-1111-1111-1111-111111111111', 0,  49,  'F', 'Fail');

insert into houses (school_id, name, color) values
  ('11111111-1111-1111-1111-111111111111', 'Red House', '#c0392b'),
  ('11111111-1111-1111-1111-111111111111', 'Blue House', '#2c5aa0');

insert into students (school_id, class_id, student_no, first_name, last_name) values
  ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','S001','Ama','Mensah'),
  ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','S002','Kofi','Asante'),
  ('11111111-1111-1111-1111-111111111111','44444444-4444-4444-4444-444444444444','S003','Esi','Boateng');

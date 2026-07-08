-- Student Portfolio and Assignment Tracker (Parent Portal)
-- Supabase project: vjimsmfybvyfhegsplwm (shared with TeacherAssist)
-- Two tables, joined ONLY by qr_id. No student names ever stored here —
-- that mapping lives in the teacher's own private local document, by design.

create table if not exists qr_student_data (
  id uuid primary key default gen_random_uuid(),
  qr_id text not null,
  week_start date not null,
  items jsonb not null default '[]',
  -- items shape: [{ title, status: 'done'|'in_progress'|'not_started', note }]
  created_at timestamptz not null default now(),
  unique (qr_id, week_start)
);

create table if not exists qr_parent_contacts (
  id uuid primary key default gen_random_uuid(),
  qr_id text not null,
  parent_email text not null,
  created_at timestamptz not null default now(),
  unique (qr_id, parent_email)
);

create table if not exists qr_announcements (
  id uuid primary key default gen_random_uuid(),
  qr_id text, -- null = applies to everyone (e.g. whole-class field trip)
  date date not null,
  title text not null,
  detail text,
  created_at timestamptz not null default now()
);

create index if not exists idx_student_data_qr on qr_student_data (qr_id);
create index if not exists idx_parent_contacts_qr on qr_parent_contacts (qr_id);
create index if not exists idx_announcements_qr on qr_announcements (qr_id);

-- ─────────────────────────────────────────────────────────────────────────
-- TEACHER-ONLY: grading / assessment data. HARD boundary, not convention —
-- this table is never queried by app/api/portal/[qrId]/route.js (the
-- parent-facing route). If this data needs its own UI, it must live behind
-- a separate teacher-only API route with its own auth gate (e.g. the same
-- x-portfolio-sync-secret pattern already used by teacherassist's
-- api/portfolio-sync.js), never merged into qr_student_data or exposed
-- through the parent-facing route. Per Aj, 2026-07-08.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists qr_teacher_assessment (
  id uuid primary key default gen_random_uuid(),
  qr_id text not null,
  week_start date,
  assessment jsonb not null default '{}',
  -- assessment shape: whatever grading/assessment content the teacher needs -
  -- grades, rubric scores, private notes, marking status, etc. Intentionally
  -- open-ended since this hasn't been fully specified yet.
  created_at timestamptz not null default now()
);

create index if not exists idx_teacher_assessment_qr on qr_teacher_assessment (qr_id);

alter table qr_teacher_assessment enable row level security;
-- No policies defined = no access via anon/authenticated roles at all;
-- only the service-role key (server-side only, never sent to the browser)
-- can read/write this table. That is the actual enforcement mechanism,
-- not just "the parent route doesn't query it."

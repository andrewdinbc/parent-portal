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

-- Assignments + QR-scan submission pipeline (Student Portfolio)
-- Added 2026-07-08 per Aj's spec: students scan their own QR code on a
-- worksheet page to submit, AI auto-marks, teacher reviews via a future
-- assessment platform. This is what backs the Assigned -> Completed ->
-- Marked status model.

create table if not exists assignments (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null check (subject in ('math', 'language_arts')),
  answer_key jsonb, -- optional: [{questionNumber, answer}], used for AI marking when present
  rubric text, -- optional: free-text rubric, used for AI marking when answer_key absent
  created_at timestamptz not null default now()
);

create table if not exists qr_submissions (
  id uuid primary key default gen_random_uuid(),
  qr_id text not null,
  assignment_id uuid not null references assignments(id) on delete cascade,
  image_url text not null, -- Vercel Blob URL of the scanned/photographed page
  status text not null default 'completed' check (status in ('completed', 'marked')),
  -- 'completed' = submitted, not yet marked. 'marked' = has BOTH ai_feedback
  -- AND teacher_feedback populated (see qr_teacher_assessment for the
  -- teacher-only half — ai_feedback lives here since it's not sensitive the
  -- same way, but is only ever surfaced to parents once status='marked').
  ai_feedback jsonb,
  submitted_at timestamptz not null default now(),
  marked_at timestamptz,
  unique (qr_id, assignment_id)
);

create index if not exists idx_qr_submissions_qr on qr_submissions (qr_id);
create index if not exists idx_qr_submissions_assignment on qr_submissions (assignment_id);
create index if not exists idx_qr_submissions_status on qr_submissions (status);

-- Teacher feedback lives in the existing teacher-only table
-- (qr_teacher_assessment), not here — keeps the hard grading/assessment
-- boundary from memory #19 intact even as this new pipeline is added.


-- ─────────────────────────────────────────────────────────────────────────
-- Teacher assessment platform (2026-07-08, modeled on CoGrader's rubric UX
-- per Aj's reference screenshots) — extends the QR submission pipeline with
-- structured, per-criterion AI feedback instead of a free-text blob, and
-- supports text-document submissions (writing assignments) alongside photo
-- scans (math/worksheet assignments).
-- ─────────────────────────────────────────────────────────────────────────

alter table qr_submissions add column if not exists text_content text;
-- Either image_url OR text_content is populated, never neither. image_url
-- stays required at the DB level for backward compat with the photo-scan
-- path already built; text-document submissions set image_url to '' and
-- populate text_content instead (enforced in application code, not a CHECK
-- constraint, since existing rows already have image_url set).

alter table assignments add column if not exists rubric_criteria jsonb;
-- Structured rubric, replacing the free-text `rubric` column for new
-- assignments (rubric text field kept for backward compat / simple cases).
-- Shape: [{ name, description, weight }], e.g.
-- [{"name":"Language","description":"Spelling and word choice","weight":1},
--  {"name":"Voice","description":"...","weight":1}, ...]

alter table qr_submissions add column if not exists structured_feedback jsonb;
-- Shape: {
--   overallScore, maxScore,
--   criteria: [{ name, level, score, maxScore, justificationQuote }],
--   glow: [string], grow: [string], thinkAboutIt: [string]
-- }
-- This is the AI-generated draft. qr_teacher_assessment (teacher-only,
-- separate table, RLS-locked per memory #19) holds the teacher's edited/
-- approved version - structured_feedback here is never shown to parents
-- directly; only the portal API's coarse status computation reads its
-- existence, matching the existing ai_feedback boundary pattern.

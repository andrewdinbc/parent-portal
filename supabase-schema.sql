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

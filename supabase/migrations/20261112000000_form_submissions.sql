-- AADS website form log.
-- Stores every Contact and Place an Order submission received by the
-- aads-intake Edge Function. Nothing here is readable from the public website:
-- RLS is on with no policies, so only the service role (used by the Edge
-- Function and the Supabase dashboard) can read or write.

create table if not exists public.form_submissions (
  id                 uuid primary key default gen_random_uuid(),
  reference          text not null unique,
  client_request_id  text not null unique,           -- stops double submits
  kind               text not null check (kind in ('inquiry','order')),
  status             text not null default 'new'
                       check (status in ('new','in_review','responded','closed','spam')),
  created_at         timestamptz not null default now(),
  -- Contact details (copied out of payload for easy filtering)
  name               text,
  email              text,
  company            text,
  phone              text,
  service            text,
  -- Everything else the visitor entered, as validated by the server
  payload            jsonb not null default '{}'::jsonb,
  attachments        jsonb not null default '[]'::jsonb,  -- [{path,name,size,type}]
  -- Consent record
  consent_given      boolean not null default false,
  consent_version    text,
  consent_at         timestamptz,
  -- Anti-abuse metadata (no raw IP stored)
  source_page        text,
  ip_hash            text,
  user_agent         text,
  turnstile_passed   boolean,
  spam_reason        text,
  notes              text
);

create index if not exists form_submissions_created_idx on public.form_submissions (created_at desc);
create index if not exists form_submissions_status_idx  on public.form_submissions (status);
create index if not exists form_submissions_iphash_idx  on public.form_submissions (ip_hash, created_at desc);

alter table public.form_submissions enable row level security;
-- Deliberately no policies: anon and authenticated roles get nothing.
revoke all on public.form_submissions from anon, authenticated;

comment on table public.form_submissions is
  'AADS website form log (contact + order). Written only by the aads-intake Edge Function. Contains personal data; access via service role only.';

-- Private bucket for order attachments (10 MB per file; the function enforces 25 MB total).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'intake-attachments', 'intake-attachments', false, 10485760,
  array['application/pdf','application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/csv','image/jpeg','image/png','image/tiff']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
-- No storage.objects policies are added for this bucket, so only the service role can read or write it.

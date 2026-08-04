-- Google Calendar integration.
--
-- Stores one OAuth connection per user per provider, and lets synced calendar
-- events land in `meetings` alongside the synthetic starter data without the
-- two colliding.

create table public.calendar_connections (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google')),
  -- Which Google account is connected, so the UI can name it and the user can
  -- tell two connections apart.
  account_email text not null,
  -- Both tokens are AES-256-GCM ciphertext, never plaintext. The application
  -- encrypts before insert; the database never sees the raw value.
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  -- When the access token expires. The refresh token has no fixed expiry, but
  -- Google expires it after 7 days while the OAuth app is in Testing status.
  access_token_expires_at timestamptz not null,
  scope text not null default '',
  last_synced_at timestamptz,
  last_sync_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One connection per provider per user. Reconnecting updates in place.
  unique (user_id, provider)
);

create index calendar_connections_user_idx
  on public.calendar_connections (user_id);

alter table public.calendar_connections enable row level security;

create policy "Users read their calendar connections"
  on public.calendar_connections for select
  using ((select auth.uid()) = user_id);
create policy "Users manage their calendar connections"
  on public.calendar_connections for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete
  on public.calendar_connections to authenticated;

-- Distinguishes a synced calendar event from the synthetic starter workspace,
-- so re-syncing never touches seeded rows and clearing a connection never
-- deletes hand-made ones.
alter table public.meetings
  add column source text not null default 'seed'
    check (source in ('seed', 'google_calendar'));

-- `external_ref` already exists and holds the demo slug for seeded rows; for
-- synced rows it holds the Google event id. Scoping uniqueness by source keeps
-- those two namespaces from colliding, and makes sync an idempotent upsert.
--
-- A full constraint rather than a partial index: PostgREST infers the conflict
-- target from column names alone and cannot express an index predicate, so a
-- `where external_ref is not null` index would not be usable for upsert. NULLs
-- compare as distinct in a unique constraint, so meetings created by hand with
-- no external reference are still unrestricted.
alter table public.meetings
  add constraint meetings_user_source_external_ref_key
  unique (user_id, source, external_ref);

comment on column public.calendar_connections.refresh_token_encrypted is
  'AES-256-GCM ciphertext. Google omits the refresh token when re-consenting without prompt=consent, so this stays nullable.';
comment on column public.meetings.source is
  'Where the meeting came from. Sync only ever touches google_calendar rows.';

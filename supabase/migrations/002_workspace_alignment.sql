-- Aligns the initial schema with the shipped application domain model.
--
-- 001 described the intended production shape. This migration closes the gaps
-- the persistent repositories actually need:
--   1. Existing meeting action items had no table.
--   2. Proposed actions arrive from the AI provider with a non-UUID identifier,
--      so they need a stable natural key to upsert against.
--   3. Briefs are replaced in place, so a meeting may hold only one current brief.
--   4. Audit rows must survive the action they describe.

create table public.meeting_action_items (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  source_key text not null,
  title text not null,
  owner text not null default '',
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (meeting_id, source_key)
);

create index meeting_action_items_meeting_id_idx
  on public.meeting_action_items (meeting_id);

alter table public.meeting_action_items enable row level security;

create policy "Users read their meeting action items"
  on public.meeting_action_items for select
  using ((select auth.uid()) = user_id);
create policy "Users manage their meeting action items"
  on public.meeting_action_items for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Context items are seeded and re-synced per meeting, so they need the same
-- natural key treatment as action items.
alter table public.context_items
  add column source_key text not null default '';

update public.context_items set source_key = id::text where source_key = '';

create unique index context_items_meeting_source_key_idx
  on public.context_items (meeting_id, source_key);

-- The AI provider supplies its own proposed-action identifier. Keep the UUID
-- primary key and upsert on the provider-supplied key instead.
alter table public.proposed_actions
  add column source_key text not null default '';

update public.proposed_actions set source_key = id::text where source_key = '';

create unique index proposed_actions_meeting_source_key_idx
  on public.proposed_actions (meeting_id, source_key);

-- One current brief per meeting. Brief history is a later phase; when it lands,
-- drop this index and add an explicit `is_current` flag instead.
create unique index meeting_briefs_meeting_id_idx
  on public.meeting_briefs (meeting_id);

-- Audit logs are an append-only record of human decisions. Deleting the action
-- must not erase the evidence that someone approved or rejected it.
alter table public.audit_logs
  drop constraint audit_logs_proposed_action_id_fkey;

alter table public.audit_logs
  alter column proposed_action_id drop not null;

alter table public.audit_logs
  add constraint audit_logs_proposed_action_id_fkey
  foreign key (proposed_action_id)
  references public.proposed_actions(id) on delete set null;

-- Audit rows record the decision as it was made; they are never edited.
create policy "Audit logs are immutable"
  on public.audit_logs for update
  using (false);

comment on column public.proposed_actions.source_key is
  'Provider-supplied action identifier. Stable across brief regeneration.';
comment on column public.context_items.source_key is
  'Stable per-meeting context identifier used for idempotent re-sync.';

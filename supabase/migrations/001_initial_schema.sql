-- ContextFlow production schema example.
-- The MVP uses local in-memory repositories. A production implementation would
-- replace them with server-side Supabase repositories scoped to auth.uid().

create extension if not exists vector with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create table public.meetings (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  external_ref text,
  title text not null,
  summary text not null default '',
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  location text not null default '',
  attendees jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.context_items (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  kind text not null check (kind in ('email', 'note', 'calendar')),
  title text not null,
  body text not null,
  source_label text not null,
  occurred_at timestamptz not null,
  embedding extensions.vector(1536),
  created_at timestamptz not null default now()
);

create table public.meeting_briefs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  objective text not null,
  context_summary text not null,
  unresolved_questions jsonb not null default '[]'::jsonb,
  suggested_agenda jsonb not null default '[]'::jsonb,
  provider text not null check (provider in ('mock', 'anthropic')),
  generated_at timestamptz not null default now()
);

create table public.proposed_actions (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  meeting_brief_id uuid references public.meeting_briefs(id) on delete set null,
  action_type text not null
    check (action_type in ('draft_email', 'create_task', 'schedule_follow_up')),
  title text not null,
  description text not null,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table public.audit_logs (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meeting_id uuid not null references public.meetings(id) on delete cascade,
  proposed_action_id uuid not null references public.proposed_actions(id) on delete cascade,
  action_title text not null,
  status text not null check (status in ('approved', 'rejected')),
  actor_label text not null,
  created_at timestamptz not null default now()
);

create index meetings_user_starts_at_idx
  on public.meetings (user_id, starts_at);
create index context_items_meeting_id_idx
  on public.context_items (meeting_id);
create index context_items_user_occurred_at_idx
  on public.context_items (user_id, occurred_at desc);
create index proposed_actions_user_status_idx
  on public.proposed_actions (user_id, status, created_at desc);
create index audit_logs_user_created_at_idx
  on public.audit_logs (user_id, created_at desc);

-- Create this HNSW index after representative production data is loaded and
-- tune vector_cosine_ops/dimensions to the selected embedding model.
create index context_items_embedding_hnsw_idx
  on public.context_items
  using hnsw (embedding extensions.vector_cosine_ops);

alter table public.meetings enable row level security;
alter table public.context_items enable row level security;
alter table public.meeting_briefs enable row level security;
alter table public.proposed_actions enable row level security;
alter table public.audit_logs enable row level security;

create policy "Users read their meetings"
  on public.meetings for select
  using ((select auth.uid()) = user_id);
create policy "Users manage their meetings"
  on public.meetings for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users read their context"
  on public.context_items for select
  using ((select auth.uid()) = user_id);
create policy "Users manage their context"
  on public.context_items for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users read their briefs"
  on public.meeting_briefs for select
  using ((select auth.uid()) = user_id);
create policy "Users manage their briefs"
  on public.meeting_briefs for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users read their proposed actions"
  on public.proposed_actions for select
  using ((select auth.uid()) = user_id);
create policy "Users decide their proposed actions"
  on public.proposed_actions for update
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "Users read their audit logs"
  on public.audit_logs for select
  using ((select auth.uid()) = user_id);
create policy "Users insert their audit logs"
  on public.audit_logs for insert
  with check ((select auth.uid()) = user_id);

comment on column public.context_items.embedding is
  'Optional semantic-search vector. Generate server-side and never expose service-role credentials.';
comment on table public.audit_logs is
  'Append-only application history for explicit human decisions.';

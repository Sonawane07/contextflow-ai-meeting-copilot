-- Job-application inbox.
--
-- Surfaces mail about a job search that is still waiting on the user, so a
-- reply request or an interview invite cannot quietly scroll out of view.
--
-- Deliberately separate from `context_items`: those belong to a meeting and
-- exist to inform a brief. These belong to nothing but the user's attention,
-- and carry state (triage, dismissal) that meeting context does not.

create table public.tracked_emails (
  id uuid primary key default extensions.gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Gmail's ids. `thread_id` is what makes a reply detectable: a reply lands
  -- as a new message in the same thread.
  message_id text not null,
  thread_id text not null,

  subject text not null default '',
  from_label text not null default '',
  snippet text not null default '',
  received_at timestamptz not null,

  -- Straight from Gmail's labels, refreshed on every scan.
  is_unread boolean not null default false,

  -- Assigned by the classifier. 'other' is the safe default for anything it
  -- is unsure about, so an unknown value never masquerades as urgent.
  category text not null default 'other'
    check (category in (
      'interview_invite', 'assessment', 'offer', 'rejection',
      'reply_needed', 'acknowledgement', 'other'
    )),
  -- Whether the user still owes a response. This is the field the dashboard
  -- actually sorts on.
  needs_reply boolean not null default false,
  -- One line explaining the classification, so a wrong call is inspectable
  -- rather than mysterious.
  reason text not null default '',
  -- Any date the message itself named, e.g. "please reply by Friday".
  deadline_at timestamptz,

  -- Set when the user says they have dealt with it. Never inferred: only the
  -- person knows whether an email is actually handled.
  dismissed_at timestamptz,

  first_seen_at timestamptz not null default now(),
  last_scanned_at timestamptz not null default now(),

  -- One row per message per user; a re-scan updates in place.
  unique (user_id, message_id)
);

create index tracked_emails_user_attention_idx
  on public.tracked_emails (user_id, dismissed_at, received_at desc);
create index tracked_emails_user_thread_idx
  on public.tracked_emails (user_id, thread_id);

alter table public.tracked_emails enable row level security;

create policy "Users read their tracked emails"
  on public.tracked_emails for select
  using ((select auth.uid()) = user_id);
create policy "Users manage their tracked emails"
  on public.tracked_emails for all
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

grant select, insert, update, delete on public.tracked_emails to authenticated;

comment on table public.tracked_emails is
  'Job-search mail still awaiting the user. Read-only with respect to Gmail: nothing here sends, replies, or marks a message read.';
comment on column public.tracked_emails.dismissed_at is
  'Set only by an explicit user action, never inferred from mailbox state.';

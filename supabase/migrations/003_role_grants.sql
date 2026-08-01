-- Table privileges and the missing insert policy for proposed actions.
--
-- Two separate permission systems have to agree before a query succeeds:
--
--   1. GRANTs decide whether a role may touch a table at all.
--   2. RLS policies decide which rows it may touch.
--
-- Migrations 001 and 002 defined only the second. Tables created by raw SQL do
-- not inherit privileges for the `authenticated` role, so every request failed
-- with "permission denied for table meetings" before RLS was ever consulted.
-- This was invisible until the app ran against a real database, because a
-- policy-only schema reads as complete.

grant usage on schema public to anon, authenticated, service_role;

-- Privileges are granted per table to match what each RLS policy set allows,
-- rather than blanket-granting the schema.

grant select, insert, update, delete on public.meetings to authenticated;
grant select, insert, update, delete on public.context_items to authenticated;
grant select, insert, update, delete on public.meeting_action_items to authenticated;
grant select, insert, update, delete on public.meeting_briefs to authenticated;

-- Proposed actions are never deleted by a user; a decision is a status change,
-- so the audit trail stays intact.
grant select, insert, update on public.proposed_actions to authenticated;

-- Audit rows are append-only: no update, no delete privilege at all.
grant select, insert on public.audit_logs to authenticated;

grant all on all tables in schema public to service_role;

-- 001 gave proposed_actions select and update policies but no insert policy,
-- so generating a brief could not persist the actions it proposed.
--
-- The check also pins the initial status to 'pending'. The approval boundary is
-- the product's core safety property, and this makes the database refuse a
-- pre-approved row outright rather than trusting every future code path to set
-- the status correctly.
create policy "Users propose their own actions"
  on public.proposed_actions for insert
  with check ((select auth.uid()) = user_id and status = 'pending');

comment on policy "Users propose their own actions" on public.proposed_actions is
  'New proposals must start pending; approval is a separate, explicit update.';

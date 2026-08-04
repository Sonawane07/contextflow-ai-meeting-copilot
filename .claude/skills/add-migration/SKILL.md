---
name: add-migration
description: Add a Supabase migration to ContextFlow with the grants, policies, row types, and documentation that must land with it.
---

# Add a ContextFlow Migration

A migration here is never one file. Getting the SQL right and stopping there is
what produced `003_role_grants.sql`, a migration whose only job was to repair
the two before it — a schema that defined row-level security but never granted
the `authenticated` role permission to touch the tables at all. Typecheck and
the test suite both passed. Every request failed with `permission denied` the
first time the app met a real database.

Work through all five parts.

## 1. The SQL

Create `supabase/migrations/NNN_short_name.sql`, numbered after the highest
existing file. Never edit an applied migration; add a new one.

For each new table:

- `user_id uuid not null references auth.users(id) on delete cascade`;
- `alter table ... enable row level security`;
- policies scoping rows to `(select auth.uid()) = user_id`, with `with check`
  on anything writable;
- **an explicit `grant`** naming only the privileges the policies allow.

Grants and policies are separate systems. A grant decides whether the role may
touch the table; a policy decides which rows. A policy-only schema reads as
complete and fails at runtime.

Withhold privileges the domain does not need. `proposed_actions` has no `delete`
grant because a decision is a status change, and `audit_logs` has neither
`update` nor `delete` because it is append-only. Where an invariant can be
expressed as a constraint, prefer that over trusting future code — the insert
policy on `proposed_actions` pins new rows to `status = 'pending'`, so the
database itself refuses a pre-approved action.

Comment the *why*, not the shape. The column list is already self-describing;
the reason a column is nullable is not.

## 2. The row types

Update `src/lib/supabase/database.types.ts` in the same change. Nothing
regenerates this file — it is hand-authored so a reviewer can diff it against
the migration.

Every shape must be a `type` alias. An `interface` compiles here and then
collapses every query result to `never`, because postgrest-js constrains rows
to `Record<string, unknown>` and only type aliases receive an implicit index
signature. The failure surfaces far from its cause.

## 3. The repository

Add queries behind the existing repository interface so route handlers keep
depending on the interface rather than an implementation. Scope every query
twice: row-level security is the guarantee on request paths, and an explicit
`user_id` filter is what scopes background jobs running through the
service-role client, which bypasses RLS. Set `user_id` on writes so the
database rejects a mismatch.

Never construct the service-role client on a request path.

## 4. The verification

Typecheck and unit tests cannot see any of the failures above. Apply the
migration to a real database:

```bash
npx supabase db reset   # applies every migration in order
```

Then sign up as two separate accounts and confirm the second sees none of the
first's rows.

## 5. The documentation

Update in `README.md`:

- the table in **Supabase persistence**;
- the **Data model summary** row;
- the migration list under **Repository structure**;
- any design decision a reviewer would otherwise have to infer from the SQL.

Finish with `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

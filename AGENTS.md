# Repository Instructions

## Setup and Commands

```bash
npm install
npm run dev
npm run lint
npm run typecheck
npm test
npm run test:watch
npm run build
npm run mcp:dev
```

## Structure

- `src/app`: six UI pages and REST API routes
- `src/components`: shared visual components
- `src/features`: auth, meeting, brief, action, and dashboard modules
- `src/lib`: AI providers, repositories, auth, validation, and examples
- `src/lib/supabase`: clients, database types, persistent repositories
- `src/lib/inngest`: client, scheduled functions, and pure date helpers
- `src/lib/integrations/google`: OAuth, calendar reads, and sync
- `src/lib/crypto`: authenticated encryption for stored OAuth tokens
- `src/proxy.ts`: session refresh and authenticated-page gating
- `src/types`: shared domain and API types
- `src/test`: test setup
- `supabase/migrations`: applied schema for the persistent path
- `tools/contextflow-mcp`: read-only MCP example

## Coding Rules

- Preserve strict TypeScript and validate external input with Zod.
- Keep provider calls and credentials server-only.
- Keep demo data synthetic and deterministic.
- Require explicit approval for action state changes.
- Resolve repositories through `getRequestContext()`; return 401 when it is null.
- Never let an unauthenticated request fall back to seeded demo data.
- Keep changes small, focused, tested, and documented.
- Do not add live third-party integrations without an explicit requirement.
- Never commit `.env*` credentials, access tokens, service-role keys, or personal data.
- Encrypt OAuth tokens before storage and keep third-party scopes read-only.
- Run lint, typecheck, tests, and build before handing off changes.

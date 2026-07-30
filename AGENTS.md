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

- `src/app`: five UI pages and REST API routes
- `src/components`: shared visual components
- `src/features`: meeting, brief, action, and dashboard modules
- `src/lib`: AI providers, demo data, validation, and production examples
- `src/types`: shared domain and API types
- `src/test`: test setup
- `supabase/migrations`: illustrative production schema
- `tools/contextflow-mcp`: read-only MCP example

## Coding Rules

- Preserve strict TypeScript and validate external input with Zod.
- Keep provider calls and credentials server-only.
- Keep demo data synthetic and deterministic.
- Require explicit approval for action state changes.
- Keep changes small, focused, tested, and documented.
- Do not add live third-party integrations without an explicit requirement.
- Never commit `.env*` credentials, access tokens, service-role keys, or personal data.
- Run lint, typecheck, tests, and build before handing off changes.

---
name: create-api-route
description: Add or update a ContextFlow API route with validation, typed responses, and tests.
---

# Create a ContextFlow API Route

1. Inspect adjacent handlers in `src/app/api` and reuse their response envelope.
2. Keep the route small and delegate data access to an existing repository interface.
3. Validate every path, query, or body input with Zod before using it.
4. Return a typed error with an appropriate HTTP status; do not leak stack traces or provider details.
5. Keep credentials and provider calls on the server. Never serialize secrets.
6. Preserve the human-approval boundary for proposed actions.
7. Add or update a meaningful route test, including at least one failure case when relevant.
8. Update the API table in `README.md` if the public contract changes.
9. Run `npm run lint`, `npm run typecheck`, `npm test`, and `npm run build`.

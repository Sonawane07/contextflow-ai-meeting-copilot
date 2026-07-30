# ContextFlow Read-Only MCP Example

This tiny stdio server exposes three static resources:

- project overview;
- implemented API route list;
- database schema summary.

It reads no environment variables, accesses no secrets, and provides no mutating tools.

Run it with:

```bash
npm run mcp:dev
```

Connect an MCP client with the placeholder configuration in `.mcp.json.example`.

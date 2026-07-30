import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

const resources = [
  {
    name: "project-overview",
    uri: "contextflow://project/overview",
    description: "A concise overview of ContextFlow's purpose and boundaries.",
    text:
      "ContextFlow is a demo-first Next.js meeting copilot. It combines focused synthetic meeting context, structured AI briefs, and explicit human decisions for simulated follow-up actions.",
  },
  {
    name: "api-routes",
    uri: "contextflow://project/api-routes",
    description: "The read-only list of API contracts implemented by the MVP.",
    text: [
      "GET /api/meetings",
      "GET /api/meetings/[id]",
      "POST /api/meetings/[id]/brief",
      "GET /api/actions",
      "PATCH /api/actions/[id]",
      "GET /api/audit-logs",
    ].join("\n"),
  },
  {
    name: "database-schema",
    uri: "contextflow://project/database-schema",
    description: "A summary of the illustrative Supabase/PostgreSQL schema.",
    text:
      "Tables: meetings, context_items, meeting_briefs, proposed_actions, audit_logs. Every table is user-scoped. Context items include an optional pgvector embedding. Example RLS policies constrain rows to auth.uid().",
  },
] as const;

const server = new McpServer({
  name: "contextflow-readonly",
  version: "0.1.0",
});

for (const resource of resources) {
  server.registerResource(
    resource.name,
    resource.uri,
    {
      title: resource.name,
      description: resource.description,
      mimeType: "text/plain",
    },
    async () => ({
      contents: [
        {
          uri: resource.uri,
          mimeType: "text/plain",
          text: resource.text,
        },
      ],
    }),
  );
}

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("ContextFlow read-only MCP server is running over stdio.");
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown MCP startup error.";
  console.error(`ContextFlow MCP server failed: ${message}`);
  process.exitCode = 1;
});

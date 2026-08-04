#!/usr/bin/env node
/**
 * Two database invariants that neither typecheck nor the test suite can see.
 *
 * Both are recorded in CLAUDE.md, and both are here because they were learned
 * the expensive way — see `supabase/migrations/003_role_grants.sql`, which
 * exists solely to repair the first one after it reached a real database.
 *
 * Runs as a PostToolUse hook on Write and Edit. It reads the tool payload from
 * stdin, inspects only the file that was just written, and exits 2 with an
 * explanation on stderr when an invariant is broken. Pure string inspection:
 * no npm, no network, no database.
 */

import { readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const MIGRATION = /supabase[/\\]migrations[/\\].+\.sql$/i;
const DB_TYPES = /src[/\\]lib[/\\]supabase[/\\]database\.types\.ts$/i;

function readStdin() {
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

/** Strips `-- line` and block comments so prose cannot satisfy a check. */
function stripSqlComments(sql) {
  return sql.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/--[^\n]*/g, " ");
}

/**
 * A table with row-level security that no migration ever GRANTs.
 *
 * Two permission systems have to agree: a GRANT decides whether a role may
 * touch a table at all, an RLS policy decides which rows. Defining only the
 * second reads as a complete schema and fails at runtime with
 * "permission denied", before RLS is ever consulted.
 *
 * Checked across the whole directory rather than one file, because a later
 * migration may legitimately supply the grant for an earlier table — which is
 * exactly what 003 does for the tables created in 001 and 002.
 */
function checkGrants(migrationPath) {
  const directory = dirname(migrationPath);

  let files;
  try {
    files = readdirSync(directory)
      .filter((name) => name.toLowerCase().endsWith(".sql"))
      .sort();
  } catch {
    return [];
  }

  const sources = new Map();
  for (const name of files) {
    try {
      sources.set(name, stripSqlComments(readFileSync(join(directory, name), "utf8")));
    } catch {
      // An unreadable sibling is not this hook's business to report.
    }
  }

  const everything = [...sources.values()].join("\n");
  const problems = [];

  for (const [name, sql] of sources) {
    const created = [...sql.matchAll(/create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?(\w+)"?/gi)]
      .map((match) => match[1]);

    for (const table of new Set(created)) {
      const rls = new RegExp(
        `alter\\s+table\\s+(?:public\\.)?"?${table}"?\\s+enable\\s+row\\s+level\\s+security`,
        "i",
      );
      if (!rls.test(sql)) continue;

      // Deliberately requires a per-table grant. A blanket
      // `grant ... on all tables in schema public` is not accepted as a
      // substitute: 003 grants per table precisely so each table's privileges
      // match what its own policy set allows.
      const grant = new RegExp(`grant\\s+[^;]*\\son\\s+(?:public\\.)?"?${table}"?\\b`, "i");
      if (grant.test(everything)) continue;

      problems.push(
        `  ${name}: "${table}" enables row level security but no migration GRANTs it.\n` +
        `    RLS decides which rows; a GRANT decides whether the role may touch the\n` +
        `    table at all. Without one, every request fails with "permission denied\n` +
        `    for table ${table}" before RLS is consulted — and typecheck and the test\n` +
        `    suite cannot see it. See 003_role_grants.sql, which exists only to\n` +
        `    repair exactly this omission in 001 and 002.`,
      );
    }
  }

  return problems;
}

/**
 * An `interface` in database.types.ts.
 *
 * postgrest-js constrains rows to Record<string, unknown>, and only type
 * aliases receive an implicit index signature. An interface satisfies the
 * compiler here but collapses every query result to `never`, surfacing far
 * downstream as an unrelated-looking type error.
 */
function checkTypeAliases(source) {
  const problems = [];
  for (const [index, line] of source.split("\n").entries()) {
    if (/^\s*(?:export\s+)?interface\s+\w+/.test(line)) {
      problems.push(
        `  Line ${index + 1} declares an interface: ${line.trim()}\n` +
        `    Every shape in this file must be a \`type\` alias. postgrest-js\n` +
        `    constrains rows to Record<string, unknown>, and only type aliases get\n` +
        `    an implicit index signature — an interface compiles here but collapses\n` +
        `    every query result to \`never\` somewhere else entirely.`,
      );
    }
  }
  return problems;
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) process.exit(0);

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    process.exit(0);
  }

  const filePath = payload?.tool_input?.file_path;
  if (typeof filePath !== "string" || filePath.length === 0) process.exit(0);

  const isMigration = MIGRATION.test(filePath);
  const isDbTypes = DB_TYPES.test(filePath);
  if (!isMigration && !isDbTypes) process.exit(0);

  let source;
  try {
    source = readFileSync(filePath, "utf8");
  } catch {
    // The file may have been moved or removed since the tool ran. Nothing to
    // check, and a missing file is not this hook's business to report.
    process.exit(0);
  }

  const problems = isMigration ? checkGrants(filePath) : checkTypeAliases(source);
  if (problems.length === 0) process.exit(0);

  const label = isMigration ? "Migration" : "Database types";
  process.stderr.write(
    `${label} invariant not satisfied in ${filePath}:\n\n${problems.join("\n\n")}\n\n` +
    `Fix this before continuing. Neither \`npm run typecheck\` nor \`npm test\`\n` +
    `will catch it, and it will not fail until the app runs against a real\n` +
    `database. This rule is recorded in CLAUDE.md.\n`,
  );
  process.exit(2);
}

main();

#!/usr/bin/env node
/**
 * End-of-turn verification.
 *
 * Replaces a bare `npm run typecheck && npm test`, which had three problems:
 * it ran the full suite for a change that touched only documentation, it
 * failed outright in a git worktree that has no `node_modules`, and it could
 * not see the one drift rule CLAUDE.md states about migrations.
 *
 * Lint and build stay deliberately out of this hook and remain explicit
 * completion commands, for the reason given in the README: they are slower and
 * easier to read when invoked directly.
 */

import { existsSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const root = process.env.CLAUDE_PROJECT_DIR ?? process.cwd();

/** Paths whose change should trigger the TypeScript checks. */
const CODE = /^(src\/|tools\/|supabase\/|package\.json|tsconfig|vitest|next\.config|eslint)/;
const MIGRATION = /^supabase\/migrations\/.+\.sql$/;
const DB_TYPES = "src/lib/supabase/database.types.ts";

function git(args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
  if (result.status !== 0 || typeof result.stdout !== "string") return [];
  return result.stdout.split("\n").map((line) => line.trim()).filter(Boolean);
}

/**
 * Everything this branch has touched: uncommitted edits plus any commits not
 * yet on the default branch. A change committed mid-session still counts.
 */
function changedFiles() {
  const files = new Set();

  for (const line of git(["status", "--porcelain"])) {
    // "XY path" — and for renames, "XY old -> new".
    const path = line.slice(2).trim();
    files.add(path.includes(" -> ") ? path.split(" -> ")[1] : path);
  }

  // The first base that exists wins, even if it reports nothing: "this branch
  // has no commits of its own" is an answer, not a failed lookup. Falling
  // through on an empty result would reach a stale local `main` and report its
  // entire backlog as this turn's work.
  const base = ["origin/main", "main"].find(
    (ref) => spawnSync("git", ["rev-parse", "--verify", "--quiet", ref], { cwd: root }).status === 0,
  );
  if (base) {
    git(["diff", "--name-only", `${base}...HEAD`]).forEach((file) => files.add(file));
  }

  return [...files].map((file) => file.replace(/^"|"$/g, ""));
}

/**
 * A migration that changes a table's shape without updating the hand-authored
 * row types beside it.
 *
 * Shape-changing only: a migration that adds nothing but grants or policies
 * has no effect on the generated row types, which is why 003 is not a
 * violation of this rule.
 */
function typesDrift(files) {
  const migrations = files.filter((file) => MIGRATION.test(file));
  if (migrations.length === 0) return null;
  if (files.includes(DB_TYPES)) return null;

  const reshaping = migrations.filter((file) => {
    const full = join(root, file);
    if (!existsSync(full)) return false;
    const sql = readFileSync(full, "utf8").replace(/--[^\n]*/g, " ");
    return /create\s+table|add\s+column|drop\s+column|alter\s+column|rename\s+column/i.test(sql);
  });

  if (reshaping.length === 0) return null;

  return (
    `${reshaping.join(", ")} changes a table's shape, but ${DB_TYPES} is unchanged.\n` +
    `CLAUDE.md requires them to move together: those row types are hand-authored\n` +
    `so they can be diffed against the migration in review, and nothing regenerates\n` +
    `them. A missing column here surfaces later as a confusing type error far from\n` +
    `its cause.`
  );
}

function run(script) {
  const result = spawnSync("npm", ["run", script, "--silent"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`.trim(),
  };
}

function main() {
  let payload = {};
  try {
    payload = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    payload = {};
  }

  // Already blocked once this turn. Blocking again risks a loop, and the point
  // has been made.
  if (payload.stop_hook_active) process.exit(0);

  const files = changedFiles();
  const problems = [];

  const drift = typesDrift(files);
  if (drift) problems.push(drift);

  const codeChanged = files.some((file) => CODE.test(file));

  if (codeChanged) {
    if (!existsSync(join(root, "node_modules"))) {
      // A worktree without an install. Failing here would report a missing
      // dependency as if it were a defect in the change.
      process.stderr.write(
        `Skipped typecheck and tests: no node_modules in ${root}.\n` +
        `Run \`npm install\` here, or verify from the main checkout, before\n` +
        `treating this change as done.\n`,
      );
    } else {
      for (const script of ["typecheck", "test"]) {
        const { ok, output } = run(script);
        if (!ok) problems.push(`\`npm run ${script}\` failed:\n\n${output}`);
      }
    }
  }

  if (problems.length === 0) process.exit(0);

  process.stderr.write(`${problems.join("\n\n")}\n`);
  process.exit(2);
}

main();

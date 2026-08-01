import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  // `supabase/` holds SQL migrations and CLI-managed config. `supabase/.temp/`
  // additionally contains bundled runtime code the CLI writes during
  // `supabase start`, which is not ours to lint.
  globalIgnores([".next/**", "coverage/**", "tmp/**", "supabase/**"]),
]);

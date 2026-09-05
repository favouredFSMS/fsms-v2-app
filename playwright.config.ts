import { defineConfig, devices } from "@playwright/test";

/**
 * FSMS V2 — browser E2E (Phase 29). Runs against the local dev harness
 * (`next dev` + local PostgreSQL) because that is the only auth path available
 * without a provisioned Supabase project. Production E2E requires Supabase
 * credentials and is documented as a provisioning-gated follow-up.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 90_000,
  // Low parallelism: the sandbox is memory-constrained and `next dev` is
  // compile-on-demand; too many workers OOM-kill the dev server mid-run.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    // NOTE: must be `localhost`, not `127.0.0.1` — Next.js 16 treats the raw
    // IP as a cross-origin dev host and blocks dev resources, which silently
    // breaks client-component hydration (and thus the language switcher).
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/login",
    // Always start a fresh server: the e2e/run.sh runner invokes Playwright
    // once per spec group precisely so each group gets its own low-memory
    // dev server. Reusing a long-lived server accumulates compiled routes and
    // gets OOM-killed in the ~2 GB sandbox.
    reuseExistingServer: false,
    timeout: 180_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});

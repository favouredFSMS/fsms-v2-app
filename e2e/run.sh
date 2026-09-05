#!/usr/bin/env bash
# FSMS V2 — memory-safe E2E runner (Phase 29).
#
# The sandbox has ~2 GB RAM and no swap. `next dev` (Turbopack) is OOM-killed
# once it compiles enough routes (~1 GB RSS), so a single long run dies partway.
# We therefore run each spec group against its own freshly-started dev server
# (Playwright starts and tears down the webServer per invocation), keeping the
# compiled-route footprint per server well under the OOM threshold.
set -euo pipefail
cd "$(dirname "$0")/.."

groups=( "e2e/auth.spec.ts" "e2e/admin.spec.ts" "e2e/teacher.spec.ts" )
for g in "${groups[@]}"; do
  echo "==> playwright test $g"
  npx playwright test "$g"
done
echo "==> all E2E groups passed"

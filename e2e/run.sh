#!/usr/bin/env bash
# FSMS V2 — memory-safe E2E runner (Phase 29, extended Phase 31 UAT).
#
# The sandbox has ~2 GB RAM and no swap. `next dev` (Turbopack) is OOM-killed
# once it compiles enough routes (~1 GB RSS), so a single long run dies partway.
# We therefore run each spec group against its own freshly-started dev server
# (Playwright starts and tears down the webServer per invocation), keeping the
# compiled-route footprint per server well under the OOM threshold.
#
# Modes:
#   E2E_REUSE=0 (default) — memory-safe: fresh dev server per group.
#   E2E_REUSE=1 — reuse a prewarmed dev server already listening on :3000
#     (start it with `npm run dev`, then curl the routes once). Fast and
#     reliable for a long suite, but needs the server to stay alive.
#   UAT_ONLY=1 — run just the Phase 31 UAT groups.
#
# SANDBOX NOTE: the host has ~2 GB RAM and no swap by default; `next dev` +
# Chromium + PostgreSQL can OOM-kill mid-run. On a host with sudo, enable swap
# once before running (it does not persist across sandbox snapshots):
#   sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile \
#     && sudo mkswap /swapfile && sudo swapon /swapfile
set -euo pipefail
cd "$(dirname "$0")/.."

base=( "e2e/auth.spec.ts" "e2e/admin.spec.ts" "e2e/teacher.spec.ts" "e2e/role-workflows.spec.ts" )
uat=( "e2e/uat-admin.spec.ts" "e2e/uat-teacher.spec.ts" "e2e/uat-teacher2.spec.ts" \
      "e2e/uat-parent.spec.ts" "e2e/uat-student.spec.ts" "e2e/uat-i18n.spec.ts" \
      "e2e/uat-mobile.spec.ts" )

groups=()
if [[ "${UAT_ONLY:-0}" == "1" ]]; then
  groups=( "${uat[@]}" )
else
  groups=( "${base[@]}" "${uat[@]}" )
fi

for g in "${groups[@]}"; do
  echo "==> playwright test $g"
  npx playwright test "$g"
  if [[ "${E2E_REUSE:-0}" != "1" ]]; then
    # Give the OS a beat to reclaim the previous dev server's memory before the
    # next group starts its own (the sandbox has no swap; back-to-back starts
    # can otherwise OOM-kill the next server).
    sleep 2
  fi
done
echo "==> all E2E groups passed"

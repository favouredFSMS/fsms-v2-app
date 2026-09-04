"use client";

import { useEffect } from "react";

/**
 * FSMS V2 — service-worker registration (Phase 25).
 *
 * Registers `/sw.js` once the app hydrates. Wrapped in try/catch and dev
 * guards so a registration failure never breaks the app. The worker is
 * registered with the default scope ("/") and updates are picked up via
 * `updateViaCache: "none"` so a redeploy installs the new worker immediately.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV === "production" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .catch(() => {
          // Non-fatal: the app works without offline support.
        });
    }
  }, []);

  return null;
}

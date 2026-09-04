import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

/**
 * Phase 28 security headers. Applied to every route.
 *
 * Deliberately NO frame-blocking (X-Frame-Options / CSP frame-ancestors): the
 * app is embedded by the development/preview host, and adding those would
 * break the preview. A strict Content-Security-Policy is a per-deployment
 * concern (nonce strategy depends on the hosting setup) and is documented in
 * FSMS_V2_SECURITY.md rather than hardcoded here.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

export default withNextIntl(nextConfig);

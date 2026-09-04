/**
 * FSMS V2 — LOCAL-ONLY dev session token (pure, no request context).
 *
 * HMAC-signed, base64url-encoded JSON tokens for the dev harness. Split from
 * local.ts so the crypto is unit-testable without Next.js request scope.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

export const LOCAL_SESSION_COOKIE = "fsms_local_session";
const SESSION_DAYS = 7;

export interface LocalSession {
  sub: string;
  email?: string;
  exp: number; // epoch seconds
}

function hmac(payload: string): string {
  return createHmac("sha256", env.localAuthSecret).update(payload).digest("base64url");
}

function encode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj), "utf8").toString("base64url");
}

function decode<T>(payload: string): T | null {
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

/** Build a signed session token for a freshly-authenticated user. */
export function issueLocalSession(sub: string, email?: string): string {
  const payload = encode({ sub, email, exp: Math.floor(Date.now() / 1000) + SESSION_DAYS * 86400 });
  return `${payload}.${hmac(payload)}`;
}

/** Verify a token and return its claims, or null (bad signature / expired / malformed). */
export function verifyLocalSessionToken(token: string): LocalSession | null {
  const i = token.lastIndexOf(".");
  if (i < 0) return null;
  const payload = token.slice(0, i);
  const sig = token.slice(i + 1);
  const expect = hmac(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expect);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  const data = decode<LocalSession>(payload);
  if (!data || typeof data.sub !== "string" || !data.sub) return null;
  if (data.exp < Math.floor(Date.now() / 1000)) return null;
  return data;
}

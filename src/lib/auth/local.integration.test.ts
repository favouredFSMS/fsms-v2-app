/**
 * Integration test for the LOCAL dev auth adapter against the real local
 * PostgreSQL harness (skips when the harness DB is unreachable).
 *
 * Proves the full chain: bcrypt credential check → signed session cookie →
 * HMAC verification → request.jwt.claim.sub → fsms.current_profile().
 */
import { describe, it, expect } from "vitest";
import { Client } from "pg";
import { verifyLocalCredentials, fetchProfileFor } from "./local-db";
import { issueLocalSession, verifyLocalSessionToken } from "./local-session";

const dbUrl = process.env.LOCAL_DB_URL ?? "postgres://fsms:fsms_dev@127.0.0.1:5432/fsms_v2";

// Reachability is checked at module load so describe.skipIf sees the final value.
let reachable = false;
try {
  const c = new Client({ connectionString: dbUrl });
  await c.connect();
  await c.query("select 1");
  await c.end();
  reachable = true;
} catch {
  reachable = false;
}

describe.skipIf(!reachable)("local auth adapter (integration)", () => {
  it("accepts seeded credentials and rejects wrong/missing ones", async () => {
    const id = await verifyLocalCredentials("owner@favoured.test", "owner123");
    expect(id).toMatch(/^[0-9a-f-]{36}$/i);
    expect(await verifyLocalCredentials("owner@favoured.test", "nope")).toBeNull();
    expect(await verifyLocalCredentials("ghost@favoured.test", "x")).toBeNull();
    expect(await verifyLocalCredentials("", "")).toBeNull();
  });

  it("round-trips a signed session token and verifies tampering is rejected", async () => {
    const token = issueLocalSession("00000000-0000-0000-0000-000000000201", "owner@favoured.test");
    const claims = verifyLocalSessionToken(token);
    expect(claims).not.toBeNull();
    expect(claims?.sub).toBe("00000000-0000-0000-0000-000000000201");
    expect(claims?.email).toBe("owner@favoured.test");

    // tampered payload → rejected (change the last char so HMAC differs)
    const [payload, sig] = token.split(".");
    const forged = `${payload.slice(0, -1)}${payload.endsWith("A") ? "B" : "A"}.${sig}`;
    expect(verifyLocalSessionToken(forged)).toBeNull();
    // tampered signature → rejected
    expect(verifyLocalSessionToken(`${payload}.AAAA`)).toBeNull();
  });

  it("resolves the full profile for the owner (role, school, per-user locale, permissions)", async () => {
    const profile = await fetchProfileFor("00000000-0000-0000-0000-000000000201");
    expect(profile).not.toBeNull();
    expect(profile?.role_base).toBe("admin1");
    expect(profile?.permissions).toEqual(["*"]);
    expect(profile?.locale).toBe("en");
    expect(profile?.status).toBe("active");
    expect(profile?.school_id).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("resolves the parent with per-user ru locale and parent permission count", async () => {
    const profile = await fetchProfileFor("00000000-0000-0000-0000-000000000203");
    expect(profile?.role_base).toBe("parent");
    expect(profile?.locale).toBe("ru"); // per-user language, never global
    expect(profile?.permissions).toHaveLength(98);
    expect(profile?.permissions).toContain("dashboard");
    expect(profile?.permissions).not.toContain("saveStudent");
  });
});

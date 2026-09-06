import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

// Mock @supabase/ssr createServerClient
let mockUser: { id: string; email: string } | null = null;
const mockResponseCookies = new Map<string, string>();

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockUser },
        error: null,
      })),
    },
  })),
}));

// Mock env
vi.mock("@/lib/env", () => ({
  env: {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
  },
}));

import proxy from "./proxy";

describe("proxy (middleware) redirect loop prevention", () => {
  beforeEach(() => {
    mockUser = null;
    mockResponseCookies.clear();
  });

  it("redirects unauthenticated users from /dashboard to /login", async () => {
    mockUser = null;
    const req = new NextRequest("https://fsms-v2-staging.vercel.app/dashboard");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://fsms-v2-staging.vercel.app/login");
  });

  it("allows authenticated user to access /dashboard without redirect", async () => {
    mockUser = { id: "user-1", email: "owner@favoured.test" };
    const req = new NextRequest("https://fsms-v2-staging.vercel.app/dashboard");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects authenticated user from /login to /dashboard when no query params are present", async () => {
    mockUser = { id: "user-1", email: "owner@favoured.test" };
    const req = new NextRequest("https://fsms-v2-staging.vercel.app/login");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://fsms-v2-staging.vercel.app/dashboard");
  });

  it("DOES NOT redirect authenticated user from /login when ?reason=inactive is present (breaks redirect loop)", async () => {
    mockUser = { id: "user-1", email: "inactive@favoured.test" };
    const req = new NextRequest("https://fsms-v2-staging.vercel.app/login?reason=inactive");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("DOES NOT redirect authenticated user from /login when ?error=session-expired is present (breaks redirect loop)", async () => {
    mockUser = { id: "user-1", email: "expired@favoured.test" };
    const req = new NextRequest("https://fsms-v2-staging.vercel.app/login?error=session-expired");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("DOES NOT redirect authenticated user from /login when ?logout=1 is present", async () => {
    mockUser = { id: "user-1", email: "owner@favoured.test" };
    const req = new NextRequest("https://fsms-v2-staging.vercel.app/login?logout=1");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("allows unauthenticated visitor to access /signup without redirect", async () => {
    mockUser = null;
    const req = new NextRequest("https://fsms-v2-staging.vercel.app/signup");
    const res = await proxy(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
  });

  it("redirects authenticated user from /signup to /dashboard", async () => {
    mockUser = { id: "user-1", email: "owner@favoured.test" };
    const req = new NextRequest("https://fsms-v2-staging.vercel.app/signup");
    const res = await proxy(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("https://fsms-v2-staging.vercel.app/dashboard");
  });
});

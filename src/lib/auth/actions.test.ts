import { describe, it, expect, vi, beforeEach } from "vitest";

// Neutralise the react-server guard and Next request-scope APIs for the test.
vi.mock("server-only", () => ({}));

const cookieStore = {
  values: new Map<string, { name: string; value: string; options?: Record<string, unknown> }>(),
  get(name: string) {
    const v = this.values.get(name);
    return v ? { name: v.name, value: v.value } : undefined;
  },
  set(name: string, value: string, options?: Record<string, unknown>) {
    this.values.set(name, { name, value, options });
  },
  delete(name: string) {
    this.values.delete(name);
  },
};
const headerStore = new Headers();
vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => cookieStore),
  headers: vi.fn(async () => headerStore),
}));

vi.mock("./local", async () => {
  const actual = await vi.importActual<typeof import("./local")>("./local");
  return {
    ...actual,
    isLocalAuthEnabled: vi.fn(() => true),
    verifyLocalCredentials: vi.fn(async (email: string, pass: string) => {
      if (email === "owner@favoured.test" && pass === "owner123") {
        return "00000000-0000-0000-0000-000000000201";
      }
      return null;
    }),
    fetchLocalProfile: vi.fn(async () => ({
      id: "00000000-0000-0000-0000-000000000201",
      school_id: "00000000-0000-0000-0000-000000000001",
      email: "owner@favoured.test",
      name: "Owner",
      role_id: "00000000-0000-0000-0000-000000000101",
      role_base: "admin1" as const,
      role_key: "admin1",
      role_label: "Owner",
      rank: 200,
      locale: "en" as const,
      notify_lang: "en" as const,
      status: "active" as const,
      must_change_password: false,
      linked_ids: [],
      permissions: ["*"],
    })),
  };
});

const redirectTargets: string[] = [];
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    redirectTargets.push(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { loginAction, logoutAction, getAuthRedirectBaseUrl } from "./actions";

describe("auth server actions (local mode)", () => {
  beforeEach(() => {
    cookieStore.values.clear();
    redirectTargets.length = 0;
  });

  it("resolves dynamic origin from request headers", async () => {
    headerStore.set("x-forwarded-host", "fsms-v2-staging.vercel.app");
    headerStore.set("x-forwarded-proto", "https");
    const url = await getAuthRedirectBaseUrl();
    expect(url).toBe("https://fsms-v2-staging.vercel.app");
    headerStore.delete("x-forwarded-host");
    headerStore.delete("x-forwarded-proto");
  });

  it("logs in with valid seeded credentials, sets the session cookie, and redirects", async () => {
    const fd = new FormData();
    fd.set("email", "owner@favoured.test");
    fd.set("password", "owner123");

    await expect(loginAction(null, fd)).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(cookieStore.get("fsms_local_session")?.value).toBeTruthy();
    expect(cookieStore.get("fsms_local_session")?.value).toMatch(/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/);
  });

  it("rejects invalid credentials without setting a cookie", async () => {
    const fd = new FormData();
    fd.set("email", "owner@favoured.test");
    fd.set("password", "wrong");

    const state = await loginAction(null, fd);
    expect(state?.error).toBeTruthy();
    expect(cookieStore.get("fsms_local_session")).toBeUndefined();
  });

  it("rejects empty credentials", async () => {
    const state = await loginAction(null, new FormData());
    expect(state?.error).toMatch(/required/i);
  });

  it("logout clears the cookie and redirects to /login", async () => {
    cookieStore.set("fsms_local_session", "x.y");
    await expect(logoutAction()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(cookieStore.get("fsms_local_session")).toBeUndefined();
  });
});

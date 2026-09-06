import { describe, it, expect, vi, beforeEach } from "vitest";

import type { AuthProfile } from "@/lib/auth/types";

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

vi.mock("@/lib/env", () => ({
  env: {
    supabaseUrl: "https://example.supabase.co",
    supabaseAnonKey: "anon-key",
    supabaseServiceRoleKey: "service-key",
    appUrl: "https://example.com",
    localAuthSecret: "fsms-local-dev-secret-change-me",
  },
}));

let mockLocalAuth = true;
let mockSignInResult: { error: { message: string } | null } = { error: null };
let mockSignUpResult: {
  data?: { user?: { id: string; email: string } | null; session?: { access_token: string } | null };
  error: { message: string } | null;
} = { data: { user: { id: "new-user-1", email: "new@favoured.test" }, session: null }, error: null };
let mockAuthProfileResult: AuthProfile | null = null;

vi.mock("./local", async () => {
  const actual = await vi.importActual<typeof import("./local")>("./local");
  return {
    ...actual,
    isLocalAuthEnabled: vi.fn(() => mockLocalAuth),
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

vi.mock("@/lib/supabase/server", () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      signInWithPassword: vi.fn(async () => mockSignInResult),
      signUp: vi.fn(async () => mockSignUpResult),
      signOut: vi.fn(async () => ({})),
      resetPasswordForEmail: vi.fn(async () => ({ error: null })),
      updateUser: vi.fn(async () => ({ error: null })),
    },
  })),
  getServerClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        order: vi.fn(() => ({
          limit: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { id: "school-1" } })),
          })),
        })),
        eq: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: { id: "role-1", key: "parent", label: "Parent", rank: 20 } })),
          })),
        })),
      })),
      upsert: vi.fn(async () => ({ error: null })),
    })),
  })),
}));

vi.mock("./session", () => ({
  getAuthProfile: vi.fn(async () => mockAuthProfileResult),
}));

const redirectTargets: string[] = [];
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    redirectTargets.push(url);
    throw new Error(`NEXT_REDIRECT:${url}`);
  }),
}));

import { loginAction, signupAction, logoutAction, getAuthRedirectBaseUrl } from "./actions";

const defaultOwnerProfile: AuthProfile = {
  id: "00000000-0000-0000-0000-000000000201",
  school_id: "00000000-0000-0000-0000-000000000001",
  email: "owner@favoured.test",
  name: "Owner",
  role_id: "00000000-0000-0000-0000-000000000101",
  role_base: "admin1",
  role_key: "admin1",
  role_label: "Owner",
  rank: 200,
  locale: "en",
  notify_lang: "en",
  status: "active",
  must_change_password: false,
  linked_ids: [],
  permissions: ["*"],
};

describe("auth server actions (local mode)", () => {
  beforeEach(() => {
    mockLocalAuth = true;
    mockAuthProfileResult = { ...defaultOwnerProfile };
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

  it("signup succeeds in local dev mode", async () => {
    const fd = new FormData();
    fd.set("name", "Jane Doe");
    fd.set("email", "jane@favoured.test");
    fd.set("password", "secret123");
    fd.set("confirm", "secret123");
    fd.set("role", "parent");

    const state = await signupAction(null, fd);
    expect(state?.ok).toBe(true);
    expect(state?.error).toBeUndefined();
  });
});

describe("auth server actions (Supabase mode)", () => {
  beforeEach(() => {
    mockLocalAuth = false;
    mockSignInResult = { error: null };
    mockSignUpResult = {
      data: { user: { id: "new-user-1", email: "new@favoured.test" }, session: null },
      error: null,
    };
    mockAuthProfileResult = {
      id: "user-1",
      school_id: "school-1",
      email: "owner@favoured.test",
      name: "Owner",
      role_id: "role-1",
      role_base: "admin1",
      role_key: "admin1",
      role_label: "Owner",
      rank: 100,
      locale: "en",
      notify_lang: "en",
      status: "active",
      must_change_password: false,
      linked_ids: [],
      permissions: ["*"],
    };
    cookieStore.values.clear();
    redirectTargets.length = 0;
  });

  it("completes login and redirects to /dashboard when Supabase credentials and profile are valid", async () => {
    const fd = new FormData();
    fd.set("email", "owner@favoured.test");
    fd.set("password", "correct-password");

    await expect(loginAction(null, fd)).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(cookieStore.get("fsms_locale")?.value).toBe("en");
  });

  it("returns sanitized error message when signInWithPassword fails with invalid credentials", async () => {
    mockSignInResult = { error: { message: "Invalid login credentials" } };
    const fd = new FormData();
    fd.set("email", "owner@favoured.test");
    fd.set("password", "bad-password");

    const state = await loginAction(null, fd);
    expect(state?.error).toBe("Invalid email or password.");
  });

  it("sanitizes network 'fetch failed' errors to helpful connection guidance", async () => {
    mockSignInResult = { error: { message: "fetch failed" } };
    const fd = new FormData();
    fd.set("email", "owner@favoured.test");
    fd.set("password", "some-password");

    const state = await loginAction(null, fd);
    expect(state?.error).toMatch(/Unable to connect to the authentication server/i);
  });

  it("returns inactive message when profile status is not active", async () => {
    if (mockAuthProfileResult) {
      mockAuthProfileResult.status = "deactivated";
    }
    const fd = new FormData();
    fd.set("email", "inactive@favoured.test");
    fd.set("password", "valid-password");

    const state = await loginAction(null, fd);
    expect(state?.error).toMatch(/not active/i);
  });

  it("returns profile loading error if profile is null after successful auth", async () => {
    mockAuthProfileResult = null;
    const fd = new FormData();
    fd.set("email", "orphaned@favoured.test");
    fd.set("password", "valid-password");

    const state = await loginAction(null, fd);
    expect(state?.error).toMatch(/profile could not be loaded/i);
  });

  it("signup creates account and returns ok when email confirmation is required", async () => {
    const fd = new FormData();
    fd.set("name", "New Student");
    fd.set("email", "student@example.com");
    fd.set("password", "password123");
    fd.set("confirm", "password123");
    fd.set("role", "student");

    const state = await signupAction(null, fd);
    expect(state?.ok).toBe(true);
    expect(state?.error).toBeUndefined();
  });

  it("signup rejects password mismatch", async () => {
    const fd = new FormData();
    fd.set("name", "New Student");
    fd.set("email", "student@example.com");
    fd.set("password", "password123");
    fd.set("confirm", "different123");

    const state = await signupAction(null, fd);
    expect(state?.error).toMatch(/passwords do not match/i);
  });

  it("signup redirects to dashboard immediately if session is returned (email confirmation disabled)", async () => {
    mockSignUpResult = {
      data: {
        user: { id: "new-user-1", email: "instant@example.com" },
        session: { access_token: "mock-jwt" },
      },
      error: null,
    };

    const fd = new FormData();
    fd.set("name", "Instant User");
    fd.set("email", "instant@example.com");
    fd.set("password", "password123");
    fd.set("confirm", "password123");

    await expect(signupAction(null, fd)).rejects.toThrow("NEXT_REDIRECT:/dashboard");
    expect(cookieStore.get("fsms_locale")?.value).toBe("en");
  });
});

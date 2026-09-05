import { expect, type Page } from "@playwright/test";

/**
 * Shared E2E helpers (Phase 29). Local-auth credentials seeded by
 * supabase/seed.sql — valid only against the local dev harness, never
 * production.
 */
export const CREDS = {
  owner: { email: "owner@favoured.test", password: "owner123" },
  teacher: { email: "teacher@favoured.test", password: "teacher123" },
  parent: { email: "parent@favoured.test", password: "parent123" },
  student: { email: "student@favoured.test", password: "student123" },
} as const;

export async function signIn(
  page: Page,
  creds: { email: string; password: string },
) {
  await page.goto("/login");
  await page.locator("#email").fill(creds.email);
  await page.locator("#password").fill(creds.password);
  await page.getByRole("button", { name: /Sign in|Войти/i }).click();
  await page.waitForURL(/\/dashboard/, { timeout: 30_000 });
}

/** Navigate to a route and assert its title heading (h1) rendered. */
export async function visitAndAssert(page: Page, path: string, title: string | RegExp) {
  await page.goto(path);
  await page.locator("main").waitFor({ state: "visible", timeout: 30_000 });
  await expect(page.getByRole("heading", { name: title }).first()).toBeVisible({ timeout: 15_000 });
}

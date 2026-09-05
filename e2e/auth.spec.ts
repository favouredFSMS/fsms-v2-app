import { expect, test } from "@playwright/test";
import { CREDS, signIn } from "./helpers";

/**
 * Phase 29 — auth, role dashboards, RBAC nav visibility and language
 * switching. Only touches /login and /dashboard, keeping the dev server's
 * compiled-route footprint small (see e2e/run.sh for the memory rationale).
 */

for (const role of ["owner", "teacher", "parent", "student"] as const) {
  test(`${role} can sign in and reach the dashboard`, async ({ page }) => {
    await signIn(page, CREDS[role]);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("heading", { name: /Dashboard|Главная/i }).first()).toBeVisible();
  });
}

test("RBAC: admin sees People in nav, student does not", async ({ page }) => {
  await signIn(page, CREDS.owner);
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /People|Люди/i })).toBeVisible();
  await page.getByRole("button", { name: /Sign out|Выйти/i }).click();
  await page.waitForURL(/\/login/);

  await signIn(page, CREDS.student);
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /People|Люди/i })).toHaveCount(0);
});

test("language switching: en → ru → en on the authed shell", async ({ page }) => {
  await signIn(page, CREDS.owner);

  const switcher = page.getByLabel("Select language");
  await expect(switcher).toBeVisible();

  // The switcher persists the chosen locale to profiles.locale (server action),
  // so this test must always restore English — even on failure — or the next
  // run would start in Russian. Don't assert the starting language: it is
  // whatever a previous run left behind.
  try {
    await switcher.selectOption("ru");
    await expect(page.getByRole("heading", { name: /Главная/i }).first()).toBeVisible();
  } finally {
    await switcher.selectOption("en");
  }
  await expect(page.getByRole("heading", { name: /Dashboard/i }).first()).toBeVisible();
});

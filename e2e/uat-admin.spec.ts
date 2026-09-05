import { expect, test } from "@playwright/test";
import { CREDS, signIn, visitAndAssert } from "./helpers";

/**
 * Phase 31 UAT — Administrator workflow: users, schools, classes, reports,
 * settings. Also asserts the Phase 31 nav-hygiene fixes: no dangling links to
 * routes that do not exist (/learning, /family, /roles, /admin), and Settings
 * is reachable, lists the school profile, and supports add + remove.
 */

test("admin: users, classes, reports and settings render", async ({ page }) => {
  await signIn(page, CREDS.owner);
  await visitAndAssert(page, "/people", "People");
  await visitAndAssert(page, "/classes", "Classes");
  await visitAndAssert(page, "/reports", "Reports");
  await visitAndAssert(page, "/settings", "Settings");
});

test("admin: settings lists the school profile and supports add + remove", async ({ page }) => {
  await signIn(page, CREDS.owner);
  await page.goto("/settings");

  // School profile (covers the UAT "schools" item).
  await expect(page.getByText("FAVOURED English School").first()).toBeVisible();

  // Add a setting.
  await page.locator("#key").fill("uatTest");
  await page.locator("#value").fill("hello");
  await page.getByRole("button", { name: /Save/ }).click();
  await expect(page.getByRole("cell", { name: "uatTest" })).toBeVisible({ timeout: 15_000 });

  // Remove it again (keeps the dev DB clean for repeat runs).
  const row = page.getByRole("row", { name: /uatTest/ });
  await row.getByRole("button", { name: /Remove/ }).click();
  await expect(page.getByRole("cell", { name: "uatTest" })).toHaveCount(0, { timeout: 15_000 });
});

test("admin: no dangling navigation links", async ({ page }) => {
  await signIn(page, CREDS.owner);
  await page.goto("/dashboard");
  await expect(page.getByRole("link", { name: /Settings/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /My learning|Family|Roles|Admin/ })).toHaveCount(0);
});

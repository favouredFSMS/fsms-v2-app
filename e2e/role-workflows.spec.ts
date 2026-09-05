import { test, expect } from "@playwright/test";
import { CREDS, signIn } from "./helpers";

/**
 * Phase 32 staging prep — role × surface smoke (E2E).
 *
 * Verifies the four seeded roles each land on their dashboard and that the
 * permission-gated navigation is correct per role, plus per-user locale
 * switching (en → ru → en) on the authenticated shell. This is the UI slice
 * of the staging verification checklist; data-shape assertions live in the
 * Vitest integration suite.
 */

test.describe("role × surface smoke", () => {
  test("admin: dashboard + admin-only nav + key pages", async ({ page }) => {
    await signIn(page, CREDS.owner);
    await expect(page.getByRole("heading", { name: "Dashboard" }).first()).toBeVisible({
      timeout: 15_000,
    });

    // admin-only gate (permission `users`) is visible to the owner
    await expect(page.getByRole("link", { name: "People" }).first()).toBeVisible();

    const surfaces: Array<[string, string]> = [
      ["/people", "People"],
      ["/students", "Students"],
      ["/reports", "Reports"],
      ["/settings", "Settings"],
    ];
    for (const [path, title] of surfaces) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: title }).first()).toBeVisible({
        timeout: 15_000,
      });
    }
  });

  test("teacher: teaching surfaces render", async ({ page }) => {
    await signIn(page, CREDS.teacher);
    const surfaces: Array<[string, string]> = [
      ["/classes", "Classes"],
      ["/students", "Students"],
      ["/attendance", "Attendance"],
      ["/homework", "Homework"],
      ["/lessons", "Lessons"],
      ["/messaging", "Messaging"],
    ];
    for (const [path, title] of surfaces) {
      await page.goto(path);
      await expect(page.getByRole("heading", { name: title }).first()).toBeVisible({
        timeout: 15_000,
      });
    }
    // teacher does not have `users` → admin People link is absent (fail-closed nav)
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "People" })).toHaveCount(0);
  });

  test("student: dashboard + own surfaces; no admin People link", async ({ page }) => {
    await signIn(page, CREDS.student);
    await expect(page.getByRole("heading", { name: "Dashboard" }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.goto("/homework");
    await expect(page.getByRole("heading", { name: "Homework" }).first()).toBeVisible({
      timeout: 15_000,
    });
    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "People" })).toHaveCount(0);
  });

  test("parent (ru locale): dashboard renders in Russian", async ({ page }) => {
    await signIn(page, CREDS.parent);
    await expect(page.getByRole("heading", { name: "Главная" }).first()).toBeVisible({
      timeout: 15_000,
    });
    // parent-facing surfaces are present in the localized nav
    await expect(page.getByRole("link", { name: "Уведомления" }).first()).toBeVisible();
  });
});

test.describe("per-user locale switching", () => {
  test("owner: en → ru → en preserves dashboard", async ({ page }) => {
    await signIn(page, CREDS.owner);
    await expect(page.getByRole("heading", { name: "Dashboard" }).first()).toBeVisible();

    const switcher = page.getByLabel("Select language");
    await switcher.selectOption("ru");
    await expect(page.getByRole("heading", { name: "Главная" }).first()).toBeVisible({
      timeout: 15_000,
    });

    await switcher.selectOption("en");
    await expect(page.getByRole("heading", { name: "Dashboard" }).first()).toBeVisible({
      timeout: 15_000,
    });
  });
});

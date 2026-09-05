import { expect, test } from "@playwright/test";
import { CREDS, signIn, visitAndAssert } from "./helpers";

/**
 * Phase 31 UAT — Parent workflow, exercised in RUSSIAN on purpose: the parent
 * profile is seeded with locale `ru` (supabase/seed.sql), so this doubles as
 * the Russian-language UAT coverage required by the roadmap. Assertions use
 * the Russian strings; nothing here mutates the profile locale.
 */
test("parent: children, attendance, homework, reports, notifications render (ru)", async ({ page }) => {
  await signIn(page, CREDS.parent);
  await expect(page.getByText("Мои дети").first()).toBeVisible(); // children card
  await visitAndAssert(page, "/students", "Ученики");
  await visitAndAssert(page, "/attendance", "Посещаемость");
  await visitAndAssert(page, "/homework", "Домашние задания");
  await visitAndAssert(page, "/reports", "Отчёты");
  await visitAndAssert(page, "/notifications", "Уведомления");
});

test("parent: settings is read-only (no edit form, ru)", async ({ page }) => {
  await signIn(page, CREDS.parent);
  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Настройки" }).first()).toBeVisible();
  await expect(page.getByText("Добавить или изменить настройку")).toHaveCount(0);
});

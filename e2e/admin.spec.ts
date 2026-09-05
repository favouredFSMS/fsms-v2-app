import { test } from "@playwright/test";
import { CREDS, signIn, visitAndAssert } from "./helpers";

/**
 * Phase 29 — administrator E2E: the office-side record surfaces render with
 * their titles (People, Students, Attendance, Reports).
 */
test("admin: people, students, attendance and reports render", async ({ page }) => {
  await signIn(page, CREDS.owner);
  await visitAndAssert(page, "/people", "People");
  await visitAndAssert(page, "/students", "Students");
  await visitAndAssert(page, "/attendance", "Attendance");
  await visitAndAssert(page, "/reports", "Reports");
});

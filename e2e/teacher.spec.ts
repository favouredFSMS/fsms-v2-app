import { test } from "@playwright/test";
import { CREDS, signIn, visitAndAssert } from "./helpers";

/**
 * Phase 29 — teacher E2E: the teaching-side surfaces render with their titles
 * (Classes, Attendance, Homework).
 */
test("teacher: classes, attendance and homework render", async ({ page }) => {
  await signIn(page, CREDS.teacher);
  await visitAndAssert(page, "/classes", "Classes");
  await visitAndAssert(page, "/attendance", "Attendance");
  await visitAndAssert(page, "/homework", "Homework");
});

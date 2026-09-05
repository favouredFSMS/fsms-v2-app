import { test } from "@playwright/test";
import { CREDS, signIn, visitAndAssert } from "./helpers";

/** Phase 31 UAT — Teacher: classes, students, attendance, homework. */
test("teacher: classes, students, attendance, homework render", async ({ page }) => {
  await signIn(page, CREDS.teacher);
  await visitAndAssert(page, "/classes", "Classes");
  await visitAndAssert(page, "/students", "Students");
  await visitAndAssert(page, "/attendance", "Attendance");
  await visitAndAssert(page, "/homework", "Homework");
});

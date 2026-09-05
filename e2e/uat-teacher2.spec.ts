import { test } from "@playwright/test";
import { CREDS, signIn, visitAndAssert } from "./helpers";

/** Phase 31 UAT — Teacher: lessons, assessments, reports. */
test("teacher: lessons, assessments, reports render", async ({ page }) => {
  await signIn(page, CREDS.teacher);
  await visitAndAssert(page, "/lessons", "Lessons");
  await visitAndAssert(page, "/assessments", "Assessments");
  await visitAndAssert(page, "/reports", "Reports");
});

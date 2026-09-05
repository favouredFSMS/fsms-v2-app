import { expect, test } from "@playwright/test";
import { CREDS, signIn, visitAndAssert } from "./helpers";

/**
 * Phase 31 UAT — Student workflow: homework, assessments, results (reports)
 * and progress (dashboard card, incl. lessons achieved). There is no separate
 * /learning route; the learner surfaces live on the dashboard (Phase 11).
 */
test("student: homework, assessments, reports and progress render", async ({ page }) => {
  await signIn(page, CREDS.student);
  await expect(page.getByText("My homework").first()).toBeVisible();
  await expect(page.getByText("Progress").first()).toBeVisible();
  await visitAndAssert(page, "/homework", "Homework");
  await visitAndAssert(page, "/assessments", "Assessments");
  await visitAndAssert(page, "/reports", "Reports");
});

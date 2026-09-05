import { expect, test } from "@playwright/test";
import { CREDS, signIn } from "./helpers";

/**
 * Phase 31 UAT — mobile viewport: the same sign-in → dashboard → key surface
 * workflow works at a phone width (390×844, iPhone-12-class).
 */
test.use({ viewport: { width: 390, height: 844 } });

test("mobile: owner signs in, dashboard and settings render", async ({ page }) => {
  await signIn(page, CREDS.owner);
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByRole("heading", { name: /Dashboard|Главная/i }).first()).toBeVisible();

  await page.goto("/settings");
  await expect(page.getByRole("heading", { name: "Settings" }).first()).toBeVisible();
  await expect(page.getByText("FAVOURED English School").first()).toBeVisible();
});

test("mobile: parent signs in and sees the children card", async ({ page }) => {
  await signIn(page, CREDS.parent);
  await expect(page).toHaveURL(/\/dashboard/);
  // Parent profile is seeded with locale `ru`, so the card renders in Russian.
  await expect(page.getByText("Мои дети").first()).toBeVisible();
});

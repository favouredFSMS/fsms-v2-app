import { expect, test } from "@playwright/test";
import { CREDS, signIn } from "./helpers";

/**
 * Phase 31 UAT — language coverage: the authed shell switches between all four
 * supported locales (English, Russian, French, Chinese) and the dashboard
 * heading localises accordingly. The chosen locale persists to
 * profiles.locale, so this test always restores English — even on failure —
 * or subsequent runs would start in a foreign locale.
 */
test("language switching: en → ru → fr → zh → en", async ({ page }) => {
  await signIn(page, CREDS.owner);
  const switcher = page.getByLabel("Select language");
  await expect(switcher).toBeVisible();

  const expectHeading = async (name: RegExp) => {
    await expect(page.getByRole("heading", { name }).first()).toBeVisible({ timeout: 15_000 });
  };

  try {
    await switcher.selectOption("ru");
    await expectHeading(/Главная/);
    await switcher.selectOption("fr");
    await expectHeading(/Tableau de bord/);
    await switcher.selectOption("zh");
    await expectHeading(/仪表盘/);
  } finally {
    await switcher.selectOption("en");
  }
  await expectHeading(/Dashboard/);
});

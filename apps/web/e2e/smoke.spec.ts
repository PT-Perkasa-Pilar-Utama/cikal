import { expect, test } from "@playwright/test";

test("dashboard shows the menus from the session", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation")).toContainText("Product");
  await expect(page.getByRole("navigation")).toContainText("Role Access");
});

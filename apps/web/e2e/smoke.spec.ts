import { expect, test } from "@playwright/test";
import { loginAs } from "./support/seed-users";

// Login baru mengakhiri sesi lain user yang sama, jadi smoke memakai user di luar `SESSION_USERS`.
test("logs in as an Auditor and shows the menus from the session", async ({ page }) => {
  await loginAs(page, "auditor.01");

  await expect(page.getByRole("banner")).toContainText("Maya Auditor");
  await expect(page.getByRole("navigation", { name: "Main menu" })).toContainText("Product");
  await expect(page.getByRole("navigation", { name: "Main menu" })).toContainText("Role Access");
});

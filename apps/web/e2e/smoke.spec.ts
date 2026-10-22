import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test } from "@playwright/test";

/** Password akun seed satu per lingkungan, dari file secret yang dibuat `pnpm dev:secrets` (DEPLOYMENT_PLAN §6.5). */
const SEED_PASSWORD_FILE =
  process.env.E2E_SEED_PASSWORD_FILE ??
  fileURLToPath(new URL("../../../deploy/compose/.secrets/seed_user_password", import.meta.url));

test("logs in as a Maker and shows the menus from the session", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel(/^Username/).fill("maker.01");
  await page.getByLabel(/^Password/).fill(readFileSync(SEED_PASSWORD_FILE, "utf8").trim());
  await page.getByRole("button", { name: "Login" }).click();

  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
  await expect(page.getByRole("banner")).toContainText("Andi Pratama");
  await expect(page.getByRole("navigation", { name: "Main menu" })).toContainText("Product");
  await expect(page.getByRole("navigation", { name: "Main menu" })).toContainText("Role Access");
});

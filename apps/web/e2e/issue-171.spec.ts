import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import { CHANGED_DEV_LICENSE } from "./support/license";

/*
 * Issue #171: halaman "License" Super User (api-specs 04 §4.1, §4.2) terhadap lisensi dev seed `qa`. Kunci privat dev
 * tidak disimpan, jadi pemasangan lisensi sah dibuktikan di test unit dan integrasi; spec ini memasang file yang diubah.
 */

async function openLicense(page: Page) {
  await page.goto("/");
  const mainMenu = page.getByRole("navigation", { name: "Main menu" });
  await mainMenu.getByRole("link", { name: "License", exact: true }).click();
  await expect(page.getByRole("heading", { name: "License", exact: true })).toBeVisible();
  return page.getByRole("region", { name: "License details" });
}

test("AC-100.01 the License page shows the licensed modules and the validity", async ({ pageAs }) => {
  const superUser = await pageAs("superuser");

  const details = await openLicense(superUser);

  await expect(details).toContainText("PPU-LIC-DEV-0001");
  await expect(details).toContainText("31-12-2027");
  const modules = superUser.getByRole("table", { name: "Licensed modules" });
  await expect(modules.getByRole("row")).toHaveCount(10);
  await expect(modules.getByRole("row", { name: "M14 E-Polis" })).toBeVisible();
});

test("AC-100.02 a licence file changed after issuing shows License file is invalid and the previous licence stays", async ({
  pageAs,
}) => {
  const superUser = await pageAs("superuser");
  const details = await openLicense(superUser);
  await expect(details).toContainText("PPU-LIC-DEV-0001");

  await superUser.getByLabel("License file").setInputFiles({
    name: "license.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(CHANGED_DEV_LICENSE)),
  });

  await expect(superUser.getByRole("alert")).toHaveText("License file is invalid");
  await superUser.reload();
  await expect(details).toContainText("PPU-LIC-DEV-0001");
  await expect(details).toContainText("Active");
});

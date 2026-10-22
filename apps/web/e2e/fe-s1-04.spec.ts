import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import { confirmApprove, openPendingDetail, pendingRow } from "./support/pending";

/*
 * FE-S1-04: layar Role Access memakai API asli (api-specs 03 §3.1 s.d. §3.5). Exit kartu: hak baru berlaku setelah
 * disetujui. Seed tidak memberi Sales akses Product (MRTM TRM_ACC_001), jadi Sales menjadi role yang diberi akses.
 */

const mainMenu = (page: Page) => page.getByRole("navigation", { name: "Main menu" });

async function chooseTarget(page: Page, role: string) {
  await page.goto("/access/role-access");
  await page.getByRole("link", { name: "New Role Access" }).click();
  await page.getByLabel(/^Role\*?$/).selectOption({ label: role });
  await page.getByLabel(/^Menu\*?$/).selectOption({ label: "Master Data" });
  await page.getByLabel(/^Sub Menu\*?$/).selectOption({ label: "Product" });
}

test("AC-09.01 access granted by a Maker applies to the role after a Checker approves it", async ({ pageAs }) => {
  const sales = await pageAs("sales.jkt01");
  await sales.goto("/");
  await expect(mainMenu(sales)).not.toContainText("Product");

  const maker = await pageAs("maker.01");
  await chooseTarget(maker, "Sales");
  await maker.getByRole("switch", { name: "View" }).click();
  await maker.getByRole("button", { name: "Submit" }).click();
  await expect(maker.getByText("Data submitted for approval")).toBeVisible();
  await maker.getByRole("link", { name: "Pending Role Access" }).click();
  await expect(pendingRow(maker, "Sales - Product")).toContainText("Waiting Approval");

  const checker = await pageAs("checker.001");
  await openPendingDetail(checker, "/access/role-access/pending", "Sales - Product");
  await confirmApprove(checker);
  await expect(checker.getByText("Data approved")).toBeVisible();

  await sales.reload();
  await mainMenu(sales).getByRole("link", { name: "Product" }).click();
  await expect(sales.getByRole("heading", { name: "Product", exact: true })).toBeVisible();
});

test("AC-09.03 Approve without View is refused with the View message", async ({ pageAs }) => {
  const maker = await pageAs("maker.01");
  await chooseTarget(maker, "Surveyor");

  await maker.getByRole("switch", { name: "Approve" }).click();
  await maker.getByRole("button", { name: "Submit" }).click();

  await expect(maker.getByRole("alert")).toHaveText("View access is required when other access is granted");
});

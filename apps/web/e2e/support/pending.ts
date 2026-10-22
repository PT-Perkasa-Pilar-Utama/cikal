import { expect, type Locator, type Page } from "@playwright/test";

/** Baris layar "Pending <Data>" menurut nama tampilannya. */
export const pendingRow = (page: Page, displayName: string): Locator =>
  page.getByRole("row", { name: new RegExp(displayName) });

/** Membuka popup "Detail" satu baris di layar Pending dan menunggu isinya termuat (api-specs 07 §7.3). */
export async function openPendingDetail(page: Page, pendingPath: string, displayName: string): Promise<Locator> {
  await page.goto(pendingPath);
  await page.getByRole("button", { name: `Detail ${displayName}` }).click();
  const detail = page.getByRole("dialog", { name: "Detail" });
  await expect(detail.getByText("Submitted By")).toBeVisible();
  return detail;
}

/** Approve di popup "Detail" lalu "Yes" di konfirmasi (AC-12.01). */
export async function confirmApprove(page: Page): Promise<void> {
  await page.getByRole("dialog", { name: "Detail" }).getByRole("button", { name: "Approve" }).click();
  const confirmation = page.getByRole("dialog", { name: "Confirmation" });
  await expect(confirmation).toContainText("Are you sure you want to approve?");
  await confirmation.getByRole("button", { name: "Yes" }).click();
}

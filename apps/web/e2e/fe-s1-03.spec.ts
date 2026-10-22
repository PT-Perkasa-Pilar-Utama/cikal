import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import { approve, submitProduct } from "./support/master-data";

/*
 * FE-S1-03: form produk dan layar Pending memakai API asli, dan pengajuan ditinjau user lain (api-specs 07, 08).
 * Seed `qa` memberi Admin Sistem Create dan Approve pada Product (MRTM TRM_ACC_004): ia pengguna AC-12.04 dan
 * Checker kedua AC-12.05.
 */

const pendingRow = (page: Page, productName: string) => page.getByRole("row", { name: new RegExp(productName) });

async function openPendingDetail(page: Page, productName: string) {
  await page.goto("/master/products/pending");
  await page.getByRole("button", { name: `Detail ${productName}` }).click();
  const detail = page.getByRole("dialog", { name: "Detail" });
  await expect(detail).toContainText(productName);
  return detail;
}

async function confirmApprove(page: Page) {
  await page.getByRole("dialog", { name: "Detail" }).getByRole("button", { name: "Approve" }).click();
  const confirmation = page.getByRole("dialog", { name: "Confirmation" });
  await expect(confirmation).toContainText("Are you sure you want to approve?");
  await confirmation.getByRole("button", { name: "Yes" }).click();
}

test("AC-20.01 a Maker submits a new product from the form and it waits for approval", async ({ pageAs }) => {
  const page = await pageAs("maker.01");
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Product" }).click();
  await page.getByRole("link", { name: "New Product" }).click();

  await page.getByLabel(/^Product Code/).fill("KTA");
  await page.getByLabel(/^Product Name/).fill("Kredit Tanpa Agunan");
  await page.getByLabel(/^Product Category/).selectOption({ label: "Non Collateral Loan" });
  await page.getByLabel(/^Interest Type/).selectOption({ label: "Effective" });
  await page.getByLabel(/^Minimal Plafond/).fill("5.000.000");
  await page.getByLabel(/^Maximal Plafond/).fill("300.000.000");
  await page.getByLabel(/^Minimum Tenor/).fill("6");
  await page.getByLabel(/^Maximum Tenor/).fill("60");
  await page.getByLabel(/^Minimum Age/).fill("21");
  await page.getByLabel(/^Maximum Age/).fill("55");
  await page.getByLabel(/^DBR Max/).fill("40");
  await page.getByLabel(/^Limit Auto Approval/).fill("10.000.000");
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByRole("heading", { name: "Product", exact: true })).toBeVisible();
  await expect(page.getByText("Data submitted for approval")).toBeVisible();
  await page.getByRole("link", { name: "Pending Product" }).click();
  await expect(pendingRow(page, "Kredit Tanpa Agunan")).toContainText("Waiting Approval");
  await expect(pendingRow(page, "Kredit Tanpa Agunan")).toContainText("maker.01");
});

test("AC-12.01 a Checker approves a new product and it moves from Pending Product to Product", async ({ pageAs }) => {
  await submitProduct("maker.01", "KPR", "KPR Subsidi");
  const page = await pageAs("checker.001");

  await openPendingDetail(page, "KPR Subsidi");
  await confirmApprove(page);

  await expect(page.getByText("Data approved")).toBeVisible();
  await expect(pendingRow(page, "KPR Subsidi")).toHaveCount(0);
  await page.goto("/master/products");
  await expect(page.getByRole("row", { name: /KPR Subsidi/ })).toBeVisible();
});

test("AC-12.04 a user with Create and Approve cannot review their own submission", async ({ pageAs }) => {
  await submitProduct("admin.sistem", "KMK", "Kredit Modal Kerja");
  const page = await pageAs("admin.sistem");

  const detail = await openPendingDetail(page, "Kredit Modal Kerja");

  await expect(detail).toContainText("You cannot review your own submission");
  for (const name of ["Approve", "Reject", "Revise"]) {
    await expect(detail.getByRole("button", { name })).toHaveCount(0);
  }
});

test("AC-12.05 a second Checker gets the processed message and the product is applied once", async ({ pageAs }) => {
  const changeRequestId = await submitProduct("maker.01", "KMG", "Kredit Multiguna");
  const page = await pageAs("checker.001");
  await openPendingDetail(page, "Kredit Multiguna");

  await approve("admin.sistem", changeRequestId);
  await confirmApprove(page);

  await expect(page.getByText("This submission has already been processed")).toBeInViewport();
  await page.goto("/master/products");
  await expect(page.getByRole("row", { name: /Kredit Multiguna/ })).toHaveCount(1);
});

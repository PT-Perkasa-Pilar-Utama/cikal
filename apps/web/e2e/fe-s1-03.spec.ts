import { expect, test } from "./support/fixtures";
import { approve, submitProduct } from "./support/master-data";
import { confirmApprove, openPendingDetail, pendingRow } from "./support/pending";

/*
 * FE-S1-03: form produk dan layar Pending memakai API asli, dan pengajuan ditinjau user lain (api-specs 07, 08).
 * Seed `qa` memberi Admin Sistem Create dan Approve pada Product (MRTM TRM_ACC_004): ia pengguna AC-12.04 dan
 * Checker kedua AC-12.05.
 */

const PENDING_PRODUCT = "/master/products/pending";

test("AC-20.01 a Maker submits a new product from the form and it waits for approval", async ({ pageAs }) => {
  const page = await pageAs("maker.01");
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Product", exact: true }).click();
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

  await openPendingDetail(page, PENDING_PRODUCT, "KPR Subsidi");
  await confirmApprove(page);

  await expect(page.getByText("Data approved")).toBeVisible();
  await expect(pendingRow(page, "KPR Subsidi")).toHaveCount(0);
  await page.goto("/master/products");
  await expect(page.getByRole("row", { name: /KPR Subsidi/ })).toBeVisible();
});

test("AC-12.04 a user with Create and Approve cannot review their own submission", async ({ pageAs }) => {
  await submitProduct("admin.sistem", "KMK", "Kredit Modal Kerja");
  const page = await pageAs("admin.sistem");

  const detail = await openPendingDetail(page, PENDING_PRODUCT, "Kredit Modal Kerja");

  await expect(detail).toContainText("You cannot review your own submission");
  for (const name of ["Approve", "Reject", "Revise"]) {
    await expect(detail.getByRole("button", { name })).toHaveCount(0);
  }
});

test("AC-12.05 a second Checker gets the processed message and the product is applied once", async ({ pageAs }) => {
  const changeRequestId = await submitProduct("maker.01", "KMG", "Kredit Multiguna");
  const page = await pageAs("checker.001");
  await openPendingDetail(page, PENDING_PRODUCT, "Kredit Multiguna");

  await approve("admin.sistem", changeRequestId);
  await confirmApprove(page);

  await expect(page.getByText("This submission has already been processed")).toBeInViewport();
  await page.goto("/master/products");
  await expect(page.getByRole("row", { name: /Kredit Multiguna/ })).toHaveCount(1);
});

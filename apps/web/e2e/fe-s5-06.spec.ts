import type { Page } from "@playwright/test";
import { expect, test } from "./support/fixtures";
import { confirmApprove, openPendingDetail, pendingRow } from "./support/pending";

/*
 * FE-S5-06: approver satu level diajukan dari layar "New Hierarchy", tampil di "Pending Approval Setup", lalu setelah
 * disetujui tampil di "Approval Hierarchy" (api-specs 16 §16.1, §16.2). Seed `qa` punya Approval Level 2 KTA QA
 * Bandung dengan sub level 1 untuk kepala.cabang, jadi spec ini menambah sub level 2.
 */

const PENDING_SETUP = "/master/approvals/pending";
const DISPLAY_NAME = "011 KTAQA Level 2.2 - approver.01";

test.describe.configure({ mode: "serial" });

async function openApprovalHierarchy(page: Page) {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Approval" }).click();
  await expect(page.getByRole("heading", { name: "Approval Hierarchy" })).toBeVisible();
}

test("AC-27.01 submits a New Hierarchy and shows it in Pending Approval Setup", async ({ pageAs }) => {
  const page = await pageAs("maker.01");
  await openApprovalHierarchy(page);

  await page.getByRole("link", { name: "New Hierarchy" }).click();
  await expect(page.getByRole("heading", { name: "New Hierarchy" })).toBeVisible();
  await page.getByLabel(/^Branch/).selectOption({ label: "011 - Bandung" });
  await page.getByLabel(/^Product/).selectOption({ label: "KTAQA" });
  await page.getByLabel(/^Job Level/).fill("2");
  await page.getByLabel(/^Sub Level/).fill("2");
  const approver = page.getByLabel(/^Approver/);
  await expect(approver.getByRole("option", { name: "sales.jkt01" })).toHaveCount(0);
  await approver.selectOption({ label: "approver.01" });
  await page.getByRole("button", { name: "Submit" }).click();

  await expect(page.getByText("Data submitted for approval")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Approval Hierarchy" })).toBeVisible();
  await page.getByRole("link", { name: "Pending Approval Setup" }).click();
  await expect(pendingRow(page, DISPLAY_NAME)).toBeVisible();
});

test("AC-27.01 lists the hierarchy in Approval Hierarchy after the Checker approves it", async ({ pageAs }) => {
  const checker = await pageAs("checker.001");
  await openPendingDetail(checker, PENDING_SETUP, DISPLAY_NAME);
  await confirmApprove(checker);
  await expect(pendingRow(checker, DISPLAY_NAME)).toHaveCount(0);

  const maker = await pageAs("maker.01");
  await openApprovalHierarchy(maker);
  const row = maker.getByRole("row").filter({ hasText: "approver.01" }).filter({ hasText: "Kepala Cabang" });
  await expect(row).toBeVisible();
  await expect(row).not.toContainText("Inactive approver");
});

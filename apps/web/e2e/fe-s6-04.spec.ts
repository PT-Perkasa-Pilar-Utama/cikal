import { readFile } from "node:fs/promises";
import type { StepCode } from "@cikal/contracts";
import type { Page } from "@playwright/test";
import { type Applicant, processTimeline, submittedApplication } from "./support/application";
import { expect, test } from "./support/fixtures";

/*
 * FE-S6-04: pengajuan KTA QA yang disetujui otomatis melewati Validity Check, Print Akad, dan Record Disbursement
 * sampai Disbursed (api-specs 25, demo K-02). Plafon 5.000.000 di bawah Limit Auto Approval 10.000.000, jadi System
 * menyetujuinya. Langkah proses dijalankan worker pg-boss, jadi spec ini butuh `pnpm --filter @cikal/api start:worker`
 * menyala selain `pnpm dev`.
 */

const WORKER_TIMEOUT_MS = 60_000;
test.describe.configure({ timeout: 4 * WORKER_TIMEOUT_MS });

const WORKER_HINT = "Is the pg-boss worker running (pnpm --filter @cikal/api start:worker)?";
/** Produk KTA QA seed `qa` dengan template AKAD-KTAQA (TL-S6-02). */
const KTA_QA = "0192b6ca-0001-7000-8000-000000000001";
const KTA_QA_DOCUMENTS = ["KTP", "KK", "NPWP", "SLIP_GAJI", "REKENING_KORAN", "SURAT_KETERANGAN_KERJA", "PBB"];
const APPLICANT: Applicant = { fullName: "Sinta Pencairan", idCardNumber: "3273011402900091" };
const DAY_MS = 24 * 60 * 60 * 1000;

const businessDateIn = (days: number): string =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date(Date.now() + days * DAY_MS));

async function stepStatus(applicationId: string, stepCode: StepCode) {
  return (await processTimeline(applicationId)).data.steps.find((step) => step.stepCode === stepCode)?.status;
}

async function untilWaiting(applicationId: string, stepCode: StepCode) {
  await expect
    .poll(() => stepStatus(applicationId, stepCode), { message: WORKER_HINT, timeout: WORKER_TIMEOUT_MS })
    .toBe("WAITING_HUMAN");
}

/** Menu Operations, lalu "Assign to Me" dan tombol Proceed baris pengajuan. */
async function takeTask(page: Page, menu: string, loanId: string, proceed: string) {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: menu, exact: true }).click();
  await expect(page.getByRole("heading", { name: menu, exact: true })).toBeVisible();
  const task = page.getByRole("row").filter({ hasText: loanId });
  await task.getByRole("button", { name: "Assign to Me" }).click();
  await task.getByRole("button", { name: proceed }).click();
}

async function confirmYes(page: Page) {
  await page.getByRole("dialog", { name: "Confirmation" }).getByRole("button", { name: "Yes" }).click();
}

test("AC-76.01 AC-77.01 AC-101.01 AC-102.08 an approved application goes through to Disbursed", async ({ pageAs }) => {
  const application = await submittedApplication(KTA_QA, {
    documents: KTA_QA_DOCUMENTS,
    applicant: APPLICANT,
    requestedLimit: "5000000.00",
  });
  await untilWaiting(application.id, "VALIDITY_CHECK");
  const ops = await pageAs("admin.ops");

  await takeTask(ops, "Validity Check", application.loanId, "Validity Check");
  await expect(ops.getByRole("heading", { name: "Validity Check Form" })).toBeVisible();
  await ops.getByLabel(/^Disbursement Date/).fill(businessDateIn(0));
  await ops.getByRole("button", { name: "Valid", exact: true }).click();
  await expect(ops.getByText("Disbursement date must be at least 1 day after today")).toBeVisible();
  await ops.getByLabel(/^Disbursement Date/).fill(businessDateIn(1));
  await ops.getByRole("button", { name: "Valid", exact: true }).click();
  await confirmYes(ops);
  await expect(ops.getByText("Disbursement data validated")).toBeVisible();
  await untilWaiting(application.id, "PRINT_AKAD");

  await takeTask(ops, "Print Akad", application.loanId, "View Detail");
  await ops.getByRole("button", { name: "Print Akad" }).click();
  const form = ops.getByRole("dialog", { name: "Print Akad Form" });
  await form.getByRole("button", { name: "Print" }).click();
  await expect(form.getByText("This field is required")).toHaveCount(4);
  await form.getByRole("combobox", { name: "Payment Method" }).selectOption({ index: 1 });
  await form.getByLabel(/^Bank Account No/).fill("1234567890");
  await form.getByLabel(/^Customer Account No/).fill("9876543210");
  await form.getByRole("combobox", { name: "Risk Manager" }).selectOption({ label: "Indah Risk Manager" });
  const download = ops.waitForEvent("download");
  await form.getByRole("button", { name: "Print" }).click();
  const pdf = await readFile(await (await download).path());
  expect(pdf.subarray(0, 4).toString()).toBe("%PDF");
  await untilWaiting(application.id, "DISBURSEMENT");

  await takeTask(ops, "Record Disbursement", application.loanId, "Record Disbursement");
  const detail = ops.getByRole("region", { name: "Disbursement Detail" });
  await expect(detail).toContainText(new RegExp(`/PK/${businessDateIn(0).slice(0, 4)}/\\d{6}`));
  const record = ops.getByRole("form", { name: "Record Disbursement" });
  await record.getByRole("combobox", { name: "Result" }).selectOption({ label: "Disbursed" });
  await record.getByLabel(/^Disbursement Date/).fill(businessDateIn(1));
  await record.getByLabel(/^Core Loan Number/).fill("LN-0012345");
  await record.getByRole("button", { name: "Submit" }).click();
  await confirmYes(ops);
  await expect(ops.getByText("Disbursement recorded")).toBeVisible();

  const sales = await pageAs("sales.jkt01");
  await sales.goto("/applications");
  await sales.getByLabel("Search").fill(application.loanId);
  await expect(sales.getByRole("row").filter({ hasText: application.loanId })).toContainText("Disbursed");
});

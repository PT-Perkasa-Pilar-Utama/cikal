import type { Page } from "@playwright/test";
import {
  BELUM_KAWIN,
  clearMail,
  KARYAWAN_SWASTA,
  KAWIN,
  mailRecipients,
  processTimeline,
  SEVEN_DOCUMENTS,
  salesDraft,
} from "./support/application";
import { expect, test } from "./support/fixtures";
import { approve, availableProduct, submitChecklist } from "./support/master-data";

/*
 * FE-S3-03: form pengajuan tersambung ke API asli dari draft sampai submit (api-specs 12). Langkah otomatis setelah
 * submit (Dedup) dan email konfirmasi dijalankan worker pg-boss, jadi spec ini butuh `pnpm --filter @cikal/api
 * start:worker` menyala selain `pnpm dev`.
 */

// Produk dan checklist dibuat sekali per run; test berikutnya memakai pengajuan dari test sebelumnya.
test.describe.configure({ mode: "serial" });

/** Langkah otomatis dan email menunggu worker; batas ini cukup untuk satu putaran job `advance` dan outbox. */
const WORKER_TIMEOUT_MS = 30_000;
const WORKER_HINT = "Is the pg-boss worker running (pnpm --filter @cikal/api start:worker)?";

let ktaId = "";
let kprId = "";
let submitted = { id: "", loanId: "" };

/** Checklist dokumen lewat layar TL-S3-04 versi API: diajukan Maker, disetujui Checker. */
async function activeChecklist(productId: string, marital: string, optional: string[] = []) {
  const items = [
    ...SEVEN_DOCUMENTS.map((documentType) => ({ documentType, isMandatory: true })),
    ...optional.map((documentType) => ({ documentType, isMandatory: false })),
  ];
  await approve(
    "checker.001",
    await submitChecklist("maker.01", { productId, occupation: KARYAWAN_SWASTA, marital, items }),
  );
}

test.beforeAll(async () => {
  // Kode "KTA" dan "KPR" sudah dipakai spec FE-S1-03 di run yang sama.
  ktaId = await availableProduct("KTAW", "KTA");
  await activeChecklist(ktaId, BELUM_KAWIN, ["BPJS"]);
  kprId = await availableProduct("KPRW", "KPR");
  await activeChecklist(kprId, KAWIN);
});

/** Subjek template `APP_RECEIVED` (AC-50.05). */
const confirmationSubject = (loanId: string) => `Pengajuan kredit ${loanId} telah kami terima`;

/** Dua langkah pertama yang sudah dimulai; langkah di luar rute tercatat SKIPPED dan dilewati (RT-08). */
async function startedSteps(applicationId: string): Promise<string[]> {
  const { steps } = (await processTimeline(applicationId)).data;
  return steps
    .filter((step) => step.status !== "SKIPPED" && step.status !== "PENDING")
    .map((step) => step.stepCode)
    .slice(0, 2);
}

/** Buka draft dari Loan ID di "Application List" (AC-49.05). */
async function openDraft(page: Page, loanId: string) {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Data Entry" }).click();
  await expect(page.getByRole("heading", { name: "Application List" })).toBeVisible();
  await page.getByRole("link", { name: loanId }).click();
}

test("AC-49.01 Save as Draft forms the Loan ID and the draft appears in Application List as Draft", async ({
  pageAs,
}) => {
  const page = await pageAs("sales.jkt01");
  await page.goto("/applications/drafts");
  await page.getByRole("link", { name: "New Application" }).click();
  await page.getByLabel(/^Application Type/).selectOption({ label: "NTB" });
  await page.getByLabel(/^Product Category/).selectOption({ label: "Non Collateral Loan" });
  await page.locator("select[name=productId]").selectOption({ label: "KTAW" });
  await expect(page.getByLabel("Interest Rate")).toHaveValue("14% p.a.");
  await page.getByLabel(/^ID Card Number/).fill("3273011402900001");
  await page.getByLabel(/^Full Name\*?$/).fill("Rudi Hartono");
  await page.getByLabel(/^Full Name ID/).fill("RUDI HARTONO");

  await page.getByRole("button", { name: "Save as Draft" }).click();

  const message = page.getByText(/^Application saved as draft\. Loan ID: \d{8}KTAW\d{7}$/);
  await expect(message).toBeVisible();
  const loanId = (await message.textContent())?.split("Loan ID: ")[1] ?? "";
  await page.getByRole("button", { name: "Back" }).click();
  await page.getByRole("dialog", { name: "Back" }).getByRole("button", { name: "OK" }).click();
  const row = page.getByRole("row", { name: new RegExp(loanId) });
  await expect(row).toContainText("Draft");
  await expect(row).toContainText("Application");
});

test("AC-49.05 a draft saved at Occupation opens at Occupation with its data filled", async ({ pageAs }) => {
  const draft = await salesDraft(ktaId, { next: ["personal"], draft: "occupation" });
  const page = await pageAs("sales.jkt01");

  await openDraft(page, draft.loanId);

  await expect(page.getByRole("form", { name: "Occupation" })).toBeVisible();
  await expect(page.getByLabel(/^Company Name/)).toHaveValue("PT Maju Jaya");
  await expect(page.getByLabel(/^Monthly Income Allowance/)).toHaveValue("8.000.000");
  await expect(page.getByText(`Loan ID: ${draft.loanId}`)).toBeVisible();
});

test("AC-25.04 the Document step shows the 7 slots of the approved KPR / Karyawan Swasta / Kawin checklist", async ({
  pageAs,
}) => {
  const draft = await salesDraft(kprId, { marital: KAWIN, next: ["personal", "occupation"] });
  const page = await pageAs("sales.jkt01");

  await openDraft(page, draft.loanId);

  await expect(page.getByRole("form", { name: "Document" })).toBeVisible();
  await expect(page.getByText("0 of 7 documents")).toBeVisible();
  const slots = page.getByRole("form", { name: "Document" }).getByRole("listitem");
  await expect(slots).toHaveCount(7);
  for (const label of ["KTP", "KK", "NPWP", "Slip Gaji", "Rekening Koran 3 Bulan", "Sertifikat", "KTP Pasangan"]) {
    await expect(slots.filter({ hasText: new RegExp(`^${label}`) }).first()).toBeVisible();
  }
});

test("AC-50.01 Submit and Yes start the process at Dedup and the application is no longer editable", async ({
  pageAs,
}) => {
  submitted = await salesDraft(ktaId, {
    next: ["personal", "occupation", "emergency-contact"],
    documents: SEVEN_DOCUMENTS,
  });
  await clearMail(confirmationSubject(submitted.loanId));
  const page = await pageAs("sales.jkt01");
  await openDraft(page, submitted.loanId);
  await expect(page.getByRole("form", { name: "Emergency Contact" })).toBeVisible();

  await page.getByRole("button", { name: "Submit" }).click();
  const confirmation = page.getByRole("dialog", { name: "Submit" });
  await expect(confirmation).toContainText("Submit this application?");
  await confirmation.getByRole("button", { name: "Yes" }).click();

  await expect(page.getByText(`Application submitted. Loan ID: ${submitted.loanId}`)).toBeVisible();
  await expect(page.getByRole("link", { name: submitted.loanId })).toHaveCount(0);
  await expect
    .poll(async () => startedSteps(submitted.id), { message: WORKER_HINT, timeout: WORKER_TIMEOUT_MS })
    .toEqual(["DATA_ENTRY", "DEDUP"]);
  await page.goto(`/applications/${submitted.id}`);
  await expect(page.getByText("This action is not allowed in the current status")).toBeVisible();
  await expect(page.getByRole("form")).toHaveCount(0);
});

test("AC-50.05 the applicant receives the confirmation email in Mailpit", async () => {
  await expect
    .poll(() => mailRecipients(confirmationSubject(submitted.loanId)), {
      message: WORKER_HINT,
      timeout: WORKER_TIMEOUT_MS,
    })
    .toEqual(["rudi@contoh.com"]);
});

test("AC-50.07 a fast double click on Submit and Yes runs one process with one Data Entry step", async ({ pageAs }) => {
  const draft = await salesDraft(ktaId, {
    next: ["personal", "occupation", "emergency-contact"],
    documents: SEVEN_DOCUMENTS,
  });
  const page = await pageAs("sales.jkt01");
  await openDraft(page, draft.loanId);
  await expect(page.getByRole("form", { name: "Emergency Contact" })).toBeVisible();

  await page.getByRole("button", { name: "Submit" }).dblclick();
  await page.getByRole("dialog", { name: "Submit" }).getByRole("button", { name: "Yes" }).dblclick();

  await expect(page.getByText(`Application submitted. Loan ID: ${draft.loanId}`)).toBeVisible();
  const timeline = await processTimeline(draft.id);
  expect(timeline.data.processes).toHaveLength(1);
  expect(timeline.data.steps.filter((step) => step.stepCode === "DATA_ENTRY")).toHaveLength(1);
});

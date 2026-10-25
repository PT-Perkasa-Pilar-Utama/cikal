import { taskListResponseSchema } from "@cikal/contracts";
import type { Locator, Page } from "@playwright/test";
import { ApiSession } from "./support/api-session";
import {
  clearMail,
  mailRecipients,
  processTimeline,
  SEVEN_DOCUMENTS,
  salesDraft,
  submitDraft,
} from "./support/application";
import { expect, test } from "./support/fixtures";

/*
 * FE-S4-02: pengajuan produk KTA QA seed `qa` yang disubmit berjalan dari Dedup sampai Decision dengan adapter
 * simulasi, dan hasil tiap langkah tampil di tab Workflow (api-specs 13 §13.2, 24 §24.4). Langkah otomatis dan email
 * dijalankan worker pg-boss, jadi spec ini butuh `pnpm --filter @cikal/api start:worker` menyala selain `pnpm dev`.
 */

/** Produk KTA QA seed `qa` (`seedProductIds.ktaQa`): bunga efektif 12% p.a., DBR max 40%, rute Dedup sampai Decision. */
const KTA_QA = "0192b6ca-0001-7000-8000-000000000001";
/** Checklist KTA QA untuk Karyawan Swasta dan Belum Kawin. */
const KTA_QA_DOCUMENTS = [...SEVEN_DOCUMENTS.slice(0, 5), "SURAT_KETERANGAN_KERJA", "PBB"];
const ALL_SECTIONS = ["personal", "occupation", "emergency-contact"] as const;

/** Langkah otomatis menunggu worker; batas ini cukup untuk tujuh langkah dan outbox email. */
const WORKER_TIMEOUT_MS = 60_000;
const WORKER_HINT = "Is the pg-boss worker running (pnpm --filter @cikal/api start:worker)?";

/** Nama dan NIK berbeda dari spec lain agar Dedup tetap UnMatch dan batas velocity nama per hari tidak terlampaui. */
const GO_APPLICANT = { fullName: "Bayu Saputra", idCardNumber: "3273011402900101" };
const NOTGO_APPLICANT = { fullName: "Citra Maharani", idCardNumber: "3273011402900102", npwpNumber: "123456789012345" };
const NOTGO_EMAIL = "citra@contoh.com";

/** Hasil langkah DECISION yang sudah selesai, atau status langkah selama belum. */
async function decisionOf(applicationId: string): Promise<string | undefined> {
  const decision = (await processTimeline(applicationId)).data.steps.find((step) => step.stepCode === "DECISION");
  return decision?.status === "COMPLETED" ? (decision.outcomeCode ?? undefined) : decision?.status;
}

/** Draft KTA QA lengkap dengan semua section dan dokumen, siap disubmit. */
const ktaQaDraft = (options: Parameters<typeof salesDraft>[1]) =>
  salesDraft(KTA_QA, { next: [...ALL_SECTIONS], documents: KTA_QA_DOCUMENTS, ...options });

const stepRow = (page: Page, step: string): Locator =>
  page
    .getByRole("table", { name: "Timeline" })
    .getByRole("row")
    .filter({ has: page.getByRole("cell", { name: step, exact: true }) });

/** Nilai `<dd>` sesudah label `<dt>` di popup hasil langkah. */
const field = (dialog: Locator, label: string): Locator => dialog.locator("dt", { hasText: label }).locator("+ dd");

/** Kolom "Result" tiap langkah sama persis, agar "Go" tidak lolos untuk "NotGo". */
async function expectResults(page: Page, results: readonly [step: string, result: string][]) {
  for (const [step, result] of results) await expect(stepRow(page, step).getByRole("cell").last()).toHaveText(result);
}

const confirmationSubject = (loanId: string) => `Pengajuan kredit ${loanId} telah kami terima`;
/** Subjek template `APP_REJECTED`; NotGo tidak mengirimnya (AC-69.02). */
const rejectionSubject = (loanId: string) => `Pengajuan kredit ${loanId} belum dapat kami setujui`;

test("AC-69.01 AC-85.01 a submitted KTA runs Dedup to Decision and Workflow shows Go with Approval next", async ({
  pageAs,
}) => {
  const draft = await ktaQaDraft({ applicant: GO_APPLICANT, email: "bayu@contoh.com" });
  await submitDraft(draft.id);
  await expect.poll(() => decisionOf(draft.id), { message: WORKER_HINT, timeout: WORKER_TIMEOUT_MS }).toBe("GO");
  const page = await pageAs("sales.jkt01");

  await page.goto(`/applications/${draft.id}`);
  await page.getByRole("link", { name: "Workflow" }).click();

  await expect(page.getByRole("heading", { name: "Application Workflow" })).toBeVisible();
  await expect(page.getByText(`Loan ID: ${draft.loanId}`)).toBeVisible();
  await expect(stepRow(page, "Data Entry")).toContainText("sales.jkt01");
  await expect(stepRow(page, "Verification")).toContainText("Skipped - not in route");
  await expectResults(page, [
    ["Dedup", "UnMatch"],
    ["Dukcapil", "Passed"],
    ["Fraud", "Clean"],
    ["RAC", "Pass"],
    ["Scoring", "Pass"],
    ["SLIK", "Collect 1"],
    ["Decision", "Go"],
  ]);
  await stepRow(page, "Decision").getByRole("button", { name: "Decision" }).click();
  const decision = page.getByRole("dialog", { name: "Decision" });
  await expect(field(decision, "Decision")).toHaveText("Go");
  await expect(field(decision, "Matrix Row")).toHaveText("Priority 4");
  await expect(field(decision, "Next Step")).toHaveText("Approval");
});

test("AC-69.02 RAC Fail decides NotGo, the application waits in Recontest, and no email is sent", async ({
  pageAs,
}) => {
  // Contoh AC-67.02: plafon 200.000.000, 36 bulan, 12% efektif, penghasilan 2.000.000 = rasio 332% di atas DBR 40%.
  const draft = await ktaQaDraft({
    applicant: NOTGO_APPLICANT,
    email: NOTGO_EMAIL,
    requestedLimit: "200000000.00",
    monthlyIncome: "2000000.00",
  });
  // Reset database mengulang counter Loan ID, tetapi Mailpit tetap menyimpan email run sebelumnya.
  await clearMail(confirmationSubject(draft.loanId));
  await clearMail(rejectionSubject(draft.loanId));
  await submitDraft(draft.id);
  await expect.poll(() => decisionOf(draft.id), { message: WORKER_HINT, timeout: WORKER_TIMEOUT_MS }).toBe("NOTGO");
  const page = await pageAs("risk.manager");

  await page.goto(`/applications/${draft.id}/workflow`);

  await expectResults(page, [
    ["RAC", "Fail"],
    ["Decision", "NotGo"],
  ]);
  await stepRow(page, "RAC").getByRole("button", { name: "RAC" }).click();
  const rac = page.getByRole("dialog", { name: "RAC" });
  await expect(rac.getByRole("listitem")).toHaveText("Installment to Income Ratio 332% exceeds DBR max 40%");
  await rac.getByRole("button", { name: "Close" }).click();
  await stepRow(page, "Decision").getByRole("button", { name: "Decision" }).click();
  const decision = page.getByRole("dialog", { name: "Decision" });
  await expect(field(decision, "Decision")).toHaveText("NotGo");
  await expect(field(decision, "Next Step")).toHaveText("-");

  const recontest = await ApiSession.as("risk.manager", (riskManager) =>
    riskManager.get(taskListResponseSchema, "/api/v1/tasks?queueCode=RECONTEST"),
  );
  expect(recontest.data.map((task) => task.loanId)).toContain(draft.loanId);
  // Email konfirmasi submit membuktikan outbox sudah diproses; email penolakan tidak boleh ikut terkirim.
  await expect
    .poll(() => mailRecipients(confirmationSubject(draft.loanId)), { message: WORKER_HINT, timeout: WORKER_TIMEOUT_MS })
    .toEqual([NOTGO_EMAIL]);
  expect(await mailRecipients(rejectionSubject(draft.loanId))).toEqual([]);
});

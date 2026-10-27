import type { StepCode } from "@cikal/contracts";
import type { Page } from "@playwright/test";
import {
  type Applicant,
  clearMail,
  mailRecipients,
  processTimeline,
  submittedApplication,
} from "./support/application";
import { expect, test } from "./support/fixtures";

/*
 * TL-S5-03: pengajuan KTA QA berkeputusan Go masuk antrean approver menurut plafonnya, lalu disetujui, ditolak, atau
 * dikembalikan lewat "Approval Detail" (api-specs 16 §16.5, §16.6); plafon sampai Limit Auto Approval 10.000.000
 * disetujui System. Seed `qa` menugaskan plafon sampai 500.000.000 ke kepala.cabang (level 2 Bandung). Langkah proses
 * dijalankan worker pg-boss, jadi spec ini butuh `pnpm --filter @cikal/api start:worker` menyala selain `pnpm dev`.
 */

const WORKER_TIMEOUT_MS = 60_000;
// Setiap test menunggu worker menjalankan Dedup sampai Approval, lebih lama dari batas default 30 detik.
test.describe.configure({ timeout: 2 * WORKER_TIMEOUT_MS });

const WORKER_HINT = "Is the pg-boss worker running (pnpm --filter @cikal/api start:worker)?";
/** Produk KTA QA seed `qa` dengan rute Dedup sampai Decision, Approval, lalu langkah wajib. */
const KTA_QA = "0192b6ca-0001-7000-8000-000000000001";
const KTA_QA_DOCUMENTS = ["KTP", "KK", "NPWP", "SLIP_GAJI", "REKENING_KORAN", "SURAT_KETERANGAN_KERJA", "PBB"];
const APPROVAL_PAGE = "/operations/approval";

/** Pemohon berbeda per pengajuan agar aturan velocity Fraud (nama sama lebih dari 3 per hari) tidak terpicu. */
const applicant = (order: number, name: string): Applicant => ({
  fullName: `Wahyu Approval ${name}`,
  idCardNumber: `32730114029000${70 + order}`,
});

async function stepOf(applicationId: string, stepCode: StepCode) {
  return (await processTimeline(applicationId)).data.steps.find((step) => step.stepCode === stepCode);
}

/** Pengajuan yang disubmit lalu ditunggu sampai langkah Approval selesai dijalankan worker. */
async function untilApproval(applicant: Applicant, options: { requestedLimit?: string; email?: string } = {}) {
  const application = await submittedApplication(KTA_QA, { documents: KTA_QA_DOCUMENTS, applicant, ...options });
  await expect
    .poll(async () => (await stepOf(application.id, "APPROVAL"))?.status, {
      message: WORKER_HINT,
      timeout: WORKER_TIMEOUT_MS,
    })
    .toMatch(/^(WAITING_HUMAN|COMPLETED)$/);
  return application;
}

/** Tombol "Detail" baris pengajuan di antrean "Approval" approver. */
async function openApprovalDetail(page: Page, loanId: string) {
  await page.goto(APPROVAL_PAGE);
  await expect(page.getByRole("heading", { name: "Approval", exact: true })).toBeVisible();
  await page.getByRole("row").filter({ hasText: loanId }).getByRole("button", { name: "Detail" }).click();
  await expect(page.getByRole("heading", { name: "Approval Detail" })).toBeVisible();
  await expect(page.getByText(loanId)).toBeVisible();
}

/** "Approval Comments", tombol keputusan, lalu "Yes" di konfirmasinya (AC-72.01, AC-73.01, AC-73.02). */
async function decide(page: Page, decision: "Approve" | "Reject" | "Return", comment: string, confirmation: string) {
  await page.getByLabel(/^Approval Comments/).fill(comment);
  await page.getByRole("button", { name: decision }).click();
  const dialog = page.getByRole("dialog", { name: "Confirmation" });
  await expect(dialog).toContainText(confirmation);
  await dialog.getByRole("button", { name: "Yes" }).click();
}

/** Struktur kredit yang disetujui dengan jadwal angsuran bersisa pokok 0 di baris terakhir. */
async function expectFinancing(region: ReturnType<Page["getByRole"]>) {
  for (const label of ["Plafond", "Tenor", "Interest Rate", "Installment"]) {
    await expect(region.getByText(label, { exact: true })).toBeVisible();
  }
  const schedule = region.getByRole("table", { name: "Installment Schedule" });
  await expect(schedule.getByRole("row").last().getByRole("cell").last()).toHaveText("0");
}

test("AC-72.01 the final approver approves from the queue and the application moves past Approval", async ({
  pageAs,
}) => {
  const application = await untilApproval(applicant(1, "Satu"));

  const approver = await pageAs("kepala.cabang");
  await openApprovalDetail(approver, application.loanId);
  await decide(approver, "Approve", "Agunan memadai", "Are you sure you want to approve this application?");

  await expect(approver.getByText("Loan application is successfully approved")).toBeVisible();
  await expectFinancing(approver.getByRole("region", { name: "Approval", exact: true }));
  await expect(approver.getByRole("button", { name: "Approve" })).toHaveCount(0);
  // E-Polis (M14) tidak berlisensi, jadi langkah berikutnya Validity Check; handler-nya dipasang di kartu BE-S6-01.
  await expect
    .poll(async () => (await stepOf(application.id, "VALIDITY_CHECK"))?.status, { timeout: WORKER_TIMEOUT_MS })
    .not.toBe("PENDING");
  expect(await stepOf(application.id, "APPROVAL")).toMatchObject({ status: "COMPLETED", outcomeCode: "APPROVED" });
  expect(await stepOf(application.id, "EPOLIS")).toMatchObject({ status: "SKIPPED", skipReason: "NOT_LICENSED" });
});

test("AC-73.01 rejecting finishes the application and emails the applicant", async ({ pageAs }) => {
  const email = "wahyu.reject@contoh.com";
  const application = await untilApproval(applicant(2, "Dua"), { email });
  const subject = `Pengajuan kredit ${application.loanId} belum dapat kami setujui`;
  await clearMail(subject);

  const approver = await pageAs("kepala.cabang");
  await openApprovalDetail(approver, application.loanId);
  await decide(
    approver,
    "Reject",
    "Penghasilan tidak terverifikasi",
    "Are you sure you want to reject this application?",
  );

  await expect(approver.getByText("Loan application has been rejected")).toBeVisible();
  const sales = await pageAs("sales.jkt01");
  await sales.goto(`/applications/loan/${application.loanId}`);
  await expect(sales.getByRole("region", { name: "Summary" })).toContainText("Finished Rejected");
  await expect.poll(() => mailRecipients(subject), { timeout: WORKER_TIMEOUT_MS }).toContain(email);
});

test("AC-73.02 returning sends the application back to Sales as Draft with the approver comment", async ({
  pageAs,
}) => {
  const comment = "Lengkapi rekening koran bulan September";
  const application = await untilApproval(applicant(3, "Tiga"));

  const approver = await pageAs("kepala.cabang");
  await openApprovalDetail(approver, application.loanId);
  await decide(approver, "Return", comment, "Are you sure you want to return this application?");

  await expect(approver.getByText("Application returned to sales")).toBeVisible();
  const sales = await pageAs("sales.jkt01");
  await sales.goto("/");
  await sales.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Data Entry" }).click();
  await expect(sales.getByRole("heading", { name: "Application List", exact: true })).toBeVisible();
  await sales.getByRole("link", { name: application.loanId }).click();
  await expect(sales.getByRole("region", { name: "Return Note" })).toContainText(comment);
});

test("AC-74.01 a limit under the auto approval limit is approved by System with the financing", async ({ pageAs }) => {
  const application = await untilApproval(applicant(4, "Empat"), { requestedLimit: "8000000.00" });

  // Role Approver dan Kepala Cabang seed hanya punya menu Approval; timeline dan detail dibuka lewat APP-INQUIRY.
  const viewer = await pageAs("sales.jkt01");
  await viewer.goto(`/applications/${application.id}/workflow`);
  const approval = viewer
    .getByRole("table", { name: "Timeline" })
    .getByRole("row")
    .filter({ has: viewer.getByText("Approval", { exact: true }) });
  await expect(approval).toContainText("Auto Approved");
  await expect(approval).toContainText("System");
  await expect(viewer.locator("[aria-current=step]").first()).toContainText("Validity Check");

  await viewer.goto(`/applications/loan/${application.loanId}`);
  await viewer.getByRole("tab", { name: "Approval" }).click();
  await expectFinancing(viewer.getByRole("tabpanel", { name: "Approval" }));
});

test("AC-74.03 a limit one rupiah above the auto approval limit waits in the approver queue", async ({ pageAs }) => {
  const application = await untilApproval(applicant(5, "Lima"), { requestedLimit: "10000001.00" });

  expect(await stepOf(application.id, "APPROVAL")).toMatchObject({ status: "WAITING_HUMAN" });
  const approver = await pageAs("kepala.cabang");
  await approver.goto(APPROVAL_PAGE);
  await expect(approver.getByRole("row").filter({ hasText: application.loanId })).toContainText("kepala.cabang");
});

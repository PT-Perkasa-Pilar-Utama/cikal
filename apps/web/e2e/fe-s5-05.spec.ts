import { applicationScoringResponseSchema, type StepCode } from "@cikal/contracts";
import type { Page } from "@playwright/test";
import { ApiSession } from "./support/api-session";
import {
  type Applicant,
  BELUM_KAWIN,
  KARYAWAN_SWASTA,
  processTimeline,
  SEVEN_DOCUMENTS,
  submittedApplication,
} from "./support/application";
import { expect, test } from "./support/fixtures";
import { approve, availableProduct, submitChecklist } from "./support/master-data";
import { confirmApprove, openPendingDetail } from "./support/pending";

/*
 * FE-S5-05: verifikasi Not Match mengembalikan pengajuan ke Sales (api-specs 15 §15.3), dan kriteria scoring yang
 * disetujui mengubah skor pengajuan berikutnya (api-specs 22 §22.4, K-05). Langkah proses dijalankan worker pg-boss,
 * jadi spec ini butuh `pnpm --filter @cikal/api start:worker` menyala selain `pnpm dev`.
 */

const WORKER_TIMEOUT_MS = 60_000;
const WORKER_HINT = "Is the pg-boss worker running (pnpm --filter @cikal/api start:worker)?";

/** Rute dengan Verification sebagai langkah pertama setelah Data Entry, ditambah langkah wajib (RT-03). */
const VERIFICATION_ROUTE: readonly StepCode[] = [
  "DATA_ENTRY",
  "VERIFICATION",
  "APPROVAL",
  "VALIDITY_CHECK",
  "PRINT_AKAD",
  "DISBURSEMENT",
];
/** Produk KTA QA seed `qa` dengan RAC dan model Scoring "KTA-2026" (Constant 200, Cut Off 430). */
const KTA_QA = "0192b6ca-0001-7000-8000-000000000001";
const KTA_QA_DOCUMENTS = ["KTP", "KK", "NPWP", "SLIP_GAJI", "REKENING_KORAN", "SURAT_KETERANGAN_KERJA", "PBB"];
const NPWP_REMARKS = "Nama di NPWP tidak sesuai KTP";

async function stepStatus(applicationId: string, stepCode: StepCode): Promise<string | undefined> {
  return (await processTimeline(applicationId)).data.steps.find((step) => step.stepCode === stepCode)?.status;
}

/** Skor total langkah SCORING dari `GET /applications/{id}/scoring` (api-specs 22 §22.6); `null` sebelum berjalan. */
async function totalScore(applicationId: string): Promise<string | null> {
  const result = await ApiSession.as("sales.jkt01", (sales) =>
    sales.get(applicationScoringResponseSchema, `/api/v1/applications/${applicationId}/scoring`),
  );
  return result.data.scoring?.totalScore ?? null;
}

async function openMenu(page: Page, menu: string, heading: string) {
  await page.goto("/");
  await page.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: menu }).click();
  await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
}

test("AC-64.02 a Not Match NPWP returns the application to Sales as Draft with the NPWP remarks", async ({
  pageAs,
}) => {
  const productId = await availableProduct("KTAV", "KTA Verifikasi", VERIFICATION_ROUTE);
  const items = SEVEN_DOCUMENTS.map((documentType) => ({ documentType, isMandatory: true }));
  await approve(
    "checker.001",
    await submitChecklist("maker.01", { productId, occupation: KARYAWAN_SWASTA, marital: BELUM_KAWIN, items }),
  );
  const application = await submittedApplication(productId, { documents: SEVEN_DOCUMENTS });
  await expect
    .poll(() => stepStatus(application.id, "VERIFICATION"), { message: WORKER_HINT, timeout: WORKER_TIMEOUT_MS })
    .toBe("WAITING_HUMAN");

  const verifier = await pageAs("verifikator.01");
  await openMenu(verifier, "Verification", "Verification Document");
  const task = verifier.getByRole("row").filter({ hasText: application.loanId });
  await task.getByRole("button", { name: "Assign to Me" }).click();
  await task.getByRole("button", { name: "Proceed to Verification" }).click();
  await expect(verifier.getByRole("heading", { name: "Verification Detail" })).toBeVisible();
  const documents = verifier.getByRole("list", { name: "Documents" }).getByRole("group");
  await expect(documents).toHaveCount(7);
  for (const document of await documents.all())
    await document.getByRole("radio", { name: "Match", exact: true }).check();
  const npwp = verifier.getByRole("listitem").filter({ has: verifier.getByRole("group", { name: "NPWP" }) });
  await npwp.getByRole("radio", { name: "Not Match" }).check();
  await npwp.getByLabel(/^Remarks/).fill(NPWP_REMARKS);
  await verifier.getByRole("button", { name: "Submit" }).click();

  await expect(verifier.getByText("Verification submitted")).toBeVisible();
  await expect(verifier.getByRole("heading", { name: "Verification Document" })).toBeVisible();
  const sales = await pageAs("sales.jkt01");
  await openMenu(sales, "Data Entry", "Application List");
  await sales.getByRole("link", { name: application.loanId }).click();
  await expect(sales.getByRole("region", { name: "Return Note" })).toContainText(`NPWP: ${NPWP_REMARKS}`);
});

test("AC-37.05 the active model scores until the new version is approved, then it scores the next application", async ({
  pageAs,
}) => {
  const scoreOf = async (applicant: Applicant) => {
    const { id } = await submittedApplication(KTA_QA, { documents: KTA_QA_DOCUMENTS, applicant });
    let score: string | null = null;
    await expect
      .poll(
        async () => {
          score = await totalScore(id);
          return score;
        },
        { message: WORKER_HINT, timeout: WORKER_TIMEOUT_MS },
      )
      .not.toBeNull();
    return score;
  };
  expect(await scoreOf({ fullName: "Dimas Scoring Satu", idCardNumber: "3273011402900051" })).toBe("470.00");

  const maker = await pageAs("maker.01");
  await openMenu(maker, "Scoring Model", "Scoring Model");
  await maker.getByRole("link", { name: "KTA-2026" }).click();
  await maker.getByRole("button", { name: "New Version" }).click();
  await expect(maker.getByText("2 (Draft)")).toBeVisible();
  await expect(maker.getByRole("button", { name: "Add Criterion" })).toBeEnabled();
  await maker.getByRole("button", { name: "Add Criterion" }).click();
  const form = maker.getByRole("dialog", { name: "Add Criterion" });
  await form.getByLabel(/^Field/).selectOption({ label: "Monthly Income" });
  await form.getByLabel(/^Operator/).selectOption({ label: "greater than or equal" });
  await form.getByLabel(/^Value/).fill("7000000");
  await form.getByLabel(/^Criterion Type/).selectOption({ label: "Weighted" });
  await form.getByLabel(/^Weight/).fill("30");
  await form.getByRole("button", { name: "Save" }).click();
  await expect(maker.getByRole("table", { name: "Criteria" })).toContainText("Monthly Income");
  await maker.getByRole("button", { name: "Submit for Approval" }).click();
  await expect(maker.getByText("Data submitted for approval")).toBeVisible();

  expect(await scoreOf({ fullName: "Dimas Scoring Dua", idCardNumber: "3273011402900052" })).toBe("470.00");

  const checker = await pageAs("checker.001");
  await openPendingDetail(checker, "/master/scoring/pending", "KTA-2026 version 2");
  await confirmApprove(checker);
  await expect(checker.getByText("Data approved")).toBeVisible();

  expect(await scoreOf({ fullName: "Dimas Scoring Tiga", idCardNumber: "3273011402900053" })).toBe("500.00");
});

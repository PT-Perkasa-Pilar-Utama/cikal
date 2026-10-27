import type { StepCode } from "@cikal/contracts";
import type { Page } from "@playwright/test";
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
import { confirmApprove, openPendingDetail, pendingRow } from "./support/pending";

/*
 * FE-S2-04: Maker mematikan modul rute lewat "Product Route", Checker menyetujuinya di "Pending Product Route", dan
 * versi rute dikunci saat pengajuan disubmit (api-specs 08 §8.9, technical-specs 12 §12.1). Survey (M05) tidak
 * berlisensi di paket POC, jadi spec ini mematikan Dukcapil. Langkah yang dimatikan baru dicatat di luar rute saat
 * proses mencapainya, dan Dukcapil mendahului Verification yang menahan pengajuan di urutan langkah baku. Spec ini
 * butuh worker pg-boss menyala selain `pnpm dev`.
 */

const WORKER_TIMEOUT_MS = 60_000;
// Setiap test menunggu worker membawa pengajuan ke Verification, lebih lama dari batas default 30 detik.
test.describe.configure({ mode: "serial", timeout: 2 * WORKER_TIMEOUT_MS });

const WORKER_HINT = "Is the pg-boss worker running (pnpm --filter @cikal/api start:worker)?";
const PRODUCT_NAME = "KTA Rute";

/** Dukcapil yang dimatikan di versi baru, lalu Verification yang menahan pengajuan di tengah rute. */
const ROUTE: readonly StepCode[] = [
  "DATA_ENTRY",
  "DUKCAPIL",
  "VERIFICATION",
  "APPROVAL",
  "VALIDITY_CHECK",
  "PRINT_AKAD",
  "DISBURSEMENT",
];
const applicant = (order: number, name: string): Applicant => ({
  fullName: `Rina Rute ${name}`,
  idCardNumber: `32730114029000${60 + order}`,
});

let productId = "";
let running: { id: string; loanId: string };

/** Pengajuan yang disubmit lalu ditunggu sampai langkah Verification menunggu verifikator. */
async function atVerification(order: number, name: string) {
  const application = await submittedApplication(productId, {
    documents: SEVEN_DOCUMENTS,
    applicant: applicant(order, name),
  });
  await expect
    .poll(
      async () =>
        (await processTimeline(application.id)).data.steps.find((step) => step.stepCode === "VERIFICATION")?.status,
      { message: WORKER_HINT, timeout: WORKER_TIMEOUT_MS },
    )
    .toBe("WAITING_HUMAN");
  return application;
}

/** Layar "Application Workflow" pengajuan: versi rute yang dikunci dan modul rutenya (AC-85.01). */
async function openWorkflow(page: Page, applicationId: string) {
  await page.goto(`/applications/${applicationId}/workflow`);
  await expect(page.getByRole("heading", { name: "Application Workflow" })).toBeVisible();
  return page.getByRole("list", { name: "Route modules" });
}

test("AC-31.01 a submitted route version waits for approval while new applications keep the active version", async ({
  pageAs,
}) => {
  productId = await availableProduct("KTAR", PRODUCT_NAME, ROUTE);
  const items = SEVEN_DOCUMENTS.map((documentType) => ({ documentType, isMandatory: true }));
  await approve(
    "checker.001",
    await submitChecklist("maker.01", { productId, occupation: KARYAWAN_SWASTA, marital: BELUM_KAWIN, items }),
  );
  running = await atVerification(1, "Satu");

  const maker = await pageAs("maker.01");
  await maker.goto("/");
  await maker.getByRole("navigation", { name: "Main menu" }).getByRole("link", { name: "Product Route" }).click();
  await maker.getByLabel(/^Product/).selectOption({ label: `KTAR - ${PRODUCT_NAME}` });
  await expect(maker.getByText("Version 1")).toBeVisible();
  await maker.getByRole("button", { name: "Edit Route" }).click();
  await maker.getByRole("switch", { name: "Dukcapil" }).click();
  await maker.getByRole("button", { name: "Submit for Approval" }).click();

  await expect(maker.getByText("Route version 2 submitted for approval")).toBeVisible();
  await maker.goto("/master/routes/pending");
  await expect(pendingRow(maker, PRODUCT_NAME)).toContainText("Waiting Approval");
  const beforeApproval = await atVerification(2, "Dua");
  const sales = await pageAs("sales.jkt01");
  await openWorkflow(sales, beforeApproval.id);
  await expect(sales.getByText("Route Version 1")).toBeVisible();
});

test("AC-31.03 the running application keeps its route version after approval and the next one uses the new version", async ({
  pageAs,
}) => {
  const checker = await pageAs("checker.001");
  await openPendingDetail(checker, "/master/routes/pending", PRODUCT_NAME);
  await confirmApprove(checker);
  await expect(checker.getByText("Data approved")).toBeVisible();

  const sales = await pageAs("sales.jkt01");
  const runningModules = await openWorkflow(sales, running.id);
  await expect(sales.getByText("Route Version 1")).toBeVisible();
  await expect(runningModules).toContainText("Dukcapil");
  await expect(runningModules.locator("[aria-current=step]")).toHaveText("Verification");

  const afterApproval = await atVerification(3, "Tiga");
  const newModules = await openWorkflow(sales, afterApproval.id);
  await expect(sales.getByText("Route Version 2")).toBeVisible();
  await expect(newModules).not.toContainText("Dukcapil");
});

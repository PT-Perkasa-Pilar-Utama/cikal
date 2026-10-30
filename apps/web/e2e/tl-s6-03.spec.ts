import { errorEnvelopeSchema, licenseResponseSchema } from "@cikal/contracts";
import { ApiSession } from "./support/api-session";
import { type Applicant, processTimeline, submittedApplication } from "./support/application";
import { expect, test } from "./support/fixtures";
import { CHANGED_DEV_LICENSE } from "./support/license";

/*
 * TL-S6-03: bukti K-04 di instalasi POC (Docs/POC_VERIFICATION.md). Paket POC tidak memuat M14, jadi langkah Epolis
 * dilewati dengan alasan tak berlisensi walau lisensi dev mencantumkannya (PK-02). Langkah proses dijalankan worker
 * pg-boss, jadi spec ini butuh `pnpm --filter @cikal/api start:worker` menyala selain `pnpm dev`.
 */

const WORKER_TIMEOUT_MS = 60_000;
test.describe.configure({ timeout: 2 * WORKER_TIMEOUT_MS });

const WORKER_HINT = "Is the pg-boss worker running (pnpm --filter @cikal/api start:worker)?";
/** Produk KTA QA seed `qa`; plafon di bawah Limit Auto Approval sehingga proses lewat Approval tanpa approver. */
const KTA_QA = "0192b6ca-0001-7000-8000-000000000001";
const KTA_QA_DOCUMENTS = ["KTP", "KK", "NPWP", "SLIP_GAJI", "REKENING_KORAN", "SURAT_KETERANGAN_KERJA", "PBB"];
const APPLICANT: Applicant = { fullName: "Lukman Lisensi", idCardNumber: "3273011402900101" };

test("K-04 AC-85.06 the Epolis step of an unlicensed module shows Skipped - not licensed", async ({ pageAs }) => {
  const application = await submittedApplication(KTA_QA, {
    documents: KTA_QA_DOCUMENTS,
    applicant: APPLICANT,
    requestedLimit: "5000000.00",
  });
  await expect
    .poll(
      async () => (await processTimeline(application.id)).data.steps.find((step) => step.stepCode === "EPOLIS")?.status,
      { message: WORKER_HINT, timeout: WORKER_TIMEOUT_MS },
    )
    .toBe("SKIPPED");

  const sales = await pageAs("sales.jkt01");
  await sales.goto(`/applications/${application.id}/workflow`);
  const epolis = sales
    .getByRole("table", { name: "Timeline" })
    .getByRole("row")
    .filter({ has: sales.getByText("Epolis", { exact: true }) });
  await expect(epolis).toContainText("Skipped - not licensed");
});

test("K-04 the Super User menu has no E-Polis", async ({ pageAs }) => {
  const superUser = await pageAs("superuser");
  await superUser.goto("/");
  const mainMenu = superUser.getByRole("navigation", { name: "Main menu" });

  await expect(mainMenu.getByRole("link", { name: "Application Inquiry" })).toBeVisible();
  await expect(mainMenu.getByRole("link", { name: /E-Polis/ })).toHaveCount(0);
});

test("K-04 AC-100.02 a licence file changed after issuing is refused and the previous licence stays", async () => {
  await ApiSession.as("superuser", async (session) => {
    const response = await session.postFile(
      "/api/v1/license",
      { name: "license.json", mimeType: "application/json", buffer: Buffer.from(JSON.stringify(CHANGED_DEV_LICENSE)) },
      { "Idempotency-Key": crypto.randomUUID() },
    );

    expect(response.status).toBe(422);
    expect(errorEnvelopeSchema.parse(response.body)).toMatchObject({
      code: "LICENSE_INVALID",
      message: "License file is invalid",
    });
    const { data } = await session.get(licenseResponseSchema, "/api/v1/license");
    expect(data).toMatchObject({ licenseNumber: "PPU-LIC-DEV-0001", validTo: "2027-12-31", status: "ACTIVE" });
  });
});

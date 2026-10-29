import { akadPrintResponseSchema, fileDownloadUrlResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import PizZip from "pizzip";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedNumberFormatIds } from "../src/modules/core/document/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { businessDate } from "../src/platform/clock/business-date.js";
import { type ApprovalActors, approvalActors, expectError } from "./support/approval-decision.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { CUSTOMER_ACCOUNT, disbursementFlow } from "./support/disbursement-flow.js";
import { type FakeGotenberg, startFakeGotenberg } from "./support/gotenberg.js";
import { drainProcessJobs, latestSteps } from "./support/process.js";
import { createSession, type TestSession } from "./support/session.js";
import { startStorage, type TestStorage } from "./support/storage.js";
import { setUser } from "./support/task.js";

const bodyText = (docx: Buffer | null): string =>
  docx ? (new PizZip(docx).file("word/document.xml")?.asText() ?? "").replace(/<[^>]+>/g, "") : "";

/** Cetak akad oleh Admin Operasional (api-specs 25 §25.3, US-77, AC-102.08). */
describe("print akad", () => {
  let db: TestDatabase;
  let storage: TestStorage;
  let gotenberg: FakeGotenberg;
  let app: NestFastifyApplication;
  let actors: ApprovalActors;
  let operator: TestSession;
  let otherOperator: TestSession;
  let flow: ReturnType<typeof disbursementFlow>;

  const year = () => businessDate(new Date()).slice(0, 4);
  const form = () => flow.akadForm();
  const atPrintAkad = (options?: { template: boolean }) => flow.atPrintAkad(options);
  const detailOf = (applicationId: string, session?: TestSession) => flow.detailOf(applicationId, session);
  const print = (applicationId: string, payload: object = form(), session: TestSession = operator) =>
    flow.post(session, `${applicationId}/akad/print`, payload);
  const resetContractCounter = () =>
    db.owner.query("delete from document.document_number_counters where format_id = $1 and scope_key = '011'", [
      seedNumberFormatIds.contract,
    ]);

  beforeAll(async () => {
    [storage, gotenberg] = await Promise.all([startStorage(), startFakeGotenberg()]);
    db = await startDatabase("qa", storage.putObject);
    app = await createApp({ ...db.config, storage: storage.config, gotenbergUrl: gotenberg.url });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    actors = await approvalActors(db.owner);
    operator = await createSession(db.owner, { roleId: seedRoleIds.adminOperasional });
    otherOperator = await createSession(db.owner, { roleId: seedRoleIds.adminOperasional });
    await setUser(db.owner, operator.userId, { branchId: seedOrganizationIds.bandung });
    await setUser(db.owner, otherOperator.userId, { branchId: seedOrganizationIds.bandung });
    flow = disbursementFlow(app, db.owner, actors, operator);
  });

  afterAll(async () => {
    await app?.close();
    await Promise.all([db?.stop(), storage?.stop(), gotenberg?.stop()]);
  });

  it("AC-77.01 AC-102.08 prints the first contract of branch 011 into the akad and moves to Disbursement", async () => {
    const { applicationId, processId } = await atPrintAkad();
    await resetContractCounter();
    const contractNumber = `011/PK/${year()}/000001`;

    const res = await print(applicationId);

    expect(res.statusCode, res.body).toBe(200);
    const { data } = akadPrintResponseSchema.parse(res.json());
    expect(data).toMatchObject({ contractNumber, contractDate: businessDate(new Date()), nextStep: "DISBURSEMENT" });
    const sent = bodyText(gotenberg.lastFile);
    expect(sent).toContain(`Nomor: ${contractNumber}`);
    expect(sent).toContain("Plafond: Rp 600.000.000");
    expect(sent).toContain("Metode Pembayaran: Auto Debet");
    expect(sent).toContain(`Rekening Debitur: ${CUSTOMER_ACCOUNT}`);
    expect(sent).not.toContain("{{");
    await drainProcessJobs(app, db.owner);
    expect((await latestSteps(db.owner, processId)).get("PRINT_AKAD")).toMatchObject({ status: "COMPLETED" });
    expect(await detailOf(applicationId)).toMatchObject({
      currentStep: "DISBURSEMENT",
      contractNumber,
      bankAccountNumber: CUSTOMER_ACCOUNT,
      akadPrints: [{ generatedDocumentId: data.generatedDocumentId, fileId: data.fileId, printCount: 1 }],
    });
    expect((await detailOf(applicationId, actors.inquirer)).bankAccountNumber).toBe("******4321");
    const { rows } = await db.owner.query(
      "select document_code, document_number, file_id, is_reprint from document.generated_documents where id = $1",
      [data.generatedDocumentId],
    );
    expect(rows[0]).toMatchObject({ document_number: contractNumber, file_id: data.fileId, is_reprint: false });
    const download = await app.inject({
      method: "GET",
      url: `/api/v1/files/${data.fileId}/download-url?disposition=attachment`,
      headers: operator.headers,
    });
    expect(download.statusCode, download.body).toBe(200);
    expect(fileDownloadUrlResponseSchema.parse(download.json()).data.fileName).toMatch(/^Surat Perjanjian Kredit/);
    expectError(await print(applicationId), 409, "ALREADY_PROCESSED", "This application has already been processed");
  });

  it("AC-77.02 asks for the Risk Manager when it is empty", async () => {
    const { applicationId } = await atPrintAkad();
    const { riskManagerUserId: _omitted, ...withoutRiskManager } = form();

    const res = await print(applicationId, withoutRiskManager);

    expect(res.statusCode, res.body).toBe(400);
    expect(res.json()).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [{ field: "riskManagerUserId", message: "This field is required" }],
    });
  });

  it("AC-77.03 refuses a product without an akad template and forms no contract number", async () => {
    const { applicationId, productCode } = await atPrintAkad({ template: false });
    const { rows: before } = await db.owner.query(
      "select scope_key, last_number from document.document_number_counters",
    );

    const res = await print(applicationId);

    expectError(res, 422, "TEMPLATE_NOT_AVAILABLE", `Document template AKAD-${productCode} is not available`);
    const { rows: after } = await db.owner.query(
      "select scope_key, last_number from document.document_number_counters",
    );
    expect(after).toEqual(before);
    expect((await detailOf(applicationId)).contractNumber).toBeNull();
  });

  it("refuses a payment method that is not a Payment Method option (VALIDATION_FAILED)", async () => {
    const { applicationId } = await atPrintAkad();

    const res = await print(applicationId, { ...form(), paymentMethod: "CASH" });

    expect(res.statusCode, res.body).toBe(400);
    expect(res.json()).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [{ field: "paymentMethod", message: "Payment method is not available" }],
    });
  });

  it("refuses a print from an operator who does not hold the task (TASK_NOT_ASSIGNED_TO_YOU)", async () => {
    const { applicationId } = await atPrintAkad();

    expectError(
      await print(applicationId, form(), otherOperator),
      403,
      "TASK_NOT_ASSIGNED_TO_YOU",
      "This task is assigned to another user",
    );
  });
});

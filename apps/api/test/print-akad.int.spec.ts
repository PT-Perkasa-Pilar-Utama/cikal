import {
  akadPrintResponseSchema,
  disbursementDetailResponseSchema,
  fileDownloadUrlResponseSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import PizZip from "pizzip";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedNumberFormatIds, seedTemplateIds } from "../src/modules/core/document/index.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { businessDate } from "../src/platform/clock/business-date.js";
import {
  type ApprovalActors,
  approvalActors,
  decide,
  expectError,
  waitingApproval,
} from "./support/approval-decision.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { type FakeGotenberg, startFakeGotenberg } from "./support/gotenberg.js";
import { drainProcessJobs, latestSteps } from "./support/process.js";
import { createSession, type TestSession } from "./support/session.js";
import { startStorage, type TestStorage } from "./support/storage.js";
import { setUser } from "./support/task.js";

const APPROVE = { decision: "APPROVE", comment: "Agunan memadai" };
const CUSTOMER_ACCOUNT = "0987654321";

const bodyText = (docx: Buffer | null): string =>
  docx ? (new PizZip(docx).file("word/document.xml")?.asText() ?? "").replace(/<[^>]+>/g, "") : "";

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Cetak akad oleh Admin Operasional (api-specs 25 §25.3, US-77, AC-102.08). */
describe("print akad", () => {
  let db: TestDatabase;
  let storage: TestStorage;
  let gotenberg: FakeGotenberg;
  let app: NestFastifyApplication;
  let actors: ApprovalActors;
  let operator: TestSession;
  let otherOperator: TestSession;

  const year = () => businessDate(new Date()).slice(0, 4);
  const post = (session: TestSession, url: string, payload: object) =>
    app.inject({
      method: "POST",
      url: `/api/v1/applications/${url}`,
      headers: { ...session.headers, "idempotency-key": uuidv7() },
      payload,
    });
  const form = () => ({
    paymentMethod: "AUTO_DEBET",
    bankAccountNumber: "1234567890",
    customerAccountNumber: CUSTOMER_ACCOUNT,
    riskManagerUserId: actors.inquirer.userId,
  });
  const print = (applicationId: string, payload: object = form(), session: TestSession = operator) =>
    post(session, `${applicationId}/akad/print`, payload);
  const assignTask = async (applicationId: string, queueCode: string) => {
    await drainProcessJobs(app, db.owner);
    const { rows } = await db.owner.query<{ id: string; version: number }>(
      "select id, version from taskqueue.human_tasks where application_id = $1 and queue_code = $2 and status = 'OPEN'",
      [applicationId, queueCode],
    );
    const [task] = rows;
    if (!task) throw new Error(`${queueCode} task was not opened`);
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/tasks/${task.id}/assign`,
      headers: operator.headers,
      payload: { version: task.version },
    });
    expect(res.statusCode, res.body).toBe(200);
  };
  const productCodeOf = async (applicationId: string) => {
    const { rows } = await db.owner.query<{ product_code: string }>(
      `select p.product_code from product.products p join application.applications a on a.product_id = p.id
        where a.id = $1`,
      [applicationId],
    );
    return rows[0]?.product_code ?? "";
  };
  /** Akad template untuk produk pengajuan, memakai berkas Word seed `qa`. */
  const addTemplate = (productCode: string) =>
    db.owner.query(
      `insert into document.document_templates (id, tenant_id, document_code, product_id, file_id, placeholders)
       select $1, $2, $3, null, file_id, placeholders from document.document_templates where id = $4`,
      [uuidv7(), seedCompanyIds.company001, `AKAD-${productCode}`, seedTemplateIds.akadKtaQa],
    );
  /** Pengajuan Bandung (011) yang lolos Validity Check dan tugas PRINT_AKAD-nya diambil `operator`. */
  const atPrintAkad = async (options: { template: boolean } = { template: true }) => {
    const { applicationId, processId } = await waitingApproval(app, db.owner, actors, "600000000.00", {
      routeSteps: { VALIDITY_CHECK: true, PRINT_AKAD: true, DISBURSEMENT: true },
    });
    expect((await decide(app, actors.branchHead, applicationId, APPROVE)).statusCode).toBe(200);
    expect((await decide(app, actors.regionalHead, applicationId, APPROVE)).statusCode).toBe(200);
    await assignTask(applicationId, "VALIDITY_CHECK");
    const valid = await post(operator, `${applicationId}/validity-check`, {
      result: "VALID",
      disbursementDate: addDays(businessDate(new Date()), 1),
    });
    expect(valid.statusCode, valid.body).toBe(200);
    await assignTask(applicationId, "PRINT_AKAD");
    const productCode = await productCodeOf(applicationId);
    if (options.template) await addTemplate(productCode);
    return { applicationId, processId, productCode };
  };
  const detailOf = async (applicationId: string, session: TestSession = operator) => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/disbursement`,
      headers: session.headers,
    });
    expect(res.statusCode, res.body).toBe(200);
    return disbursementDetailResponseSchema.parse(res.json()).data;
  };
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

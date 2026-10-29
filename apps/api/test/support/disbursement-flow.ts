import { akadPrintResponseSchema, disbursementDetailResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { expect } from "vitest";
import { seedTemplateIds } from "../../src/modules/core/document/index.js";
import { seedCompanyIds } from "../../src/modules/core/tenancy/index.js";
import { businessDate } from "../../src/platform/clock/business-date.js";
import { type ApprovalActors, decide, waitingApproval } from "./approval-decision.js";
import { drainProcessJobs } from "./process.js";
import type { TestSession } from "./session.js";

const APPROVE = { decision: "APPROVE", comment: "Agunan memadai" };

/** Rekening nasabah di form Print Akad. */
export const CUSTOMER_ACCOUNT = "0987654321";

/** `YYYY-MM-DD` digeser `days` hari. */
export function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/**
 * Alur pasca-approval M15 untuk uji integrasi (api-specs 25): pengajuan Bandung (011) disetujui dua level, lalu
 * `operator` mengambil dan menyelesaikan tugas Validity Check, Print Akad, dan Disbursement.
 */
export function disbursementFlow(
  app: NestFastifyApplication,
  owner: pg.Pool,
  actors: ApprovalActors,
  operator: TestSession,
) {
  const tomorrow = () => addDays(businessDate(new Date()), 1);
  const post = (session: TestSession, url: string, payload: object) =>
    app.inject({
      method: "POST",
      url: `/api/v1/applications/${url}`,
      headers: { ...session.headers, "idempotency-key": uuidv7() },
      payload,
    });
  const akadForm = () => ({
    paymentMethod: "AUTO_DEBET",
    bankAccountNumber: "1234567890",
    customerAccountNumber: CUSTOMER_ACCOUNT,
    riskManagerUserId: actors.inquirer.userId,
  });
  const assignTask = async (applicationId: string, queueCode: string) => {
    await drainProcessJobs(app, owner);
    const { rows } = await owner.query<{ id: string; version: number }>(
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
    const { rows } = await owner.query<{ product_code: string }>(
      `select p.product_code from product.products p join application.applications a on a.product_id = p.id
        where a.id = $1`,
      [applicationId],
    );
    return rows[0]?.product_code ?? "";
  };
  /** Akad template untuk produk pengajuan, memakai berkas Word seed `qa`. */
  const addTemplate = (productCode: string) =>
    owner.query(
      `insert into document.document_templates (id, tenant_id, document_code, product_id, file_id, placeholders)
       select $1, $2, $3, null, file_id, placeholders from document.document_templates where id = $4`,
      [uuidv7(), seedCompanyIds.company001, `AKAD-${productCode}`, seedTemplateIds.akadKtaQa],
    );

  /** Pengajuan yang lolos Validity Check (tanggal cair besok) dan tugas PRINT_AKAD-nya diambil `operator`. */
  const atPrintAkad = async (options: { template: boolean } = { template: true }) => {
    const { applicationId, processId } = await waitingApproval(app, owner, actors, "600000000.00", {
      routeSteps: { VALIDITY_CHECK: true, PRINT_AKAD: true, DISBURSEMENT: true },
    });
    expect((await decide(app, actors.branchHead, applicationId, APPROVE)).statusCode).toBe(200);
    expect((await decide(app, actors.regionalHead, applicationId, APPROVE)).statusCode).toBe(200);
    await assignTask(applicationId, "VALIDITY_CHECK");
    const valid = await post(operator, `${applicationId}/validity-check`, {
      result: "VALID",
      disbursementDate: tomorrow(),
    });
    expect(valid.statusCode, valid.body).toBe(200);
    await assignTask(applicationId, "PRINT_AKAD");
    const productCode = await productCodeOf(applicationId);
    if (options.template) await addTemplate(productCode);
    return { applicationId, processId, productCode, validatedDate: tomorrow() };
  };

  /** Pengajuan yang akadnya tercetak dan tugas DISBURSEMENT-nya diambil `operator`. */
  const atDisbursement = async () => {
    const flow = await atPrintAkad();
    const printed = await post(operator, `${flow.applicationId}/akad/print`, akadForm());
    expect(printed.statusCode, printed.body).toBe(200);
    akadPrintResponseSchema.parse(printed.json());
    await assignTask(flow.applicationId, "DISBURSEMENT");
    return flow;
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

  return { post, akadForm, assignTask, atPrintAkad, atDisbursement, detailOf };
}

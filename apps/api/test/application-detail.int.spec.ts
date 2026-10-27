import {
  applicationDetailResponseSchema,
  applicationDocumentsResponseSchema,
  errorEnvelopeSchema,
  fileDownloadUrlResponseSchema,
  type StepCode,
  type StepResult,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { completeDraft, sectionClient, submittableProduct } from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import {
  drainProcessJobs,
  insertApplication,
  registerStepHandlers,
  type ScriptedStepHandler,
} from "./support/process.js";
import { insertProduct } from "./support/product.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

type Response = { statusCode: number; json(): unknown; body: string };

const COMPANY_002 = "0192b6a0-0002-7000-8000-000000000002";
/** Dedup menunggu data luar agar pengajuan tetap di langkah Dedup. */
const WAITING: StepResult = {
  type: "WAIT_EXTERNAL",
  externalReference: "REF-DETAIL",
  waitDeadline: new Date("2099-01-01T00:00:00Z"),
  summary: "Waiting",
};

/** `GET /applications/{id}` dan `by-loan-id`, halaman "Application Detail" (api-specs 12 §12.9, §12.10, US-84). */
describe("application detail", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let inquirer: TestSession;
  let bandungViewer: TestSession;
  let cimahiViewer: TestSession;
  let noInquiry: TestSession;
  let productId: string;
  let handlers: Map<StepCode, ScriptedStepHandler>;

  const get = (session: TestSession, url: string) =>
    app.inject({ method: "GET", url: `/api/v1/applications/${url}`, headers: session.headers });
  const detailOf = async (session: TestSession, url: string) => {
    const res = await get(session, url);
    expect(res.statusCode, res.body).toBe(200);
    return applicationDetailResponseSchema.parse(res.json()).data;
  };
  const expectNotFound = (res: Response) => {
    expect(res.statusCode, res.body).toBe(404);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({
      code: "APPLICATION_NOT_FOUND",
      message: "Application not found",
    });
  };
  const draft = () => completeDraft(db.owner, sectionClient(app), sales, productId);
  /** Pengajuan KTA tujuh dokumen yang disubmit dan menunggu di langkah Dedup. */
  const submitted = async (branchId: string | null = null) => {
    const id = await draft();
    handlers.get("DEDUP")?.script(id, WAITING);
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/applications/${id}/submit`,
      headers: { ...sales.headers, "idempotency-key": uuidv7() },
    });
    expect(res.statusCode, res.body).toBe(200);
    await drainProcessJobs(app, db.owner);
    await db.owner.query("update application.applications set branch_id = $2 where id = $1", [id, branchId]);
    return id;
  };
  const viewerAt = async (roleId: string, branchId: string) => {
    const session = await createSession(db.owner, { roleId });
    await db.owner.query("update iam.users set branch_id = $2 where id = $1", [session.userId, branchId]);
    return session;
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    handlers = registerStepHandlers(app, ["DEDUP", "APPROVAL"]);
    productId = await submittableProduct(db.owner);
    const salesRole = await createRole(db.owner, "Sales Detail", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
      { menuCode: "APP-INQUIRY", view: true },
    ]);
    const inquiryRole = await createRole(db.owner, "Inquiry Detail", [{ menuCode: "APP-INQUIRY", view: true }]);
    const entryRole = await createRole(db.owner, "Entry Only", [{ menuCode: "APP-ENTRY", view: true }]);
    sales = await createSession(db.owner, { roleId: salesRole });
    inquirer = await createSession(db.owner, { roleId: inquiryRole });
    bandungViewer = await viewerAt(inquiryRole, seedOrganizationIds.bandung);
    cimahiViewer = await viewerAt(inquiryRole, seedOrganizationIds.cimahi);
    noInquiry = await createSession(db.owner, { roleId: entryRole });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("AC-84.01 shows Loan Number, Application Type, Loan Amount, and Tenor Approved with the sections", async () => {
    const id = await submitted();

    const detail = await detailOf(inquirer, id);

    expect(detail).toMatchObject({
      id,
      status: "ON_PROGRESS",
      currentStep: "DEDUP",
      currentStepStatus: "WAITING_EXTERNAL",
      summary: { applicationType: "NTB", loanAmount: "20000000.00", tenorApproved: null, branchCode: null },
    });
    expect(detail.loanId).toMatch(/^\d{8}U/);
    expect(detail.summary.submittedAt).not.toBeNull();
    expect(detail.sections.personal).toMatchObject({ fullName: "Rudi Hartono", idCardNumber: "3273011402900001" });
    expect(detail.processInstances).toEqual([{ id: expect.any(String), recontestNumber: 0, status: "WAITING" }]);
  });

  it("AC-84.01 shows the approved tenor and loan amount once the final approver decides", async () => {
    const id = await submitted(seedOrganizationIds.bandung);
    await db.owner.query(
      "update application.applications set tenor_approved = 24, loan_amount = '18000000.00' where id = $1",
      [id],
    );

    const { summary } = await detailOf(inquirer, id);

    expect(summary).toMatchObject({ loanAmount: "18000000.00", tenorApproved: 24, branchCode: "011" });
  });

  it("AC-84.03 hides Spouse, Business, LKN, Collateral, and modules the route skips", async () => {
    const id = await submitted();

    const { tabs } = await detailOf(inquirer, id);

    expect(tabs).toEqual([
      "detail",
      "personal",
      "occupation",
      "documents",
      "emergency-contact",
      "workflow",
      "dedup",
      "approval",
    ]);
  });

  it("AC-84.06 records the access in the audit trail as Data Access with the Loan ID", async () => {
    const id = await submitted();

    const { loanId } = await detailOf(inquirer, id);

    const { rows } = await db.owner.query(
      "select user_id, module, description, created_at from audit.audit_logs where action = 'VIEW_APPLICATION' and record_id = $1",
      [id],
    );
    expect(rows).toEqual([
      {
        user_id: inquirer.userId,
        module: "Application",
        description: `Application ${loanId} viewed`,
        created_at: expect.any(Date),
      },
    ]);
  });

  it("opens the detail from the Loan ID", async () => {
    const id = await submitted();
    const { loanId } = await detailOf(inquirer, id);

    expect((await detailOf(inquirer, `by-loan-id/${loanId}`)).id).toBe(id);
  });

  it("AC-84.05 answers Application not found for an unknown Loan ID", async () => {
    expectNotFound(await get(inquirer, "by-loan-id/TIDAKADA"));
  });

  it("AC-84.04 answers Application not found for an application of another company", async () => {
    await db.owner.query(
      "insert into tenancy.companies (id, company_code, company_name, address) values ($1, '002', 'Bank Lain', 'Alamat')",
      [COMPANY_002],
    );
    const otherProduct = await insertProduct(db.owner, { tenantId: COMPANY_002 });
    const otherId = await insertApplication(db.owner, {
      productId: otherProduct,
      submittedBy: null,
      tenantId: COMPANY_002,
    });

    expectNotFound(await get(inquirer, otherId));
  });

  it("limits the detail to the user's data scope and drafts to their creator (TN-02)", async () => {
    const id = await submitted(seedOrganizationIds.bandung);
    const draftId = await draft();

    expect((await detailOf(bandungViewer, id)).id).toBe(id);
    expectNotFound(await get(cimahiViewer, id));
    expectNotFound(await get(inquirer, draftId));
    expect((await detailOf(sales, draftId)).status).toBe("DRAFT");
  });

  it("rejects a user without View on Application Inquiry (ACCESS_DENIED)", async () => {
    const id = await submitted();

    const res = await get(noInquiry, id);

    expect(res.statusCode, res.body).toBe(403);
    expect(errorEnvelopeSchema.parse(res.json()).code).toBe("ACCESS_DENIED");
  });

  it("AC-84.02 lists the documents and lets an inquiry user in scope download the KTP", async () => {
    const id = await submitted(seedOrganizationIds.bandung);

    const res = await get(bandungViewer, `${id}/documents`);

    expect(res.statusCode, res.body).toBe(200);
    const ktp = applicationDocumentsResponseSchema.parse(res.json()).data.slots.find((s) => s.documentType === "KTP");
    const download = (session: TestSession) =>
      app.inject({ method: "GET", url: `/api/v1/files/${ktp?.file?.fileId}/download-url`, headers: session.headers });
    const allowed = await download(bandungViewer);
    expect(allowed.statusCode, allowed.body).toBe(200);
    expect(fileDownloadUrlResponseSchema.parse(allowed.json()).data.fileName).toBe("ktp.pdf");
    expect((await download(cimahiViewer)).statusCode).toBe(404);
    expect((await get(cimahiViewer, `${id}/documents`)).statusCode).toBe(404);
  });
});

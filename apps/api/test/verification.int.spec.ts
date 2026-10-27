import {
  applicationVerificationResponseSchema,
  errorEnvelopeSchema,
  fileDownloadUrlResponseSchema,
  standardErrors,
  verificationSaveResponseSchema,
  verificationSubmitResponseSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import {
  completeDraft,
  NIK,
  SEVEN_MANDATORY_DOCUMENTS,
  sectionClient,
  submittableProduct,
} from "./support/application.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { applicationState, drainProcessJobs, registerStepHandlers } from "./support/process.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

type Response = { statusCode: number; json(): unknown; body: string };

const ALL_MATCH = SEVEN_MANDATORY_DOCUMENTS.map((documentType) => ({ documentType, verificationStatus: "MATCH" }));

/** Langkah VERIFICATION dan verifikasi dokumen oleh Verifikator (api-specs 15, US-64). */
describe("document verification", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let verifier: TestSession;
  let productId: string;

  const send = (session: TestSession, method: "GET" | "PUT" | "POST", url: string, payload?: object) =>
    app.inject({
      method,
      url: `/api/v1/applications/${url}`,
      headers: { ...session.headers, ...(method === "POST" ? { "idempotency-key": uuidv7() } : {}) },
      ...(payload ? { payload } : {}),
    });
  const expectError = (res: Response, status: number, code: string, message: string) => {
    expect(res.statusCode, res.body).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };
  /** Pengajuan tujuh dokumen yang sudah disubmit dan menunggu di antrean VERIFICATION, diambil Verifikator. */
  const waiting = async (options: { assign?: boolean } = {}) => {
    const id = await completeDraft(db.owner, sectionClient(app), sales, productId);
    const submitted = await send(sales, "POST", `${id}/submit`);
    expect(submitted.statusCode, submitted.body).toBe(200);
    await drainProcessJobs(app, db.owner);
    if (options.assign ?? true) {
      const { rows } = await db.owner.query<{ id: string; version: number }>(
        "select id, version from taskqueue.human_tasks where application_id = $1 and queue_code = 'VERIFICATION'",
        [id],
      );
      const task = rows[0];
      const res = await app.inject({
        method: "POST",
        url: `/api/v1/tasks/${task?.id}/assign`,
        headers: verifier.headers,
        payload: { version: task?.version },
      });
      expect(res.statusCode, res.body).toBe(200);
    }
    return id;
  };
  const currentStep = async (id: string) => (await applicationState(db.owner, id))?.current_step;

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    registerStepHandlers(app, ["APPROVAL"]);
    const salesRole = await createRole(db.owner, "Sales Verifikasi", [
      { menuCode: "APP-ENTRY", view: true, create: true, update: true },
    ]);
    sales = await createSession(db.owner, { roleId: salesRole });
    verifier = await createSession(db.owner, { roleId: seedRoleIds.verifikator });
    productId = await submittableProduct(db.owner, { DATA_ENTRY: true, VERIFICATION: true, APPROVAL: true });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  it("creates a Verification task and shows the documents to the task owner", async () => {
    const id = await waiting();

    const res = await send(verifier, "GET", `${id}/verification`);

    expect(res.statusCode, res.body).toBe(200);
    const { data } = applicationVerificationResponseSchema.parse(res.json());
    expect(data).toMatchObject({ editable: true, applicantSummary: { fullName: "Rudi Hartono", idCardNumber: NIK } });
    expect(data.documents.map((document) => document.documentType)).toEqual(SEVEN_MANDATORY_DOCUMENTS);
    expect(data.documents[0]).toMatchObject({ label: "KTP", isMandatory: true, verificationStatus: "PENDING" });
    expect(await currentStep(id)).toBe("VERIFICATION");
  });

  it("AC-64.01 continues to the next route step when all seven documents match", async () => {
    const id = await waiting();

    const res = await send(verifier, "POST", `${id}/verification/submit`, { documents: ALL_MATCH });

    expect(verificationSubmitResponseSchema.parse(res.json())).toEqual({
      data: { result: "ALL_MATCH", nextStep: "APPROVAL", applicationStatus: "ON_PROGRESS" },
      message: "Verification submitted",
    });
    await drainProcessJobs(app, db.owner);
    expect(await currentStep(id)).toBe("APPROVAL");
  });

  it("AC-64.02 returns the application to Sales as Draft with the NPWP remarks", async () => {
    const id = await waiting();
    const documents = ALL_MATCH.map((document) =>
      document.documentType === "NPWP"
        ? { documentType: "NPWP", verificationStatus: "NOT_MATCH", remarks: "Nama di NPWP tidak sesuai KTP" }
        : document,
    );

    const res = await send(verifier, "POST", `${id}/verification/submit`, { documents });

    expect(verificationSubmitResponseSchema.parse(res.json())).toEqual({
      data: { result: "HAS_NOT_MATCH", nextStep: null, applicationStatus: "DRAFT" },
      message: "Verification submitted",
    });
    expect(await applicationState(db.owner, id)).toMatchObject({
      status: "DRAFT",
      return_note: "NPWP: Nama di NPWP tidak sesuai KTP",
    });
    const { rows } = await db.owner.query(
      "select verification_status, verification_remarks from application.application_documents where application_id = $1 and document_type = 'NPWP'",
      [id],
    );
    expect(rows[0]).toEqual({
      verification_status: "NOT_MATCH",
      verification_remarks: "Nama di NPWP tidak sesuai KTP",
    });
  });

  it("AC-64.03 rejects a Not Match document without remarks (REMARKS_REQUIRED)", async () => {
    const id = await waiting();
    const documents = ALL_MATCH.map((document) =>
      document.documentType === "NPWP" ? { documentType: "NPWP", verificationStatus: "NOT_MATCH" } : document,
    );

    const res = await send(verifier, "POST", `${id}/verification/submit`, { documents });

    expectError(res, 422, "REMARKS_REQUIRED", "Remarks are required for Not Match documents");
    expect(await currentStep(id)).toBe("VERIFICATION");
  });

  it("AC-64.04 saves 4 of 7 statuses and keeps the application in my queue", async () => {
    const id = await waiting();

    const res = await send(verifier, "PUT", `${id}/verification`, { documents: ALL_MATCH.slice(0, 4) });

    expect(verificationSaveResponseSchema.parse(res.json())).toEqual({
      data: { savedCount: 4, pendingCount: 3 },
      message: "Verification saved",
    });
    const view = applicationVerificationResponseSchema.parse(
      (await send(verifier, "GET", `${id}/verification`)).json(),
    );
    expect(view.data.documents.filter((document) => document.verificationStatus === "MATCH")).toHaveLength(4);
    expect(await currentStep(id)).toBe("VERIFICATION");
  });

  it("AC-64.05 lets the task owner preview a document file", async () => {
    const id = await waiting();
    const view = applicationVerificationResponseSchema.parse(
      (await send(verifier, "GET", `${id}/verification`)).json(),
    );
    const ktp = view.data.documents[0];

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/files/${ktp?.fileId}/download-url`,
      headers: verifier.headers,
    });

    expect(res.statusCode, res.body).toBe(200);
    expect(fileDownloadUrlResponseSchema.parse(res.json()).data.fileName).toBe("ktp.pdf");
  });

  it("rejects submitting with a pending document (VERIFICATION_INCOMPLETE)", async () => {
    const id = await waiting();

    const res = await send(verifier, "POST", `${id}/verification/submit`, { documents: ALL_MATCH.slice(0, 6) });

    expectError(res, 422, "VERIFICATION_INCOMPLETE", "Please verify all documents");
  });

  it("shows read only and rejects changes by a user who does not own the task", async () => {
    const id = await waiting({ assign: false });

    const view = applicationVerificationResponseSchema.parse(
      (await send(verifier, "GET", `${id}/verification`)).json(),
    );

    expect(view.data.editable).toBe(false);
    expectError(
      await send(verifier, "PUT", `${id}/verification`, { documents: ALL_MATCH }),
      403,
      "TASK_NOT_ASSIGNED_TO_YOU",
      "This task is assigned to another user",
    );
  });

  it("rejects a submit after the verification is processed (ALREADY_PROCESSED)", async () => {
    const id = await waiting();
    await send(verifier, "POST", `${id}/verification/submit`, { documents: ALL_MATCH });
    await drainProcessJobs(app, db.owner);

    const res = await send(verifier, "POST", `${id}/verification/submit`, { documents: ALL_MATCH });

    expectError(res, 409, "ALREADY_PROCESSED", "This application has already been processed");
    expectError(
      await send(verifier, "GET", `${id}/verification`),
      409,
      "INVALID_STATE",
      standardErrors.INVALID_STATE.message,
    );
  });

  it("rejects a document that is not uploaded (VALIDATION_FAILED)", async () => {
    const id = await waiting();

    const res = await send(verifier, "PUT", `${id}/verification`, {
      documents: [{ documentType: "BPJS", verificationStatus: "MATCH" }],
    });

    expectError(res, 400, "VALIDATION_FAILED", standardErrors.VALIDATION_FAILED.message);
  });

  it("rejects an unknown application (APPLICATION_NOT_FOUND)", async () => {
    expectError(
      await send(verifier, "GET", `${uuidv7()}/verification`),
      404,
      "APPLICATION_NOT_FOUND",
      "Application not found",
    );
  });
});

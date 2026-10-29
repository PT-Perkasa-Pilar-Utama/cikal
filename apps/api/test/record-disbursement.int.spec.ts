import { disbursementRecordResponseSchema } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import type { MemoryEmailAdapter } from "../src/modules/core/notification/adapters/memory-email.adapter.js";
import { EMAIL_PORT } from "../src/modules/core/notification/ports/email.port.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { Outbox } from "../src/platform/queue/outbox.js";
import { type ApprovalActors, approvalActors, expectError } from "./support/approval-decision.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { addDays, disbursementFlow } from "./support/disbursement-flow.js";
import { type FakeGotenberg, startFakeGotenberg } from "./support/gotenberg.js";
import { drainProcessJobs, latestSteps } from "./support/process.js";
import { createSession, type TestSession } from "./support/session.js";
import { startStorage, type TestStorage } from "./support/storage.js";
import { setApplicantName, setUser } from "./support/task.js";

/** `YYYY-MM-DD` menjadi `DD-MM-YYYY` seperti di AC. */
const dayMonthYear = (date: string) => date.split("-").reverse().join("-");

/** Record Disbursement mode MANUAL oleh Admin Operasional (api-specs 25 §25.4, US-101). */
describe("record disbursement", () => {
  let db: TestDatabase;
  let storage: TestStorage;
  let gotenberg: FakeGotenberg;
  let app: NestFastifyApplication;
  let actors: ApprovalActors;
  let operator: TestSession;
  let otherOperator: TestSession;
  let flow: ReturnType<typeof disbursementFlow>;
  let email: MemoryEmailAdapter;

  const record = (applicationId: string, payload: object, session: TestSession = operator) =>
    flow.post(session, `${applicationId}/disbursement/record`, payload);
  const statusOf = async (applicationId: string) => {
    const { rows } = await db.owner.query<{ status: string }>(
      "select status from application.applications where id = $1",
      [applicationId],
    );
    return rows[0]?.status;
  };
  const openTasks = async (applicationId: string) => {
    const { rows } = await db.owner.query<{ queue_code: string; status: string }>(
      "select queue_code, status from taskqueue.human_tasks where application_id = $1 and status <> 'CLOSED'",
      [applicationId],
    );
    return rows;
  };

  beforeAll(async () => {
    [storage, gotenberg] = await Promise.all([startStorage(), startFakeGotenberg()]);
    db = await startDatabase("qa", storage.putObject);
    app = await createApp({ ...db.config, storage: storage.config, gotenbergUrl: gotenberg.url });
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    email = app.get<MemoryEmailAdapter>(EMAIL_PORT);
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

  it("AC-101.01 records a disbursed result, finishes the application as Disbursed, and emails the applicant", async () => {
    const { applicationId, processId, validatedDate } = await flow.atDisbursement();
    await setApplicantName(db.owner, applicationId, "Rudi Hartono");
    await db.owner.query("update application.application_personals set email = $2 where application_id = $1", [
      applicationId,
      "rudi@contoh.com",
    ]);

    const res = await record(applicationId, {
      result: "DISBURSED",
      disbursementDate: validatedDate,
      coreLoanNumber: "LN-0012345",
      cif: "CIF-0001",
    });

    expect(res.statusCode, res.body).toBe(200);
    expect(disbursementRecordResponseSchema.parse(res.json())).toEqual({
      data: { applicationStatus: "DISBURSED", disbursementDate: validatedDate, coreLoanNumber: "LN-0012345" },
      message: "Disbursement recorded",
    });
    expect(await statusOf(applicationId)).toBe("DISBURSED");
    expect((await latestSteps(db.owner, processId)).get("DISBURSEMENT")).toMatchObject({
      status: "COMPLETED",
      outcome_code: "DISBURSED",
    });
    expect(await openTasks(applicationId)).toEqual([]);
    expect((await flow.detailOf(applicationId)).coreResponse).toMatchObject({
      channel: "MANUAL",
      outcome: "SUKSES",
      disbursementDate: validatedDate,
      coreLoanNumber: "LN-0012345",
      cif: "CIF-0001",
      failureReason: null,
    });
    const { rows } = await db.owner.query<{ id: string; loan_id: string }>(
      `select e.id, a.loan_id from platform.outbox_events e join application.applications a on a.id = e.aggregate_id
        where e.aggregate_id = $1 and e.event_type = 'DisbursementCompleted'`,
      [applicationId],
    );
    const [event] = rows;
    if (!event) throw new Error("DisbursementCompleted was not published");
    await app.get(Outbox).dispatch({ tenantId: seedCompanyIds.company001, eventId: event.id });
    expect(email.sent).toContainEqual({
      to: "rudi@contoh.com",
      subject: `Kredit ${event.loan_id} telah dicairkan`,
      body: expect.any(String),
    });
    expectError(
      await record(applicationId, { result: "DISBURSED", disbursementDate: validatedDate, coreLoanNumber: "LN-1" }),
      409,
      "ALREADY_PROCESSED",
      "This application has already been processed",
    );
  });

  it("AC-101.02 records a failed result and moves the application to the Recontest queue", async () => {
    const { applicationId, processId } = await flow.atDisbursement();

    const res = await record(applicationId, { result: "FAILED", reason: "Rekening nasabah tidak aktif" });

    expect(res.statusCode, res.body).toBe(200);
    expect(disbursementRecordResponseSchema.parse(res.json())).toEqual({
      data: { applicationStatus: "RECONTEST" },
      message: "Disbursement failure recorded",
    });
    await drainProcessJobs(app, db.owner);
    expect(await statusOf(applicationId)).toBe("RECONTEST");
    expect((await latestSteps(db.owner, processId)).get("DISBURSEMENT")).toMatchObject({
      status: "COMPLETED",
      outcome_code: "FAILED",
    });
    expect(await openTasks(applicationId)).toEqual([{ queue_code: "RECONTEST", status: "OPEN" }]);
    expect((await flow.detailOf(applicationId)).coreResponse).toMatchObject({
      channel: "MANUAL",
      outcome: "GAGAL",
      disbursementDate: null,
      coreLoanNumber: null,
      failureReason: "Rekening nasabah tidak aktif",
    });
  });

  it("AC-101.03 asks for the disbursement date and core loan number of a disbursed result", async () => {
    const { applicationId } = await flow.atDisbursement();

    const res = await record(applicationId, { result: "DISBURSED" });

    expect(res.statusCode, res.body).toBe(400);
    expect(res.json()).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [
        { field: "disbursementDate", message: "This field is required" },
        { field: "coreLoanNumber", message: "This field is required" },
      ],
    });
  });

  it("AC-101.04 rejects a disbursement date before the validated date and keeps the task open", async () => {
    const { applicationId, validatedDate } = await flow.atDisbursement();

    const res = await record(applicationId, {
      result: "DISBURSED",
      disbursementDate: addDays(validatedDate, -1),
      coreLoanNumber: "LN-0012345",
    });

    expectError(
      res,
      422,
      "DISBURSEMENT_BEFORE_VALIDATED_DATE",
      `Disbursement date must not be earlier than the validated date (${dayMonthYear(validatedDate)})`,
    );
    expect(await openTasks(applicationId)).toEqual([{ queue_code: "DISBURSEMENT", status: "ASSIGNED" }]);
    expect((await flow.detailOf(applicationId)).coreResponse).toBeNull();
  });

  it("AC-101.05 asks for the reason of a failed result", async () => {
    const { applicationId } = await flow.atDisbursement();

    const res = await record(applicationId, { result: "FAILED" });

    expect(res.statusCode, res.body).toBe(400);
    expect(res.json()).toMatchObject({
      code: "VALIDATION_FAILED",
      details: [{ field: "reason", message: "Reason is required" }],
    });
  });

  it("refuses a record from an operator who does not hold the task (TASK_NOT_ASSIGNED_TO_YOU)", async () => {
    const { applicationId } = await flow.atDisbursement();

    expectError(
      await record(applicationId, { result: "FAILED", reason: "Rekening tidak aktif" }, otherOperator),
      403,
      "TASK_NOT_ASSIGNED_TO_YOU",
      "This task is assigned to another user",
    );
  });

  it("answers an unknown application with APPLICATION_NOT_FOUND", async () => {
    expectError(
      await record(uuidv7(), { result: "FAILED", reason: "Rekening tidak aktif" }),
      404,
      "APPLICATION_NOT_FOUND",
      "Application not found",
    );
  });
});

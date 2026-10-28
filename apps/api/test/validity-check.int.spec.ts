import {
  disbursementDetailResponseSchema,
  financingResponseSchema,
  validityCheckResponseSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { businessDate } from "../src/platform/clock/business-date.js";
import {
  type ApprovalActors,
  approvalActors,
  decide,
  expectError,
  waitingApproval,
} from "./support/approval-decision.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { drainProcessJobs, latestSteps } from "./support/process.js";
import { createRole, createSession, type TestSession } from "./support/session.js";
import { setUser } from "./support/task.js";
import { taskApi } from "./support/task-api.js";

const APPROVE = { decision: "APPROVE", comment: "Agunan memadai" };
const ALREADY_PROCESSED = "This application has already been processed";

function addDays(date: string, days: number): string {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + days);
  return next.toISOString().slice(0, 10);
}

/** Validity Check oleh Admin Operasional (api-specs 25 §25.1, §25.2, US-76). */
describe("validity check", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let actors: ApprovalActors;
  let operator: TestSession;
  let otherOperator: TestSession;

  const today = () => businessDate(new Date());
  const detailOf = async (applicationId: string, session: TestSession = operator) => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/disbursement`,
      headers: session.headers,
    });
    expect(res.statusCode, res.body).toBe(200);
    return disbursementDetailResponseSchema.parse(res.json()).data;
  };
  const submit = (applicationId: string, payload: object, session: TestSession = operator) =>
    app.inject({
      method: "POST",
      url: `/api/v1/applications/${applicationId}/validity-check`,
      headers: { ...session.headers, "idempotency-key": uuidv7() },
      payload,
    });
  const financingOf = async (applicationId: string) => {
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/financing`,
      headers: actors.inquirer.headers,
    });
    expect(res.statusCode, res.body).toBe(200);
    return financingResponseSchema.parse(res.json()).data;
  };
  /** Pengajuan Bandung yang disetujui level final dan tugas VALIDITY_CHECK-nya diambil `operator`. */
  const atValidityCheck = async () => {
    const { applicationId, processId } = await waitingApproval(app, db.owner, actors, "600000000.00", {
      routeSteps: { VALIDITY_CHECK: true, PRINT_AKAD: true },
    });
    expect((await decide(app, actors.branchHead, applicationId, APPROVE)).statusCode).toBe(200);
    expect((await decide(app, actors.regionalHead, applicationId, APPROVE)).statusCode).toBe(200);
    await drainProcessJobs(app, db.owner);
    const { rows } = await db.owner.query<{ id: string; version: number }>(
      "select id, version from taskqueue.human_tasks where application_id = $1 and queue_code = 'VALIDITY_CHECK'",
      [applicationId],
    );
    const [task] = rows;
    if (!task) throw new Error("VALIDITY_CHECK task was not opened");
    const assigned = await taskApi(app, db.owner).send(operator, "POST", `/tasks/${task.id}/assign`, {
      version: task.version,
    });
    expect(assigned.statusCode, assigned.body).toBe(200);
    return { applicationId, processId };
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
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
    await db?.stop();
  });

  it("AC-76.06 shows the disbursement detail without an epolis date when M14 is not licensed", async () => {
    const { applicationId } = await atValidityCheck();
    const financing = await financingOf(applicationId);

    const detail = await detailOf(applicationId);

    expect(detail).toMatchObject({
      currentStep: "VALIDITY_CHECK",
      disbursementAmount: financing.netDisbursement,
      bankAccountNumber: null,
      disbursementDate: null,
      firstInstallmentDate: financing.firstInstallmentDate,
      validityStatus: null,
      contractNumber: null,
    });
    expect(detail).not.toHaveProperty("epolisDate");
    expect(await detailOf(applicationId, actors.inquirer)).toMatchObject({ applicationId });
  });

  it("AC-76.01 validates a disbursement date of tomorrow and moves the application to Print Akad", async () => {
    const { applicationId, processId } = await atValidityCheck();
    const { firstInstallmentDate } = await financingOf(applicationId);
    const tomorrow = addDays(today(), 1);

    const res = await submit(applicationId, { result: "VALID", disbursementDate: tomorrow });

    expect(res.statusCode, res.body).toBe(200);
    expect(validityCheckResponseSchema.parse(res.json())).toEqual({
      data: { validityStatus: "VALID", disbursementDate: tomorrow, firstInstallmentDate, nextStep: "PRINT_AKAD" },
      message: "Disbursement data validated",
    });
    await drainProcessJobs(app, db.owner);
    expect((await latestSteps(db.owner, processId)).get("VALIDITY_CHECK")).toMatchObject({
      status: "COMPLETED",
      outcome_code: "VALID",
    });
    expect(await detailOf(applicationId)).toMatchObject({
      currentStep: "PRINT_AKAD",
      validityStatus: "VALID",
      disbursementDate: tomorrow,
    });
    expectError(
      await submit(applicationId, { result: "VALID", disbursementDate: tomorrow }),
      409,
      "ALREADY_PROCESSED",
      ALREADY_PROCESSED,
    );
  });

  it("AC-76.02 rejects today as the disbursement date and keeps the task open", async () => {
    const { applicationId } = await atValidityCheck();

    expectError(
      await submit(applicationId, { result: "VALID", disbursementDate: today() }),
      422,
      "DISBURSEMENT_DATE_TOO_EARLY",
      "Disbursement date must be at least 1 day after today",
    );
    expect(await detailOf(applicationId)).toMatchObject({ currentStep: "VALIDITY_CHECK", validityStatus: null });
  });

  it("AC-76.05 moves every installment due date to the 25th of each month", async () => {
    const { applicationId } = await atValidityCheck();
    const before = await financingOf(applicationId);
    const moved = `${before.firstInstallmentDate.slice(0, 8)}25`;

    const res = await submit(applicationId, {
      result: "VALID",
      disbursementDate: addDays(today(), 1),
      firstInstallmentDate: moved,
    });

    expect(res.statusCode, res.body).toBe(200);
    expect(validityCheckResponseSchema.parse(res.json()).data).toMatchObject({ firstInstallmentDate: moved });
    const after = await financingOf(applicationId);
    expect(after.firstInstallmentDate).toBe(moved);
    expect(after.schedule).toHaveLength(before.schedule.length);
    expect(after.schedule.every((row) => row.dueDate.endsWith("-25"))).toBe(true);
    expect(after.schedule[0]?.dueDate).toBe(moved);
    expect(after.schedule.at(-1)?.outstandingAmount).toBe("0.00");
  });

  it("AC-76.04 returns the application to Sales as Draft with the reason as its note", async () => {
    const { applicationId } = await atValidityCheck();

    const res = await submit(applicationId, { result: "NOT_VALID", reason: "Nomor rekening salah" });

    expect(res.statusCode, res.body).toBe(200);
    expect(validityCheckResponseSchema.parse(res.json())).toEqual({
      data: { validityStatus: "NOT_VALID", applicationStatus: "DRAFT" },
      message: "Disbursement data marked as not valid",
    });
    const { rows } = await db.owner.query("select status, return_note from application.applications where id = $1", [
      applicationId,
    ]);
    expect(rows[0]).toEqual({ status: "DRAFT", return_note: "Nomor rekening salah" });
    expect(await detailOf(applicationId)).toMatchObject({
      validityStatus: "NOT_VALID",
      notValidReason: "Nomor rekening salah",
    });
  });

  it("requires the disbursement date for Valid and the reason for Not Valid (VALIDATION_FAILED)", async () => {
    const { applicationId } = await atValidityCheck();

    for (const [payload, field] of [
      [{ result: "VALID" }, "disbursementDate"],
      [{ result: "NOT_VALID", reason: "  " }, "reason"],
    ] as const) {
      const res = await submit(applicationId, payload);
      expect(res.statusCode, res.body).toBe(400);
      expect(res.json()).toMatchObject({
        code: "VALIDATION_FAILED",
        message: "Please complete all required fields",
        details: [expect.objectContaining({ field, message: "This field is required" })],
      });
    }
  });

  it("refuses a validity check from an operator who does not hold the task (TASK_NOT_ASSIGNED_TO_YOU)", async () => {
    const { applicationId } = await atValidityCheck();

    expectError(
      await submit(applicationId, { result: "VALID", disbursementDate: addDays(today(), 1) }, otherOperator),
      403,
      "TASK_NOT_ASSIGNED_TO_YOU",
      "This task is assigned to another user",
    );
  });

  it("answers an unknown application with APPLICATION_NOT_FOUND", async () => {
    const missing = uuidv7();

    const detail = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${missing}/disbursement`,
      headers: operator.headers,
    });

    expectError(detail, 404, "APPLICATION_NOT_FOUND", "Application not found");
    expectError(
      await submit(missing, { result: "VALID", disbursementDate: addDays(today(), 1) }),
      404,
      "APPLICATION_NOT_FOUND",
      "Application not found",
    );
  });

  it("refuses the disbursement detail to a user without an operations or inquiry menu", async () => {
    const { applicationId } = await atValidityCheck();
    const productViewer = await createRole(db.owner, "Product Viewer", [{ menuCode: "MST-PRODUCT", view: true }]);
    const outsider = await createSession(db.owner, { roleId: productViewer });

    const res = await app.inject({
      method: "GET",
      url: `/api/v1/applications/${applicationId}/disbursement`,
      headers: outsider.headers,
    });

    expectError(res, 403, "ACCESS_DENIED", "You do not have access to this page");
  });
});

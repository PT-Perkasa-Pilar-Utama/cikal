import type { StepCode, StepResult } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { seedRoleIds, seedUserId } from "../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { approvalChain, defaultApprovers, insertApprovalSetup, openTasks } from "./support/approval.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { monitoringRequest } from "./support/monitoring.js";
import {
  applicationState,
  drainProcessJobs,
  insertApplication,
  insertRoute,
  latestSteps,
  registerStepHandlers,
  type ScriptedStepHandler,
  startProcess,
} from "./support/process.js";
import { insertProduct, insertSubProduct } from "./support/product.js";
import { createSession, type TestSession } from "./support/session.js";

const KEPALA_CABANG = seedUserId("kepala.cabang");
const APPROVER_01 = seedUserId("approver.01");
/**
 * VALIDITY_CHECK M15 berhenti menunggu, sehingga langkah saat ini terlihat setelah Approval. M14 E-Polis tidak ada di
 * paket POC, jadi EPOLIS dilewati `NOT_LICENSED`.
 */
const VALIDITY_WAITING: StepResult = {
  type: "WAIT_EXTERNAL",
  externalReference: "VALIDITY-REF",
  waitDeadline: new Date(Date.now() + 86_400_000),
  summary: "Waiting for validity check",
};
const NOT_GO: StepResult = { type: "RECONTEST", outcomeCode: "NOTGO", summary: "NotGo" };

interface Submission {
  requestedLimit: string;
  limitAutoApproval?: string;
  productCode?: string;
  branchId?: string;
  setup?: Parameters<typeof insertApprovalSetup>[2] | null;
  decision?: StepResult;
}

/** Langkah APPROVAL CORE: auto approval dan routing rantai approval (api-specs 16 §16.4, US-72, US-74, US-27). */
describe("approval routing", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let handlers: Map<StepCode, ScriptedStepHandler>;

  /** Pengajuan KPR Bandung dengan Decision Go yang dijalankan sampai antrean job kosong. */
  const submitted = async (submission: Submission) => {
    const productId = await insertProduct(db.owner, {
      limitAutoApproval: submission.limitAutoApproval ?? "10000000.00",
      ...(submission.productCode ? { productCode: submission.productCode } : {}),
    });
    await insertSubProduct(db.owner, productId, { interestRate: "14.0000", validFrom: "2026-10-01" });
    if (submission.setup !== null) await insertApprovalSetup(db.owner, productId, submission.setup);
    await insertRoute(db.owner, productId, [
      {
        versionNumber: 1,
        status: "ACTIVE",
        steps: { DATA_ENTRY: true, DECISION: true, APPROVAL: true, EPOLIS: true, VALIDITY_CHECK: true },
      },
    ]);
    const applicationId = await insertApplication(db.owner, {
      productId,
      submittedBy: sales.userId,
      branchId: submission.branchId ?? seedOrganizationIds.bandung,
      requestedLimit: submission.requestedLimit,
      tenorProposed: 36,
    });
    if (submission.decision) handlers.get("DECISION")?.script(applicationId, submission.decision);
    handlers.get("VALIDITY_CHECK")?.script(applicationId, VALIDITY_WAITING);
    const processId = await startProcess(app, applicationId);
    await drainProcessJobs(app, db.owner);
    const steps = await latestSteps(db.owner, processId);
    return { applicationId, processId, steps, approval: steps.get("APPROVAL") };
  };
  const chainLevels = async (processId: string) =>
    (await approvalChain(db.owner, processId)).map((row) => row.job_level);

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    handlers = registerStepHandlers(app, ["DECISION", "VALIDITY_CHECK"]);
    sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  describe("auto approval", () => {
    it("AC-74.01 approves 8.000.000 automatically by System and moves on to the next step", async () => {
      const { applicationId, processId, steps, approval } = await submitted({ requestedLimit: "8000000.00" });

      expect(approval).toMatchObject({ status: "COMPLETED", outcome_code: "AUTO_APPROVED", actor_user_id: null });
      expect(await approvalChain(db.owner, processId)).toEqual([
        { sequence: 1, job_level: null, sub_level: null, approver_user_id: null, decision: "AUTO_APPROVED" },
      ]);
      expect(steps.get("EPOLIS")).toMatchObject({ status: "SKIPPED", skip_reason: "NOT_LICENSED" });
      expect(await applicationState(db.owner, applicationId)).toMatchObject({ current_step: "VALIDITY_CHECK" });
    });

    it("AC-74.02 approves a limit equal to the auto approval limit", async () => {
      const { approval } = await submitted({ requestedLimit: "10000000.00" });

      expect(approval).toMatchObject({ status: "COMPLETED", outcome_code: "AUTO_APPROVED" });
    });

    it("AC-74.03 sends a limit one rupiah above the auto approval limit to the approver queue", async () => {
      const { applicationId, approval } = await submitted({ requestedLimit: "10000001.00" });

      expect(approval).toMatchObject({ status: "WAITING_HUMAN" });
      expect(await openTasks(db.owner, applicationId)).toEqual([
        {
          queue_code: "APPROVAL",
          status: "ASSIGNED",
          assigned_user_id: KEPALA_CABANG,
          branch_id: seedOrganizationIds.bandung,
        },
      ]);
    });

    it("AC-74.04 sends a NotGo application to Recontest without running Approval", async () => {
      const { applicationId, processId, approval } = await submitted({
        requestedLimit: "5000000.00",
        decision: NOT_GO,
      });

      expect(approval).toMatchObject({ status: "PENDING", attempt: 1 });
      expect(await approvalChain(db.owner, processId)).toEqual([]);
      expect(await applicationState(db.owner, applicationId)).toMatchObject({ status: "RECONTEST" });
    });

    it("AC-74.05 waits for an approver when the auto approval limit is 0", async () => {
      const { approval } = await submitted({ requestedLimit: "1000000.00", limitAutoApproval: "0.00" });

      expect(approval).toMatchObject({ status: "WAITING_HUMAN" });
    });
  });

  describe("routing by amount (MRTM US-72)", () => {
    it("AC-72.06 TRM_APV_001 needs level 2 only for 500.000.000", async () => {
      const { processId } = await submitted({ requestedLimit: "500000000.00" });

      expect(await chainLevels(processId)).toEqual([2]);
    });

    it("AC-72.06 TRM_APV_002 needs level 2 then level 1 for 500.000.001", async () => {
      const { processId } = await submitted({ requestedLimit: "500000001.00" });

      expect(await approvalChain(db.owner, processId)).toEqual([
        { sequence: 1, job_level: 2, sub_level: 1, approver_user_id: KEPALA_CABANG, decision: "PENDING" },
        { sequence: 2, job_level: 1, sub_level: 1, approver_user_id: APPROVER_01, decision: "PENDING" },
      ]);
    });

    it("AC-72.06 TRM_APV_003 needs level 2 then level 1 at the upper bound 2.000.000.000", async () => {
      const { processId } = await submitted({ requestedLimit: "2000000000.00" });

      expect(await chainLevels(processId)).toEqual([2, 1]);
    });

    it("AC-72.06 TRM_APV_004 puts Approval in Error when no level covers 2.000.000.001", async () => {
      const { approval } = await submitted({ requestedLimit: "2000000001.00" });

      expect(approval).toMatchObject({
        status: "ERROR",
        error_category: "BUSINESS_SETUP",
        error_message: "No approval level covers this amount",
      });
    });

    it("AC-72.06 TRM_APV_005 puts Approval in Error for branch 012 without approval setup", async () => {
      const { approval } = await submitted({
        requestedLimit: "300000000.00",
        productCode: "KPR",
        branchId: seedOrganizationIds.cimahi,
      });

      expect(approval).toMatchObject({
        status: "ERROR",
        error_category: "BUSINESS_SETUP",
        error_message: "No approval setup for branch 012 and product KPR",
      });
    });
  });

  describe("inactive approvers", () => {
    it("AC-27.04 shows Error for a level whose approvers are all inactive, and Retry routes again", async () => {
      const [level2, level1] = defaultApprovers();
      if (!level2 || !level1) throw new Error("default approvers expected");
      const replacement = await createSession(db.owner, { roleId: seedRoleIds.kepalaCabang, status: "INACTIVE" });
      const setup = {
        approvers: [{ ...level2, isActive: false }, { ...level2, approverUserId: replacement.userId }, level1],
      };
      const { applicationId, processId, approval } = await submitted({ requestedLimit: "100000000.00", setup });

      expect(approval).toMatchObject({ status: "ERROR", error_message: "No active approver for level 2" });

      await db.owner.query("update iam.users set status = 'ACTIVE' where id = $1", [replacement.userId]);
      const ops = monitoringRequest(app, await createSession(db.owner, { roleId: seedRoleIds.adminOperasional }));
      const res = await ops.post(`/processes/${processId}/steps/${approval?.id}/retry`);

      expect(res.statusCode).toBe(200);
      expect((await latestSteps(db.owner, processId)).get("APPROVAL")).toMatchObject({
        status: "WAITING_HUMAN",
        attempt: 2,
      });
      expect(await openTasks(db.owner, applicationId)).toMatchObject([
        { queue_code: "APPROVAL", assigned_user_id: replacement.userId },
      ]);
    });
  });
});

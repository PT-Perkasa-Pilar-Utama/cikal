import {
  applicationApprovalResponseSchema,
  errorEnvelopeSchema,
  financingResponseSchema,
  standardErrors,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { Decimal } from "decimal.js";
import { v7 as uuidv7 } from "uuid";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.factory.js";
import { FinancingBuilder } from "../src/modules/core/approval/application/financing-builder.js";
import { seedRoleIds } from "../src/modules/core/identity/index.js";
import { OrchestratorApi } from "../src/modules/core/orchestrator/index.js";
import { seedOrganizationIds } from "../src/modules/core/organization/index.js";
import { seedCompanyIds } from "../src/modules/core/tenancy/index.js";
import { TenantTx } from "../src/platform/db/tenant-tx.js";
import { insertApprovalSetup } from "./support/approval.js";
import { startDatabase, type TestDatabase } from "./support/database.js";
import { drainProcessJobs, insertApplication, insertRoute, startProcess } from "./support/process.js";
import { insertProduct, insertSubProduct } from "./support/product.js";
import { createRole, createSession, type TestSession } from "./support/session.js";

type Response = { statusCode: number; json(): unknown };

/** Detail approval dan struktur kredit satu pengajuan (api-specs 16 §16.5, §16.7). */
describe("application approval and financing", () => {
  let db: TestDatabase;
  let app: NestFastifyApplication;
  let sales: TestSession;
  let inquirer: TestSession;
  let branchHead: TestSession;
  let regionalHead: TestSession;
  let otherApprover: TestSession;

  /** Pengajuan KTA tenor 36 bunga 14% dengan rentang Approver 11% s.d. 15% (AC-97.05), sampai antrean job kosong. */
  const submitted = async (requestedLimit: string, options: { submittedBy?: string; start?: boolean } = {}) => {
    const productId = await insertProduct(db.owner);
    await insertSubProduct(db.owner, productId, {
      interestRate: "14.0000",
      validFrom: "2026-10-01",
      approverRateMin: "11.0000",
      approverRateMax: "15.0000",
    });
    await insertApprovalSetup(db.owner, productId, {
      approvers: [
        { jobLevel: 2, approverUserId: branchHead.userId, upLevel: 1, upSubLevel: 1 },
        { jobLevel: 1, approverUserId: regionalHead.userId },
      ],
    });
    await insertRoute(db.owner, productId, [
      { versionNumber: 1, status: "ACTIVE", steps: { DATA_ENTRY: true, APPROVAL: true } },
    ]);
    const applicationId = await insertApplication(db.owner, {
      productId,
      submittedBy: options.submittedBy ?? sales.userId,
      branchId: seedOrganizationIds.bandung,
      requestedLimit,
      tenorProposed: 36,
    });
    if (options.start === false) return { applicationId, processId: null };
    const processId = await startProcess(app, applicationId);
    await drainProcessJobs(app, db.owner);
    return { applicationId, processId };
  };
  const get = (session: TestSession, url: string) =>
    app.inject({ method: "GET", url: `/api/v1/applications/${url}`, headers: session.headers });
  const approvalOf = async (session: TestSession, applicationId: string) => {
    const res = await get(session, `${applicationId}/approval`);
    expect(res.statusCode).toBe(200);
    return applicationApprovalResponseSchema.parse(res.json()).data;
  };
  const financingOf = async (applicationId: string) => {
    const res = await get(inquirer, `${applicationId}/financing`);
    expect(res.statusCode).toBe(200);
    return financingResponseSchema.parse(res.json()).data;
  };
  const expectError = (res: Response, status: number, code: string, message: string) => {
    expect(res.statusCode).toBe(status);
    expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
  };

  beforeAll(async () => {
    db = await startDatabase("dev");
    app = await createApp(db.config);
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
    const approverRole = await createRole(db.owner, "Approver Uji", [
      { menuCode: "OPS-APPROVAL", view: true, approve: true },
    ]);
    sales = await createSession(db.owner, { roleId: seedRoleIds.sales });
    inquirer = await createSession(db.owner, { roleId: seedRoleIds.riskManager });
    branchHead = await createSession(db.owner, { roleId: approverRole });
    regionalHead = await createSession(db.owner, { roleId: approverRole });
    otherApprover = await createSession(db.owner, { roleId: approverRole });
  });

  afterAll(async () => {
    await app?.close();
    await db?.stop();
  });

  describe("GET /applications/{id}/approval", () => {
    it("lets the level 2 approver decide with the level actions", async () => {
      const { applicationId } = await submitted("600000000.00");

      expect(await approvalOf(branchHead, applicationId)).toMatchObject({
        requestedLimit: "600000000.00",
        tenorProposed: 36,
        myLevel: { jobLevel: 2, subLevel: 1, isFinalApprover: false },
        allowedActions: ["APPROVE", "REJECT", "RETURN"],
        blockedReason: null,
      });
    });

    it("AC-72.03 disables the level 1 actions while level 2 has not decided", async () => {
      const { applicationId } = await submitted("600000000.00");

      const approval = await approvalOf(regionalHead, applicationId);

      expect(approval).toMatchObject({
        myLevel: { jobLevel: 1, subLevel: 1, isFinalApprover: true },
        allowedActions: [],
        blockedReason: "Waiting for level 2 approval",
      });
      expect(approval.chain).toMatchObject([
        { jobLevel: 2, subLevel: 1, description: "Kepala Cabang", decision: "PENDING", decidedAt: null },
        { jobLevel: 1, subLevel: 1, description: "Kepala Wilayah", decision: "PENDING", decidedAt: null },
      ]);
    });

    it("AC-72.05 shows no decision for the approver who submitted the application", async () => {
      const { applicationId } = await submitted("100000000.00", { submittedBy: branchHead.userId });

      expect(await approvalOf(branchHead, applicationId)).toMatchObject({
        allowedActions: [],
        blockedReason: "You cannot approve an application you submitted",
      });
    });

    it("AC-97.05 shows the Approver interest rate range of the SubProduct", async () => {
      const { applicationId } = await submitted("100000000.00");

      expect(await approvalOf(branchHead, applicationId)).toMatchObject({
        interestRate: "14.0000",
        approverRateMin: "11.0000",
        approverRateMax: "15.0000",
        rateEditable: true,
      });
    });

    it("lets an inquiry user read the chain without actions", async () => {
      const { applicationId } = await submitted("600000000.00");

      expect(await approvalOf(inquirer, applicationId)).toMatchObject({
        myLevel: null,
        allowedActions: [],
        blockedReason: null,
      });
    });

    it("hides an application outside the approver chain (APPLICATION_NOT_FOUND)", async () => {
      const { applicationId } = await submitted("600000000.00");

      expectError(
        await get(otherApprover, `${applicationId}/approval`),
        404,
        "APPLICATION_NOT_FOUND",
        "Application not found",
      );
    });

    it("rejects an application that has not reached Approval (NOT_FOUND)", async () => {
      const { applicationId } = await submitted("600000000.00", { start: false });

      expectError(await get(inquirer, `${applicationId}/approval`), 404, "NOT_FOUND", standardErrors.NOT_FOUND.message);
    });

    it("rejects an unknown application (APPLICATION_NOT_FOUND)", async () => {
      expectError(await get(inquirer, `${uuidv7()}/approval`), 404, "APPLICATION_NOT_FOUND", "Application not found");
    });

    it("rejects a user without Approval or Inquiry access", async () => {
      const outsider = await createSession(db.owner, { roleId: null });
      const { applicationId } = await submitted("600000000.00");

      expectError(
        await get(outsider, `${applicationId}/approval`),
        403,
        "ACCESS_DENIED",
        standardErrors.ACCESS_DENIED.message,
      );
    });
  });

  describe("GET /applications/{id}/financing", () => {
    it("AC-74.01 shows the auto approval credit structure with the last outstanding at Rp0", async () => {
      const { applicationId } = await submitted("8000000.00");

      const financing = await financingOf(applicationId);

      expect(financing).toMatchObject({
        loanAmount: "8000000.00",
        tenor: 36,
        interestType: "EFFECTIVE",
        interestRate: "14.0000",
        approvalType: "AUTO",
        insuranceValue: "0.00",
        sp3kNumber: null,
      });
      expect(financing.schedule).toHaveLength(36);
      expect(financing.schedule.at(-1)?.outstandingAmount).toBe("0.00");
    });

    it("AC-97.06 recalculates the schedule with the Approver interest rate 13%", async () => {
      const { applicationId, processId } = await submitted("600000000.00");
      if (!processId) throw new Error("process expected");
      const actor = { tenantId: seedCompanyIds.company001, userId: regionalHead.userId };

      await app.get(TenantTx).withTenantTx(actor, async (tx) => {
        const parameterSnapshot = (await app.get(OrchestratorApi).parameterSnapshot(tx, processId)) ?? {};
        const process = { ...actor, applicationId, processInstanceId: processId, parameterSnapshot };
        await app
          .get(FinancingBuilder)
          .build(tx, process, { approvalType: "MANUAL", interestRate: new Decimal(13) }, actor.userId);
      });
      const financing = await financingOf(applicationId);

      expect(financing).toMatchObject({ interestRate: "13.0000", approvalType: "MANUAL" });
      // Bunga baris pertama = 600.000.000 x 13% / 12, dibulatkan ke rupiah.
      expect(financing.schedule[0]?.interestAmount).toBe("6500000.00");
      expect(financing.schedule.at(-1)?.outstandingAmount).toBe("0.00");
    });

    it("rejects a financing before approval (NOT_FOUND)", async () => {
      const { applicationId } = await submitted("600000000.00");

      expectError(
        await get(inquirer, `${applicationId}/financing`),
        404,
        "NOT_FOUND",
        "Financing is not available yet",
      );
    });

    it("rejects an unknown application (APPLICATION_NOT_FOUND)", async () => {
      expectError(await get(inquirer, `${uuidv7()}/financing`), 404, "APPLICATION_NOT_FOUND", "Application not found");
    });
  });
});

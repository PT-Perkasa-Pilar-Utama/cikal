import { errorEnvelopeSchema, type ProductCategory, type StepCode } from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { expect } from "vitest";
import { seedRoleIds } from "../../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../../src/modules/core/organization/index.js";
import { AC_72_06_LEVELS, insertApprovalSetup } from "./approval.js";
import { drainProcessJobs, insertApplication, insertRoute, startProcess } from "./process.js";
import { insertProduct, insertSubProduct } from "./product.js";
import { createRole, createSession, type TestSession } from "./session.js";

type Response = { statusCode: number; json(): unknown };

/** Pelaku uji keputusan approval: Sales penginput, Kepala Cabang level 2, Kepala Wilayah level 1. */
export interface ApprovalActors {
  sales: TestSession;
  branchHead: TestSession;
  regionalHead: TestSession;
  inquirer: TestSession;
}

export async function approvalActors(owner: pg.Pool): Promise<ApprovalActors> {
  const approverRole = await createRole(owner, `Approver ${uuidv7().slice(-6)}`, [
    { menuCode: "OPS-APPROVAL", view: true, approve: true },
  ]);
  return {
    sales: await createSession(owner, { roleId: seedRoleIds.sales }),
    branchHead: await createSession(owner, { roleId: approverRole }),
    regionalHead: await createSession(owner, { roleId: approverRole }),
    inquirer: await createSession(owner, { roleId: seedRoleIds.riskManager }),
  };
}

/**
 * Pengajuan KTA tenor 36 bunga 14% (rentang Approver 11% s.d. 15%) yang sudah menunggu di langkah APPROVAL KPR
 * Bandung AC-72.06. `isReturn` mengatur flag "Is Return" kedua level (AC-73.03).
 */
export async function waitingApproval(
  app: NestFastifyApplication,
  owner: pg.Pool,
  actors: ApprovalActors,
  requestedLimit: string,
  options: {
    isReturn?: boolean;
    submittedBy?: string;
    productCategory?: ProductCategory;
    routeSteps?: Partial<Record<StepCode, boolean>>;
  } = {},
): Promise<{ applicationId: string; processId: string }> {
  const productId = await insertProduct(owner, { productCategory: options.productCategory });
  await insertSubProduct(owner, productId, {
    interestRate: "14.0000",
    validFrom: "2026-10-01",
    approverRateMin: "11.0000",
    approverRateMax: "15.0000",
  });
  await insertApprovalSetup(owner, productId, {
    levels: AC_72_06_LEVELS.map((level) => ({ ...level, isReturn: options.isReturn ?? true })),
    approvers: [
      { jobLevel: 2, approverUserId: actors.branchHead.userId, upLevel: 1, upSubLevel: 1 },
      { jobLevel: 1, approverUserId: actors.regionalHead.userId },
    ],
  });
  await insertRoute(owner, productId, [
    { versionNumber: 1, status: "ACTIVE", steps: { DATA_ENTRY: true, APPROVAL: true, ...options.routeSteps } },
  ]);
  const applicationId = await insertApplication(owner, {
    productId,
    submittedBy: options.submittedBy ?? actors.sales.userId,
    branchId: seedOrganizationIds.bandung,
    requestedLimit,
    tenorProposed: 36,
    productCategory: options.productCategory,
  });
  const processId = await startProcess(app, applicationId);
  await drainProcessJobs(app, owner);
  return { applicationId, processId };
}

/** `POST /applications/{id}/approval/decision` dengan `Idempotency-Key` baru (api-specs 16 §16.6). */
export function decide(app: NestFastifyApplication, session: TestSession, applicationId: string, payload: object) {
  return app.inject({
    method: "POST",
    url: `/api/v1/applications/${applicationId}/approval/decision`,
    headers: { ...session.headers, "idempotency-key": uuidv7() },
    payload,
  });
}

export function expectError(res: Response, status: number, code: string, message: string): void {
  expect(res.statusCode).toBe(status);
  expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
}

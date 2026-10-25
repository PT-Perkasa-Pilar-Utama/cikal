import {
  type ApprovalHierarchyCreate,
  approvalHierarchyListResponseSchema,
  changeRequestAcceptedSchema,
  errorEnvelopeSchema,
} from "@cikal/contracts";
import type { NestFastifyApplication } from "@nestjs/platform-fastify";
import { expect } from "vitest";
import { seedUserId } from "../../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../../src/modules/core/organization/index.js";
import { seedProductIds } from "../../src/modules/core/product/index.js";
import type { TestSession } from "./session.js";

type Response = { statusCode: number; json(): unknown };

/** Body "New Hierarchy" KTA QA Bandung level 2 sub level 2 yang naik ke level 1 (seed `qa`). */
export const newHierarchy = (fields: Partial<ApprovalHierarchyCreate> = {}): ApprovalHierarchyCreate => ({
  branchId: seedOrganizationIds.bandung,
  productId: seedProductIds.ktaQa,
  jobLevel: 2,
  subLevel: 2,
  approverUserId: seedUserId("approver.01"),
  upLevel: 1,
  upSubLevel: 1,
  ...fields,
});

/** Panggilan API Approval Hierarchy oleh Maker dan persetujuan Checker (api-specs 16 §16.1 s.d. §16.3). */
export function hierarchyApi(app: NestFastifyApplication, maker: TestSession, checker: TestSession) {
  const send = (session: TestSession, method: "GET" | "POST" | "PUT", url: string, payload?: object) =>
    app.inject({ method, url: `/api/v1${url}`, headers: session.headers, payload });
  return {
    send,
    expectError: (res: Response, status: number, code: string, message: string) => {
      expect(res.statusCode).toBe(status);
      expect(errorEnvelopeSchema.parse(res.json())).toMatchObject({ code, message });
    },
    hierarchies: async (query = "") =>
      approvalHierarchyListResponseSchema.parse((await send(maker, "GET", `/approval-hierarchies${query}`)).json()),
    submitted: (res: Response): string => {
      expect(res.statusCode).toBe(202);
      const body = changeRequestAcceptedSchema.parse(res.json());
      expect(body.message).toBe("Data submitted for approval");
      return body.data.changeRequestId;
    },
    approve: async (changeRequestId: string) => {
      const res = await send(checker, "POST", `/change-requests/${changeRequestId}/approve`, {});
      expect(res.statusCode).toBe(200);
    },
  };
}

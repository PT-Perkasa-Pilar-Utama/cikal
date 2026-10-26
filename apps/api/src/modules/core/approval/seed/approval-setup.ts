import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { seedUserId } from "../../identity/index.js";
import { seedOrganizationIds } from "../../organization/index.js";
import { seedProductIds } from "../../product/index.js";
import { seedCompanyIds } from "../../tenancy/index.js";
import { hierarchies, levels } from "../db/schema.js";

/** ID tetap setup approval seed; tidak boleh diubah setelah di-merge. */
export const seedApprovalIds = {
  ktaQaLevel2: "0192b6af-0002-7000-8000-000000000001",
  ktaQaLevel1: "0192b6af-0001-7000-8000-000000000001",
  ktaQaHierarchy2: "0192b6af-0102-7000-8000-000000000001",
  ktaQaHierarchy1: "0192b6af-0101-7000-8000-000000000001",
} as const;

const ALL_ACTIONS = { isApprove: true, isReject: true, isReturn: true, isCancel: false } as const;

/**
 * Setup approval KTA QA Bandung (seed `qa`) dengan rentang AC-72.06: level 2 Kepala Cabang untuk 0 s.d.
 * 500.000.000 lalu naik ke level 1 Kepala Wilayah (final) untuk 500.000.001 s.d. 2.000.000.000.
 */
export async function seedApprovalSetup(db: NodePgDatabase): Promise<void> {
  const scope = {
    tenantId: seedCompanyIds.company001,
    branchId: seedOrganizationIds.bandung,
    productId: seedProductIds.ktaQa,
  };
  await db
    .insert(levels)
    .values([
      {
        ...scope,
        ...ALL_ACTIONS,
        id: seedApprovalIds.ktaQaLevel2,
        jobLevel: 2,
        description: "Kepala Cabang",
        amountBegin: "0.00",
        amountEnd: "500000000.00",
        isFinalApprover: false,
      },
      {
        ...scope,
        ...ALL_ACTIONS,
        id: seedApprovalIds.ktaQaLevel1,
        jobLevel: 1,
        description: "Kepala Wilayah",
        amountBegin: "500000001.00",
        amountEnd: "2000000000.00",
        isFinalApprover: true,
      },
    ])
    .onConflictDoNothing();
  await db
    .insert(hierarchies)
    .values([
      {
        ...scope,
        id: seedApprovalIds.ktaQaHierarchy2,
        jobLevel: 2,
        subLevel: 1,
        upLevel: 1,
        upSubLevel: 1,
        approverUserId: seedUserId("kepala.cabang"),
      },
      {
        ...scope,
        id: seedApprovalIds.ktaQaHierarchy1,
        jobLevel: 1,
        subLevel: 1,
        approverUserId: seedUserId("approver.01"),
      },
    ])
    .onConflictDoNothing();
}

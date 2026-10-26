import type pg from "pg";
import { v7 as uuidv7 } from "uuid";
import { seedUserId } from "../../src/modules/core/identity/index.js";
import { seedOrganizationIds } from "../../src/modules/core/organization/index.js";
import { seedCompanyIds } from "../../src/modules/core/tenancy/index.js";

interface LevelSeed {
  jobLevel: number;
  description: string;
  amountBegin: string;
  amountEnd: string;
  isReturn?: boolean;
  isFinalApprover: boolean;
}

interface ApproverSeed {
  jobLevel: number;
  subLevel?: number;
  approverUserId: string;
  upLevel?: number;
  upSubLevel?: number;
  isActive?: boolean;
}

/** Level KPR Bandung AC-72.06: level 2 untuk 0 s.d. 500.000.000, level 1 (final) sampai 2.000.000.000. */
export const AC_72_06_LEVELS: LevelSeed[] = [
  { jobLevel: 2, description: "Kepala Cabang", amountBegin: "0", amountEnd: "500000000", isFinalApprover: false },
  {
    jobLevel: 1,
    description: "Kepala Wilayah",
    amountBegin: "500000001",
    amountEnd: "2000000000",
    isFinalApprover: true,
  },
];

/** Kepala Cabang di level 2 naik ke Approver level 1 (seed `dev`). */
export const defaultApprovers = (): ApproverSeed[] => [
  { jobLevel: 2, approverUserId: seedUserId("kepala.cabang"), upLevel: 1, upSubLevel: 1 },
  { jobLevel: 1, approverUserId: seedUserId("approver.01") },
];

/** Approval Level dan Hierarchy satu produk, ditulis lewat role pemilik skema seperti hasil seed dan Checker. */
export async function insertApprovalSetup(
  owner: pg.Pool,
  productId: string,
  options: { branchId?: string; levels?: LevelSeed[]; approvers?: ApproverSeed[] } = {},
): Promise<void> {
  const tenantId = seedCompanyIds.company001;
  const branchId = options.branchId ?? seedOrganizationIds.bandung;
  for (const level of options.levels ?? AC_72_06_LEVELS) {
    await owner.query(
      `insert into approval.levels (id, tenant_id, branch_id, product_id, job_level, description, amount_begin,
         amount_end, is_approve, is_reject, is_return, is_cancel, is_final_approver)
       values ($1, $2, $3, $4, $5, $6, $7, $8, true, true, $9, false, $10)`,
      [
        uuidv7(),
        tenantId,
        branchId,
        productId,
        level.jobLevel,
        level.description,
        level.amountBegin,
        level.amountEnd,
        level.isReturn ?? true,
        level.isFinalApprover,
      ],
    );
  }
  for (const approver of options.approvers ?? defaultApprovers()) {
    await owner.query(
      `insert into approval.hierarchies (id, tenant_id, branch_id, product_id, job_level, sub_level, up_level,
         up_sub_level, approver_user_id, is_active)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        uuidv7(),
        tenantId,
        branchId,
        productId,
        approver.jobLevel,
        approver.subLevel ?? 1,
        approver.upLevel ?? null,
        approver.upSubLevel ?? null,
        approver.approverUserId,
        approver.isActive ?? true,
      ],
    );
  }
}

export interface ApprovalRow {
  sequence: number;
  job_level: number | null;
  sub_level: number | null;
  approver_user_id: string | null;
  decision: string;
}

/** Rantai approval satu proses, dibaca role pemilik skema. */
export async function approvalChain(owner: pg.Pool, processInstanceId: string): Promise<ApprovalRow[]> {
  const { rows } = await owner.query<ApprovalRow>(
    `select sequence, job_level, sub_level, approver_user_id, decision from approval.application_approvals
      where process_instance_id = $1 order by sequence`,
    [processInstanceId],
  );
  return rows;
}

/** Tugas antrean satu pengajuan yang belum ditutup. */
export async function openTasks(
  owner: pg.Pool,
  applicationId: string,
): Promise<{ queue_code: string; status: string; assigned_user_id: string | null; branch_id: string | null }[]> {
  const { rows } = await owner.query(
    `select queue_code, status, assigned_user_id, branch_id from taskqueue.human_tasks
      where application_id = $1 and status <> 'CLOSED' order by created_at`,
    [applicationId],
  );
  return rows;
}

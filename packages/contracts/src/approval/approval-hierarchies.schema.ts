import { z } from "zod";
import { userStatusSchema } from "../access-control/users.schema.js";
import { pageEnvelope } from "../common/envelope.js";
import { id } from "../common/scalars.js";

/** Pesan Approval Hierarchy (api-specs 16 §16.2); selain AC-27.02 teksnya usulan engineering. */
export const APPROVAL_HIERARCHY_MESSAGES = {
  approverWithoutAccess: "Selected user does not have approval access",
  levelNotFound: (jobLevel: number) => `Approval level ${jobLevel} is not set up for this branch and product`,
  hierarchyExists: "This approver is already assigned to this level",
  upLevelPair: "Up Level and Up Sub Level must be filled together",
} as const;

const level = z.int().min(1);
const nextLevel = level.nullable().optional();

/** Level berikutnya dalam rantai diisi berpasangan atau dikosongkan berdua (RM-06). */
const upLevelPaired = (value: { upLevel?: number | null; upSubLevel?: number | null }) =>
  (value.upLevel == null) === (value.upSubLevel == null);
const upLevelIssue = { message: APPROVAL_HIERARCHY_MESSAGES.upLevelPair, path: ["upSubLevel"] };

/** Body `POST /approval-hierarchies` (api-specs 16 §16.2). */
export const approvalHierarchyCreateSchema = z
  .object({
    branchId: id,
    productId: id,
    jobLevel: level,
    subLevel: level,
    approverUserId: id,
    upLevel: nextLevel,
    upSubLevel: nextLevel,
  })
  .refine(upLevelPaired, upLevelIssue);
export type ApprovalHierarchyCreate = z.infer<typeof approvalHierarchyCreateSchema>;

/** Body `PUT /approval-hierarchies/{id}` (api-specs 16 §16.3). */
export const approvalHierarchyUpdateSchema = z
  .object({
    approverUserId: id,
    upLevel: nextLevel,
    upSubLevel: nextLevel,
    isActive: z.boolean(),
  })
  .refine(upLevelPaired, upLevelIssue);
export type ApprovalHierarchyUpdate = z.infer<typeof approvalHierarchyUpdateSchema>;

/** `newData` ChangeRequest `APPROVAL_HIERARCHY`; kode dan nama disimpan untuk halaman Pending (api-specs 07 §7.2). */
export const approvalHierarchyDataSchema = z.object({
  branchId: id,
  branchCode: z.string(),
  productId: id,
  productCode: z.string(),
  jobLevel: level,
  subLevel: level,
  levelDescription: z.string(),
  approverUserId: id,
  approverUsername: z.string(),
  upLevel: level.nullable(),
  upSubLevel: level.nullable(),
  isActive: z.boolean(),
});
export type ApprovalHierarchyData = z.infer<typeof approvalHierarchyDataSchema>;

/** Query `GET /approval-hierarchies` (api-specs 16 §16.1). */
export const approvalHierarchyListQuerySchema = z.object({
  branchId: id.optional(),
  productId: id.optional(),
  jobLevel: z.coerce.number().int().min(1).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(["branchCode,asc", "branchCode,desc", "jobLevel,asc", "jobLevel,desc"]).default("branchCode,asc"),
});
export type ApprovalHierarchyListQuery = z.infer<typeof approvalHierarchyListQuerySchema>;

/** Baris halaman "Approval Hierarchy"; `approverInactive` dirender "Inactive approver" (AC-27.03). */
export const approvalHierarchySchema = z.object({
  id,
  branch: z.object({ id, branchCode: z.string() }),
  product: z.object({ id, productCode: z.string() }),
  jobLevel: level,
  subLevel: level,
  levelDescription: z.string(),
  upLevel: level.nullable(),
  upSubLevel: level.nullable(),
  approver: z.object({ id, username: z.string(), fullName: z.string(), status: userStatusSchema }),
  approverInactive: z.boolean(),
  isActive: z.boolean(),
  hasPendingChange: z.boolean(),
});
export type ApprovalHierarchy = z.infer<typeof approvalHierarchySchema>;

export const approvalHierarchyListResponseSchema = pageEnvelope(approvalHierarchySchema);
export type ApprovalHierarchyListResponse = z.infer<typeof approvalHierarchyListResponseSchema>;

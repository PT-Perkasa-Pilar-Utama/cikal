import { z } from "zod";
import { pageEnvelope } from "../common/envelope.js";
import { id } from "../common/scalars.js";

/** `includeInactive` hanya untuk halaman Organization (`MST-ORG`); dropdown lain melihat unit aktif (AC-17.06). */
const includeInactive = z
  .enum(["true", "false"])
  .default("false")
  .transform((value) => value === "true");
const q = z.string().trim().min(1).optional();
const page = z.coerce.number().int().min(1).default(1);
/** Dropdown memuat sekaligus sampai 100 unit (api-specs 05 §5.1). */
const pageSize = z.coerce.number().int().min(1).max(100).default(100);

export const regionalSchema = z.object({
  id,
  regionalCode: z.string(),
  regionalName: z.string(),
  isActive: z.boolean(),
});
export type Regional = z.infer<typeof regionalSchema>;

export const branchSchema = z.object({
  id,
  branchCode: z.string(),
  branchName: z.string(),
  regional: regionalSchema.pick({ id: true, regionalCode: true, regionalName: true }),
  isActive: z.boolean(),
});
export type Branch = z.infer<typeof branchSchema>;

export const subBranchSchema = z.object({
  id,
  subBranchCode: z.string(),
  subBranchName: z.string(),
  isActive: z.boolean(),
});
export type SubBranch = z.infer<typeof subBranchSchema>;

/** Query `GET /branches` (api-specs 05 §5.1). */
export const branchListQuerySchema = z.object({
  regionalId: id.optional(),
  q,
  includeInactive,
  page,
  pageSize,
  sort: z.enum(["branchCode,asc", "branchCode,desc", "branchName,asc", "branchName,desc"]).default("branchCode,asc"),
});
export type BranchListQuery = z.infer<typeof branchListQuerySchema>;

/** Query `GET /regionals` (api-specs 05 §5.2). */
export const regionalListQuerySchema = z.object({
  q,
  includeInactive,
  page,
  pageSize,
  sort: z
    .enum(["regionalCode,asc", "regionalCode,desc", "regionalName,asc", "regionalName,desc"])
    .default("regionalCode,asc"),
});
export type RegionalListQuery = z.infer<typeof regionalListQuerySchema>;

/** Query `GET /branches/{id}/sub-branches` (api-specs 05 §5.2). */
export const subBranchListQuerySchema = z.object({
  q,
  includeInactive,
  page,
  pageSize,
  sort: z
    .enum(["subBranchCode,asc", "subBranchCode,desc", "subBranchName,asc", "subBranchName,desc"])
    .default("subBranchCode,asc"),
});
export type SubBranchListQuery = z.infer<typeof subBranchListQuerySchema>;

export const branchListResponseSchema = pageEnvelope(branchSchema);
export type BranchListResponse = z.infer<typeof branchListResponseSchema>;
export const regionalListResponseSchema = pageEnvelope(regionalSchema);
export type RegionalListResponse = z.infer<typeof regionalListResponseSchema>;
export const subBranchListResponseSchema = pageEnvelope(subBranchSchema);
export type SubBranchListResponse = z.infer<typeof subBranchListResponseSchema>;

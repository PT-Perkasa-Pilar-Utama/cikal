import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { id, money, percent, timestamp } from "../common/scalars.js";

/** Pesan routing dan detail approval (api-specs 16 §16.4 s.d. §16.6); `noBranch` teks usulan engineering. */
export const APPROVAL_MESSAGES = {
  noLevelCoversAmount: "No approval level covers this amount",
  noSetup: (branchCode: string, productCode: string) =>
    `No approval setup for branch ${branchCode} and product ${productCode}`,
  noActiveApprover: (jobLevel: number) => `No active approver for level ${jobLevel}`,
  noBranch: "The application has no branch for approval routing",
  waitingLowerLevel: (jobLevel: number) => `Waiting for level ${jobLevel} approval`,
  submitterCannotApprove: "You cannot approve an application you submitted",
  rateOutOfRange: (min: string, max: string) => `Interest rate must be between ${min}% and ${max}%`,
} as const;

/** Keputusan satu baris rantai; `AUTO_APPROVED` oleh System tanpa level (RM-05). */
export const approvalDecisionSchema = z.enum(["PENDING", "APPROVE", "REJECT", "RETURN", "AUTO_APPROVED"]);
export type ApprovalDecision = z.infer<typeof approvalDecisionSchema>;

/** Tombol keputusan approver (api-specs 16 §16.6). */
export const approvalActionSchema = z.enum(["APPROVE", "REJECT", "RETURN"]);
export type ApprovalAction = z.infer<typeof approvalActionSchema>;

const level = z.int().min(1);

export const approvalChainEntrySchema = z.object({
  jobLevel: level,
  subLevel: level,
  description: z.string(),
  approver: z.object({ username: z.string() }),
  decision: approvalDecisionSchema,
  comment: z.string().nullable(),
  decidedAt: timestamp.nullable(),
});
export type ApprovalChainEntry = z.infer<typeof approvalChainEntrySchema>;

/**
 * Halaman "Approval Detail" (api-specs 16 §16.5): rantai dari level terendah, struktur kredit usulan, dan tombol yang
 * boleh dipakai. `blockedReason` terisi berarti `allowedActions` kosong (AC-72.03, AC-72.05).
 */
export const applicationApprovalSchema = z.object({
  applicationId: id,
  loanId: z.string(),
  requestedLimit: money,
  tenorProposed: z.int(),
  interestRate: percent,
  approverRateMin: percent.nullable(),
  approverRateMax: percent.nullable(),
  rateEditable: z.boolean(),
  chain: z.array(approvalChainEntrySchema),
  myLevel: z.object({ jobLevel: level, subLevel: level, isFinalApprover: z.boolean() }).nullable(),
  allowedActions: z.array(approvalActionSchema),
  blockedReason: z.string().nullable(),
});
export type ApplicationApproval = z.infer<typeof applicationApprovalSchema>;

export const applicationApprovalResponseSchema = dataEnvelope(applicationApprovalSchema);
export type ApplicationApprovalResponse = z.infer<typeof applicationApprovalResponseSchema>;

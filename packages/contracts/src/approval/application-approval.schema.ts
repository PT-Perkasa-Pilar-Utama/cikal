import { z } from "zod";
import { applicationStatusSchema } from "../application/application.schema.js";
import { dataEnvelope } from "../common/envelope.js";
import { id, money, percent, timestamp } from "../common/scalars.js";
import { stepCodeSchema } from "../orchestrator/step.js";

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

/** Pesan keputusan approver (api-specs 16 §16.6). */
export const APPROVAL_DECISION_MESSAGES = {
  approved: "Loan application is successfully approved",
  rejected: "Loan application has been rejected",
  returned: "Application returned to sales",
  commentRequired: "Approval comments are required",
  commentTooLong: "Approval comments must not exceed 1000 characters",
  alreadyProcessed: "This application has already been processed",
} as const;

/** Batas panjang "Approval Comments" (AC-73.05). */
export const APPROVAL_COMMENT_MAX = 1000;

/**
 * Body `POST /applications/{id}/approval/decision` (api-specs 16 §16.6). Komentar kosong dan terlalu panjang dijawab
 * `422 COMMENT_REQUIRED` dan `COMMENT_TOO_LONG` oleh aturan keputusan, bukan oleh skema. Struktur kredit hanya untuk
 * `APPROVE`.
 */
export const approvalDecisionRequestSchema = z.object({
  decision: approvalActionSchema,
  comment: z.string().default(""),
  interestRate: percent.optional(),
  tenorApproved: z.int().min(1).optional(),
  loanAmount: money.optional(),
});
export type ApprovalDecisionRequest = z.infer<typeof approvalDecisionRequestSchema>;

export const approvalDecisionResultSchema = z.object({
  decision: approvalActionSchema,
  jobLevel: level,
  isFinal: z.boolean(),
  applicationStatus: applicationStatusSchema,
  /** `APPROVAL` saat rantai lanjut ke level berikutnya; kosong bila proses berhenti di keputusan ini. */
  nextStep: stepCodeSchema.nullable(),
});
export type ApprovalDecisionResult = z.infer<typeof approvalDecisionResultSchema>;

export const approvalDecisionResponseSchema = dataEnvelope(approvalDecisionResultSchema);
export type ApprovalDecisionResponse = z.infer<typeof approvalDecisionResponseSchema>;

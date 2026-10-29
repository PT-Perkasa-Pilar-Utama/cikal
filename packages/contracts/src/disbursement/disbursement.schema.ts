import { z } from "zod";
import { applicationStatusSchema } from "../application/application.schema.js";
import { dataEnvelope } from "../common/envelope.js";
import { businessDate, id, money, timestamp } from "../common/scalars.js";
import { stepCodeSchema } from "../orchestrator/step.js";

/** Hasil Validity Check (US-76). */
export const validityStatusSchema = z.enum(["VALID", "NOT_VALID"]);
export type ValidityStatus = z.infer<typeof validityStatusSchema>;

/**
 * "Disbursement Detail" `GET /applications/{id}/disbursement` (api-specs 25 §25.1). `bankAccountNumber` kosong sampai
 * Print Akad mengisi rekening nasabah; `epolisDate` tidak dikirim karena M14 tidak berlisensi di POC (AC-76.06).
 */
export const disbursementDetailSchema = z.object({
  applicationId: id,
  loanId: z.string(),
  currentStep: stepCodeSchema.nullable(),
  disbursementAmount: money,
  bankAccountNumber: z.string().nullable(),
  disbursementDate: businessDate.nullable(),
  firstInstallmentDate: businessDate,
  validityStatus: validityStatusSchema.nullable(),
  notValidReason: z.string().nullable(),
  contractNumber: z.string().nullable(),
  contractDate: businessDate.nullable(),
  akadPrints: z.array(z.object({ generatedDocumentId: id, fileId: id, printCount: z.number().int().min(1) })),
  coreResponse: z.null(),
});
export type DisbursementDetail = z.infer<typeof disbursementDetailSchema>;

export const disbursementDetailResponseSchema = dataEnvelope(disbursementDetailSchema);
export type DisbursementDetailResponse = z.infer<typeof disbursementDetailResponseSchema>;

/** Body `POST /applications/{id}/validity-check` (api-specs 25 §25.2): tanggal wajib untuk Valid, alasan untuk Not Valid. */
export const validityCheckRequestSchema = z
  .strictObject({
    result: validityStatusSchema,
    disbursementDate: businessDate.optional(),
    firstInstallmentDate: businessDate.optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((body, ctx) => {
    const missing = body.result === "VALID" ? !body.disbursementDate : !body.reason;
    const path = body.result === "VALID" ? "disbursementDate" : "reason";
    if (missing) ctx.addIssue({ code: "custom", path: [path], message: "This field is required" });
  });
export type ValidityCheckRequest = z.infer<typeof validityCheckRequestSchema>;

export const validityCheckResponseSchema = z.union([
  z.object({
    data: z.object({
      validityStatus: z.literal("VALID"),
      disbursementDate: businessDate,
      firstInstallmentDate: businessDate,
      nextStep: stepCodeSchema.nullable(),
    }),
    message: z.literal("Disbursement data validated"),
  }),
  z.object({
    data: z.object({ validityStatus: z.literal("NOT_VALID"), applicationStatus: applicationStatusSchema }),
    message: z.literal("Disbursement data marked as not valid"),
  }),
]);
export type ValidityCheckResponse = z.infer<typeof validityCheckResponseSchema>;

const REQUIRED = "This field is required";
const requiredText = (max: number) => z.string({ error: REQUIRED }).trim().min(1, REQUIRED).max(max);

/** Body `POST /applications/{id}/akad/print` (api-specs 25 §25.3); field kosong "This field is required" (AC-77.02). */
export const akadPrintRequestSchema = z.strictObject({
  paymentMethod: requiredText(30),
  bankAccountNumber: requiredText(30),
  customerAccountNumber: requiredText(30),
  riskManagerUserId: z.uuid({ error: REQUIRED }),
});
export type AkadPrintRequest = z.infer<typeof akadPrintRequestSchema>;

/** PDF "Surat Perjanjian Kredit" diunduh dari `downloadUrl` berumur 5 menit (AC-77.01, AC-102.08). */
export const akadPrintResponseSchema = dataEnvelope(
  z.object({
    contractNumber: z.string(),
    contractDate: businessDate,
    generatedDocumentId: id,
    fileId: id,
    downloadUrl: z.url(),
    expiresAt: timestamp,
    nextStep: stepCodeSchema.nullable(),
  }),
);
export type AkadPrintResponse = z.infer<typeof akadPrintResponseSchema>;

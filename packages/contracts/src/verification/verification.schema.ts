import { z } from "zod";
import { applicationStatusSchema } from "../application/application.schema.js";
import { documentVerificationStatusSchema } from "../application/documents.schema.js";
import { dataEnvelope } from "../common/envelope.js";
import { businessDate, id } from "../common/scalars.js";
import { stepCodeSchema } from "../orchestrator/step.js";

/** Pesan verifikasi dokumen (api-specs 15); `incomplete` teks usulan engineering. */
export const VERIFICATION_MESSAGES = {
  saved: "Verification saved",
  submitted: "Verification submitted",
  remarksRequired: "Remarks are required for Not Match documents",
  incomplete: "Please verify all documents",
  alreadyProcessed: "This application has already been processed",
} as const;

/** Batas panjang "Remarks" per dokumen (api-specs 15 §15.2). */
export const VERIFICATION_REMARKS_MAX = 500;

/** Hasil verifikasi satu proses (technical-specs 06 §6.10 DOCUMENT_VERIFICATIONS). */
export const verificationResultSchema = z.enum(["IN_PROGRESS", "ALL_MATCH", "HAS_NOT_MATCH"]);
export type VerificationResult = z.infer<typeof verificationResultSchema>;

export const verificationDocumentInputSchema = z.object({
  documentType: z.string().trim().min(1),
  verificationStatus: documentVerificationStatusSchema,
  remarks: z.string().trim().max(VERIFICATION_REMARKS_MAX).nullable().optional(),
});
export type VerificationDocumentInput = z.infer<typeof verificationDocumentInputSchema>;

/** Body `PUT /applications/{id}/verification` dan `POST .../verification/submit` (api-specs 15 §15.2, §15.3). */
export const verificationSaveRequestSchema = z.object({ documents: z.array(verificationDocumentInputSchema) });
export type VerificationSaveRequest = z.infer<typeof verificationSaveRequestSchema>;

export const verificationDocumentSchema = z.object({
  documentType: z.string(),
  label: z.string(),
  isMandatory: z.boolean(),
  fileId: id,
  verificationStatus: documentVerificationStatusSchema,
  remarks: z.string().nullable(),
});
export type VerificationDocument = z.infer<typeof verificationDocumentSchema>;

/** Layar "Proceed to Verification" (api-specs 15 §15.1); `editable` hanya untuk pemilik tugas. */
export const applicationVerificationSchema = z.object({
  applicationId: id,
  loanId: z.string(),
  taskId: id,
  editable: z.boolean(),
  documents: z.array(verificationDocumentSchema),
  applicantSummary: z.object({
    fullName: z.string().nullable(),
    idCardNumber: z.string().nullable(),
    dateOfBirth: businessDate.nullable(),
  }),
});
export type ApplicationVerification = z.infer<typeof applicationVerificationSchema>;

export const applicationVerificationResponseSchema = dataEnvelope(applicationVerificationSchema);
export type ApplicationVerificationResponse = z.infer<typeof applicationVerificationResponseSchema>;

export const verificationSaveResponseSchema = dataEnvelope(
  z.object({ savedCount: z.int().min(0), pendingCount: z.int().min(0) }),
);
export type VerificationSaveResponse = z.infer<typeof verificationSaveResponseSchema>;

export const verificationSubmitResponseSchema = dataEnvelope(
  z.object({
    result: verificationResultSchema.exclude(["IN_PROGRESS"]),
    /** Langkah berikutnya untuk `ALL_MATCH`; kosong saat pengajuan kembali ke Draft. */
    nextStep: stepCodeSchema.nullable(),
    applicationStatus: applicationStatusSchema,
  }),
);
export type VerificationSubmitResponse = z.infer<typeof verificationSubmitResponseSchema>;

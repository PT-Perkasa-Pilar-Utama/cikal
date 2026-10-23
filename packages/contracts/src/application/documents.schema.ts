import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { id, timestamp } from "../common/scalars.js";
import { applicationStatusSchema } from "./application.schema.js";

/** Pesan dokumen dan submit pengajuan (api-specs 12 §12.6 s.d. §12.8). */
export const APPLICATION_SUBMIT_MESSAGES = {
  checklistNotConfigured: "No document checklist is configured for this product. Please contact your administrator",
  documentNotInChecklist: "Document type is not in the checklist",
  incompleteApplication: "Please complete all required fields",
  alreadySubmitted: "This application has already been submitted",
  documentsIncomplete: (uploaded: number, required: number): string =>
    `Please upload all required documents (${uploaded} of ${required} required)`,
  submitted: (loanId: string): string => `Application submitted. Loan ID: ${loanId}`,
} as const;

/** Dokumen wajib terunggah dibanding wajib menurut checklist; dokumen opsional tidak dihitung (AC-47.06). */
export const documentCompletenessSchema = z.object({
  uploadedMandatory: z.number().int().min(0),
  requiredMandatory: z.number().int().min(0),
});
export type DocumentCompleteness = z.infer<typeof documentCompletenessSchema>;

export const documentVerificationStatusSchema = z.enum(["PENDING", "MATCH", "NOT_MATCH"]);

export const slotFileSchema = z.object({
  fileId: id,
  fileName: z.string(),
  sizeBytes: z.number().int().min(0),
  uploadedAt: timestamp,
});

export const documentSlotSchema = z.object({
  documentType: z.string(),
  label: z.string(),
  isMandatory: z.boolean(),
  file: slotFileSchema.nullable(),
  verificationStatus: documentVerificationStatusSchema,
});

/** Respons `GET /applications/{id}/documents` (api-specs 12 §12.6). */
export const applicationDocumentsResponseSchema = dataEnvelope(
  z.object({ slots: z.array(documentSlotSchema), completeness: documentCompletenessSchema }),
);
export type ApplicationDocumentsResponse = z.infer<typeof applicationDocumentsResponseSchema>;

/** Respons `PUT /applications/{id}/documents/{documentType}` (api-specs 12 §12.7). */
export const documentUploadResponseSchema = dataEnvelope(
  z.object({ documentType: z.string(), file: slotFileSchema, completeness: documentCompletenessSchema }),
);
export type DocumentUploadResponse = z.infer<typeof documentUploadResponseSchema>;

/** Respons `POST /applications/{id}/submit` (api-specs 12 §12.8). */
export const applicationSubmitResponseSchema = dataEnvelope(
  z.object({ id, loanId: z.string(), status: applicationStatusSchema, processInstanceId: id }),
);
export type ApplicationSubmitResponse = z.infer<typeof applicationSubmitResponseSchema>;

import { z } from "zod";
import { dataEnvelope } from "../common/envelope.js";
import { id, timestamp } from "../common/scalars.js";

/** Jenis dokumen bernomor (grooming v3 DN-01, api-specs 10 §10.5). */
export const documentTypeSchema = z.enum(["SP3K", "CONTRACT"]);
export type DocumentType = z.infer<typeof documentTypeSchema>;

/** Periode reset nomor urut (DN-04). */
export const resetPeriodSchema = z.enum(["NONE", "YEARLY", "MONTHLY", "DAILY"]);
export type ResetPeriod = z.infer<typeof resetPeriodSchema>;

/** Cakupan counter nomor urut (DN-04). */
export const counterScopeSchema = z.enum(["COMPANY", "BRANCH", "PRODUCT", "BRANCH_PRODUCT"]);
export type CounterScope = z.infer<typeof counterScopeSchema>;

/** Status versi format (technical-specs 06 §6.13 data berversi). */
export const numberFormatStatusSchema = z.enum(["DRAFT", "WAITING_APPROVAL", "ACTIVE", "SUPERSEDED"]);
export type NumberFormatStatus = z.infer<typeof numberFormatStatusSchema>;

const formatSettings = {
  pattern: z.string().min(1).max(100),
  resetPeriod: resetPeriodSchema,
  counterScope: counterScopeSchema,
};

/** Satu baris halaman "Document Number Format" (api-specs 10 §10.3). */
export const documentNumberFormatSchema = z.object({
  id,
  documentType: documentTypeSchema,
  ...formatSettings,
  versionNumber: z.number().int().min(1),
  status: z.literal("ACTIVE"),
  effectiveFrom: timestamp,
  hasPendingChange: z.boolean(),
});
export type DocumentNumberFormat = z.infer<typeof documentNumberFormatSchema>;

/** `GET /document-number-formats` (api-specs 10 §10.3): format ACTIVE per jenis dokumen. */
export const documentNumberFormatListResponseSchema = dataEnvelope(z.array(documentNumberFormatSchema));
export type DocumentNumberFormatListResponse = z.infer<typeof documentNumberFormatListResponseSchema>;

/** Body `POST /document-number-formats/preview` (api-specs 10 §10.4). */
export const documentNumberPreviewRequestSchema = z.strictObject({
  documentType: documentTypeSchema,
  ...formatSettings,
});
export type DocumentNumberPreviewRequest = z.infer<typeof documentNumberPreviewRequestSchema>;

export const documentNumberPreviewResponseSchema = dataEnvelope(z.object({ preview: z.string() }));
export type DocumentNumberPreviewResponse = z.infer<typeof documentNumberPreviewResponseSchema>;

/** Body `PUT /document-number-formats/{documentType}` (api-specs 10 §10.5). */
export const documentNumberFormatUpdateRequestSchema = z.strictObject({
  ...formatSettings,
  effectiveFrom: timestamp.optional(),
});
export type DocumentNumberFormatUpdateRequest = z.infer<typeof documentNumberFormatUpdateRequestSchema>;

/** Respons 202 `PUT /document-number-formats/{documentType}` dengan pratinjau nomor (AC-102.01). */
export const documentNumberFormatAcceptedSchema = dataEnvelope(
  z.object({
    changeRequestId: id,
    entityType: z.literal("DOCUMENT_NUMBER_FORMAT"),
    entityId: id,
    status: z.literal("WAITING_APPROVAL"),
    versionNumber: z.number().int().min(1),
    preview: z.string(),
  }),
);
export type DocumentNumberFormatAccepted = z.infer<typeof documentNumberFormatAcceptedSchema>;

/**
 * Isi `currentData` dan `proposedData` ChangeRequest `DOCUMENT_NUMBER_FORMAT` (api-specs 07 §7.3). `currentData`
 * adalah versi ACTIVE, kosong bila jenis dokumen belum punya format.
 */
export const documentNumberFormatChangeDataSchema = z.object({
  documentType: documentTypeSchema,
  versionId: id,
  versionNumber: z.number().int().min(1),
  ...formatSettings,
  effectiveFrom: timestamp.nullable(),
});
export type DocumentNumberFormatChangeData = z.infer<typeof documentNumberFormatChangeDataSchema>;

import { z } from "zod";
import { businessDate, timestamp } from "../common/scalars.js";

/** Hasil pencairan yang dicatat Admin Operasional (US-101). */
export const disbursementResultSchema = z.enum(["DISBURSED", "FAILED"]);
export type DisbursementResult = z.infer<typeof disbursementResultSchema>;

/** Jalur masuk respons core (technical-specs 06 §6.11 CORE_RESPONSES); Rilis 1 hanya `MANUAL`. */
export const coreChannelSchema = z.enum(["CALLBACK", "FILE", "POLLING", "MANUAL"]);
export type CoreChannel = z.infer<typeof coreChannelSchema>;

/** Respons core yang berlaku untuk proses pengajuan saat ini, bagian "Disbursement Detail" (api-specs 25 §25.1). */
export const coreResponseSchema = z.object({
  channel: coreChannelSchema,
  outcome: z.enum(["SUKSES", "GAGAL"]),
  disbursementDate: businessDate.nullable(),
  coreLoanNumber: z.string().nullable(),
  cif: z.string().nullable(),
  failureReason: z.string().nullable(),
  recordedAt: timestamp,
});
export type CoreResponse = z.infer<typeof coreResponseSchema>;

const REQUIRED = "This field is required";

/**
 * Body `POST /applications/{id}/disbursement/record` (api-specs 25 §25.4): Disbursed wajib tanggal dan nomor pinjaman
 * core (AC-101.03); Failed wajib alasan dengan pesan "Reason is required" (AC-101.05).
 */
export const disbursementRecordRequestSchema = z
  .strictObject({
    result: disbursementResultSchema,
    disbursementDate: businessDate.optional(),
    coreLoanNumber: z.string().trim().max(50).optional(),
    cif: z.string().trim().max(50).optional(),
    reason: z.string().trim().max(500).optional(),
  })
  .superRefine((body, ctx) => {
    if (body.result === "FAILED") {
      if (!body.reason) ctx.addIssue({ code: "custom", path: ["reason"], message: "Reason is required" });
      return;
    }
    for (const field of ["disbursementDate", "coreLoanNumber"] as const) {
      if (!body[field]) ctx.addIssue({ code: "custom", path: [field], message: REQUIRED });
    }
  });
export type DisbursementRecordRequest = z.infer<typeof disbursementRecordRequestSchema>;

export const disbursementRecordResponseSchema = z.union([
  z.object({
    data: z.object({
      applicationStatus: z.literal("DISBURSED"),
      disbursementDate: businessDate,
      coreLoanNumber: z.string(),
    }),
    message: z.literal("Disbursement recorded"),
  }),
  z.object({
    data: z.object({ applicationStatus: z.literal("RECONTEST") }),
    message: z.literal("Disbursement failure recorded"),
  }),
]);
export type DisbursementRecordResponse = z.infer<typeof disbursementRecordResponseSchema>;

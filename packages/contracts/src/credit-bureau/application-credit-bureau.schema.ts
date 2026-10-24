import { z } from "zod";
import { businessDate, id, money } from "../common/scalars.js";
import { stepResultEnvelope } from "../orchestrator/step-result.schema.js";

/** Hasil langkah CREDIT_BUREAU untuk Decision Matrix (api-specs 24 §24.1). */
export const creditBureauOutcomeSchema = z.enum([
  "COLLECT_1",
  "COLLECT_2",
  "COLLECT_3",
  "COLLECT_4",
  "COLLECT_5",
  "NO_HISTORY",
]);
export type CreditBureauOutcome = z.infer<typeof creditBureauOutcomeSchema>;

export const creditFacilityViewSchema = z.object({
  lenderName: z.string(),
  facilityType: z.string(),
  plafond: money,
  outstanding: money,
  collectibility: z.int(),
  daysPastDue: z.int(),
  condition: z.enum(["ACTIVE", "CLOSED"]),
  /** Kosong bila penyedia tidak memberi tanggal pembaruan fasilitas. */
  lastUpdated: businessDate.nullable(),
});

export const applicationCreditBureauSchema = z.object({
  mode: z.enum(["SYNC", "ASYNC", "MANUAL"]),
  providerCode: z.string(),
  reportReference: z.string().nullable(),
  reportDate: businessDate.nullable(),
  hasHistory: z.boolean(),
  /** Kolektibilitas terburuk fasilitas `ACTIVE`; kosong tanpa fasilitas aktif (TRM_SLK_005, TRM_SLK_007). */
  aggregatedCollectibility: z.int().min(1).max(5).nullable(),
  quality: z.string(),
  outcome: creditBureauOutcomeSchema,
  /** "Collectibility 1 - Good" s.d. "Collectibility 5 - Poor", atau "No credit history" (AC-68.01, AC-68.02). */
  label: z.string(),
  reportFileId: id.nullable(),
  facilities: z.array(creditFacilityViewSchema),
});
export type ApplicationCreditBureau = z.infer<typeof applicationCreditBureauSchema>;

export const applicationCreditBureauResponseSchema = stepResultEnvelope(applicationCreditBureauSchema);
export type ApplicationCreditBureauResponse = z.infer<typeof applicationCreditBureauResponseSchema>;

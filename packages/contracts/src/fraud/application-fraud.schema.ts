import { z } from "zod";
import { id } from "../common/scalars.js";
import { stepResultEnvelope } from "../orchestrator/step-result.schema.js";

/** Hasil langkah FRAUD (api-specs 21 §21.1). */
export const fraudOutcomeSchema = z.enum(["CLEAN", "SUSPICIOUS", "HIGH_FRAUD_POTENTIAL"]);
export type FraudOutcome = z.infer<typeof fraudOutcomeSchema>;

/** Status cek IP; `NOT_APPLICABLE` tampil "Not applicable" untuk pengajuan tanpa IP (AC-65.02). */
export const ipCheckStatusSchema = z.enum(["NORMAL", "VPN_PROXY", "LOCATION_MISMATCH", "NOT_APPLICABLE"]);
export type IpCheckStatus = z.infer<typeof ipCheckStatusSchema>;

export const velocityDimensionSchema = z.enum(["FULL_NAME", "ID_CARD_NUMBER", "IP_ADDRESS", "DEVICE_ID"]);
export type VelocityDimension = z.infer<typeof velocityDimensionSchema>;

export const velocityHitSchema = z.object({
  dimension: velocityDimensionSchema,
  windowValue: z.int(),
  windowUnit: z.enum(["DAY", "HOUR"]),
  maxCount: z.int(),
  actualCount: z.int(),
  /** Terlampaui bila jumlah di atas `maxCount`; tepat di batas masih Clean (TRM_FRD_003). */
  exceeded: z.boolean(),
});
export type VelocityHit = z.infer<typeof velocityHitSchema>;

export const applicationFraudSchema = z.object({
  outcome: fraudOutcomeSchema,
  isBlacklisted: z.boolean(),
  ipCheck: z.object({
    status: ipCheckStatusSchema,
    ipAddress: z.string().nullable(),
    /** Klasifikasi penyedia reputasi IP (`NORMAL`, `VPN_PROXY`); kosong bila penyedia tidak dipanggil. */
    category: z.string().nullable(),
    providerCode: z.string().nullable(),
  }),
  velocityHits: z.array(velocityHitSchema),
  matrixRow: z
    .object({
      id,
      priority: z.int(),
      nameCondition: z.enum(["NORMAL", "EXCEEDED", "ANY"]),
      ipCondition: z.enum(["NORMAL", "VPN_PROXY", "LOCATION_MISMATCH", "NOT_APPLICABLE", "ANY"]),
    })
    .nullable(),
  /** Keputusan Verifikator dari layar review (backlog US-66); selalu kosong di POC. */
  review: z.null(),
});
export type ApplicationFraud = z.infer<typeof applicationFraudSchema>;

export const applicationFraudResponseSchema = stepResultEnvelope(applicationFraudSchema);
export type ApplicationFraudResponse = z.infer<typeof applicationFraudResponseSchema>;

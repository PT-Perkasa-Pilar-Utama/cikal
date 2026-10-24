import { businessDate, type IntegrationPort, money } from "@cikal/contracts";
import { z } from "zod";

/** Permintaan kanonik M10 (tech ref 10.4). */
export const creditBureauRequestSchema = z.object({
  nik: z.string(),
  fullName: z.string(),
  dateOfBirth: businessDate,
  placeOfBirth: z.string(),
  motherMaidenName: z.string(),
  npwpNumber: z.string().optional(),
  purposeCode: z.string(),
});
export type CreditBureauRequest = z.infer<typeof creditBureauRequestSchema>;

/**
 * Satu fasilitas di laporan biro kredit. `collectibility` sengaja bilangan bulat apa pun: nilai di luar 1 s.d. 5
 * ditolak domain dengan pesan "Invalid collectibility value: N" (TRM_SLK_006), bukan sebagai `INVALID_RESPONSE`.
 */
export const creditFacilitySchema = z.object({
  lenderName: z.string(),
  facilityType: z.string(),
  plafond: money,
  outstanding: money,
  collectibility: z.int(),
  daysPastDue: z.int().min(0),
  condition: z.enum(["ACTIVE", "CLOSED"]),
});
export type CreditFacility = z.infer<typeof creditFacilitySchema>;

export const creditBureauResponseSchema = z.object({
  reportReference: z.string(),
  reportDate: businessDate,
  hasHistory: z.boolean(),
  facilities: z.array(creditFacilitySchema),
  reportFileId: z.uuid().optional(),
});
export type CreditBureauResponse = z.infer<typeof creditBureauResponseSchema>;

/** `CreditBureauPort` (technical-specs 05 §5.18). */
export const creditBureauPort: IntegrationPort<CreditBureauRequest, CreditBureauResponse> = {
  moduleCode: "M10",
  request: creditBureauRequestSchema,
  response: creditBureauResponseSchema,
};

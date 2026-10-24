import { businessDate, type IntegrationPort, score } from "@cikal/contracts";
import { z } from "zod";

/** Permintaan kanonik M07 (tech ref 10.4, technical-specs 13 §13.2). */
export const dukcapilRequestSchema = z.object({
  nik: z.string(),
  kkNumber: z.string().optional(),
  fullName: z.string(),
  motherMaidenName: z.string(),
  dateOfBirth: businessDate,
  placeOfBirth: z.string(),
});
export type DukcapilRequest = z.infer<typeof dukcapilRequestSchema>;

/**
 * Respons kanonik M07. Skor 0 s.d. 1 berupa string desimal agar ambang inklusif 0,90 dan 0,75 dihitung tanpa float
 * (TRM_DKC_002, TRM_DKC_004); penyedia yang hanya memberi cocok/tidak dipetakan adapter ke 1,0 / 0,0.
 */
export const dukcapilResponseSchema = z.object({
  recordFound: z.boolean(),
  dobMatch: z.boolean(),
  pobMatch: z.boolean(),
  fullNameScore: score,
  motherNameScore: score,
  providerReference: z.string().optional(),
});
export type DukcapilResponse = z.infer<typeof dukcapilResponseSchema>;

/** `DukcapilPort` (technical-specs 13 §13.7). */
export const dukcapilPort: IntegrationPort<DukcapilRequest, DukcapilResponse> = {
  moduleCode: "M07",
  request: dukcapilRequestSchema,
  response: dukcapilResponseSchema,
};

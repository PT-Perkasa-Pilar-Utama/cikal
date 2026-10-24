import { z } from "zod";

/** Pengajuan dikirim (api-specs 12 §12.8 langkah 6). */
export const APPLICATION_SUBMITTED_EVENT = "ApplicationSubmitted";
/** Pencairan berhasil; dipublikasikan langkah Record Disbursement M15 (kartu BE-S6-03). */
export const DISBURSEMENT_COMPLETED_EVENT = "DisbursementCompleted";

/** Payload event pengajuan di outbox, tanpa data pemohon (technical-specs 06 §6.3). */
export const applicationEventPayloadSchema = z.object({ applicationId: z.uuid(), loanId: z.string() });
export type ApplicationEventPayload = z.infer<typeof applicationEventPayloadSchema>;

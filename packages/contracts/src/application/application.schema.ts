import { z } from "zod";

/** Status pengajuan (technical-specs 06 §6.13, tech ref 6.4); label UI ditetapkan data dictionary. */
export const applicationStatusSchema = z.enum([
  "DRAFT",
  "ON_PROGRESS",
  "RECONTEST",
  "APPROVED",
  "DISBURSED",
  "FINISHED_REJECTED",
  "FINISHED_CANCELLED",
]);
export type ApplicationStatus = z.infer<typeof applicationStatusSchema>;

import type { ApplicationStatus } from "@cikal/contracts";

/**
 * Transisi sah Application.status (technical-specs 06 §6.13). APPROVED, DISBURSED, FINISHED_REJECTED, dan
 * FINISHED_CANCELLED adalah status akhir.
 */
const TRANSITIONS: Record<ApplicationStatus, readonly ApplicationStatus[]> = {
  DRAFT: ["ON_PROGRESS"],
  ON_PROGRESS: ["DRAFT", "RECONTEST", "FINISHED_REJECTED", "APPROVED", "DISBURSED", "FINISHED_CANCELLED"],
  RECONTEST: ["ON_PROGRESS", "FINISHED_REJECTED"],
  APPROVED: [],
  DISBURSED: [],
  FINISHED_REJECTED: [],
  FINISHED_CANCELLED: [],
};

export function canTransition(from: ApplicationStatus, to: ApplicationStatus): boolean {
  return TRANSITIONS[from].includes(to);
}

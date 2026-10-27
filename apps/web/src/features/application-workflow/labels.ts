import {
  type ApplicationStatus,
  type DecisionOutcomes,
  type IpCheckStatus,
  MATRIX_COLUMN_LABELS,
  MATRIX_VALUE_LABELS,
  type StepActor,
  type StepCode,
  skipReasonLabels,
  stepNames,
  stepStatusLabels,
  type TimelineStep,
  type VelocityDimension,
} from "@cikal/contracts";

export const EMPTY_VALUE = "-";

/** Hasil langkah di luar nilai Decision Matrix; teksnya mengikuti MRTM US-59, US-61, US-65, dan AC-74.01. */
const OUTCOME_LABELS: Readonly<Record<string, string>> = {
  ...MATRIX_VALUE_LABELS,
  DUPLICATE_IN_FLIGHT: "Duplicate In-Flight",
  FAILED: "Failed",
  SUSPICIOUS: "Suspicious",
  HIGH_FRAUD_POTENTIAL: "High Fraud Potential",
  AUTO_APPROVED: "Auto Approved",
};

/** Label `outcomeCode`; kode yang belum punya label tampil apa adanya agar hasil baru tetap terbaca. */
export const outcomeLabel = (code: string): string => OUTCOME_LABELS[code] ?? code;

/** Label status langkah (api-specs 13 §13.1); langkah SKIPPED memakai label alasannya (AC-85.02). */
export function stepStatusLabel(step: Pick<TimelineStep, "status" | "skipReason">): string {
  if (step.status === "SKIPPED" && step.skipReason) return skipReasonLabels[step.skipReason];
  return stepStatusLabels[step.status];
}

/** Kolom hasil timeline: pesan error, hasil langkah, atau ringkasannya. */
export function stepResultText(step: TimelineStep): string {
  if (step.errorMessage) return step.errorMessage;
  if (step.outcomeCode) return outcomeLabel(step.outcomeCode);
  return step.summary ?? EMPTY_VALUE;
}

const SYSTEM_ACTOR = "System";

/** Pelaku langkah: username user, atau "System" untuk langkah otomatis. */
export const actorLabel = (actor: StepActor | null): string => {
  if (!actor) return EMPTY_VALUE;
  return actor.type === "USER" ? actor.username : SYSTEM_ACTOR;
};

/** Langkah berjalan, menunggu, atau error menjadi langkah saat ini yang disorot (AC-85.01). */
const CURRENT_STATUSES: ReadonlySet<TimelineStep["status"]> = new Set([
  "RUNNING",
  "WAITING_HUMAN",
  "WAITING_EXTERNAL",
  "ERROR",
]);
export const isCurrentStep = (step: TimelineStep): boolean => CURRENT_STATUSES.has(step.status);

/** Langkah otomatis yang hasilnya bisa dibuka dari timeline (api-specs 19 s.d. 24). */
export const RESULT_STEPS = ["DEDUP", "DUKCAPIL", "FRAUD", "RAC", "SCORING", "CREDIT_BUREAU", "DECISION"] as const;
export type ResultStep = (typeof RESULT_STEPS)[number];
const RESULT_STEP_SET: ReadonlySet<StepCode> = new Set(RESULT_STEPS);
/** Langkah yang punya popup hasil. */
export const isResultStep = (code: StepCode): code is ResultStep => RESULT_STEP_SET.has(code);

/** Nama langkah di timeline; CREDIT_BUREAU tampil "SLIK" seperti AC-85.01, AC-85.06, dan kolom Decision Matrix. */
export const stepName = (code: StepCode): string =>
  code === "CREDIT_BUREAU" ? MATRIX_COLUMN_LABELS.creditBureauOutcome : stepNames[code];

/** Kolom hasil modul di langkah Decision dengan nama kolom Decision Matrix. */
export const DECISION_OUTCOME_LABELS: Record<keyof DecisionOutcomes, string> = {
  dedup: MATRIX_COLUMN_LABELS.dedupOutcome,
  dukcapil: MATRIX_COLUMN_LABELS.dukcapilOutcome,
  fraud: MATRIX_COLUMN_LABELS.fraudOutcome,
  rac: MATRIX_COLUMN_LABELS.racOutcome,
  scoring: MATRIX_COLUMN_LABELS.scoringOutcome,
  creditBureau: MATRIX_COLUMN_LABELS.creditBureauOutcome,
};

/** Label cek IP; "Not applicable" mengikuti AC-65.02. */
export const IP_STATUS_LABELS: Record<IpCheckStatus, string> = {
  NORMAL: "Normal",
  VPN_PROXY: "VPN/Proxy",
  LOCATION_MISMATCH: "Location mismatch",
  NOT_APPLICABLE: "Not applicable",
};

export const VELOCITY_DIMENSION_LABELS: Record<VelocityDimension, string> = {
  FULL_NAME: "Full Name",
  ID_CARD_NUMBER: "ID Card Number",
  IP_ADDRESS: "IP Address",
  DEVICE_ID: "Device ID",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  DRAFT: "Draft",
  ON_PROGRESS: "On Progress",
  RECONTEST: "Recontest",
  APPROVED: "Approved",
  DISBURSED: "Disbursed",
  FINISHED_REJECTED: "Finished Rejected",
  FINISHED_CANCELLED: "Finished Cancelled",
};

/** Hasil banding field identitas Dedup dan Dukcapil. */
export const MATCH_LABELS: Readonly<Record<string, string>> = {
  MATCH: "Match",
  UNMATCH: "Not match",
  NOT_MATCH: "Not match",
};

/** Nilai boolean hasil langkah, contoh "Blacklisted" atau "Met". */
export const yesNo = (value: boolean): string => (value ? "Yes" : "No");

import { z } from "zod";
import type { ApplicationStatus } from "../application/application.schema.js";
import type { ModuleCode } from "../common/modules.js";

/** Urutan langkah baku (tech ref 6.3). Data dan API menyimpan kode langkah, bukan nomor urut (RT-02). */
export const stepCodes = [
  "DATA_ENTRY",
  "SURVEY",
  "DEDUP",
  "DUKCAPIL",
  "NAME_SCREENING",
  "VERIFICATION",
  "FRAUD",
  "RAC",
  "SCORING",
  "CREDIT_BUREAU",
  "DECISION",
  "SIKP",
  "APPROVAL",
  "EPOLIS",
  "VALIDITY_CHECK",
  "PRINT_AKAD",
  "DISBURSEMENT",
  "WAIT_CORE",
] as const;
export const stepCodeSchema = z.enum(stepCodes);
export type StepCode = z.infer<typeof stepCodeSchema>;

/** Modul pemilik langkah untuk pemeriksaan lisensi (tech ref 6.3, COM-05). */
export const stepModules = {
  DATA_ENTRY: "CORE",
  SURVEY: "M05",
  DEDUP: "M06",
  DUKCAPIL: "M07",
  NAME_SCREENING: "M16",
  VERIFICATION: "CORE",
  FRAUD: "M08",
  RAC: "M09",
  SCORING: "M09",
  CREDIT_BUREAU: "M10",
  DECISION: "M11",
  SIKP: "M12",
  APPROVAL: "CORE",
  EPOLIS: "M14",
  VALIDITY_CHECK: "M15",
  PRINT_AKAD: "M15",
  DISBURSEMENT: "M15",
  WAIT_CORE: "M15",
} as const satisfies Record<StepCode, ModuleCode>;

/** Status StepExecution (technical-specs 06 §6.13). */
export const stepStatusSchema = z.enum([
  "PENDING",
  "RUNNING",
  "WAITING_HUMAN",
  "WAITING_EXTERNAL",
  "COMPLETED",
  "SKIPPED",
  "ERROR",
]);
export type StepStatus = z.infer<typeof stepStatusSchema>;

export const skipReasonSchema = z.enum(["NOT_IN_ROUTE", "NOT_LICENSED", "CONDITION_NOT_MET", "DEDUP_MATCH"]);
export type SkipReason = z.infer<typeof skipReasonSchema>;

/** Kategori error langkah (IN-07, FM-09, technical-specs 12 §12.2). */
export const errorCategorySchema = z.enum([
  "TIMEOUT",
  "CONNECTION",
  "PROVIDER_ERROR",
  "AUTH",
  "CONFIG",
  "INVALID_RESPONSE",
  "CONSENT_MISSING",
  "FORMULA",
  "BUSINESS_SETUP",
]);
export type ErrorCategory = z.infer<typeof errorCategorySchema>;

/** Tujuh hasil kontrak langkah (tech ref 5.1). */
export const stepResultTypeSchema = z.enum([
  "CONTINUE",
  "WAIT_HUMAN",
  "WAIT_EXTERNAL",
  "BACK_TO_DRAFT",
  "RECONTEST",
  "FINISH",
  "ERROR",
]);
export type StepResultType = z.infer<typeof stepResultTypeSchema>;

/** Status ProcessInstance (technical-specs 06 §6.10). */
export const processStatusSchema = z.enum(["RUNNING", "WAITING", "COMPLETED", "CANCELLED"]);
export type ProcessStatus = z.infer<typeof processStatusSchema>;

/** Masukan orchestrator untuk satu attempt langkah (technical-specs 12 §12.2). */
export interface StepContext {
  tenantId: string;
  applicationId: string;
  loanId: string;
  processInstanceId: string;
  stepCode: StepCode;
  attempt: number;
  /** `processInstanceId` + `stepCode` + `attempt`; panggilan ulang dengan kunci sama tanpa efek ganda (COM-03). */
  idempotencyKey: string;
  /** Parameter `lockOnSubmit` dan parameter produk saat submit (PR-06, grooming v1 A-36). */
  parameterSnapshot: Readonly<Record<string, string>>;
  /** Kode rumus ke id versi yang dikunci saat submit (FM-05). */
  formulaVersions: Readonly<Record<string, string>>;
  correlationId: string;
}

/** Keluaran langkah ke orchestrator (technical-specs 12 §12.2). */
export type StepResult =
  | { type: "CONTINUE"; outcomeCode: string; summary: string }
  | {
      type: "WAIT_HUMAN";
      queueCode: string;
      branchId: string;
      eligibleRoleId?: string;
      assigneeUserId?: string;
      summary: string;
    }
  | { type: "WAIT_EXTERNAL"; externalReference: string; waitDeadline: Date; summary: string }
  | { type: "BACK_TO_DRAFT"; outcomeCode: string; returnNote: string }
  | { type: "RECONTEST"; outcomeCode: string; summary: string }
  | {
      type: "FINISH";
      outcomeCode: string;
      applicationStatus: Extract<ApplicationStatus, "DISBURSED" | "FINISHED_REJECTED" | "APPROVED">;
      summary: string;
    }
  | { type: "ERROR"; errorCategory: ErrorCategory; errorMessage: string; retryable: boolean };

/** Label UI status langkah (api-specs 13 §13.1). Klien menambah nama antrean pada WAITING_HUMAN. */
export const stepStatusLabels = {
  PENDING: "Pending",
  RUNNING: "Running",
  WAITING_HUMAN: "Waiting",
  WAITING_EXTERNAL: "Waiting for provider",
  COMPLETED: "Completed",
  SKIPPED: "Skipped",
  ERROR: "Error",
} as const satisfies Record<StepStatus, string>;

/** Label UI langkah `SKIPPED` per alasan (api-specs 13 §13.1; AC-85.02, AC-85.06, AC-31.04). */
export const skipReasonLabels = {
  NOT_IN_ROUTE: "Skipped - not in route",
  NOT_LICENSED: "Skipped - not licensed",
  CONDITION_NOT_MET: "Skipped - condition not met",
  DEDUP_MATCH: "Skipped - dedup match",
} as const satisfies Record<SkipReason, string>;

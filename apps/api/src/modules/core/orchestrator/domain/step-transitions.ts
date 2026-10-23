import type { ProcessStatus, StepResult, StepStatus } from "@cikal/contracts";

/**
 * Transisi StepExecution.status (technical-specs 06 §6.13). Retry ERROR -> RUNNING membuat baris attempt
 * berikutnya. COMPLETED dan SKIPPED adalah status akhir; ERROR akhir untuk attempt-nya.
 */
const STEP_TRANSITIONS: Record<StepStatus, readonly StepStatus[]> = {
  PENDING: ["SKIPPED", "RUNNING"],
  RUNNING: ["COMPLETED", "WAITING_HUMAN", "WAITING_EXTERNAL", "ERROR"],
  WAITING_HUMAN: ["COMPLETED"],
  WAITING_EXTERNAL: ["COMPLETED", "ERROR"],
  ERROR: ["RUNNING"],
  COMPLETED: [],
  SKIPPED: [],
};

/** Transisi ProcessInstance.status (technical-specs 06 §6.10). COMPLETED dan CANCELLED adalah status akhir. */
const PROCESS_TRANSITIONS: Record<ProcessStatus, readonly ProcessStatus[]> = {
  RUNNING: ["WAITING", "COMPLETED", "CANCELLED"],
  WAITING: ["RUNNING", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canStepTransition(from: StepStatus, to: StepStatus): boolean {
  return STEP_TRANSITIONS[from].includes(to);
}

export function canProcessTransition(from: ProcessStatus, to: ProcessStatus): boolean {
  return from === to || PROCESS_TRANSITIONS[from].includes(to);
}

/** Status langkah dari hasil kontrak (technical-specs 12 §12.3). */
export function stepStatusFor(result: StepResult): StepStatus {
  switch (result.type) {
    case "WAIT_HUMAN":
      return "WAITING_HUMAN";
    case "WAIT_EXTERNAL":
      return "WAITING_EXTERNAL";
    case "ERROR":
      return "ERROR";
    default:
      return "COMPLETED";
  }
}

/**
 * Status proses setelah hasil langkah: lanjut, menunggu (tugas, pihak ketiga, atau tindakan atas ERROR), selesai
 * (FINISH), atau batal (BACK_TO_DRAFT; RECONTEST yang akan diproses di ProcessInstance baru, ER-04).
 */
export function processStatusAfter(result: StepResult, retryScheduled: boolean): ProcessStatus {
  switch (result.type) {
    case "CONTINUE":
      return "RUNNING";
    case "WAIT_HUMAN":
    case "WAIT_EXTERNAL":
      return "WAITING";
    case "BACK_TO_DRAFT":
    case "RECONTEST":
      return "CANCELLED";
    case "FINISH":
      return "COMPLETED";
    case "ERROR":
      return retryScheduled ? "RUNNING" : "WAITING";
  }
}

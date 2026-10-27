import type { ProcessStatus, StepCode, StepStatus } from "@cikal/contracts";
import type { Tx } from "../db/tenant-tx.js";

/** Proses satu pengajuan untuk halaman "Application Detail" (api-specs 12 §12.9). */
export interface ApplicationProcessView {
  /** Proses awal dan setiap recontest, urut dari yang pertama. */
  processInstances: { id: string; recontestNumber: number; status: ProcessStatus }[];
  /** Status terakhir tiap langkah proses terbaru; kosong bila belum ada proses. */
  stepStatuses: Partial<Record<StepCode, StepStatus>>;
  /** Langkah proses terbaru yang tidak dilewati rute, lisensi, atau syarat langkah (AC-84.03). */
  activeSteps: StepCode[];
}

/**
 * Bacaan proses untuk modul Application tanpa impor modul Orchestrator, yang sendiri memakai Application lewat
 * `ApplicationProcess`. Modul Orchestrator mendaftarkan implementasinya.
 */
export interface ProcessViewPort {
  view(tx: Tx, applicationId: string): Promise<ApplicationProcessView>;
}

export const PROCESS_VIEW_PORT = Symbol("PROCESS_VIEW_PORT");

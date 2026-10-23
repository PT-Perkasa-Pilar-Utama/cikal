import type { Tx } from "../db/tenant-tx.js";

/** Permintaan tugas manusia dari langkah proses (technical-specs 05 §5.12 `create`, TQ-01). */
export interface HumanTaskRequest {
  stepExecutionId: string;
  applicationId: string;
  /** Kode katalog antrean HumanTask, contoh `VERIFICATION` atau `RECONTEST` (api-specs 14 §14.1). */
  queueCode: string;
  /** `null`: cabang pengajuan, contoh antrean RECONTEST yang dibuat orchestrator. */
  branchId: string | null;
  eligibleRoleId: string | null;
  assigneeUserId: string | null;
}

/**
 * `taskQueue.create` untuk Orchestrator tanpa impor modul Task Queue, yang merujuk tabel `step_executions`
 * lewat foreign key. Modul Task Queue mendaftarkan implementasinya.
 */
export interface TaskQueuePort {
  /** Membuat tugas `OPEN` di transaksi langkah, sehingga langkah dan tugasnya commit bersama. */
  create(tx: Tx, request: HumanTaskRequest): Promise<void>;
}

export const TASK_QUEUE_PORT = Symbol("TASK_QUEUE_PORT");

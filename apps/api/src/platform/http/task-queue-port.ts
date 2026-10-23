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

/** Tugas terbuka satu pengajuan yang ditutup; `queueCode` membatasi ke satu antrean, contoh `PROCESS_ERROR`. */
export interface TaskClosingScope {
  applicationId: string;
  queueCode?: string;
}

/**
 * `taskQueue.create` untuk Orchestrator tanpa impor modul Task Queue, yang merujuk tabel `step_executions`
 * lewat foreign key. Modul Task Queue mendaftarkan implementasinya.
 */
export interface TaskQueuePort {
  /** Membuat tugas `OPEN` di transaksi langkah, sehingga langkah dan tugasnya commit bersama. */
  create(tx: Tx, request: HumanTaskRequest): Promise<void>;
  /** Menutup tugas `OPEN` dan `ASSIGNED` dengan `resultCode` oleh `userId`, di transaksi pemanggil. */
  closeOpen(tx: Tx, scope: TaskClosingScope, resultCode: string, userId: string): Promise<void>;
}

export const TASK_QUEUE_PORT = Symbol("TASK_QUEUE_PORT");

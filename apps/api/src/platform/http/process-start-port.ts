import type { Tx } from "../db/tenant-tx.js";

/**
 * `orchestrator.start` untuk modul Application tanpa impor modul Orchestrator, yang sendiri memakai Application
 * lewat `ApplicationProcess`. Modul Orchestrator mendaftarkan implementasinya.
 */
export interface ProcessStartPort {
  /** ProcessInstance baru di transaksi submit pemanggil (api-specs 12 §12.8 langkah 5). */
  start(tx: Tx, applicationId: string): Promise<{ processInstanceId: string }>;
}

export const PROCESS_START_PORT = Symbol("PROCESS_START_PORT");

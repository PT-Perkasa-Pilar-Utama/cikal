import type { ApplicationStatus, StepCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { type ApplicationProcessRow, ApplicationsRepository } from "../db/applications.repository.js";
import { canTransition } from "../domain/application-status.js";

export type ProcessApplication = ApplicationProcessRow;

/**
 * Operasi Application untuk Orchestrator (technical-specs 05 §5.10 `returnToDraft`, 12 §12.3): Orchestrator
 * tidak menulis tabel `application` sendiri (XM-02).
 */
@Injectable()
export class ApplicationProcess {
  constructor(private readonly applications: ApplicationsRepository) {}

  /** Pengajuan tenant transaksi; `null` bila tidak ada atau milik tenant lain (RLS). */
  find(tx: Tx, id: string): Promise<ProcessApplication | null> {
    return this.applications.findById(tx, id);
  }

  /** Pengajuan tenant transaksi untuk daftar modul lain, contoh antrean tugas; id yang tidak ada dilewati. */
  findMany(tx: Tx, ids: readonly string[]): Promise<ProcessApplication[]> {
    return this.applications.findMany(tx, [...new Set(ids)]);
  }

  /** Langkah tempat proses berada, untuk detail pengajuan dan Process Monitoring (tech ref 6.4). */
  setCurrentStep(tx: Tx, id: string, step: StepCode): Promise<void> {
    return this.applications.updateCurrentStep(tx, id, step);
  }

  /**
   * Status dari hasil langkah dan aksi proses. Transisi di luar technical-specs 06 §6.13 ditolak `INVALID_STATE`.
   * Kembali ke Draft menyimpan catatan pengembalian dan mengosongkan langkah saat ini.
   */
  async transition(
    tx: Tx,
    id: string,
    to: ApplicationStatus,
    options: { userId: string | null; returnNote?: string },
  ): Promise<void> {
    const from = await this.applications.lockStatus(tx, id);
    if (from === null) throw new Error(`Application ${id} not found`);
    if (!canTransition(from, to)) throw DomainError.standard("INVALID_STATE");
    const toDraft = to === "DRAFT";
    await this.applications.updateStatus(
      tx,
      id,
      {
        status: to,
        returnNote: toDraft ? (options.returnNote ?? null) : null,
        ...(toDraft ? { currentStep: null } : {}),
      },
      options.userId,
    );
  }
}

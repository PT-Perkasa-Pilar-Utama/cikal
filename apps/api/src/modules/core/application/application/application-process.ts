import type { ApplicationStatus, StepCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { Outbox } from "../../../../platform/queue/outbox.js";
import { type ApplicationProcessRow, ApplicationsRepository } from "../db/applications.repository.js";
import { canTransition } from "../domain/application-status.js";
import {
  APPLICATION_REJECTED_EVENT,
  type ApplicationEventPayload,
  DISBURSEMENT_COMPLETED_EVENT,
} from "./application-events.js";

export type ProcessApplication = ApplicationProcessRow;

/**
 * Operasi Application untuk Orchestrator (technical-specs 05 §5.10 `returnToDraft`, 12 §12.3): Orchestrator
 * tidak menulis tabel `application` sendiri (XM-02).
 */
@Injectable()
export class ApplicationProcess {
  constructor(
    private readonly applications: ApplicationsRepository,
    private readonly outbox: Outbox,
  ) {}

  /** Pengajuan tenant transaksi; `null` bila tidak ada atau milik tenant lain (RLS). */
  find(tx: Tx, id: string): Promise<ProcessApplication | null> {
    return this.applications.findById(tx, id);
  }

  /** Pengajuan tenant transaksi menurut Loan ID, contoh pengajuan contoh uji model scoring (api-specs 22 §22.5). */
  findByLoanId(tx: Tx, loanId: string): Promise<ProcessApplication | null> {
    return this.applications.findByLoanId(tx, loanId);
  }

  /** Pengajuan tenant transaksi untuk daftar modul lain, contoh antrean tugas; id yang tidak ada dilewati. */
  findMany(tx: Tx, ids: readonly string[]): Promise<ProcessApplication[]> {
    return this.applications.findMany(tx, [...new Set(ids)]);
  }

  /** Langkah tempat proses berada, untuk detail pengajuan dan Process Monitoring (tech ref 6.4). */
  setCurrentStep(tx: Tx, id: string, step: StepCode): Promise<void> {
    return this.applications.updateCurrentStep(tx, id, step);
  }

  /** Tenor dan plafon level approval final untuk ringkasan "Application Detail" (AC-84.01); ditulis modul Approval. */
  recordApprovedTerms(
    tx: Tx,
    id: string,
    terms: { tenorApproved: number; loanAmount: string },
    userId: string | null,
  ): Promise<void> {
    return this.applications.updateApprovedTerms(tx, id, terms, userId);
  }

  /**
   * Status dari hasil langkah dan aksi proses. Transisi di luar technical-specs 06 §6.13 ditolak `INVALID_STATE`.
   * Kembali ke Draft menyimpan catatan pengembalian dan mengosongkan langkah saat ini. Penolakan dan pencairan menulis
   * event `ApplicationRejected` dan `DisbursementCompleted` untuk email nasabah di transaksi yang sama (TRM_DKC_005,
   * AC-101.01).
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
    if (to === "FINISHED_REJECTED") await this.publish(tx, id, APPLICATION_REJECTED_EVENT);
    if (to === "DISBURSED") await this.publish(tx, id, DISBURSEMENT_COMPLETED_EVENT);
  }

  private async publish(tx: Tx, id: string, eventType: string): Promise<void> {
    const application = await this.applications.findById(tx, id);
    if (!application) throw new Error(`Application ${id} not found`);
    await this.outbox.publish(tx, {
      tenantId: application.tenantId,
      eventType,
      aggregateId: id,
      payload: { applicationId: id, loanId: application.loanId } satisfies ApplicationEventPayload,
    });
  }
}

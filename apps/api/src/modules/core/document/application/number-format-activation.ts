import { Injectable } from "@nestjs/common";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import {
  DocumentNumberFormatsRepository,
  type FormatWriter,
  type NumberFormatRow,
} from "../db/document-number-formats.repository.js";
import { NUMBER_FORMAT_ACTIVATION_QUEUE } from "../jobs/queues.js";

/**
 * Format yang disetujui menjadi ACTIVE pada `effectiveFrom` dan versi lama SUPERSEDED (grooming v3 DN-05). Nomor yang
 * sudah terbentuk tidak berubah; counter baru per format mulai dari 1 (api-specs 10 §10.5 langkah 4).
 */
@Injectable()
export class NumberFormatActivation {
  constructor(
    private readonly db: TenantTx,
    private readonly formats: DocumentNumberFormatsRepository,
    private readonly queue: JobQueue,
  ) {}

  /** Langsung ACTIVE bila waktunya sudah tiba, atau tetap WAITING_APPROVAL sampai job berjalan pada `effectiveFrom`. */
  async approve(tx: Tx, format: NumberFormatRow, effectiveFrom: Date, writer: FormatWriter): Promise<void> {
    if (effectiveFrom.getTime() <= Date.now()) {
      await this.formats.lockType(tx, writer.tenantId, format.documentType);
      await this.promote(tx, format, effectiveFrom, writer.userId);
      return;
    }
    await this.formats.setStatus(tx, format.id, { status: "WAITING_APPROVAL", effectiveFrom }, writer.userId);
    await this.queue.enqueue(
      tx,
      NUMBER_FORMAT_ACTIVATION_QUEUE,
      { tenantId: writer.tenantId, formatId: format.id },
      { startAfter: effectiveFrom },
    );
  }

  /** Job `document.number-format-activate`; idempoten karena status dibaca ulang setelah jenis dokumen dikunci. */
  activate(tenantId: string, formatId: string): Promise<void> {
    return this.db.withSystemTx(tenantId, async (tx) => {
      const found = await this.formats.findById(tx, formatId);
      if (!found) return;
      await this.formats.lockType(tx, tenantId, found.documentType);
      const format = await this.formats.findById(tx, formatId);
      if (format?.status !== "WAITING_APPROVAL" || !format.effectiveFrom) return;
      await this.promote(tx, format, format.effectiveFrom, null);
    });
  }

  private async promote(tx: Tx, format: NumberFormatRow, effectiveFrom: Date, userId: string | null): Promise<void> {
    await this.formats.supersedeActive(tx, format.documentType, userId);
    await this.formats.setStatus(tx, format.id, { status: "ACTIVE", effectiveFrom }, userId);
  }
}

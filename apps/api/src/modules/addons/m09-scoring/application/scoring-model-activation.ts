import { Injectable } from "@nestjs/common";
import { type TenantContext, TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { type ModelRow, ScoringModelDraftsRepository } from "../db/scoring-model-drafts.repository.js";
import { MODEL_ACTIVATION_QUEUE } from "../jobs/queues.js";

/**
 * Versi model yang disetujui menjadi ACTIVE pada `effectiveFrom` dan versi ACTIVE lama kode yang sama SUPERSEDED
 * (technical-specs 06 §6.13). Pengajuan yang sudah disubmit tetap memakai hasil langkah yang sudah tersimpan.
 */
@Injectable()
export class ScoringModelActivation {
  constructor(
    private readonly db: TenantTx,
    private readonly models: ScoringModelDraftsRepository,
    private readonly queue: JobQueue,
  ) {}

  /** Langsung ACTIVE bila waktunya sudah tiba; selain itu tetap WAITING_APPROVAL sampai job aktivasi berjalan. */
  async approve(tx: Tx, model: ModelRow, effectiveFrom: Date, reviewer: TenantContext): Promise<void> {
    if (effectiveFrom.getTime() <= Date.now()) {
      await this.promote(tx, model, effectiveFrom, reviewer.userId);
      return;
    }
    await this.models.setStatus(tx, model.id, { status: "WAITING_APPROVAL", effectiveFrom }, reviewer.userId);
    await this.queue.enqueue(
      tx,
      MODEL_ACTIVATION_QUEUE,
      { tenantId: reviewer.tenantId, modelId: model.id },
      { startAfter: effectiveFrom },
    );
  }

  /** Job aktivasi; idempoten karena status dibaca ulang setelah versi dikunci. */
  activate(tenantId: string, modelId: string): Promise<void> {
    return this.db.withSystemTx(tenantId, async (tx) => {
      const model = await this.models.lock(tx, modelId);
      if (model?.status !== "WAITING_APPROVAL" || !model.effectiveFrom) return;
      await this.promote(tx, model, model.effectiveFrom, null);
    });
  }

  private async promote(tx: Tx, model: ModelRow, effectiveFrom: Date, userId: string | null): Promise<void> {
    await this.models.supersedeActive(tx, model.modelCode, model.id, userId);
    await this.models.setStatus(tx, model.id, { status: "ACTIVE", effectiveFrom }, userId);
  }
}

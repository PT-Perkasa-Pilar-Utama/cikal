import { Injectable } from "@nestjs/common";
import { TenantTx, type Tx } from "../../../../platform/db/tenant-tx.js";
import { JobQueue } from "../../../../platform/queue/job-queue.js";
import { type RouteVersionDetail, RouteVersionsRepository, type RouteWriter } from "../db/route-versions.repository.js";
import { ROUTE_ACTIVATION_QUEUE } from "../jobs/queues.js";

/**
 * Versi rute yang disetujui menjadi ACTIVE pada `effectiveFrom` dan versi lama SUPERSEDED (api-specs 07 §7.4
 * langkah 4). Pengajuan yang sudah disubmit tetap memakai versi yang dikunci (AC-31.03, RT-06).
 */
@Injectable()
export class RouteActivation {
  constructor(
    private readonly db: TenantTx,
    private readonly versions: RouteVersionsRepository,
    private readonly queue: JobQueue,
  ) {}

  /**
   * Saat Checker menyetujui: langsung ACTIVE bila waktunya sudah tiba, atau tetap WAITING_APPROVAL sampai job
   * `product.route-activate` berjalan pada `effectiveFrom`.
   */
  async approve(tx: Tx, version: RouteVersionDetail, effectiveFrom: Date, writer: RouteWriter): Promise<void> {
    if (effectiveFrom.getTime() <= Date.now()) {
      await this.versions.lockRoute(tx, version.productId, writer);
      await this.promote(tx, version, effectiveFrom, writer.userId);
      return;
    }
    await this.versions.setStatus(tx, version.id, { status: "WAITING_APPROVAL", effectiveFrom }, writer.userId);
    await this.queue.enqueue(
      tx,
      ROUTE_ACTIVATION_QUEUE,
      { tenantId: writer.tenantId, versionId: version.id },
      { startAfter: effectiveFrom },
    );
  }

  /** Job `product.route-activate`; idempoten karena status dibaca ulang setelah rute dikunci. */
  activate(tenantId: string, versionId: string): Promise<void> {
    return this.db.withSystemTx(tenantId, async (tx) => {
      const found = await this.versions.findDetailById(tx, versionId);
      if (!found) return;
      await this.versions.lockRoute(tx, found.productId, { tenantId, userId: null });
      const version = await this.versions.findDetailById(tx, versionId);
      if (version?.status !== "WAITING_APPROVAL" || !version.effectiveFrom) return;
      await this.promote(tx, version, version.effectiveFrom, null);
    });
  }

  private async promote(
    tx: Tx,
    version: RouteVersionDetail,
    effectiveFrom: Date,
    userId: string | null,
  ): Promise<void> {
    await this.versions.supersedeActive(tx, version.routeId, userId);
    await this.versions.setStatus(tx, version.id, { status: "ACTIVE", effectiveFrom }, userId);
  }
}

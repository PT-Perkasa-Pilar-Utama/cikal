import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { type RouteStepRow, RouteVersionsRepository } from "../db/route-versions.repository.js";

/** Satu versi rute beserta langkah yang tampil di editor rute. Langkah yang tidak ada belum pernah bisa dipilih. */
export interface RouteVersion {
  id: string;
  versionNumber: number;
  steps: RouteStepRow[];
}

/** `activeRoute(productId)` dan versi rute yang dikunci ProcessInstance (technical-specs 05 §5.5). */
@Injectable()
export class ProductRoutes {
  constructor(private readonly versions: RouteVersionsRepository) {}

  /** Versi ACTIVE; `null` bila produk belum punya rute yang disetujui (RT-07). */
  async activeRoute(tx: Tx, productId: string): Promise<RouteVersion | null> {
    const version = await this.versions.findActive(tx, productId);
    return version ? { ...version, steps: await this.versions.listSteps(tx, version.id) } : null;
  }

  /** Versi yang dikunci saat submit; versi yang pernah ACTIVE tidak berubah sehingga aman dibaca ulang (RT-06). */
  async version(tx: Tx, versionId: string): Promise<RouteVersion> {
    const version = await this.versions.findById(tx, versionId);
    // Foreign key ProcessInstance menjamin versi ada di tenant yang sama.
    if (!version) throw new Error(`Route version ${versionId} not found`);
    return { ...version, steps: await this.versions.listSteps(tx, version.id) };
  }
}

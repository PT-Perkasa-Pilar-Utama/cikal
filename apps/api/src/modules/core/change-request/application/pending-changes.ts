import type { ChangeRequestEntityType } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ChangeRequestsRepository } from "../db/change-requests.repository.js";

/**
 * Permintaan terbuka untuk modul pemilik data, yang tidak membaca tabel `cr` (XM-02): penanda `hasPendingChange`
 * dan aturan "satu permintaan terbuka" lintas jenis entity, contoh produk dan pricing-nya (AC-12.06).
 */
@Injectable()
export class PendingChanges {
  constructor(private readonly requests: ChangeRequestsRepository) {}

  async entityIds(
    tx: Tx,
    entityTypes: readonly ChangeRequestEntityType[],
    entityIds: readonly string[],
  ): Promise<Set<string>> {
    return new Set(await this.requests.openEntityIds(tx, entityTypes, [...new Set(entityIds)]));
  }

  /** Untuk kunci unik data yang belum punya id, contoh kode produk baru yang masih menunggu (AC-20.03). */
  hasProposedValue(tx: Tx, entityType: ChangeRequestEntityType, field: string, value: string): Promise<boolean> {
    return this.requests.hasOpenWithField(tx, entityType, field, value);
  }
}

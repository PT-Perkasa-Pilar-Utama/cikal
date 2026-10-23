import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";

/**
 * Aturan lihat file milik modul pemilik file, contoh dokumen pengajuan dengan `APP-INQUIRY` VIEW atau tugas yang
 * sedang dikerjakan user (api-specs 10 §10.1). Modul Document tidak membaca tabel pemilik (XM-02).
 */
export interface FileAccessPolicy {
  /** `true` bila file `fileId` dimiliki data modul ini dan `ctx` berhak melihat data itu. */
  canView(tx: Tx, ctx: RequestContext, fileId: string): Promise<boolean>;
}

/** Modul pemilik file mendaftarkan aturannya saat `onModuleInit`; file tanpa pemilik yang mengizinkan tidak terlihat. */
@Injectable()
export class FileAccessRegistry {
  private readonly policies: FileAccessPolicy[] = [];

  register(policy: FileAccessPolicy): void {
    this.policies.push(policy);
  }

  async canView(tx: Tx, ctx: RequestContext, fileId: string): Promise<boolean> {
    for (const policy of this.policies) {
      if (await policy.canView(tx, ctx, fileId)) return true;
    }
    return false;
  }
}

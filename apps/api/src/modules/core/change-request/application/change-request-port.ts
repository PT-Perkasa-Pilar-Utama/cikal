import type { ChangeRequestAccepted, ChangeRequestEntityType } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { ChangeRequestsRepository } from "../db/change-requests.repository.js";
import { CHANGE_REQUEST_MESSAGES } from "../domain/review-policy.js";
import { ChangeRequestRegistry, type EntityHandler } from "./change-request-registry.js";
import { SubmitChangeRequest, type SubmitInput } from "./submit-change-request.js";

/**
 * Operasi checker-maker untuk modul pemilik data lewat token `CHANGE_REQUEST_PORT` (technical-specs 05 §5.6).
 * Modul pemilik tidak membaca tabel `cr` (XM-02).
 */
export interface ChangeRequestPort {
  /** `registerEntity(entityType, handler)`, dipanggil modul pemilik saat `onModuleInit`. */
  register(handler: EntityHandler): void;
  /** `submit` di transaksi Maker; hasilnya body `202` checker-maker (api-specs 01 §1.8). */
  submit(tx: Tx, maker: Actor, input: SubmitInput): Promise<ChangeRequestAccepted>;
  /** Id data yang masih punya permintaan terbuka untuk salah satu jenis entity (AC-12.06, `hasPendingChange`). */
  pendingEntityIds(
    tx: Tx,
    entityTypes: readonly ChangeRequestEntityType[],
    entityIds: readonly string[],
  ): Promise<Set<string>>;
  /**
   * Untuk kunci unik data yang belum punya id: ada permintaan terbuka yang `newData`-nya berisi semua nilai
   * `fields`, contoh kode produk baru (AC-20.03) atau pasangan role dan menu (api-specs 03 §3.4).
   */
  hasProposed(tx: Tx, entityType: ChangeRequestEntityType, fields: Record<string, string>): Promise<boolean>;
}

/** Implementasi `ChangeRequestPort` di modul Change Request. */
@Injectable()
export class ChangeRequestService implements ChangeRequestPort {
  constructor(
    private readonly registry: ChangeRequestRegistry,
    private readonly submitter: SubmitChangeRequest,
    private readonly requests: ChangeRequestsRepository,
  ) {}

  register(handler: EntityHandler): void {
    this.registry.register(handler);
  }

  async submit(tx: Tx, maker: Actor, input: SubmitInput): Promise<ChangeRequestAccepted> {
    return { data: await this.submitter.execute(tx, maker, input), message: CHANGE_REQUEST_MESSAGES.submitted };
  }

  async pendingEntityIds(
    tx: Tx,
    entityTypes: readonly ChangeRequestEntityType[],
    entityIds: readonly string[],
  ): Promise<Set<string>> {
    return new Set(await this.requests.openEntityIds(tx, entityTypes, [...new Set(entityIds)]));
  }

  hasProposed(tx: Tx, entityType: ChangeRequestEntityType, fields: Record<string, string>): Promise<boolean> {
    return this.requests.hasOpenWithFields(tx, entityType, fields);
  }
}

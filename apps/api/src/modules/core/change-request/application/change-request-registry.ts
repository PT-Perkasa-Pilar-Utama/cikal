import type { ChangeRequestEntityType } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import type { ChangeRequestAction, JsonRecord } from "../db/schema.js";

/** Permintaan yang sedang disetujui, seperti diajukan Maker. */
export interface ChangeRequestSnapshot {
  id: string;
  entityType: ChangeRequestEntityType;
  /** Kosong untuk data baru dan paket impor. */
  entityId: string | null;
  action: ChangeRequestAction;
  oldData: JsonRecord | null;
  /** Untuk paket impor berisi `items[]` (AC-12.07). */
  newData: JsonRecord;
  packageSize: number;
}

export interface ApplyResult {
  /** Id data yang dibuat atau diubah; kosong untuk paket impor. */
  entityId: string | null;
  /** Hanya untuk data berversi (api-specs 07 §7.4). */
  versionNumber?: number;
}

/**
 * Kontrak modul pemilik data terhadap checker-maker (technical-specs 05 §5.6 `registerEntity`). Semua method
 * berjalan di transaksi approve, jadi `apply` yang gagal membatalkan seluruh paket dan status permintaan.
 */
export interface EntityHandler {
  entityType: ChangeRequestEntityType;
  /** Label modul di "Audit Trail", contoh `Product`. */
  auditModule: string;
  /** Nama baris di halaman "Pending <Data>" (api-specs 07 §7.2). */
  displayName(newData: JsonRecord): string;
  /** Aturan entity terhadap data terkini; gagal dengan `422 BUSINESS_RULE_VIOLATION` dan pesan AC. */
  validate(tx: Tx, request: ChangeRequestSnapshot): Promise<void>;
  apply(tx: Tx, request: ChangeRequestSnapshot, reviewer: Actor): Promise<ApplyResult>;
  /** Path field yang berubah; tanpa method ini dipakai perbandingan field per field (`changedFields`). */
  diff?(oldData: JsonRecord | null, newData: JsonRecord): string[];
}

/** `registerEntity(entityType, handler)`: modul pemilik mendaftar saat `onModuleInit`. */
@Injectable()
export class ChangeRequestRegistry {
  private readonly handlers = new Map<ChangeRequestEntityType, EntityHandler>();

  register(handler: EntityHandler): void {
    if (this.handlers.has(handler.entityType)) {
      throw new Error(`Change request handler for ${handler.entityType} is already registered`);
    }
    this.handlers.set(handler.entityType, handler);
  }

  get(entityType: ChangeRequestEntityType): EntityHandler {
    const handler = this.handlers.get(entityType);
    if (!handler) throw new Error(`No change request handler is registered for ${entityType}`);
    return handler;
  }
}

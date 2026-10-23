import { createHmac } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { APP_CONFIG, type AppConfig } from "../config/config.js";
import { type KeyPurpose, TenantKeysRepository } from "../db/tenant-keys.repository.js";
import { boundTenantId, type Tx } from "../db/tenant-tx.js";
import { seal, unseal } from "./envelope.js";

export interface EncryptedField {
  ciphertext: Buffer;
  keyVersion: number;
}

/** Enkripsi field dan blind index memakai tenant dari transaksi, tanpa cache kunci (DM-08, TL-S3-05). */
@Injectable()
export class TenantEncryption {
  constructor(
    @Inject(APP_CONFIG) private readonly config: AppConfig,
    private readonly keys: TenantKeysRepository,
  ) {}

  private async withKey<T>(
    tx: Tx,
    purpose: KeyPurpose,
    version: number | undefined,
    work: (key: Buffer, tenantId: string, keyVersion: number) => T,
  ): Promise<T> {
    const tenantId = await boundTenantId(tx);
    if (!tenantId) throw new Error("Tenant context is required for encryption");
    const row = await this.keys.find(tx, tenantId, purpose, version);
    if (!row) throw new Error("Tenant key is not available");
    const key = unseal(this.config.masterKey, row.wrappedKey, `tenant-key:${tenantId}:${purpose}:${row.keyVersion}`);
    try {
      return work(key, tenantId, row.keyVersion);
    } finally {
      key.fill(0);
    }
  }

  /** Menyimpan ciphertext dan versi bersama pada kolom milik modul pemanggil (DM-08). */
  encrypt(tx: Tx, value: string): Promise<EncryptedField> {
    return this.withKey(tx, "ENCRYPTION", undefined, (key, tenantId, keyVersion) => ({
      ciphertext: seal(key, Buffer.from(value, "utf8"), `field:${tenantId}:${keyVersion}`),
      keyVersion,
    }));
  }

  /** Versi tersimpan tetap terbaca walau kuncinya RETIRED (technical-specs 07 §7.4). */
  decrypt(tx: Tx, value: EncryptedField): Promise<string> {
    return this.withKey(tx, "ENCRYPTION", value.keyVersion, (key, tenantId, keyVersion) =>
      unseal(key, value.ciphertext, `field:${tenantId}:${keyVersion}`).toString("utf8"),
    );
  }

  /** NIK dinormalisasi/validasi pemanggil; HMAC-SHA256 deterministik per tenant (DM-08). */
  blindIndex(tx: Tx, value: string): Promise<Buffer> {
    return this.withKey(tx, "BLIND_INDEX", undefined, (key) =>
      createHmac("sha256", key).update(value, "utf8").digest(),
    );
  }
}

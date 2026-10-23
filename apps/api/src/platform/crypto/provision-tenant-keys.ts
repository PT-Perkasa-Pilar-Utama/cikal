import { randomBytes } from "node:crypto";
import type { NodePgDatabase } from "drizzle-orm/node-postgres";
import { v7 as uuidv7 } from "uuid";
import { type KeyPurpose, TenantKeysRepository } from "../db/tenant-keys.repository.js";
import { DATA_KEY_BYTES, seal } from "./envelope.js";

/** Dibuat bersama company dalam transaksi pemanggil; seed ulang tidak mengganti kunci (TL-S3-05). */
export async function provisionTenantKeys(db: NodePgDatabase, masterKey: Buffer, tenantId: string): Promise<void> {
  const repository = new TenantKeysRepository();
  const purposes: readonly KeyPurpose[] = ["ENCRYPTION", "BLIND_INDEX"];
  for (const purpose of purposes) {
    if (await repository.find(db, tenantId, purpose)) continue;
    const key = randomBytes(DATA_KEY_BYTES);
    try {
      await repository.insert(db, {
        id: uuidv7(),
        tenantId,
        keyPurpose: purpose,
        keyVersion: 1,
        status: "ACTIVE",
        wrappedKey: seal(masterKey, key, `tenant-key:${tenantId}:${purpose}:1`),
      });
    } finally {
      key.fill(0);
    }
  }
}

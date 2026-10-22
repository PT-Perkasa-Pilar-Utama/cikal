import { Injectable } from "@nestjs/common";
import { and, eq, lt } from "drizzle-orm";
import { idempotencyKeys } from "./schema.js";
import type { Tx } from "./tenant-tx.js";

export interface StoredResponse {
  status: number;
  body: unknown;
}

export interface IdempotencyClaim {
  id: string;
  tenantId: string;
  userId: string;
  idempotencyKey: string;
  requestHash: Buffer;
  expiresAt: Date;
}

/** Hasil klaim kunci: kunci baru milik pemanggil, atau kunci yang sudah ada beserta respons pertamanya. */
export type ClaimResult =
  | { kind: "claimed" }
  | { kind: "existing"; requestHash: Buffer; response: StoredResponse | null };

/** Akses tabel `platform.idempotency_keys` (api-specs 01 §1.7). */
@Injectable()
export class IdempotencyKeysRepository {
  async claim(tx: Tx, claim: IdempotencyClaim, now: Date): Promise<ClaimResult> {
    const sameKey = and(
      eq(idempotencyKeys.userId, claim.userId),
      eq(idempotencyKeys.idempotencyKey, claim.idempotencyKey),
    );
    await tx.delete(idempotencyKeys).where(and(sameKey, lt(idempotencyKeys.expiresAt, now)));
    const inserted = await tx
      .insert(idempotencyKeys)
      .values(claim)
      .onConflictDoNothing()
      .returning({ id: idempotencyKeys.id });
    if (inserted.length > 0) return { kind: "claimed" };

    const [existing] = await tx
      .select({
        requestHash: idempotencyKeys.requestHash,
        responseStatus: idempotencyKeys.responseStatus,
        responseBody: idempotencyKeys.responseBody,
      })
      .from(idempotencyKeys)
      .where(sameKey);
    if (!existing) throw new Error(`Idempotency key ${claim.idempotencyKey} vanished after a conflict`);
    const { requestHash, responseStatus, responseBody } = existing;
    return {
      kind: "existing",
      requestHash,
      response: responseStatus === null ? null : { status: responseStatus, body: responseBody },
    };
  }

  async complete(tx: Tx, id: string, response: StoredResponse): Promise<void> {
    await tx
      .update(idempotencyKeys)
      .set({ responseStatus: response.status, responseBody: response.body, updatedAt: new Date() })
      .where(eq(idempotencyKeys.id, id));
  }

  /** Permintaan pertama gagal: kunci dilepas agar klien bisa mengulang dengan kunci yang sama. */
  async release(tx: Tx, id: string): Promise<void> {
    await tx.delete(idempotencyKeys).where(eq(idempotencyKeys.id, id));
  }
}

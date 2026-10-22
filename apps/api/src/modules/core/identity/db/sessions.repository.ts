import { Injectable } from "@nestjs/common";
import { eq } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { sessions } from "./schema.js";

export interface SessionRow {
  id: string;
  tenantId: string;
  userId: string;
  csrfTokenHash: Buffer | null;
  lastActivityAt: Date;
  expiresAt: Date;
}

/** Akses tabel `iam.sessions` (technical-specs 06 §6.4). */
@Injectable()
export class SessionsRepository {
  /** Dipanggil di transaksi pra-tenant yang memasang `app.session_token_hash` (DM-12). */
  async findByTokenHash(tx: Tx, tokenHash: Buffer): Promise<SessionRow | null> {
    const [row] = await tx
      .select({
        id: sessions.id,
        tenantId: sessions.tenantId,
        userId: sessions.userId,
        csrfTokenHash: sessions.csrfTokenHash,
        lastActivityAt: sessions.lastActivityAt,
        expiresAt: sessions.expiresAt,
      })
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash));
    return row ?? null;
  }

  async touch(tx: Tx, id: string, at: Date): Promise<void> {
    await tx.update(sessions).set({ lastActivityAt: at }).where(eq(sessions.id, id));
  }
}

import { Injectable } from "@nestjs/common";
import { and, eq, isNotNull, isNull, lte, or } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { sessions } from "./schema.js";

export interface SessionRow {
  id: string;
  tenantId: string;
  userId: string;
  csrfTokenHash: Buffer | null;
  lastActivityAt: Date;
  expiresAt: Date;
  endedReason: string | null;
}

export interface NewSession {
  id: string;
  tenantId: string;
  userId: string;
  tokenHash: Buffer;
  csrfTokenHash: Buffer;
  expiresAt: Date;
  ipAddress: string;
}

const WEB = "WEB";

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
        endedReason: sessions.endedReason,
      })
      .from(sessions)
      .where(eq(sessions.tokenHash, tokenHash));
    return row ?? null;
  }

  async findExpiry(tx: Tx, id: string): Promise<Date | null> {
    const [row] = await tx.select({ expiresAt: sessions.expiresAt }).from(sessions).where(eq(sessions.id, id));
    return row?.expiresAt ?? null;
  }

  async touch(tx: Tx, id: string, at: Date): Promise<void> {
    await tx.update(sessions).set({ lastActivityAt: at }).where(eq(sessions.id, id));
  }

  /**
   * Satu sesi WEB per user (AC-06.05): sesi hidup sebelumnya ditandai REPLACED, lalu sesi baru dibuat.
   * Tanda REPLACED dan sesi kedaluwarsa yang lebih lama dihapus agar tiap user menyimpan paling banyak satu tanda.
   */
  async replaceWebSession(tx: Tx, session: NewSession, now: Date): Promise<void> {
    const mine = and(eq(sessions.userId, session.userId), eq(sessions.channel, WEB));
    await tx.delete(sessions).where(and(mine, or(isNotNull(sessions.endedReason), lte(sessions.expiresAt, now))));
    await tx
      .update(sessions)
      .set({ endedReason: "REPLACED", updatedAt: now })
      .where(and(mine, isNull(sessions.endedReason)));
    await tx.insert(sessions).values({ ...session, channel: WEB, lastActivityAt: now });
  }

  async delete(tx: Tx, id: string): Promise<void> {
    await tx.delete(sessions).where(eq(sessions.id, id));
  }
}

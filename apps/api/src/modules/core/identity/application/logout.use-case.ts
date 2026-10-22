import { Injectable } from "@nestjs/common";
import { bindTenant, TenantTx } from "../../../../platform/db/tenant-tx.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { csrfMatches, hashToken } from "../../../../platform/http/session-token.js";
import { SessionsRepository } from "../db/sessions.repository.js";

/**
 * Logout (api-specs 02 §2.3): menghapus baris sesi. Idempoten, jadi cookie tanpa sesi tetap selesai tanpa error;
 * sesi yang masih ada wajib membawa `X-CSRF-Token` yang cocok.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly sessions: SessionsRepository,
  ) {}

  async execute(sessionToken: string | undefined, csrfHeader: string | string[] | undefined): Promise<void> {
    if (!sessionToken) return;
    const tokenHash = hashToken(sessionToken);
    await this.db.withLookupTx("app.session_token_hash", tokenHash.toString("hex"), async (tx) => {
      const session = await this.sessions.findByTokenHash(tx, tokenHash);
      if (!session) return;
      if (!csrfMatches(session.csrfTokenHash, csrfHeader)) throw DomainError.standard("CSRF_TOKEN_INVALID");
      await bindTenant(tx, { tenantId: session.tenantId, userId: session.userId });
      await this.sessions.delete(tx, session.id);
    });
  }
}

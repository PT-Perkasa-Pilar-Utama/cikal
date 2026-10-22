import { Injectable } from "@nestjs/common";
import { bindTenant, TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { Actor } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { csrfMatches, hashToken } from "../../../../platform/http/session-token.js";
import { AuditTrail } from "../../audit/index.js";
import { SessionsRepository } from "../db/sessions.repository.js";
import { AUTHENTICATION_AUDIT_MODULE } from "../domain/login-policy.js";

/**
 * Logout (api-specs 02 §2.3): menghapus baris sesi dan mencatat audit `LOGOUT`. Idempoten, jadi cookie tanpa sesi
 * tetap selesai tanpa error; sesi yang masih ada wajib membawa `X-CSRF-Token` yang cocok.
 */
@Injectable()
export class LogoutUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly sessions: SessionsRepository,
    private readonly audit: AuditTrail,
  ) {}

  async execute(
    sessionToken: string | undefined,
    csrfHeader: string | string[] | undefined,
    ipAddress: string,
  ): Promise<void> {
    if (!sessionToken) return;
    const tokenHash = hashToken(sessionToken);
    await this.db.withLookupTx("app.session_token_hash", tokenHash.toString("hex"), async (tx) => {
      const session = await this.sessions.findByTokenHash(tx, tokenHash);
      if (!session) return;
      if (!csrfMatches(session.csrfTokenHash, csrfHeader)) throw DomainError.standard("CSRF_TOKEN_INVALID");
      const actor: Actor = { tenantId: session.tenantId, userId: session.userId, ipAddress };
      await bindTenant(tx, actor);
      await this.sessions.delete(tx, session.id);
      await this.audit.record(tx, actor, { module: AUTHENTICATION_AUDIT_MODULE, action: "LOGOUT" });
    });
  }
}

import type { Action, MenuCode } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { bindTenant, type TenantContext, TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { AccessPort, AuthorizeOptions, ResolvedSession } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { hashToken } from "../../../../platform/http/session-token.js";
import { Licensing } from "../../tenancy/index.js";
import { AccessRepository } from "../db/access.repository.js";
import { SessionsRepository } from "../db/sessions.repository.js";
import { UsersRepository } from "../db/users.repository.js";
import { type AccessDecision, decideAccess } from "../domain/access-policy.js";
import { isSessionExpired } from "../domain/session-policy.js";

/** `identity.authorize` dan validasi sesi yang dipanggil guard di setiap rute (technical-specs 05 §5.1, 07 §7.2). */
@Injectable()
export class AccessService implements AccessPort {
  constructor(
    private readonly db: TenantTx,
    private readonly sessions: SessionsRepository,
    private readonly users: UsersRepository,
    private readonly access: AccessRepository,
    private readonly licensing: Licensing,
  ) {}

  resolveSession(token: string, options: { touch: boolean }): Promise<ResolvedSession> {
    const tokenHash = hashToken(token);
    return this.db.withLookupTx("app.session_token_hash", tokenHash.toString("hex"), async (tx) => {
      const session = await this.sessions.findByTokenHash(tx, tokenHash);
      if (!session) throw DomainError.standard("UNAUTHENTICATED");
      if (session.endedReason === "REPLACED") throw DomainError.standard("SESSION_REPLACED");
      const now = new Date();
      if (isSessionExpired(session, now)) throw DomainError.standard("SESSION_EXPIRED");

      await bindTenant(tx, { tenantId: session.tenantId, userId: session.userId });
      const user = await this.users.findAuthState(tx, session.userId);
      if (user?.status !== "ACTIVE") throw DomainError.standard("UNAUTHENTICATED");
      if (options.touch) await this.sessions.touch(tx, session.id, now);
      return {
        sessionId: session.id,
        tenantId: session.tenantId,
        userId: session.userId,
        mustChangePassword: user.mustChangePassword,
        csrfTokenHash: session.csrfTokenHash,
        licenseStatus: (await this.licensing.state(tx)).status,
      };
    });
  }

  async authorize(
    ctx: TenantContext,
    menuCode: MenuCode,
    action: Action,
    options: AuthorizeOptions = { licenseExempt: false },
  ): Promise<void> {
    const decision = await this.decide(ctx, menuCode, action, options);
    if (decision !== "ALLOW") throw DomainError.standard(decision);
  }

  async allows(ctx: TenantContext, menuCode: MenuCode, action: Action): Promise<boolean> {
    return (await this.decide(ctx, menuCode, action, { licenseExempt: false })) === "ALLOW";
  }

  private async decide(
    ctx: TenantContext,
    menuCode: MenuCode,
    action: Action,
    options: AuthorizeOptions,
  ): Promise<AccessDecision> {
    const today = businessDate(new Date());
    const facts = await this.db.withTenantTx(ctx, async (tx) => ({
      ...(await this.access.findMenuAccess(tx, ctx.userId, menuCode, today)),
      licensedModules: (await this.licensing.state(tx)).modules,
    }));
    return decideAccess({ ...facts, licenseExempt: options.licenseExempt }, action);
  }
}

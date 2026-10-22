import type { SessionResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { licensedModuleCodes } from "../../../../licensed-module-codes.generated.js";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { CompanyDirectory } from "../../tenancy/index.js";
import { MenusRepository } from "../db/menus.repository.js";
import { SessionsRepository } from "../db/sessions.repository.js";
import { UsersRepository } from "../db/users.repository.js";
import { buildMenuTree } from "../domain/menu-tree.js";
import { SESSION_IDLE_MINUTES } from "../domain/session-policy.js";

/**
 * `GET /auth/session` (api-specs 02 §2.4). Lisensi berasal dari manifest paket; `validTo` diisi dari lisensi
 * bertanda tangan di kartu TL-S2-02. Unit kerja (`branchCode`) menunggu tabel Organization.
 */
@Injectable()
export class GetSessionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
    private readonly menus: MenusRepository,
    private readonly companies: CompanyDirectory,
  ) {}

  execute(ctx: RequestContext): Promise<SessionResponse> {
    const today = businessDate(new Date());
    return this.db.withTenantTx(ctx, async (tx) => {
      const profile = await this.users.findProfile(tx, ctx.userId);
      const expiresAt = await this.sessions.findExpiry(tx, ctx.sessionId);
      if (!profile || !expiresAt) throw DomainError.standard("UNAUTHENTICATED");
      const company = await this.companies.summary(tx, ctx.tenantId);
      const menus = buildMenuTree(
        await this.menus.listActive(tx),
        await this.menus.listGrants(tx, ctx.userId, today),
        licensedModuleCodes,
      );
      return {
        data: {
          user: { ...profile, branchCode: null },
          company,
          mustChangePassword: ctx.mustChangePassword,
          license: { status: "ACTIVE", validTo: null, modules: [...licensedModuleCodes] },
          menus,
          sessionExpiresAt: expiresAt.toISOString(),
          idleTimeoutMinutes: SESSION_IDLE_MINUTES,
        },
      };
    });
  }
}

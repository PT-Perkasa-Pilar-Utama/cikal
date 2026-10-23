import type { SessionResponse } from "@cikal/contracts";
import { Injectable } from "@nestjs/common";
import { businessDate } from "../../../../platform/clock/business-date.js";
import { TenantTx } from "../../../../platform/db/tenant-tx.js";
import type { RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { CompanyDirectory, Licensing } from "../../tenancy/index.js";
import { MenusRepository } from "../db/menus.repository.js";
import { SessionsRepository } from "../db/sessions.repository.js";
import { UsersRepository } from "../db/users.repository.js";
import { buildMenuTree } from "../domain/menu-tree.js";
import { SESSION_IDLE_MINUTES } from "../domain/session-policy.js";

/**
 * `GET /auth/session` (api-specs 02 §2.4). Menu dan `license.modules` hanya modul lisensi aktif yang ada di paket
 * (AC-100.01). Unit kerja (`branchCode`) menunggu tabel Organization.
 */
@Injectable()
export class GetSessionUseCase {
  constructor(
    private readonly db: TenantTx,
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
    private readonly menus: MenusRepository,
    private readonly companies: CompanyDirectory,
    private readonly licensing: Licensing,
  ) {}

  execute(ctx: RequestContext): Promise<SessionResponse> {
    const today = businessDate(new Date());
    return this.db.withTenantTx(ctx, async (tx) => {
      const profile = await this.users.findProfile(tx, ctx.userId);
      const expiresAt = await this.sessions.findExpiry(tx, ctx.sessionId);
      if (!profile || !expiresAt) throw DomainError.standard("UNAUTHENTICATED");
      const company = await this.companies.summary(tx, ctx.tenantId);
      const license = await this.licensing.state(tx);
      const menus = buildMenuTree(
        await this.menus.listActive(tx),
        await this.menus.listGrants(tx, ctx.userId, today),
        license.modules,
      );
      return {
        data: {
          user: { ...profile, branchCode: null },
          company,
          mustChangePassword: ctx.mustChangePassword,
          license: {
            status: license.status,
            validTo: license.status === "NONE" ? null : license.license.validTo,
            modules: [...license.modules],
          },
          menus,
          sessionExpiresAt: expiresAt.toISOString(),
          idleTimeoutMinutes: SESSION_IDLE_MINUTES,
        },
      };
    });
  }
}

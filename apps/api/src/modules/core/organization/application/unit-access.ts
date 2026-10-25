import type { MenuCode } from "@cikal/contracts";
import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { ACCESS_PORT, type AccessPort, type RequestContext } from "../../../../platform/http/access-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import { USER_DIRECTORY_PORT, type UserDirectoryPort } from "../../../../platform/http/user-directory-port.js";
import type { UnitScope } from "../db/unit-filters.js";

/** Menu yang memakai dropdown unit organisasi (api-specs 05 §5.1). */
const VIEWING_MENUS: readonly MenuCode[] = ["MST-APPROVAL", "APP-INQUIRY", "OPS-MONITORING"];
const ORGANIZATION_MENU: MenuCode = "MST-ORG";

/** Hak baca dropdown unit dan lingkup data user pembacanya (api-specs 05 §5.1, TN-02). */
@Injectable()
export class UnitAccess {
  constructor(
    @Inject(ACCESS_PORT) private readonly access: AccessPort,
    @Inject(USER_DIRECTORY_PORT) private readonly users: UserDirectoryPort,
  ) {}

  /** View pada salah satu menu pemakai dropdown; unit nonaktif hanya untuk halaman Organization. */
  async authorize(ctx: RequestContext, includeInactive: boolean): Promise<void> {
    if (includeInactive) return this.access.authorize(ctx, ORGANIZATION_MENU, "VIEW");
    for (const menu of VIEWING_MENUS) {
      if (await this.access.allows(ctx, menu, "VIEW")) return;
    }
    await this.access.authorize(ctx, ORGANIZATION_MENU, "VIEW");
  }

  async scope(tx: Tx, ctx: RequestContext): Promise<UnitScope> {
    const scope = await this.users.scope(tx, ctx.userId);
    if (!scope) throw DomainError.standard("UNAUTHENTICATED");
    return { regionalId: scope.regionalId, branchId: scope.branchId };
  }
}

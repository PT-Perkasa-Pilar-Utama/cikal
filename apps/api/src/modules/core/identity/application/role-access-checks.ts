import { Inject, Injectable } from "@nestjs/common";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import { CHANGE_REQUEST_PORT } from "../../../../platform/http/change-request-port.js";
import { DomainError } from "../../../../platform/http/domain-error.js";
import type { ChangeRequestPort } from "../../change-request/index.js";
import { Licensing } from "../../tenancy/index.js";
import { MenusRepository } from "../db/menus.repository.js";
import { RoleAccessRepository } from "../db/role-access.repository.js";
import { type RoleRow, RolesRepository } from "../db/roles.repository.js";
import type { AccessFlags } from "../domain/access-policy.js";
import type { MenuRow } from "../domain/menu-tree.js";
import { roleAccessError, viewRequired } from "../domain/role-access-rules.js";

export interface RoleAccessTarget {
  role: RoleRow;
  menu: MenuRow;
}

/** Aturan Role Access yang butuh database, dipakai saat Maker mengajukan dan saat Checker menyetujui. */
@Injectable()
export class RoleAccessChecks {
  constructor(
    private readonly roles: RolesRepository,
    private readonly menus: MenusRepository,
    private readonly roleAccess: RoleAccessRepository,
    @Inject(CHANGE_REQUEST_PORT) private readonly changeRequests: ChangeRequestPort,
    private readonly licensing: Licensing,
  ) {}

  /**
   * Role aktif di tenant dan menu aktif dari modul berlisensi (api-specs 03 §3.4 langkah 1). Role atau menu yang
   * tidak bisa dipilih di dropdown dijawab `404 NOT_FOUND`.
   */
  async target(tx: Tx, roleId: string, menuId: string): Promise<RoleAccessTarget> {
    const role = await this.roles.findById(tx, roleId);
    const menu = await this.menus.findById(tx, menuId);
    const licensed: ReadonlySet<string> = (await this.licensing.state(tx)).modules;
    const selectable = menu?.isActive === true && licensed.has(menu.moduleCode);
    if (!role?.isActive || !menu || !selectable) throw DomainError.standard("NOT_FOUND");
    return { role, menu };
  }

  /** View wajib bila aksi lain diberikan (AC-09.03, langkah 2). */
  assertViewGranted(flags: AccessFlags): void {
    if (viewRequired(flags)) throw roleAccessError("VIEW_ACCESS_REQUIRED");
  }

  /** Langkah 3: pasangan role dan menu belum aktif, dan saat Maker mengajukan, belum sedang diajukan. */
  async assertUnused(tx: Tx, roleId: string, menuId: string, options: { includePending: boolean }): Promise<void> {
    const pending =
      options.includePending && (await this.changeRequests.hasProposed(tx, "ROLE_ACCESS", { roleId, menuId }));
    if (pending || (await this.roleAccess.exists(tx, roleId, menuId))) throw roleAccessError("ROLE_ACCESS_EXISTS");
  }

  /** Id hak akses yang punya perubahan menunggu persetujuan (AC-12.06, `hasPendingChange`). */
  pendingIds(tx: Tx, ids: readonly string[]): Promise<Set<string>> {
    return this.changeRequests.pendingEntityIds(tx, ["ROLE_ACCESS"], ids);
  }
}

import { Injectable } from "@nestjs/common";
import { and, eq, gte, lte } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { MenuGrant, MenuRow } from "../domain/menu-tree.js";
import { menus, roleAccess, roles, userAccess, users } from "./schema.js";

const grantColumns = (table: typeof roleAccess | typeof userAccess) => ({
  menuId: table.menuId,
  canView: table.canView,
  canCreate: table.canCreate,
  canUpdate: table.canUpdate,
  canDelete: table.canDelete,
  canApprove: table.canApprove,
});

const menuColumns = {
  id: menus.id,
  menuCode: menus.menuCode,
  menuName: menus.menuName,
  menuIndex: menus.menuIndex,
  parentMenuId: menus.parentMenuId,
  link: menus.link,
  iconName: menus.iconName,
  moduleCode: menus.moduleCode,
};

/** Menu instalasi dan hak menu user untuk pohon menu sesi dan Role Access (api-specs 02 §2.4, 03 §3.2). */
@Injectable()
export class MenusRepository {
  async listActive(tx: Tx): Promise<MenuRow[]> {
    return this.list(tx, { includeInactive: false });
  }

  /** Semua menu instalasi; menu nonaktif hanya bila diminta (api-specs 03 §3.2). */
  async list(tx: Tx, options: { includeInactive: boolean }): Promise<MenuRow[]> {
    return tx
      .select(menuColumns)
      .from(menus)
      .where(options.includeInactive ? undefined : eq(menus.isActive, true));
  }

  async findById(tx: Tx, id: string): Promise<(MenuRow & { isActive: boolean }) | null> {
    const [row] = await tx
      .select({ ...menuColumns, isActive: menus.isActive })
      .from(menus)
      .where(eq(menus.id, id));
    return row ?? null;
  }

  /** RoleAccess role aktif user dan UserAccess yang berlaku `today` (technical-specs 09 §9.4). */
  async listGrants(tx: Tx, userId: string, today: string): Promise<MenuGrant[]> {
    const byRole = await tx
      .select(grantColumns(roleAccess))
      .from(roleAccess)
      .innerJoin(roles, and(eq(roles.id, roleAccess.roleId), eq(roles.isActive, true)))
      .innerJoin(users, eq(users.roleId, roles.id))
      .where(eq(users.id, userId));
    const byUser = await tx
      .select(grantColumns(userAccess))
      .from(userAccess)
      .where(and(eq(userAccess.userId, userId), lte(userAccess.validFrom, today), gte(userAccess.validTo, today)));
    return [...byRole, ...byUser];
  }
}

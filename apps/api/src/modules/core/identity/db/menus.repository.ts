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

/** Menu dan semua hak menu user untuk pohon menu sesi (api-specs 02 §2.4). */
@Injectable()
export class MenusRepository {
  async listActive(tx: Tx): Promise<MenuRow[]> {
    return tx
      .select({
        id: menus.id,
        menuCode: menus.menuCode,
        menuName: menus.menuName,
        menuIndex: menus.menuIndex,
        parentMenuId: menus.parentMenuId,
        link: menus.link,
        iconName: menus.iconName,
        moduleCode: menus.moduleCode,
      })
      .from(menus)
      .where(eq(menus.isActive, true));
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

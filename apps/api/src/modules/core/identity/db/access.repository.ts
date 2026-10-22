import { Injectable } from "@nestjs/common";
import { and, eq, gte, lte } from "drizzle-orm";
import type { Tx } from "../../../../platform/db/tenant-tx.js";
import type { AccessFlags, MenuAccessFacts } from "../domain/access-policy.js";
import { menus, roleAccess, roles, userAccess, users } from "./schema.js";

const flagColumns = (table: typeof roleAccess | typeof userAccess) => ({
  canView: table.canView,
  canCreate: table.canCreate,
  canUpdate: table.canUpdate,
  canDelete: table.canDelete,
  canApprove: table.canApprove,
});

/** Hak menu user dari RoleAccess dan UserAccess (technical-specs 09 §9.4). */
@Injectable()
export class AccessRepository {
  async findMenuAccess(
    tx: Tx,
    userId: string,
    menuCode: string,
    today: string,
  ): Promise<Omit<MenuAccessFacts, "licensedModules">> {
    const [menu] = await tx
      .select({ id: menus.id, moduleCode: menus.moduleCode, isActive: menus.isActive })
      .from(menus)
      .where(eq(menus.menuCode, menuCode));
    if (!menu) return { menu: null, grants: [] };

    const byRole: AccessFlags[] = await tx
      .select(flagColumns(roleAccess))
      .from(roleAccess)
      .innerJoin(roles, and(eq(roles.id, roleAccess.roleId), eq(roles.isActive, true)))
      .innerJoin(users, eq(users.roleId, roles.id))
      .where(and(eq(users.id, userId), eq(roleAccess.menuId, menu.id)));
    const byUser: AccessFlags[] = await tx
      .select(flagColumns(userAccess))
      .from(userAccess)
      .where(
        and(
          eq(userAccess.userId, userId),
          eq(userAccess.menuId, menu.id),
          lte(userAccess.validFrom, today),
          gte(userAccess.validTo, today),
        ),
      );
    return { menu, grants: [...byRole, ...byUser] };
  }
}
